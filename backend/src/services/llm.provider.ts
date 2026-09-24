import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

// Prevent the @google/genai SDK from picking up a stale system-level GOOGLE_API_KEY.
// The SDK prioritizes GOOGLE_API_KEY over GEMINI_API_KEY when both are set in process.env.
// We explicitly delete it so our .env GEMINI_API_KEY is always the sole authority.
if (process.env.GOOGLE_API_KEY) {
  delete process.env.GOOGLE_API_KEY;
}

export interface ILLMProvider {
  generateObject<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T>;
}

export class GeminiProvider implements ILLMProvider {
  private ai: GoogleGenAI | null = null;
  private modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async generateObject<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    if (!this.ai) throw new Error('API key not configured');
    const maxRetries = 3;
    let delay = 1000;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // ---- Phase 1: Call the Gemini API ----
      let text: string;
      try {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });

        text = response.text ?? '';
        if (!text) {
          console.warn(`[LLM] Empty response on attempt ${attempt + 1}/${maxRetries}`);
          lastError = new Error('Empty response from LLM');
          if (attempt < maxRetries - 1) {
            await this.backoff(delay);
            delay *= 2;
            continue;
          }
          throw lastError;
        }
      } catch (apiError: any) {
        // Classify API-level errors (these should NOT be retried as schema issues)
        const errStr = this.safeErrorString(apiError);

        // Permanent: Quota Exhaustion (429 with specific messaging)
        if (errStr.toLowerCase().includes('exceeded your current quota') || (errStr.includes('limit: 0') && errStr.includes('quota'))) {
          throw new Error('AI_PROVIDER_QUOTA_EXHAUSTED');
        }

        // Permanent: Model Not Found
        if (apiError?.status === 404 || (errStr.includes('is not found') && errStr.includes('model'))) {
          throw new Error('AI_PROVIDER_MODEL_NOT_FOUND');
        }

        // Permanent: Bad API key
        if (apiError?.status === 400 && errStr.toLowerCase().includes('api key not valid')) {
          throw new Error('AI_PROVIDER_INVALID_KEY');
        }

        // Permanent: General 400 Bad Request
        if (apiError?.status === 400) {
          throw new Error('AI_PROVIDER_BAD_REQUEST');
        }

        // Permanent: Auth / Permission
        if (apiError?.status === 401 || apiError?.status === 403) {
          throw new Error('AI_PROVIDER_AUTH_FAILED');
        }

        // Transient: Rate Limit
        if (apiError?.status === 429 || errStr.includes('RESOURCE_EXHAUSTED')) {
          lastError = new Error('AI_PROVIDER_RATE_LIMITED');
          if (attempt < maxRetries - 1) {
            const delayToUse = this.extractRetryDelay(errStr, delay);
            console.warn(`[LLM] Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayToUse}ms...`);
            await this.backoff(delayToUse);
            delay *= 2;
            continue;
          }
          throw lastError;
        } else if (apiError?.status === 503) {
          // Transient: Service Unavailable
          lastError = new Error('AI_PROVIDER_UNAVAILABLE');
          if (attempt < maxRetries - 1) {
            console.warn(`[LLM] Service unavailable (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`);
            await this.backoff(delay);
            delay *= 2;
            continue;
          }
          throw lastError;
        } else {
          // Unknown API error — don't retry
          throw apiError;
        }
      }

      // ---- Phase 2: Parse JSON and validate schema ----
      try {
        const json = JSON.parse(text);
        // First: try direct parse
        const directResult = schema.safeParse(json);
        if (directResult.success) return directResult.data;

        // If the LLM returned an array but the schema expects an object with an array property,
        // try wrapping it automatically. Common wrappers: requirements, questions, flashcards.
        if (Array.isArray(json)) {
          for (const wrapperKey of ['requirements', 'questions', 'flashcards']) {
            const wrappedResult = schema.safeParse({ [wrapperKey]: json });
            if (wrappedResult.success) {
              console.warn(`[LLM] Auto-wrapped raw array into { ${wrapperKey}: [...] }`);
              return wrappedResult.data;
            }
          }
        }

        // Neither direct nor wrapped parse worked — throw the original ZodError
        const issuesSummary = (directResult as any).error.issues.map((iss: any) => `${iss.path.join('.')}: ${iss.message}`).join('; ');
        console.warn(`[LLM] Schema validation failed (attempt ${attempt + 1}/${maxRetries}): ${issuesSummary}`);
        lastError = (directResult as any).error;

        if (attempt < maxRetries - 1) {
          await this.backoff(Math.min(delay, 2000));
          delay *= 1.5;
          continue;
        }
      } catch (parseError: any) {
        lastError = parseError;
        console.warn(`[LLM] JSON parse failed (attempt ${attempt + 1}/${maxRetries}): ${parseError.message}`);

        if (attempt < maxRetries - 1) {
          await this.backoff(Math.min(delay, 2000));
          delay *= 1.5;
          continue;
        }
      }
    }

    // All retries exhausted
    if (lastError instanceof z.ZodError || lastError instanceof SyntaxError) {
      const err = new Error('AI_INVALID_RESPONSE');
      (err as any).cause = lastError;
      throw err;
    }
    throw lastError || new Error('Max retries exceeded or permanent API failure');
  }

  private safeErrorString(error: any): string {
    try {
      return JSON.stringify(error, Object.getOwnPropertyNames(error)) + ' ' + (error?.message || '');
    } catch {
      return String(error?.message || error);
    }
  }

  private extractRetryDelay(errStr: string, baseDelay: number): number {
    const retryMatch = errStr.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    if (retryMatch && retryMatch[1]) {
      return parseInt(retryMatch[1], 10) * 1000 + 1000 + Math.floor(Math.random() * 500);
    }
    return baseDelay * 5 + Math.floor(Math.random() * 1000);
  }

  private async backoff(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class TestLLMProvider implements ILLMProvider {
  async generateObject<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    // Deterministic mock data based on the requested schema keys
    // This allows schema validation to succeed without hitting the external API.
    const isRequirements = prompt.includes('Extract requirements');
    const isQuestions = prompt.includes('generate technical interview questions');
    const isFlashcards = prompt.includes('generate conceptual flashcards');
    const isCoverage = prompt.includes('Analyze the coverage');
    const isSchedule = prompt.includes('Create a study schedule');

    let mockData: any = {};

    if (isRequirements) {
      mockData = {
        companyBrief: "Mock Company",
        role: "Mock Role",
        requirements: [{ id: "req-1", description: "Mock Req", isMustHave: true }]
      };
    } else if (isQuestions) {
      mockData = {
        questions: [{
          id: "q-1",
          question: "Mock Question?",
          answerOutline: "Mock Answer",
          difficulty: 1,
          requirementIds: ["req-1"]
        }]
      };
    } else if (isFlashcards) {
      mockData = {
        flashcards: [{
          id: "f-1",
          front: "Mock Front",
          back: "Mock Back",
          difficulty: 1,
          requirementIds: ["req-1"]
        }]
      };
    } else if (isCoverage) {
      mockData = {
        coveredRequirementIds: ["req-1"],
        missingRequirementIds: []
      };
    } else if (isSchedule) {
      mockData = {
        schedule: [{
          day: 1,
          items: [{
            type: "question",
            itemId: "q-1",
            durationMinutes: 30
          }]
        }]
      };
    } else {
      throw new Error("TestLLMProvider: Unknown prompt type");
    }

    // Must still pass real Zod validation
    return schema.parse(mockData);
  }
}

export function getLLMProvider(): ILLMProvider {
  if (process.env.NODE_ENV === 'test') {
    return new TestLLMProvider();
  }
  return new GeminiProvider();
}
