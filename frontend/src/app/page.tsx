'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full mt-10">
      <div className="max-w-4xl w-full text-center space-y-8 p-8">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 pb-2">
          Ace Your Next Interview
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light">
          Generate highly personalized technical interview prep kits tailored to your specific role and company. 
          Stop guessing, start preparing.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
          <button 
            onClick={() => router.push('/register')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105"
          >
            Get Started Free
          </button>
          <button 
            onClick={() => router.push('/login')}
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-full font-bold text-lg border border-gray-700 transition-all"
          >
            Log In
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
          <div className="p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <div className="text-blue-400 mb-4 text-3xl">🎯</div>
            <h3 className="text-xl font-bold text-gray-100 mb-2">Targeted Extraction</h3>
            <p className="text-gray-400">We analyze your job description to extract the exact must-have requirements the employer is looking for.</p>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <div className="text-purple-400 mb-4 text-3xl">🔍</div>
            <h3 className="text-xl font-bold text-gray-100 mb-2">Company Research</h3>
            <p className="text-gray-400">Our engine dynamically crawls the company website and public discussions to understand their interview style.</p>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <div className="text-green-400 mb-4 text-3xl">⚡</div>
            <h3 className="text-xl font-bold text-gray-100 mb-2">Smart Generation</h3>
            <p className="text-gray-400">Get technical questions, conceptual flashcards, and a personalized study schedule covering 100% of requirements.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
