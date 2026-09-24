'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function Dashboard() {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadKits() {
      try {
        const data = await api.get('/kits');
        setKits(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load kits');
      } finally {
        setLoading(false);
      }
    }
    loadKits();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Your Kits</h2>
        <a 
          href="/kits/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Create New Kit
        </a>
      </div>

      {error && <div className="bg-red-900/50 text-red-200 p-3 rounded">{error}</div>}

      {loading ? (
        <div className="text-gray-400">Loading kits...</div>
      ) : kits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-gray-800 rounded-lg bg-gray-800/50">
          <p className="text-gray-400 mb-4">You don't have any interview prep kits yet.</p>
          <a href="/kits/new" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">Get Started</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map((kit) => (
            <a key={kit._id} href={`/kits/${kit._id}`} className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors flex flex-col gap-2 shadow-lg">
              <h3 className="text-xl font-bold">{kit.role?.title || 'Unknown Role'}</h3>
              <p className="text-gray-400">{kit.source?.company || 'Unknown Company'}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                  kit.generationStatus === 'completed' ? 'bg-green-900 text-green-300' :
                  kit.generationStatus === 'failed' ? 'bg-red-900 text-red-300' :
                  'bg-yellow-900 text-yellow-300'
                }`}>
                  {kit.generationStatus}
                </span>
                <span className="text-sm text-gray-500">{new Date(kit.createdAt).toLocaleDateString()}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
