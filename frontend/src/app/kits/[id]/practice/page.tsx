'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function PracticeMode() {
  const { id } = useParams();
  const router = useRouter();
  const [kit, setKit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get(`/kits/${id}`);
        setKit(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Weak card prioritization: sort cards by confidence (Again > Hard > Good > Easy > Unanswered)
  // BUT: "Practice prioritization must only affect the practice session. DO NOT permanently reorder the saved Questions Builder list."
  // Wait, the prompt said: "If weak-card prioritization already exists, connect the new confidence state to it instead of creating duplicate logic."
  // It does NOT exist yet. "If confidence levels are ... then weaker cards should have higher practice priority ... Conceptually: Again = highest ... BUT DO NOT permanently reorder"
  
  const practiceCards = useMemo(() => {
    if (!kit || !kit.flashcards) return [];
    
    // Check if we already tagged them with an initial sort order
    // to prevent jumping around while practicing
    if (!kit._initialSortDone) {
      const confidenceWeight: Record<string, number> = { Again: 4, Hard: 3, Good: 2, Easy: 1 };
      
      const sorted = [...kit.flashcards].sort((a, b) => {
        const aWeight = a.confidence ? confidenceWeight[a.confidence] : 5;
        const bWeight = b.confidence ? confidenceWeight[b.confidence] : 5;
        return bWeight - aWeight;
      });
      
      // Store the sorted IDs to maintain order during the session
      kit._sortedIds = sorted.map(f => f.id);
      kit._initialSortDone = true;
    }
    
    // Map the sorted IDs back to the actual updated flashcards
    return kit._sortedIds.map((id: string) => kit.flashcards.find((f: any) => f.id === id)).filter(Boolean);
  }, [kit]);

  if (loading) return <div className="p-4">Loading practice mode...</div>;
  if (!practiceCards || practiceCards.length === 0) return <div className="p-4">No practice cards available.</div>;

  const currentCard = practiceCards[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === practiceCards.length - 1;

  const nextCard = () => {
    if (!isLast) {
      setShowAnswer(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (!isFirst) {
      setShowAnswer(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleConfidence = async (level: string) => {
    if (savingId === currentCard.id) return; // Prevent duplicate submissions

    setSavingId(currentCard.id);
    
    // Update local state immediately
    const updatedFlashcards = kit.flashcards.map((f: any) => 
      f.id === currentCard.id ? { ...f, confidence: level } : f
    );

    setKit({ ...kit, flashcards: updatedFlashcards });

    try {
      await api.put(`/kits/${id}`, {
        company_brief: kit.company_brief,
        role: kit.role,
        questions: kit.questions,
        flashcards: updatedFlashcards,
        schedule: kit.schedule
      });
    } catch (err: any) {
      alert('Failed to save confidence: ' + err.message);
    } finally {
      setTimeout(() => setSavingId(null), 500); // Show "Saved" briefly
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <h2 className="text-3xl font-bold mb-8">Practice Mode</h2>
      
      <div 
        className="w-full max-w-2xl min-h-[300px] bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 flex flex-col justify-center items-center text-center cursor-pointer hover:border-blue-500 transition-colors"
        onClick={() => { if (!showAnswer) setShowAnswer(true); }}
      >
        {!showAnswer ? (
          <div className="flex flex-col gap-4">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Question</span>
            <p className="text-2xl font-medium text-gray-100">{currentCard.front}</p>
            <span className="text-xs text-gray-600 mt-8">Click to reveal answer</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">Answer</span>
            <p className="text-xl text-gray-300">{currentCard.back}</p>
            
            <div className="mt-8 border-t border-gray-700 pt-6 w-full">
              <span className="text-sm font-bold text-gray-400 block mb-4">How confident are you?</span>
              <div className="flex justify-center gap-4 flex-wrap">
                {['Again', 'Hard', 'Good', 'Easy'].map(level => {
                  const isSelected = currentCard.confidence === level;
                  return (
                    <button
                      key={level}
                      disabled={savingId === currentCard.id}
                      onClick={(e) => { e.stopPropagation(); handleConfidence(level); }}
                      className={`px-4 py-2 rounded-full font-bold transition-colors text-sm ${
                        isSelected 
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      } ${savingId === currentCard.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
              {savingId === currentCard.id && <div className="text-xs text-blue-400 mt-2">Saving...</div>}
              {savingId !== currentCard.id && currentCard.confidence && <div className="text-xs text-green-400 mt-2">Saved</div>}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-8 mt-12 items-center">
        <button 
          onClick={prevCard}
          disabled={isFirst}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-full font-bold transition-colors"
        >
          Previous
        </button>
        <span className="flex items-center text-gray-400 font-medium min-w-[80px] justify-center">
          {currentIndex + 1} / {practiceCards.length}
        </span>
        {isLast ? (
          <button 
            onClick={() => router.push(`/kits/${id}`)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold transition-colors shadow-lg shadow-green-900/20"
          >
            Finish Practice
          </button>
        ) : (
          <button 
            onClick={nextCard}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-colors shadow-lg shadow-blue-900/20"
          >
            Next Card
          </button>
        )}
      </div>

      <button onClick={() => router.push(`/kits/${id}`)} className="mt-12 text-gray-500 hover:text-white underline">Back to Kit Builder</button>
    </div>
  );
}
