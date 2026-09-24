import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'dns/promises';
import { URL } from 'url';

import * as ipaddr from 'ipaddr.js';

export interface RetrievalPolicy {
  allowLocalhost: boolean;
}

export class RetrievalService {
  private policy: RetrievalPolicy;

  constructor(policy: RetrievalPolicy = { allowLocalhost: false }) {
    this.policy = policy;
  }

  private async isSafeUrl(targetUrl: string): Promise<boolean> {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

      const lookup = await dns.lookup(parsed.hostname);
      const ip = lookup.address;

      if (ipaddr.isValid(ip)) {
        const addr = ipaddr.parse(ip);
        const range = addr.range();

        // Check if internal/private/loopback
        const isInternal = range !== 'unicast' ||
                           ['private', 'uniqueLocal', 'loopback', 'linkLocal', 'multicast', 'broadcast', 'carrierGradeNat'].includes(range) ||
                           ip.startsWith('0.') ||
                           ip.startsWith('127.');

        if (isInternal) {
          if (this.policy.allowLocalhost && (range === 'loopback' || ip.startsWith('127.'))) {
            return true;
          }
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  async fetchPage(url: string): Promise<{ text: string; links: string[] }> {
    let currentUrl = url;
    let redirects = 0;
    const maxRedirects = 5;
    let responseData = '';
    let responseHeaders: any = {};

    while (redirects <= maxRedirects) {
      if (!(await this.isSafeUrl(currentUrl))) {
        throw new Error(`Unsafe or invalid URL blocked: ${currentUrl}`);
      }

      try {
        const response = await axios.get(currentUrl, {
          timeout: 10000,
          maxContentLength: 5 * 1024 * 1024, // 5MB limit
          headers: {
            'User-Agent': 'AI-Interview-Prep-Bot/1.0',
          },
          maxRedirects: 0, // We handle redirects manually
          validateStatus: (status) => status < 400 || (status >= 300 && status < 400),
        });

        if (response.status >= 300 && response.status < 400 && response.headers.location) {
          // It's a redirect
          currentUrl = new URL(response.headers.location, currentUrl).toString();
          redirects++;
          continue;
        }

        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}`);
        }

        responseData = response.data;
        responseHeaders = response.headers;
        break; // Success
      } catch (error: any) {
        if (error.response && error.response.status >= 300 && error.response.status < 400 && error.response.headers.location) {
           currentUrl = new URL(error.response.headers.location, currentUrl).toString();
           redirects++;
           continue;
        }
        throw error;
      }
    }

    if (redirects > maxRedirects) {
      throw new Error(`Exceeded maximum redirects (${maxRedirects})`);
    }

    try {
      const contentType = responseHeaders['content-type'];
      const ctStr = typeof contentType === 'string' ? contentType : '';
      if (!ctStr.includes('text/html') && !ctStr.includes('text/plain')) {
        throw new Error('Invalid content type. Only HTML and Text are supported.');
      }

      const $ = cheerio.load(responseData);
      
      // Remove scripts, styles, nav, footer
      $('script, style, nav, footer, header').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim();

      const links: string[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, url).toString();
            links.push(absoluteUrl);
          } catch {
            // Ignore invalid URLs
          }
        }
      });

      return { text, links };
    } catch (error: any) {
      console.error(`Failed to fetch ${url}:`, error.message);
      throw error;
    }
  }
}
