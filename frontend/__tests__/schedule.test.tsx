import { render, screen, act, fireEvent } from '@testing-library/react';
import KitDetails from '../src/app/kits/[id]/page';
import { api } from '../src/lib/api';

jest.mock('../src/lib/api', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn()
  }
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '123' })
}));

describe('Schedule UI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getMockKit = () => ({
    role: { title: 'Engineer' },
    source: { company: 'Acme' },
    generationStatus: 'completed',
    createdAt: new Date().toISOString(),
    questions: [
      { id: 'uuid-1', prompt: 'Q1' },
      { id: 'uuid-2', prompt: 'Q2' }
    ],
    schedule: {
      days: [
        { day: 1, minutes: 60, question_ids: ['uuid-1', 'uuid-2'] },
        { day: 2, minutes: 45, question_ids: ['uuid-2'] },
        { day: 3, minutes: 120, question_ids: ['invalid-id'] },
        { day: 4, minutes: 30, question_ids: [] },
        { day: 5, minutes: 90, question_ids: ['uuid-1'] }
      ]
    }
  });

  it('TEST 1: API response contains schedule and exactly 5 days are rendered', async () => {
    (api.get as jest.Mock).mockResolvedValue(getMockKit());
    await act(async () => { render(<KitDetails />); });

    expect(screen.getByText('5-Day Interview Preparation Schedule')).toBeInTheDocument();
    
    // Check days 1 to 5
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Day ${i}`)).toBeInTheDocument();
    }
  });

  it('TEST 2: Each day displays actual minutes and question references resolve safely', async () => {
    (api.get as jest.Mock).mockResolvedValue(getMockKit());
    await act(async () => { render(<KitDetails />); });

    // Minutes
    expect(screen.getByText('60 mins')).toBeInTheDocument();
    expect(screen.getByText('45 mins')).toBeInTheDocument();
    expect(screen.getByText('120 mins')).toBeInTheDocument();
    expect(screen.getByText('30 mins')).toBeInTheDocument();
    expect(screen.getByText('90 mins')).toBeInTheDocument();

    // References
    const q1Elements = screen.getAllByText('Q1');
    expect(q1Elements.length).toBeGreaterThanOrEqual(1);

    // Day 3 has 'invalid-id'
    expect(screen.getByText('Question reference unavailable')).toBeInTheDocument();

    // Day 4 has empty list
    expect(screen.getByText('No questions assigned.')).toBeInTheDocument();
  });

  it('TEST 3: Save Edits does not drop or remove schedule', async () => {
    const kit = getMockKit();
    (api.get as jest.Mock).mockResolvedValue(kit);
    await act(async () => { render(<KitDetails />); });

    (api.put as jest.Mock).mockResolvedValue(kit);
    
    const saveButton = screen.getByText('Save Edits');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    const putCall = (api.put as jest.Mock).mock.calls[0][1];
    expect(putCall.schedule).toBeDefined();
    expect(putCall.schedule.days.length).toBe(5);
  });
});
