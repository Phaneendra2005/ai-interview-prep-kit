'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function KitDetails() {
  const { id } = useParams();
  const [kit, setKit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<{prompt: string, answer_outline: string}>({prompt: '', answer_outline: ''});
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  
  const saveQueue = useRef<Promise<any>>(Promise.resolve());
  const pendingSaves = useRef(0);
  const [backgroundSaving, setBackgroundSaving] = useState(false);

  useEffect(() => {
    async function fetchKit() {
      try {
        const data = await api.get(`/kits/${id}`);
        
        if (process.env.NODE_ENV === 'development' && data.questions) {
          const ids = new Set();
          const duplicates = new Set();
          data.questions.forEach((q: any) => {
            if (ids.has(q.id)) duplicates.add(q.id);
            ids.add(q.id);
          });
          if (duplicates.size > 0) {
            console.error('[KitValidation] Duplicate question IDs detected:\n' + Array.from(duplicates).join('\n'));
          }
        }
        
        setKit(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load kit');
      } finally {
        setLoading(false);
      }
    }
    fetchKit();
  }, [id]);

  const [saveEditsSuccess, setSaveEditsSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveEditsSuccess(false);
    try {
      const updated = await api.put(`/kits/${id}`, {
        company_brief: kit.company_brief,
        role: kit.role,
        questions: kit.questions,
        flashcards: kit.flashcards,
        schedule: kit.schedule
      });
      setKit(updated);
      setSaveEditsSuccess(true);
      setTimeout(() => setSaveEditsSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      await api.post(`/kits/${id}/regenerate`);
      window.location.reload(); // Quick hack: reload to see polling or new status
    } catch (err: any) {
      alert('Failed to regenerate: ' + err.message);
    }
  };

  const updateQuestion = (qId: string, field: string, value: any) => {
    setKit((prev: any) => ({
      ...prev,
      questions: prev.questions.map((q: any) => 
        q.id === qId ? { ...q, [field]: value, source: field === 'pinned' ? q.source : 'edited' } : q
      )
    }));
  };

  const deleteQuestion = async (qId: string) => {
    if (deletingQuestionId) return; // prevent concurrent deletes
    
    if (editingQuestionId === qId) {
      handleCancelEdit();
    }
    
    // Optimistic update
    const previousQuestions = [...kit.questions];
    const updatedQuestions = kit.questions.filter((q: any) => q.id !== qId);
    
    setKit((prev: any) => ({
      ...prev,
      questions: updatedQuestions
    }));
    setDeletingQuestionId(qId);
    
    try {
      const updated = await api.put(`/kits/${id}`, {
        company_brief: kit.company_brief,
        role: kit.role,
        questions: updatedQuestions,
        flashcards: kit.flashcards,
        schedule: kit.schedule
      });
      setKit(updated);
    } catch (err: any) {
      // Rollback
      setKit((prev: any) => ({
        ...prev,
        questions: previousQuestions
      }));
      alert('Failed to delete question: ' + err.message);
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleEditQuestion = (q: any) => {
    if (editingQuestionId && editingQuestionId !== q.id) {
      alert("Please save or cancel the currently editing question first.");
      return;
    }
    setEditingQuestionId(q.id);
    setDraftQuestion({ prompt: q.prompt, answer_outline: q.answer_outline });
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setDraftQuestion({ prompt: '', answer_outline: '' });
  };

  const handleSaveEdit = async () => {
    if (!draftQuestion.prompt?.trim() || !draftQuestion.answer_outline?.trim()) {
      alert('Question and Expected Answer are required.');
      return;
    }

    setSaving(true);
    try {
      const updatedQuestions = kit.questions.map((q: any) => 
        q.id === editingQuestionId 
          ? { ...q, prompt: draftQuestion.prompt, answer_outline: draftQuestion.answer_outline } 
          : q
      );
      
      const updated = await api.put(`/kits/${id}`, {
        company_brief: kit.company_brief,
        role: kit.role,
        questions: updatedQuestions,
        flashcards: kit.flashcards,
        schedule: kit.schedule
      });
      setKit(updated);
      
      const savedId = editingQuestionId;
      setEditingQuestionId(null);
      setDraftQuestion({ prompt: '', answer_outline: '' });
      
      setSaveSuccessId(savedId);
      setTimeout(() => setSaveSuccessId(null), 3000);
    } catch (err: any) {
      alert('Failed to save question: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const newQ = {
      id: `manual-${Date.now()}`,
      prompt: '',
      answer_outline: '',
      category: 'technical',
      difficulty: 2,
      source: 'manual',
      pinned: false,
      requirement_ids: [],
      isNew: true // custom frontend state flag
    };
    setKit((prev: any) => ({
      ...prev,
      questions: [newQ, ...prev.questions]
    }));
  };

  const saveIndividualQuestion = async (qId: string) => {
    const q = kit.questions.find((x: any) => x.id === qId);
    if (!q.prompt?.trim() || !q.answer_outline?.trim()) {
      alert('Question and Expected Answer are required.');
      return;
    }

    setSaving(true);
    try {
      // Remove isNew flag for persistence
      const updatedQuestions = kit.questions.map((x: any) => 
        x.id === qId ? { ...x, isNew: false } : x
      );
      
      const updated = await api.put(`/kits/${id}`, {
        company_brief: kit.company_brief,
        role: kit.role,
        questions: updatedQuestions,
        flashcards: kit.flashcards,
        schedule: kit.schedule
      });
      setKit(updated);
    } catch (err: any) {
      alert('Failed to save question: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const syncQuestions = (updatedQuestions: any[]) => {
    pendingSaves.current++;
    setBackgroundSaving(true);
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await api.put(`/kits/${id}`, { questions: updatedQuestions });
      } catch (err: any) {
        console.error('Background save failed:', err);
      } finally {
        pendingSaves.current--;
        if (pendingSaves.current === 0) {
          setBackgroundSaving(false);
          setSaveSuccessId('sync-success');
          setTimeout(() => setSaveSuccessId(null), 2000);
        }
      }
    });
  };

  const togglePinQuestion = (qId: string, pinned: boolean) => {
    setKit((prev: any) => {
      const updatedQuestions = prev.questions.map((q: any) => 
        q.id === qId ? { ...q, pinned, source: q.source } : q
      );
      syncQuestions(updatedQuestions);
      return { ...prev, questions: updatedQuestions };
    });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === kit.questions.length - 1) return;

    setKit((prev: any) => {
      const newQs = [...prev.questions];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      const temp = newQs[index];
      newQs[index] = newQs[swapIdx];
      newQs[swapIdx] = temp;
      syncQuestions(newQs);
      return { ...prev, questions: newQs };
    });
  };

  if (loading) return <div className="p-4">Loading kit...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;
  if (!kit) return <div className="p-4">Kit not found.</div>;

  return (
    <div className="flex flex-col gap-8 p-4">
      {kit.generationStatus !== 'completed' && kit.generationStatus !== 'failed' && (
        <div className="bg-blue-900/50 p-4 rounded-md border border-blue-500 text-blue-200 flex justify-between items-center">
          <div>
            <strong>Regenerating:</strong> {kit.generationProgress?.replace(/_/g, ' ')}...
          </div>
          <button onClick={() => window.location.reload()} className="underline hover:text-white">Refresh</button>
        </div>
      )}

      <div className="flex justify-between items-center bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div>
          <h2 className="text-3xl font-bold">{kit.role?.title || 'Unknown Role'} at {kit.source?.company || 'Unknown Company'}</h2>
          <p className="text-gray-400 mt-2">Generated on {new Date(kit.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-4 items-center">
          {saving && <span className="text-sm text-blue-400 animate-pulse">Saving...</span>}
          {backgroundSaving && <span className="text-sm text-yellow-400 animate-pulse">Syncing...</span>}
          {saveEditsSuccess && !saving && <span className="text-sm text-green-400 font-bold">✓ Saved</span>}
          {saveSuccessId === 'sync-success' && !backgroundSaving && <span className="text-sm text-green-400 font-bold">✓ Synced</span>}
          <button 
            onClick={handleRegenerate}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            Regenerate Missing
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            Save Edits
          </button>
          <a 
            href={`/kits/${id}/practice`} 
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            Practice
          </a>
        </div>
      </div>

      {kit.schedule && kit.schedule.days && kit.schedule.days.length > 0 && (
        <section className="bg-gray-800/30 p-6 rounded-lg border border-gray-700 flex flex-col gap-4">
          <h3 className="text-2xl font-bold">5-Day Interview Preparation Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            {kit.schedule.days.map((day: any, i: number) => (
              <div key={day.day || i} className="bg-gray-900 p-4 rounded-md border border-gray-700 flex flex-col gap-2">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                  <h4 className="font-bold text-lg text-blue-400">Day {day.day}</h4>
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{day.minutes} mins</span>
                </div>
                {day.question_ids && day.question_ids.length > 0 ? (
                  <ul className="text-sm flex flex-col gap-2 text-gray-300">
                    {day.question_ids.map((qId: string) => {
                      const q = kit.questions?.find((x: any) => x.id === qId);
                      return (
                        <li key={qId} className="flex gap-2 items-start">
                          <span className="text-blue-500 mt-1 text-xs">▹</span>
                          <span className="line-clamp-2" title={q ? q.prompt : 'Question unavailable'}>
                            {q ? q.prompt : <span className="text-red-400 italic">Question reference unavailable</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No questions assigned.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-gray-800/30 p-6 rounded-lg border border-gray-700 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">Questions Builder</h3>
          <button 
            onClick={addQuestion}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded transition-colors text-sm"
          >
            + Add Question
          </button>
        </div>
        
        {kit.questions?.map((q: any, i: number) => {
          const isEditing = editingQuestionId === q.id;
          const isNew = q.isNew;
          
          return (
          <div key={q.id} className={`p-4 rounded-md border flex flex-col gap-2 ${isNew ? 'bg-blue-900/20 border-blue-500/50' : isEditing ? 'bg-gray-800 border-blue-400' : 'bg-gray-900 border-gray-700'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-xs uppercase font-bold ${isNew ? 'text-blue-400' : 'text-purple-400'}`}>
                {q.category} • {q.source} {isNew && '• UNSAVED'} {isEditing && '• EDITING'}
              </span>
              <div className="flex gap-2">
                {!isNew && !isEditing && (
                  <>
                    <button 
                      onClick={() => moveQuestion(i, 'up')}
                      disabled={i === 0}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded"
                    >
                      ↑
                    </button>
                    <button 
                      onClick={() => moveQuestion(i, 'down')}
                      disabled={i === kit.questions.length - 1}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded"
                    >
                      ↓
                    </button>
                    <button 
                      onClick={() => togglePinQuestion(q.id, !q.pinned)}
                      className={`text-xs px-2 py-1 rounded ${q.pinned ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      {q.pinned ? 'Pinned' : 'Pin'}
                    </button>
                    <button
                      onClick={() => handleEditQuestion(q)}
                      className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded font-medium"
                    >
                      Edit
                    </button>
                  </>
                )}
                
                {isEditing && (
                  <>
                    <button 
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-medium disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
                
                {isNew && (
                  <button 
                    onClick={() => saveIndividualQuestion(q.id)}
                    disabled={saving}
                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Question'}
                  </button>
                )}
                
                {(!isEditing || isNew) && (
                  <button 
                    onClick={() => deleteQuestion(q.id)}
                    disabled={deletingQuestionId === q.id}
                    className="text-xs px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 rounded disabled:opacity-50"
                  >
                    {deletingQuestionId === q.id ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                
                {saveSuccessId === q.id && !isEditing && (
                  <span className="text-xs text-green-400 font-bold px-2 py-1">✓ Saved</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1 mt-2">
              <label className="text-xs text-gray-500 uppercase font-bold">Question</label>
              {(isEditing || isNew) ? (
                <input 
                  value={isEditing ? draftQuestion.prompt : q.prompt} 
                  onChange={(e) => isEditing ? setDraftQuestion(prev => ({...prev, prompt: e.target.value})) : updateQuestion(q.id, 'prompt', e.target.value)}
                  placeholder="Enter interview question..."
                  className={`font-medium text-gray-200 bg-gray-800 rounded outline-none p-2 w-full ${(!isEditing && isNew && !q.prompt?.trim()) || (isEditing && !draftQuestion.prompt?.trim()) ? 'border border-red-500/50' : 'border border-gray-600 focus:border-blue-500'}`} 
                />
              ) : (
                <div className="font-medium text-gray-200 py-1 w-full">
                  {q.prompt}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-1 mt-2">
              <label className="text-xs text-gray-500 uppercase font-bold">Expected Answer</label>
              {(isEditing || isNew) ? (
                <textarea 
                  value={isEditing ? draftQuestion.answer_outline : q.answer_outline} 
                  onChange={(e) => isEditing ? setDraftQuestion(prev => ({...prev, answer_outline: e.target.value})) : updateQuestion(q.id, 'answer_outline', e.target.value)}
                  placeholder="Enter the expected answer or evaluation points..."
                  className={`p-3 bg-gray-800 rounded text-sm text-gray-300 outline-none w-full min-h-[80px] ${(!isEditing && isNew && !q.answer_outline?.trim()) || (isEditing && !draftQuestion.answer_outline?.trim()) ? 'border border-red-500/50' : 'border border-gray-600 focus:border-blue-500'}`} 
                />
              ) : (
                <div className="p-3 bg-gray-800/50 rounded text-sm text-gray-300 border-l-4 border-gray-600 w-full min-h-[40px] whitespace-pre-wrap">
                  {q.answer_outline}
                </div>
              )}
            </div>
          </div>
          );
        })}
      </section>
    </div>
  );
}
