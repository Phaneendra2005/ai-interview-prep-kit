import { Requirement } from './extraction.service';

export class CoverageService {
  /**
   * Deterministically checks which requirements have no associated questions.
   */
  checkCoverage(requirements: Requirement[], questions: { requirement_ids: string[] }[]): string[] {
    const coveredIds = new Set<string>();
    
    questions.forEach(q => {
      q.requirement_ids.forEach(id => coveredIds.add(id));
    });

    const uncoveredIds = requirements
      .map(r => r.id)
      .filter(id => !coveredIds.has(id));

    return uncoveredIds;
  }
}
