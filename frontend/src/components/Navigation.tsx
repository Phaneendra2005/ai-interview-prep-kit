'use client';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const router = useRouter();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/logout');
      router.push('/');
    } catch (err) {
      console.error('Logout failed', err);
      // Fallback
      router.push('/');
    }
  };

  return (
    <nav className="flex space-x-4">
      <Link href="/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link>
      <a href="#" onClick={handleLogout} className="hover:text-blue-400 transition-colors">Logout</a>
    </nav>
  );
}
