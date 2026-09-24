'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', { email, password });
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-full mt-20">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-700 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
        
        {error && <div className="bg-red-900/50 text-red-200 p-3 rounded">{error}</div>}

        <div>
          <label className="block text-gray-400 mb-1">Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-100" 
            required 
          />
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-100" 
            required 
          />
        </div>
        <button 
          type="submit" 
          disabled={loading} 
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
        <p className="text-sm text-gray-500 text-center mt-2">
          Already have an account? <a href="/login" className="text-blue-400 hover:underline">Log in</a>
        </p>
      </form>
    </div>
  );
}
