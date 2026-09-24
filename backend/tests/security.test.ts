import { RetrievalService } from '../src/services/retrieval.service';
import { KitService } from '../src/services/kit.service';
import { Kit } from '../src/models/Kit';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.setTimeout(900000);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 300000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Security & Adversarial Tests', () => {
  describe('RetrievalService SSRF Protection', () => {
    let retrieval: RetrievalService;

    beforeEach(() => {
      retrieval = new RetrievalService();
    });

    it('should block localhost URLs in production mode', async () => {
      await expect(retrieval.fetchPage('http://localhost:8080/admin')).rejects.toThrow(/Unsafe or invalid URL blocked/);
      await expect(retrieval.fetchPage('http://127.0.0.1/')).rejects.toThrow(/Unsafe or invalid URL blocked/);
    });

    it('should allow localhost URLs in evaluator mode', async () => {
      const evaluatorRetrieval = new RetrievalService({ allowLocalhost: true });
      // We mock axios for this test so it doesn't actually try to fetch localhost in the CI
      const axios = require('axios');
      jest.spyOn(axios, 'get').mockResolvedValueOnce({ status: 200, data: '<html><body>Mock</body></html>', headers: {'content-type':'text/html'} });
      const result = await evaluatorRetrieval.fetchPage('http://127.0.0.1:8080/company');
      expect(result.text).toBe('Mock');
    });

    it('should block internal IPs', async () => {
      await expect(retrieval.fetchPage('http://10.0.0.5/api')).rejects.toThrow(/Unsafe or invalid URL blocked/);
      await expect(retrieval.fetchPage('http://192.168.1.1/router')).rejects.toThrow(/Unsafe or invalid URL blocked/);
      await expect(retrieval.fetchPage('http://172.16.0.1/')).rejects.toThrow(/Unsafe or invalid URL blocked/);
      await expect(retrieval.fetchPage('http://172.31.255.255/')).rejects.toThrow(/Unsafe or invalid URL blocked/);
      await expect(retrieval.fetchPage('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/Unsafe or invalid URL blocked/);
      await expect(retrieval.fetchPage('http://[::1]/')).rejects.toThrow(/Unsafe or invalid URL blocked/);
    });

    it('should block non-http protocols', async () => {
      await expect(retrieval.fetchPage('file:///etc/passwd')).rejects.toThrow(/Unsafe or invalid URL blocked/);
      await expect(retrieval.fetchPage('ftp://example.com')).rejects.toThrow(/Unsafe or invalid URL blocked/);
    });

    it('should block redirects to private IPs', async () => {
      // Mock axios to return a redirect to a private IP
      const axios = require('axios');
      jest.spyOn(axios, 'get').mockRejectedValueOnce({
        response: {
          status: 302,
          headers: { location: 'http://169.254.169.254/latest/meta-data/' }
        }
      });
      // Use 8.8.8.8 to bypass initial DNS lookup blocking
      await expect(retrieval.fetchPage('http://8.8.8.8')).rejects.toThrow(/Unsafe or invalid URL blocked: http:\/\/169.254.169.254/);
    });

    it('should block redirects to localhost even if evaluator mode is off', async () => {
      const axios = require('axios');
      jest.spyOn(axios, 'get').mockRejectedValueOnce({
        response: {
          status: 302,
          headers: { location: 'http://127.0.0.1/' }
        }
      });
      await expect(retrieval.fetchPage('http://8.8.8.8')).rejects.toThrow(/Unsafe or invalid URL blocked: http:\/\/127.0.0.1/);
    });
  });

  describe('Regeneration Preservation', () => {
    it('should preserve edited and pinned content across regeneration', async () => {
      const kit = new Kit({
        userId: new mongoose.Types.ObjectId().toString(),
        generationStatus: 'completed',
        role: {
          title: 'Dev',
          requirements: [{ id: 'req-1', text: 'React', category: 'technical' }]
        },
        questions: [
          {
            id: 'q1',
            requirement_ids: ['req-1'],
            category: 'technical',
            prompt: 'Generated Q',
            answer_outline: 'A1',
            difficulty: 2,
            source: 'generated',
            pinned: false
          },
          {
            id: 'q2',
            requirement_ids: ['req-1'],
            category: 'technical',
            prompt: 'Edited Q',
            answer_outline: 'A2',
            difficulty: 2,
            source: 'edited', // SHOULD KEEP
            pinned: false
          },
          {
            id: 'q3',
            requirement_ids: ['req-1'],
            category: 'technical',
            prompt: 'Pinned Generated Q',
            answer_outline: 'A3',
            difficulty: 2,
            source: 'generated',
            pinned: true // SHOULD KEEP
          }
        ],
        flashcards: [],
        schedule: { days_available: 5, days: [] },
        coverage: { uncovered_requirement_ids: [], passes: 1 }
      });
      await kit.save();

      // Mock dependencies
      const kitService = new KitService(
        { extractRequirements: jest.fn() } as any,
        {} as any,
        {} as any,
        {
          generateQuestions: jest.fn().mockResolvedValue([{
            id: 'q_new',
            requirement_ids: ['req-1'],
            category: 'technical',
            prompt: 'New Generated Q',
            answer_outline: 'New A',
            difficulty: 2
          }]),
          generateFlashcards: jest.fn().mockResolvedValue([])
        } as any,
        { checkCoverage: jest.fn().mockReturnValue([]) } as any,
        { allocateSchedule: jest.fn().mockReturnValue({ days_available: 5, days: [] }) } as any,
        {} as any // DiscussionProvider mock
      );

      const regeneratedKit = await kitService.regenerateKit((kit._id as any).toString());

      // q2 and q3 must exist. q1 should be replaced by the new generated question.
      const qIds = regeneratedKit.questions.map((q: any) => q.id);
      expect(qIds).toContain('q2');
      expect(qIds).toContain('q3');
      expect(qIds).not.toContain('q1');
      expect(qIds).not.toContain('q_new'); // It should be rewritten to a unique ObjectId
      expect(qIds.length).toBe(6); // 2 retained + (4 categories * 1 generated question)
    });
  });
});
