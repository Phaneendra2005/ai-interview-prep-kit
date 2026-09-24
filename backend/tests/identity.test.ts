import mongoose from 'mongoose';
import { KitService } from '../src/services/kit.service';

const mockExtraction = { extractRequirements: jest.fn() };
const mockRetrieval = { fetchPage: jest.fn() };
const mockDiscovery = { rankLinks: jest.fn() };
const mockGeneration = {
  generateCompanyBrief: jest.fn(),
  generateRoleBreakdown: jest.fn(),
  generateQuestions: jest.fn(),
  generateFlashcards: jest.fn()
};
const mockCoverage = { checkCoverage: jest.fn() };
const mockScheduling = { allocateSchedule: jest.fn() };
const mockDiscussion = {};

jest.mock('../src/models/Kit', () => ({
  Kit: {
    findById: jest.fn(),
    prototype: {
      save: jest.fn().mockResolvedValue(true),
      set: jest.fn()
    }
  }
}));

describe('Question Identity Tests', () => {
  let kitService: KitService;

  beforeEach(() => {
    kitService = new KitService(
      mockExtraction as any,
      mockRetrieval as any,
      mockDiscovery as any,
      mockGeneration as any,
      mockCoverage as any,
      mockScheduling as any,
      mockDiscussion as any
    );
  });

  it('TEST 1 & 2: A generated kit must have globally unique question IDs across all categories', async () => {
    // We mock the generation returning overlapping LLM IDs like q-1, q-2 for different categories
    mockExtraction.extractRequirements.mockResolvedValue([{ id: 'r1', text: 'req1', kind: 'technical', priority: 'must' }]);
    mockGeneration.generateQuestions.mockImplementation((reqs, cat) => Promise.resolve([
      { id: 'q-1', category: cat, requirement_ids: ['r1'], prompt: 'Q1', answer_outline: 'A1', difficulty: 1 },
      { id: 'q-2', category: cat, requirement_ids: ['r1'], prompt: 'Q2', answer_outline: 'A2', difficulty: 1 }
    ]));
    mockGeneration.generateFlashcards.mockResolvedValue([{ id: 'f-1', front: 'F1', back: 'B1', requirement_ids: ['r1'] }]);
    mockCoverage.checkCoverage.mockReturnValue([]);
    mockScheduling.allocateSchedule.mockReturnValue({ days_available: 5, days: [] });
    mockGeneration.generateCompanyBrief.mockResolvedValue({ summary: 'S', what_they_do: 'W', sources: [] });
    mockGeneration.generateRoleBreakdown.mockResolvedValue({ title: 'T', seniority: 'S', responsibilities: [] });
    mockRetrieval.fetchPage.mockResolvedValue({ text: '', links: [] });
    mockDiscovery.rankLinks.mockReturnValue([]);

    const mockKitDoc = {
      _id: new mongoose.Types.ObjectId(),
      save: jest.fn(),
      set: jest.fn(data => {
        const qIds = data.questions.map((q: any) => q.id);
        const uniqueQIds = new Set(qIds);
        expect(qIds.length).toBe(8); // 4 categories * 2 questions each
        expect(uniqueQIds.size).toBe(8); // All IDs must be unique
        
        // TEST 10: Requirement IDs must remain valid
        expect(data.questions[0].requirement_ids).toContain('r1');
      })
    };
    require('../src/models/Kit').Kit.findById.mockResolvedValue(mockKitDoc);

    await kitService.generateKit(new mongoose.Types.ObjectId().toString(), 'test jd', 'http://example.com', 5, mockKitDoc._id.toString());
  });

  it('TEST 8 & 10: Regenerating missing questions must not duplicate existing IDs', async () => {
    const existingQ1Id = new mongoose.Types.ObjectId().toString();
    const existingQ2Id = new mongoose.Types.ObjectId().toString();

    const mockKit = {
      role: { requirements: [{ id: 'r1' }, { id: 'r2' }] },
      questions: [
        { id: existingQ1Id, source: 'manual', requirement_ids: ['r1'], prompt: 'Q1', answer_outline: 'A1', category: 'technical', difficulty: 1 },
        { id: existingQ2Id, source: 'edited', requirement_ids: ['r2'], prompt: 'Q2', answer_outline: 'A2', category: 'technical', difficulty: 1 }
      ],
      flashcards: [],
      schedule: { days_available: 5, days: [] },
      save: jest.fn()
    };
    require('../src/models/Kit').Kit.findById.mockResolvedValue(mockKit);

    // Provide overlapping newly generated questions
    mockGeneration.generateQuestions.mockImplementation((reqs, cat) => Promise.resolve([
      { id: 'q-1', category: cat, requirement_ids: ['r1'], prompt: 'Q1', answer_outline: 'A1', difficulty: 1 }
    ]));

    mockCoverage.checkCoverage.mockReturnValue([]);
    mockScheduling.allocateSchedule.mockReturnValue({ days_available: 5, days: [] });
    mockGeneration.generateFlashcards.mockResolvedValue([{ id: 'f-1', front: 'F1', back: 'B1', requirement_ids: ['r1'] }]);

    const res = await kitService.regenerateKit('6ab4d0a0a756154559f9bd82');
    
    // We expect 2 original + (4 categories * 1 question) = 6 questions
    const qIds = res.questions.map((q: any) => q.id);
    const uniqueQIds = new Set(qIds);
    expect(qIds.length).toBe(6);
    expect(uniqueQIds.size).toBe(6);

    // Existing IDs must be preserved
    expect(qIds).toContain(existingQ1Id);
    expect(qIds).toContain(existingQ2Id);

    // TEST 10
    expect(res.questions.every((q: any) => q.requirement_ids && q.requirement_ids.length > 0)).toBe(true);
  });
});
