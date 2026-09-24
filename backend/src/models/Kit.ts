import mongoose, { Document, Schema } from 'mongoose';

export interface IKit extends Document {
  userId: mongoose.Types.ObjectId;
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: Date;
    pages_used: string[];
  };
  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Array<{
      id: string;
      text: string;
      kind: 'technical' | 'behavioural' | 'domain';
      priority: 'must' | 'nice';
    }>;
  };
  questions: Array<{
    id: string;
    requirement_ids: string[];
    category: 'technical' | 'behavioural' | 'system-design' | 'company-fit';
    prompt: string;
    answer_outline: string;
    difficulty: number;
    source: 'generated' | 'edited' | 'manual';
    pinned: boolean;
  }>;
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    requirement_ids: string[];
    source: 'generated' | 'edited' | 'manual';
    pinned: boolean;
  }>;
  schedule: {
    days_available: number;
    days: Array<{
      day: number;
      focus: string;
      question_ids: string[];
      minutes: number;
    }>;
  };
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
  generationStatus: 'pending' | 'researching' | 'generating' | 'completed' | 'failed';
  generationProgress: string;
  generationErrors?: Array<{ code: string; message: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const kitSchema = new Schema<IKit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    source: { type: Schema.Types.Mixed, default: {} },
    company_brief: { type: Schema.Types.Mixed, default: {} },
    role: { type: Schema.Types.Mixed, default: {} },
    questions: { type: Schema.Types.Mixed, default: [] },
    flashcards: { type: Schema.Types.Mixed, default: [] },
    schedule: { type: Schema.Types.Mixed, default: {} },
    coverage: { type: Schema.Types.Mixed, default: {} },
    generationStatus: { type: String, default: 'pending' },
    generationProgress: { type: String, default: 'queued' },
    generationErrors: { type: Schema.Types.Mixed, default: [] }
  },
  { timestamps: true }
);

export const Kit = mongoose.model<IKit>('Kit', kitSchema);
