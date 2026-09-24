import { validateKit } from '../src/utils/kit.validator';

describe('Kit Validator', () => {
  it('should validate a correct kit structure', () => {
    const validKit = {
      source: {
        company: 'Acme',
        company_url: 'http://acme.com',
        role: 'Dev',
        location: 'Remote',
        jd_chars: 100,
        researched_at: '2023-01-01T00:00:00.000Z',
        pages_used: ['http://acme.com']
      },
      company_brief: {
        summary: 'Brief',
        what_they_do: 'Stuff',
        sources: []
      },
      role: {
        title: 'Dev',
        seniority: 'Senior',
        responsibilities: ['Code'],
        requirements: [{ id: 'r1', text: 'React', kind: 'technical', priority: 'must' }]
      },
      questions: [{
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'How to react?',
        answer_outline: 'Hooks',
        difficulty: 2,
        source: 'generated',
        pinned: false
      }],
      flashcards: [{
        id: 'f1',
        front: 'Q',
        back: 'A',
        requirement_ids: ['r1'],
        source: 'generated',
        pinned: false
      }],
      schedule: {
        days_available: 5,
        days: [{
          day: 1,
          focus: 'Technical Focus',
          question_ids: ['q1'],
          minutes: 30
        }]
      },
      coverage: {
        uncovered_requirement_ids: [],
        passes: 1
      }
    };

    expect(() => validateKit(validKit)).not.toThrow();
  });

  it('should reject missing fields', () => {
    const invalidKit = {
      // missing everything
    };
    expect(() => validateKit(invalidKit)).toThrow();
  });
});
