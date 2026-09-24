import { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Interview Prep Kit',
  description: 'Generate personalized interview prep kits',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-gray-900 text-gray-100 min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <header className="border-b border-gray-800 p-4 sticky top-0 bg-gray-900 z-10">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              AI Interview Prep
            </Link>
            <Navigation />
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
