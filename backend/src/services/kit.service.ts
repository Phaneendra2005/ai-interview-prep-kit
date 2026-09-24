import mongoose from 'mongoose';
import { Kit, IKit } from '../models/Kit';
import { ExtractionService } from './extraction.service';
import { RetrievalService } from './retrieval.service';
import { LinkDiscoveryService } from './discovery.service';
import { GenerationService } from './generation.service';
import { CoverageService } from './coverage.service';
import { SchedulingService } from './scheduling.service';
import { validateKit } from '../utils/kit.validator';

import { DiscussionProvider } from './discussion.provider';

export class KitService {
  constructor(
    private extraction: ExtractionService,
    private retrieval: RetrievalService,
    private discovery: LinkDiscoveryService,
    private generation: GenerationService,
    private coverage: CoverageService,
    private scheduling: SchedulingService,
    private discussion: DiscussionProvider
  ) {}

  async generateKit(userId: string, jdText: string, companyUrl: string, days: number, kitId?: string) {
    let kitIdString = kitId;
    try {
      const kitDocument = kitId ? await Kit.findById(kitId) : new Kit({ userId, generationStatus: 'pending' });
      if (!kitDocument) {
        throw new Error('Kit not found');
      }
      kitIdString = (kitDocument._id as any).toString();

      kitDocument.generationStatus = 'generating';
      kitDocument.generationProgress = 'parsing_jd';
      await kitDocument.save();
      console.log(`[KitGeneration] Started kitId=${kitIdString}`);

      // Step 2: Extract requirements
      kitDocument.generationProgress = 'extracting_requirements';
      await kitDocument.save();
      const requirements = await this.extraction.extractRequirements(jdText);
      console.log(`[KitGeneration] stage=extracting_requirements count=${requirements.length}`);

      // Step 3-7: Retrieval and Discovery
      kitDocument.generationProgress = 'researching_company';
      await kitDocument.save();
      let homePage = { text: '', links: [] as string[] };
      let originDomain = '';

      try {
        homePage = await this.retrieval.fetchPage(companyUrl);
        console.log(`[Research] Fetched company URL=${companyUrl} textLen=${homePage.text.length} links=${homePage.links.length}`);
        originDomain = new URL(companyUrl).hostname;
      } catch (e: any) {
        console.warn(`[Research] Primary URL fetch failed for ${companyUrl}:`, e.message);
      }

      const rankedLinks = originDomain ? this.discovery.rankLinks(homePage.links, originDomain).slice(0, 5) : []; // take top 5

      const pagesContent: string[] = [];
      const pagesUsed: string[] = [];

      if (homePage.text) {
        pagesContent.push(homePage.text);
        pagesUsed.push(companyUrl);
      }

      for (const link of rankedLinks) {
        try {
          const page = await this.retrieval.fetchPage(link);
          pagesContent.push(page.text);
          pagesUsed.push(link);
        } catch (e) {
          console.warn(`Failed to fetch secondary link ${link}`, e);
        }
      }

      kitDocument.generationProgress = 'researching_discussions';
      await kitDocument.save();
      // discussion stub integration

      // Step 9-10: Generate Brief & Role
      kitDocument.generationProgress = 'generating_questions';
      await kitDocument.save();
      const companyBrief = await this.generation.generateCompanyBrief(companyUrl, pagesContent);
      console.log(`[KitGeneration] stage=company_brief done`);
      const roleBreakdownLLM = await this.generation.generateRoleBreakdown(jdText);
      console.log(`[KitGeneration] stage=role_breakdown title=${roleBreakdownLLM.title}`);
      // Ensure the generated role breakdown contains the deterministic requirements we extracted
      const roleBreakdown = { ...roleBreakdownLLM, requirements };

      // Step 11-15: Generate Questions and Flashcards
      const technicalQuestions = await this.generation.generateQuestions(requirements, 'technical');
      const behaviouralQuestions = await this.generation.generateQuestions(requirements, 'behavioural');
      const systemDesignQuestions = await this.generation.generateQuestions(requirements, 'system-design');
      const companyFitQuestions = await this.generation.generateQuestions(requirements, 'company-fit');

      let allQuestions = [
        ...technicalQuestions,
        ...behaviouralQuestions,
        ...systemDesignQuestions,
        ...companyFitQuestions
      ];

      kitDocument.generationProgress = 'generating_flashcards';
      await kitDocument.save();
      const flashcards = await this.generation.generateFlashcards(requirements);
      console.log(`[KitGeneration] stage=flashcards count=${flashcards.length}`);

      // Add structural state markers AND globally unique IDs
      allQuestions = allQuestions.map(q => ({ ...q, id: new mongoose.Types.ObjectId().toString(), source: 'generated', pinned: false }));
      const allFlashcards = flashcards.map(f => ({ ...f, id: new mongoose.Types.ObjectId().toString(), source: 'generated', pinned: false }));

      // Step 16-19: Coverage Engine
      kitDocument.generationProgress = 'checking_coverage';
      await kitDocument.save();
      let uncoveredIds = this.coverage.checkCoverage(requirements, allQuestions);
      let passes = 1;

      if (uncoveredIds.length > 0) {
        kitDocument.generationProgress = 'second_pass';
        await kitDocument.save();
        const missingReqs = requirements.filter(r => uncoveredIds.includes(r.id));
        let additionalQuestions = await this.generation.generateQuestions(missingReqs, 'technical', allQuestions.map(q => q.id));
        additionalQuestions = additionalQuestions.map(q => ({ ...q, id: new mongoose.Types.ObjectId().toString(), source: 'generated', pinned: false }));
        allQuestions = [...allQuestions, ...additionalQuestions];
        uncoveredIds = this.coverage.checkCoverage(requirements, allQuestions);
        passes++;
      }

      // FINAL MUST-HAVE COVERAGE VALIDATION
      const uncoveredMustHaves = requirements.filter(r => uncoveredIds.includes(r.id) && r.priority === 'must');
      if (uncoveredMustHaves.length > 0) {
        throw new Error('MUST_HAVE_REQUIREMENTS_UNCOVERED');
      }

      // Step 20: Schedule allocation
      kitDocument.generationProgress = 'building_schedule';
      await kitDocument.save();
      const schedule = this.scheduling.allocateSchedule(days, requirements, allQuestions);

      kitDocument.generationProgress = 'validating';
      await kitDocument.save();
      const kitData = {
        source: {
          company: companyBrief.what_they_do ? "Extracted from brief" : "Unknown",
          company_url: companyUrl,
          role: roleBreakdown.title,
          location: "Unknown", // Can be expanded
          jd_chars: jdText.length,
          researched_at: new Date().toISOString(),
          pages_used: pagesUsed
        },
        company_brief: companyBrief,
        role: roleBreakdown,
        questions: allQuestions,
        flashcards: allFlashcards,
        schedule,
        coverage: {
          uncovered_requirement_ids: uncoveredIds,
          passes
        }
      };

      // Step 21: Validate Kit
      const validatedData = validateKit(kitData);

      // Step 22: Persist
      kitDocument.generationProgress = 'saving';
      await kitDocument.save();
      kitDocument.set(validatedData);
      kitDocument.generationStatus = 'completed';
      kitDocument.generationProgress = 'completed';
      await kitDocument.save();
      console.log(`[KitGeneration] COMPLETED kitId=${(kitDocument._id as any).toString()} questions=${kitData.questions.length} flashcards=${kitData.flashcards.length} days=${kitData.schedule.days.length}`);

      return kitDocument;

    } catch (error: any) {
      const errorMap: Record<string, string> = {
        'AI_PROVIDER_QUOTA_EXHAUSTED': 'AI generation is unavailable because the configured provider has no remaining quota for this model.',
        'AI_PROVIDER_MODEL_NOT_FOUND': 'The configured AI model is unavailable. Please check GEMINI_MODEL or provider configuration.',
        'AI_INVALID_RESPONSE': 'The AI returned an invalid response. Please try again.',
        'AI_PROVIDER_INVALID_KEY': 'The configured API key is invalid. Please check GEMINI_API_KEY.',
        'AI_PROVIDER_AUTH_FAILED': 'Authentication failed with the AI provider. Please check credentials.',
        'MUST_HAVE_REQUIREMENTS_UNCOVERED': 'Failed to cover essential must-have requirements',
      };
      const errorMessage = errorMap[error.message] || 'Generation temporarily unavailable. Please try again shortly.';
      const errorCode = Object.keys(errorMap).includes(error.message) ? error.message : 'GEN_FAILED';
      console.error(`[KitGeneration] FAILED kitId=${kitIdString} code=${errorCode} message=${errorMessage}`);

      if (kitIdString) {
        await Kit.findByIdAndUpdate(
          kitIdString,
          {
            $set: {
              generationStatus: 'failed',
              generationErrors: [{ code: errorCode, message: errorMessage }],
              generationProgress: 'failed'
            }
          }
        ).exec();
        console.log(`[KitGeneration] Forcefully marked kitId=${kitIdString} as FAILED in DB.`);
      }
      throw error;
    }
  }

  async regenerateKit(kitId: string) {
    const kit = await Kit.findById(kitId);
    if (!kit) throw new Error('Kit not found');

    try {
      kit.generationProgress = 'generating_questions';
      await kit.save();

      const requirements = kit.role.requirements;
      const originalQuestions = kit.questions || [];
      const originalFlashcards = kit.flashcards || [];

      // KEEP: edited, manual, pinned
      const retainedQuestions = originalQuestions.filter(q => q.source === 'edited' || q.source === 'manual' || q.pinned);
      const retainedFlashcards = originalFlashcards.filter(f => f.source === 'edited' || f.source === 'manual' || f.pinned);

      // We need to generate missing questions to cover all requirements again, as well as general questions
      // Actually, since we want to fully regenerate the "generated" content, we just generate everything and filter out duplicates or rely on the retained questions to satisfy coverage.
      // But we shouldn't discard the old generated questions just to generate the exact same things if they are good.
      // The prompt says "Regeneration rules: generated + unedited content may be replaced".
      // So we will just re-generate technical, behavioural, system-design, company-fit for all requirements.
      const technicalQuestions = await this.generation.generateQuestions(requirements, 'technical', retainedQuestions.map(q => q.id));
      const behaviouralQuestions = await this.generation.generateQuestions(requirements, 'behavioural', retainedQuestions.map(q => q.id));
      const systemDesignQuestions = await this.generation.generateQuestions(requirements, 'system-design', retainedQuestions.map(q => q.id));
      const companyFitQuestions = await this.generation.generateQuestions(requirements, 'company-fit', retainedQuestions.map(q => q.id));

      const newlyGeneratedQuestions = [
        ...technicalQuestions,
        ...behaviouralQuestions,
        ...systemDesignQuestions,
        ...companyFitQuestions
      ].map(q => ({ ...q, id: new mongoose.Types.ObjectId().toString(), source: 'generated' as const, pinned: false }));

      let allQuestions = [...retainedQuestions, ...newlyGeneratedQuestions];

      kit.generationProgress = 'generating_flashcards';
      await kit.save();

      const newFlashcards = await this.generation.generateFlashcards(requirements);
      // To avoid duplicate IDs, we can filter or re-map. But the prompt specifically said we can replace them.
      let newlyGeneratedFlashcards = newFlashcards.map(f => ({ ...f, id: new mongoose.Types.ObjectId().toString(), source: 'generated' as const, pinned: false }));

      // Ensure no ID collision
      const retainedFIds = new Set(retainedFlashcards.map(f => f.id));
      newlyGeneratedFlashcards = newlyGeneratedFlashcards.filter(f => !retainedFIds.has(f.id));

      const allFlashcards = [...retainedFlashcards, ...newlyGeneratedFlashcards];

      kit.generationProgress = 'checking_coverage';
      await kit.save();

      let uncoveredIds = this.coverage.checkCoverage(requirements, allQuestions);
      let passes = 1;

      if (uncoveredIds.length > 0) {
        kit.generationProgress = 'second_pass';
        await kit.save();
        const missingReqs = requirements.filter(r => uncoveredIds.includes(r.id));
        let additionalQuestions = await this.generation.generateQuestions(missingReqs, 'technical', allQuestions.map(q => q.id));
        additionalQuestions = additionalQuestions.map(q => ({ ...q, id: new mongoose.Types.ObjectId().toString(), source: 'generated' as const, pinned: false }));
        allQuestions = [...allQuestions, ...additionalQuestions];
        uncoveredIds = this.coverage.checkCoverage(requirements, allQuestions);
        passes++;
      }

      kit.generationProgress = 'building_schedule';
      await kit.save();
      const schedule = this.scheduling.allocateSchedule(kit.schedule.days_available, requirements, allQuestions);

      kit.generationProgress = 'saving';
      await kit.save();

      kit.questions = allQuestions;
      kit.flashcards = allFlashcards;
      kit.schedule = schedule;
      kit.coverage = {
        uncovered_requirement_ids: uncoveredIds,
        passes
      };

      // Ensure questions don't reference missing requirements
      const reqIds = new Set(requirements.map(r => r.id));
      kit.questions.forEach(q => {
        q.requirement_ids = q.requirement_ids.filter(id => reqIds.has(id));
      });
      kit.flashcards.forEach(f => {
        f.requirement_ids = f.requirement_ids.filter(id => reqIds.has(id));
      });

      const qIds = new Set(allQuestions.map(q => q.id));
      kit.schedule.days.forEach(day => {
        day.question_ids = day.question_ids.filter(id => qIds.has(id));
      });

      kit.generationStatus = 'completed';
      kit.generationProgress = 'completed';
      await kit.save();

      return kit;
    } catch (error: any) {
      const errorMap: Record<string, string> = {
        'AI_PROVIDER_QUOTA_EXHAUSTED': 'AI generation is unavailable because the configured provider has no remaining quota for this model.',
        'AI_PROVIDER_MODEL_NOT_FOUND': 'The configured AI model is unavailable. Please check GEMINI_MODEL or provider configuration.',
        'AI_INVALID_RESPONSE': 'The AI returned an invalid response. Please try again.',
        'AI_PROVIDER_INVALID_KEY': 'The configured API key is invalid. Please check GEMINI_API_KEY.',
        'AI_PROVIDER_AUTH_FAILED': 'Authentication failed with the AI provider. Please check credentials.',
      };
      const errorMessage = errorMap[error.message] || 'Generation temporarily unavailable. Please try again shortly.';
      const errorCode = Object.keys(errorMap).includes(error.message) ? error.message : 'REGEN_FAILED';
      console.error(`[KitRegeneration] FAILED stage=${kit.generationProgress} code=${errorCode}`);

      await Kit.findByIdAndUpdate(
        kit._id,
        {
          $set: {
            generationStatus: 'failed',
            generationErrors: [{ code: errorCode, message: errorMessage }],
            generationProgress: 'failed'
          }
        }
      ).exec();
      console.log(`[KitRegeneration] Forcefully marked kitId=${kit._id} as FAILED in DB.`);
      throw error;
    }
  }
}
