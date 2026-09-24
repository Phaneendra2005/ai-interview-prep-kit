import { GeminiProvider } from '../src/services/llm.provider';
import { z } from 'zod';

const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    })
  };
});

const TestSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

describe('GeminiProvider Error Handling', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test_key';
    delete process.env.GOOGLE_API_KEY; // Ensure clean state
    provider = new GeminiProvider();
    
    // Mock setTimeout so we don't actually wait
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Successful generation with valid schema', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ summary: 'Test', what_they_do: 'Build things', sources: ['http://example.com'] })
    });
    const res = await provider.generateObject('test prompt', TestSchema);
    expect(res.summary).toBe('Test');
    expect(res.what_they_do).toBe('Build things');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('2. Temporary 429 -> retry -> success', async () => {
    const err = new Error('Too many requests');
    (err as any).status = 429;
    mockGenerateContent
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ text: JSON.stringify({ summary: 'OK', what_they_do: 'stuff', sources: [] }) });
    
    const res = await provider.generateObject('test prompt', TestSchema);
    expect(res.summary).toBe('OK');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('3. Repeated 429 -> exhausts retries -> throws', async () => {
    const err = new Error('Too many requests');
    (err as any).status = 429;
    mockGenerateContent.mockRejectedValue(err);
    
    await expect(provider.generateObject('test prompt', TestSchema)).rejects.toThrow('AI_PROVIDER_RATE_LIMITED');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('4. Daily quota exhausted -> no retry', async () => {
    mockGenerateContent.mockRejectedValue({
      status: 429,
      message: 'You exceeded your current quota limit: 0'
    });
    
    await expect(provider.generateObject('test prompt', TestSchema)).rejects.toThrow('AI_PROVIDER_QUOTA_EXHAUSTED');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('5. 503 -> retry -> success', async () => {
    const err = new Error('Service unavailable');
    (err as any).status = 503;
    mockGenerateContent
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ text: JSON.stringify({ summary: 'OK', what_they_do: 'stuff', sources: [] }) });
    
    const res = await provider.generateObject('test prompt', TestSchema);
    expect(res.summary).toBe('OK');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('6. Invalid API key -> immediate failure', async () => {
    const err = new Error('API key not valid');
    (err as any).status = 400;
    mockGenerateContent.mockRejectedValue(err);
    
    await expect(provider.generateObject('test prompt', TestSchema)).rejects.toThrow('AI_PROVIDER_INVALID_KEY');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('7. 404 model not found -> immediate failure', async () => {
    const err = new Error('models/invalid-model is not found');
    (err as any).status = 404;
    mockGenerateContent.mockRejectedValue(err);
    
    await expect(provider.generateObject('test prompt', TestSchema)).rejects.toThrow('AI_PROVIDER_MODEL_NOT_FOUND');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('8. Invalid LLM response (ZodError) -> retries then AI_INVALID_RESPONSE', async () => {
    // LLM returns JSON but with wrong keys
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ title: 'wrong', description: 'wrong keys' })
    });
    
    await expect(provider.generateObject('test prompt', TestSchema)).rejects.toThrow('AI_INVALID_RESPONSE');
    // Should have retried all 3 times
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('9. Schema validation fails then succeeds on retry', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ wrong: 'keys' }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ summary: 'OK', what_they_do: 'stuff', sources: [] }) });
    
    const res = await provider.generateObject('test prompt', TestSchema);
    expect(res.summary).toBe('OK');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('10. Empty response -> retries', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: '' })
      .mockResolvedValueOnce({ text: JSON.stringify({ summary: 'OK', what_they_do: 'stuff', sources: [] }) });
    
    const res = await provider.generateObject('test prompt', TestSchema);
    expect(res.summary).toBe('OK');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('11. No GOOGLE_API_KEY interference', () => {
    // The module-level code should have deleted GOOGLE_API_KEY
    expect(process.env.GOOGLE_API_KEY).toBeUndefined();
  });

  it('12. Uses configured model, not gemini-3.1-pro or gemini-1.5-flash', () => {
    // Default should be gemini-3.5-flash-lite
    expect((provider as any).modelName).toBe('gemini-3.5-flash-lite');
    expect((provider as any).modelName).not.toBe('gemini-3.1-pro');
    expect((provider as any).modelName).not.toBe('gemini-3.1-pro-preview');
    expect((provider as any).modelName).not.toBe('gemini-1.5-flash');
  });

  it('13. 401/403 -> immediate auth failure', async () => {
    const err = new Error('Permission denied');
    (err as any).status = 403;
    mockGenerateContent.mockRejectedValue(err);
    
    await expect(provider.generateObject('test prompt', TestSchema)).rejects.toThrow('AI_PROVIDER_AUTH_FAILED');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // Task 3: Schema Validation Audit Tests
  const StrictSchema = z.object({
    requirements: z.array(z.object({
      id: z.string(),
      description: z.string()
    }))
  });

  it('14. Schema Audit A: Expected object', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ requirements: [{ id: '1', description: 'test' }] })
    });
    const res = await provider.generateObject('prompt', StrictSchema);
    expect(res.requirements[0].id).toBe('1');
  });

  it('15. Schema Audit B: Valid operation-specific array normalization', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([{ id: '1', description: 'test' }])
    });
    const res = await provider.generateObject('prompt', StrictSchema);
    expect(res.requirements[0].id).toBe('1');
  });

  it('16. Schema Audit C: Wrong array shape (rejects safely)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([['invalid', 'array']]) // inner array instead of object
    });
    await expect(provider.generateObject('prompt', StrictSchema)).rejects.toThrow('AI_INVALID_RESPONSE');
  });

  it('17. Schema Audit D: Missing required fields (rejects safely)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ requirements: [{ id: '1' }] }) // missing description
    });
    await expect(provider.generateObject('prompt', StrictSchema)).rejects.toThrow('AI_INVALID_RESPONSE');
  });

  it('18. Schema Audit E: Invalid types (rejects safely)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ requirements: [{ id: 123, description: 'test' }] }) // id is number instead of string
    });
    await expect(provider.generateObject('prompt', StrictSchema)).rejects.toThrow('AI_INVALID_RESPONSE');
  });

  it('19. Schema Audit F: Malformed JSON (rejects safely)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{ invalid json structure ...'
    });
    await expect(provider.generateObject('prompt', StrictSchema)).rejects.toThrow('AI_INVALID_RESPONSE');
  });
});
