import { Request, Response } from 'express';
import { Kit } from '../models/Kit';
import { KitService } from '../services/kit.service';
import { ExtractionService } from '../services/extraction.service';
import { RetrievalService } from '../services/retrieval.service';
import { LinkDiscoveryService } from '../services/discovery.service';
import { GenerationService } from '../services/generation.service';
import { CoverageService } from '../services/coverage.service';
import { SchedulingService } from '../services/scheduling.service';
import { getLLMProvider } from '../services/llm.provider';
import { DiscussionProvider } from '../services/discussion.provider';

// Singleton instance for the controller
const llmProvider = getLLMProvider();
const kitService = new KitService(
  new ExtractionService(llmProvider),
  new RetrievalService(),
  new LinkDiscoveryService(),
  new GenerationService(llmProvider),
  new CoverageService(),
  new SchedulingService(),
  new DiscussionProvider(new RetrievalService()) // I will create this class shortly
);

export const createKit = async (req: Request, res: Response) => {
  try {
    const { jdText, companyUrl, days } = req.body;
    if (!jdText || !companyUrl || !days) {
      return res.status(400).json({ error: 'jdText, companyUrl, and days are required' });
    }

    const userId = req.session.userId!;
    
    // No global user lock. Kit creations are isolated.

    
    // Create kit immediately and return ID to frontend for polling
    const newKit = new Kit({
      userId,
      generationStatus: 'pending',
      generationProgress: 'queued'
    });
    await newKit.save();

    const kitIdString = (newKit._id as any).toString();

    // Start generation asynchronously
    kitService.generateKit(userId, jdText, companyUrl, days, kitIdString)
      .catch(e => console.error('Background generation error:', e));

    res.status(202).json({ id: kitIdString });
  } catch (error) {
    console.error('createKit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getKits = async (req: Request, res: Response) => {
  try {
    const kits = await Kit.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.status(200).json(kits);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getKit = async (req: Request, res: Response) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    res.status(200).json(kit);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getKitStatus = async (req: Request, res: Response) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.session.userId }).select('generationStatus generationProgress generationErrors');
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    res.status(200).json({
      status: kit.generationStatus,
      progress: kit.generationProgress,
      error: kit.generationErrors?.[0]?.message || null,
      errorCode: kit.generationErrors?.[0]?.code || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateKit = async (req: Request, res: Response) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    
    // The frontend sends the entire kit to overwrite
    const { company_brief, role, questions, flashcards, schedule } = req.body;
    
    kit.company_brief = company_brief ?? kit.company_brief;
    kit.role = role ?? kit.role;
    kit.questions = questions ?? kit.questions;
    kit.flashcards = flashcards ?? kit.flashcards;
    kit.schedule = schedule ?? kit.schedule;
    
    // Reference Integrity Checks
    const reqIds = new Set(kit.role?.requirements?.map((r: any) => r.id) || []);
    const qIds = new Set(kit.questions?.map((q: any) => q.id) || []);

    if (kit.questions) {
      kit.questions.forEach((q: any) => {
        q.requirement_ids = q.requirement_ids?.filter((id: string) => reqIds.has(id)) || [];
      });
    }

    if (kit.flashcards) {
      kit.flashcards.forEach((f: any) => {
        f.requirement_ids = f.requirement_ids?.filter((id: string) => reqIds.has(id)) || [];
      });
    }

    if (kit.schedule && kit.schedule.days) {
      kit.schedule.days.forEach((day: any) => {
        day.question_ids = day.question_ids?.filter((id: string) => qIds.has(id)) || [];
      });
    }

    // Must mark mixed fields as modified in mongoose
    kit.markModified('company_brief');
    kit.markModified('role');
    kit.markModified('questions');
    kit.markModified('flashcards');
    kit.markModified('schedule');

    await kit.save();
    res.status(200).json(kit);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const regenerateKit = async (req: Request, res: Response) => {
  try {
    // Regenerate triggered by user
    // Start regeneration async
    // Atomically acquire regeneration lock if not generating or if lock is stale
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const kit = await Kit.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.session.userId,
        $or: [
          { generationStatus: { $nin: ['pending', 'generating'] } },
          { updatedAt: { $lt: tenMinutesAgo } }
        ]
      },
      { 
        $set: { 
          generationStatus: 'generating',
          generationProgress: 'queued_regeneration',
          updatedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!kit) {
      // If we couldn't acquire the lock, check if the kit even exists
      const existing = await Kit.findOne({ _id: req.params.id, userId: req.session.userId });
      if (!existing) return res.status(404).json({ error: 'Kit not found' });
      return res.status(429).json({ error: 'This kit is already being generated.' });
    }

    const kitIdString = (kit._id as any).toString();

    // Fire off async regen process
    kitService.regenerateKit(kitIdString)
      .catch(e => console.error('Regeneration error:', e));

    res.status(202).json({ id: kitIdString });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
