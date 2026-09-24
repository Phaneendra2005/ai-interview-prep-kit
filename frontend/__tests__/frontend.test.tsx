import { render, screen, waitFor } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import Home from '@/app/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
    };
  },
}));

describe('Frontend Verification', () => {
  it('Root route renders the intended application rather than starter content', () => {
    render(<Home />);
    
    // Should NOT contain Vercel starter text
    expect(screen.queryByText(/To get started, edit the/i)).not.toBeInTheDocument();
    
    // Should contain our AI Interview Prep Kit landing page text
    expect(screen.getByText(/Ace Your Next Interview/i)).toBeInTheDocument();
    expect(screen.getByText(/Targeted Extraction/i)).toBeInTheDocument();
  });

  it('Root layout imports global styles', () => {
    const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    expect(layoutContent).toMatch(/import\s+['"]\.\/globals\.css['"]/);
  });
});
