'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function NewKit() {
  const [jdText, setJdText] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string, code?: string } | null>(null);
  const [pollStatus, setPollStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPollStatus('Submitting request...');

    try {
      if (!jdText.trim()) throw new Error('Job description is required');
      if (!companyUrl.trim() || !companyUrl.startsWith('http')) throw new Error('Valid company URL is required');
      if (days < 1 || days > 60) throw new Error('Days must be between 1 and 60');

      const response = await api.post('/kits', { jdText, companyUrl, days });
      const kitId = response.id;

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const kit = await api.get(`/kits/${kitId}/status`);
          setPollStatus(`Processing: ${kit.progress.replace(/_/g, ' ')}...`);
          
          if (kit.status === 'completed') {
            clearInterval(pollInterval);
            window.location.href = `/kits/${kitId}`;
          } else if (kit.status === 'failed') {
            clearInterval(pollInterval);
            setError({ message: kit.error || 'Generation failed', code: kit.errorCode });
            setLoading(false);
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setError({ message: pollErr.message || 'Lost connection to generation status' });
          setLoading(false);
        }
      }, 3000);

    } catch (err: any) {
      setError({ message: err.message || 'Failed to create kit' });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-6 w-full">
      <h2 className="text-3xl font-bold tracking-tight">Create Interview Kit</h2>
      <p className="text-gray-400">Generate a personalized preparation plan based on the job description and company details.</p>

      {error && (
        <div className={`p-4 rounded-md border flex flex-col gap-2 ${
          error.code?.startsWith('AI_PROVIDER') ? 'bg-orange-900/40 border-orange-500 text-orange-200' : 
          'bg-red-900/50 border-red-500 text-red-200'
        }`}>
          <div className="flex items-center gap-2 font-bold">
            <span className="text-xl">⚠️</span>
            <span>{error.code ? `Error: ${error.code.replace(/_/g, ' ')}` : 'Error'}</span>
          </div>
          <p className="text-sm">{error.message}</p>
          {error.code === 'AI_PROVIDER_QUOTA_EXHAUSTED' && (
            <p className="text-xs opacity-80 mt-1">
              Tip: The free tier of Gemini AI limits requests. Please try again later, or configure a different GEMINI_MODEL in the backend.
            </p>
          )}
          {error.code === 'GEN_FAILED' && error.message.includes('experiencing high demand') && (
            <p className="text-xs opacity-80 mt-1">
              Tip: The AI model is temporarily overloaded (HTTP 503). This is common on free tiers. Please try again in a few minutes.
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-gray-800/30 p-6 rounded-lg border border-gray-700 shadow-xl">
        <div className="flex flex-col gap-2">
          <label htmlFor="jd" className="font-medium text-gray-200">Job Description</label>
          <textarea
            id="jd"
            rows={10}
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="Paste the full job description here..."
            disabled={loading}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="url" className="font-medium text-gray-200">Company Website URL</label>
          <input
            id="url"
            type="url"
            value={companyUrl}
            onChange={e => setCompanyUrl(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="https://company.com"
            disabled={loading}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="days" className="font-medium text-gray-200">Days until Interview</label>
          <input
            id="days"
            type="number"
            min={1}
            max={60}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all w-1/3"
            disabled={loading}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-blue-900/20 flex flex-col items-center justify-center"
        >
          {loading ? (
            <>
              <span className="animate-pulse">Generating Pipeline...</span>
              <span className="text-xs text-blue-200 mt-1">{pollStatus}</span>
            </>
          ) : 'Generate Prep Kit'}
        </button>
      </form>
    </div>
  );
}
