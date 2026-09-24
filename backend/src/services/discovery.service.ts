import { URL } from 'url';

export class LinkDiscoveryService {
  /**
   * Ranks links based on relevance to career/interview keywords.
   */
  rankLinks(links: string[], originDomain: string): string[] {
    const scoredLinks = links.map(link => {
      let score = 0;
      const lowerLink = link.toLowerCase();

      // Prefer same domain
      try {
        const parsed = new URL(link);
        if (parsed.hostname === originDomain) {
          score += 10;
        } else {
          score -= 5;
        }
      } catch {
        // Ignored
      }

      // Keywords in URL
      const positiveKeywords = ['career', 'job', 'hiring', 'interview', 'about', 'team', 'engineering', 'culture'];
      positiveKeywords.forEach(kw => {
        if (lowerLink.includes(kw)) {
          score += 20;
        }
      });

      // Penalize unlikely pages
      const negativeKeywords = ['login', 'signup', 'forgot', 'terms', 'privacy', 'blog', 'press'];
      negativeKeywords.forEach(kw => {
        if (lowerLink.includes(kw)) {
          score -= 20;
        }
      });

      return { link, score };
    });

    // Sort descending by score
    scoredLinks.sort((a, b) => b.score - a.score);

    return scoredLinks.map(l => l.link);
  }
}
