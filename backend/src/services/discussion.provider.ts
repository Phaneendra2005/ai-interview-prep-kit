import { RetrievalService } from './retrieval.service';
import * as cheerio from 'cheerio';

export interface PublicDiscussionFinding {
  source_url: string;
  snippet: string;
}

export interface PublicDiscussionResult {
  sources: string[];
  findings: PublicDiscussionFinding[];
  searched: boolean;
  error: string | null;
}

export class DiscussionProvider {
  constructor(private retrieval: RetrievalService) {}

  async searchPublicDiscussions(companyName: string): Promise<PublicDiscussionResult> {
    try {
      const query = encodeURIComponent(`site:reddit.com OR site:news.ycombinator.com "${companyName}" interview`);
      const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
      
      const { text, links } = await this.retrieval.fetchPage(searchUrl);
      
      // We need raw HTML to extract snippets properly from DDG HTML, 
      // but fetchPage strips out most tags and returns raw text for safety.
      // Actually, since DDG html is well-structured, we can fetch it separately to parse results.
      // But fetchPage() in RetrievalService returns clean text and absolute links.
      // Let's use it for the links at least, and find reddit/HN links.
      
      const discussionLinks = links.filter(l => l.includes('reddit.com') || l.includes('ycombinator.com'));
      const uniqueLinks = [...new Set(discussionLinks)].slice(0, 3); // top 3 results

      if (uniqueLinks.length === 0) {
        return {
          sources: [],
          findings: [],
          searched: true,
          error: null
        };
      }

      // Try fetching the individual threads (capped at 3 to prevent timeouts)
      const findings: PublicDiscussionFinding[] = [];
      for (const link of uniqueLinks) {
        try {
          const page = await this.retrieval.fetchPage(link);
          // Just grab the first 300 chars as a snippet
          const snippet = page.text.substring(0, 300) + '...';
          findings.push({ source_url: link, snippet });
        } catch (e) {
          console.warn(`Failed to fetch discussion link ${link}`);
        }
      }

      return {
        sources: uniqueLinks,
        findings,
        searched: true,
        error: null
      };

    } catch (error: any) {
      console.warn(`PublicDiscussionProvider search failed: ${error.message}`);
      return {
        sources: [],
        findings: [],
        searched: true, // We tried
        error: error.message
      };
    }
  }
}
