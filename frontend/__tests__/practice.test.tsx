import { render, screen, fireEvent, act } from '@testing-library/react';
import PracticeMode from '../src/app/kits/[id]/practice/page';
import { api } from '../src/lib/api';
import { useRouter } from 'next/navigation';

jest.mock('../src/lib/api', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn()
  }
}));

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '123' }),
  useRouter: () => ({ push: mockPush })
}));

describe('Practice Mode Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getMockKit = () => ({
    flashcards: [
      { id: 'f-1', front: 'Q1', back: 'A1', confidence: undefined },
      { id: 'f-2', front: 'Q2', back: 'A2', confidence: 'Good' },
      { id: 'f-3', front: 'Q3', back: 'A3', confidence: 'Hard' }
    ]
  });

  it('TEST 1: Renders first card, answer hidden, Previous disabled', async () => {
    (api.get as jest.Mock).mockResolvedValue(getMockKit());
    await act(async () => { render(<PracticeMode />); });

    // Weak card prioritization sorts Unanswered > Hard > Good. 
    // Unanswered = f-1 (weight 5), Hard = f-3 (weight 3), Good = f-2 (weight 2)
    // Sorted: f-1 (Q1), f-3 (Q3), f-2 (Q2)
    expect(await screen.findByText('Q1')).toBeInTheDocument();
    
    expect(screen.queryByText('A1')).not.toBeInTheDocument();
    expect(screen.queryByText('How confident are you?')).not.toBeInTheDocument();

    const prevButton = screen.getByText('Previous') as HTMLButtonElement;
    expect(prevButton.disabled).toBe(true);

    const nextButton = screen.getByText('Next Card') as HTMLButtonElement;
    expect(nextButton.disabled).toBe(false);
  });

  it('TEST 2: Reveal answer and show confidence', async () => {
    (api.get as jest.Mock).mockResolvedValue(getMockKit());
    await act(async () => { render(<PracticeMode />); });

    await screen.findByText('Q1');
    
    // Click card to reveal
    const card = screen.getByText('Q1').parentElement?.parentElement as HTMLElement;
    fireEvent.click(card);

    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('How confident are you?')).toBeInTheDocument();
    expect(screen.getByText('Again')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('TEST 3: Save confidence and navigate', async () => {
    const kit = getMockKit();
    (api.get as jest.Mock).mockResolvedValue(kit);
    (api.put as jest.Mock).mockResolvedValue({});
    
    await act(async () => { render(<PracticeMode />); });

    await screen.findByText('Q1');
    const card = screen.getByText('Q1').parentElement?.parentElement as HTMLElement;
    fireEvent.click(card);

    const goodBtn = screen.getByText('Good');
    await act(async () => {
      fireEvent.click(goodBtn);
    });

    expect(api.put).toHaveBeenCalledTimes(1);

    // Nav forward
    const nextButton = screen.getByText('Next Card');
    fireEvent.click(nextButton);

    // Sorted: Q1, Q3, Q2
    // So next is Q3
    expect(screen.getByText('Q3')).toBeInTheDocument();
    const prevButton = screen.getByText('Previous') as HTMLButtonElement;
    expect(prevButton.disabled).toBe(false);

    // Nav back
    fireEvent.click(prevButton);
    expect(screen.getByText('Q1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Q1').parentElement?.parentElement as HTMLElement); // Reveal

    // Verify Good is selected (has ring-2 class)
    const activeGoodBtn = screen.getByText('Good');
    expect(activeGoodBtn.className).toContain('bg-blue-600');
  });

  it('TEST 4: Finish Practice boundary', async () => {
    const kit = {
      flashcards: [
        { id: 'f-1', front: 'Q1', back: 'A1', confidence: undefined }
      ]
    };
    (api.get as jest.Mock).mockResolvedValue(kit);
    await act(async () => { render(<PracticeMode />); });

    await screen.findByText('Q1');
    
    // Should say Finish Practice since it's the last card
    const finishBtn = screen.getByText('Finish Practice');
    expect(finishBtn).toBeInTheDocument();
    expect(screen.queryByText('Next Card')).not.toBeInTheDocument();

    const prevButton = screen.getByText('Previous') as HTMLButtonElement;
    expect(prevButton.disabled).toBe(true);

    fireEvent.click(finishBtn);
    expect(mockPush).toHaveBeenCalledWith('/kits/123');
  });
});
