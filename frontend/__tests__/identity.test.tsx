import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('Questions Builder Identity Tests', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  const getMockKit = () => ({
    role: { title: 'Engineer' },
    source: { company: 'Acme' },
    generationStatus: 'completed',
    createdAt: new Date().toISOString(),
    questions: [
      { id: 'uuid-1', category: 'technical', prompt: 'Q1', answer_outline: 'A1', source: 'generated', pinned: false, requirement_ids: ['r1'] },
      { id: 'uuid-2', category: 'behavioural', prompt: 'Q2', answer_outline: 'A2', source: 'generated', pinned: false, requirement_ids: ['r2'] }
    ]
  });

  it('TEST 11: The Questions Builder should render without duplicate React key warnings', async () => {
    (api.get as jest.Mock).mockResolvedValue(getMockKit());
    await act(async () => { render(<KitDetails />); });

    // Assert NO "Encountered two children with the same key"
    const calls = (console.error as jest.Mock).mock.calls;
    const hasDuplicateKeyWarning = calls.some(call => 
      typeof call[0] === 'string' && call[0].includes('Encountered two children with the same key')
    );
    expect(hasDuplicateKeyWarning).toBe(false);
  });

  it('TEST 3: Adding a question must produce an ID not already present', async () => {
    const kit = getMockKit();
    (api.get as jest.Mock).mockResolvedValue(kit);
    await act(async () => { render(<KitDetails />); });

    const addButton = await screen.findByText('+ Add Question');
    fireEvent.click(addButton);

    // The new question has an empty prompt, so we can't find it by 'New Question?'
    // But we know there are 3 question elements total, and 3 category headers or 3 textareas.
    // We know there are 3 question elements total.
    const newInputs = screen.getAllByPlaceholderText(/Enter interview question.../);
    expect(newInputs.length).toBe(3);

    // The new question is prepended to the list, so it's the first one.
    // Give it a prompt so it can save
    fireEvent.change(newInputs[0], { target: { value: 'New Test Question' } });

    const newOutline = screen.getAllByPlaceholderText(/Enter the expected answer/);
    fireEvent.change(newOutline[0], { target: { value: 'New Test Answer' } });

    // Save and check API payload (it uses Save Question now for new questions)
    (api.put as jest.Mock).mockResolvedValue(kit);
    const saveQButton = screen.getByText('Save Question');
    fireEvent.click(saveQButton);

    const putCall = (api.put as jest.Mock).mock.calls[0][1];
    const newQs = putCall.questions;
    expect(newQs.length).toBe(3);
    const ids = new Set(newQs.map((q: any) => q.id));
    expect(ids.size).toBe(3);
    expect(newQs[0].id).toContain('manual-');
  });

  it('TEST 4: Deleting a question must not cause another question to reuse its ID', async () => {
    (api.get as jest.Mock).mockResolvedValue(getMockKit());
    await act(async () => { render(<KitDetails />); });

    const deleteButtons = await screen.findAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    (api.put as jest.Mock).mockResolvedValue(getMockKit());
    fireEvent.click(screen.getByText('Save Edits'));

    const putCall = (api.put as jest.Mock).mock.calls[0][1];
    const newQs = putCall.questions;
    expect(newQs.length).toBe(1);
    expect(newQs[0].id).toBe('uuid-2'); // uuid-1 was deleted, uuid-2 remains
  });

  it('TEST 5: Reordering questions must preserve IDs', async () => {
    (api.get as jest.Mock).mockResolvedValue(getMockKit());
    await act(async () => { render(<KitDetails />); });

    const downButtons = await screen.findAllByText('↓');
    fireEvent.click(downButtons[0]); // Move Q1 down

    (api.put as jest.Mock).mockResolvedValue(getMockKit());
    fireEvent.click(screen.getByText('Save Edits'));

    const putCall = (api.put as jest.Mock).mock.calls[0][1];
    const newQs = putCall.questions;
    expect(newQs[0].id).toBe('uuid-2');
    expect(newQs[1].id).toBe('uuid-1');
  });

  it('TEST 6: Editing a question must preserve its ID', async () => {
    (api.get as jest.Mock).mockResolvedValue(getMockKit());
    await act(async () => { render(<KitDetails />); });

    const inputQ1 = await screen.findByDisplayValue('Q1');
    fireEvent.change(inputQ1, { target: { value: 'Q1 Edited' } });

    (api.put as jest.Mock).mockResolvedValue(getMockKit());
    fireEvent.click(screen.getByText('Save Edits'));

    const putCall = (api.put as jest.Mock).mock.calls[0][1];
    const newQs = putCall.questions;
    expect(newQs[0].id).toBe('uuid-1');
    expect(newQs[0].prompt).toBe('Q1 Edited');
  });

  it('TEST 9: Refreshing/reloading a saved kit must preserve question IDs', async () => {
    const kit = getMockKit();
    kit.questions.push({
      id: 'manual-12345',
      category: 'technical',
      prompt: 'Manual',
      answer_outline: 'A3',
      source: 'manual',
      pinned: true,
      requirement_ids: []
    });
    
    (api.get as jest.Mock).mockResolvedValue(kit);
    await act(async () => { render(<KitDetails />); });

    // Assuming we successfully load it without validation error
    const calls = (console.error as jest.Mock).mock.calls;
    const validationError = calls.some(call => 
      typeof call[0] === 'string' && call[0].includes('[KitValidation]')
    );
    expect(validationError).toBe(false);

    (api.put as jest.Mock).mockResolvedValue(kit);
    fireEvent.click(screen.getByText('Save Edits'));

    const putCall = (api.put as jest.Mock).mock.calls[0][1];
    expect(putCall.questions.map((q: any) => q.id)).toEqual(['uuid-1', 'uuid-2', 'manual-12345']);
  });
});
