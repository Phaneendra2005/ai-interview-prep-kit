import { z } from 'zod';
import { RequirementSchema } from '../services/extraction.service';
import { QuestionSchema, FlashcardSchema } from '../services/generation.service';

export const KitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string().url(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int(),
    researched_at: z.string(), // ISO string
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(RequirementSchema),
  }),
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: z.object({
    days_available: z.number().int().min(1),
    days: z.array(z.object({
      day: z.number().int(),
      focus: z.string(),
      question_ids: z.array(z.string()),
      minutes: z.number().int(),
    })),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int(),
  }),
});

export function validateKit(kitData: any) {
  return KitSchema.parse(kitData);
}
