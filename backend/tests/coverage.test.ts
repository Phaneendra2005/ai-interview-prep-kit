import { CoverageService } from '../src/services/coverage.service';

describe('CoverageService', () => {
  let coverageService: CoverageService;

  beforeEach(() => {
    coverageService = new CoverageService();
  });

  it('should return uncovered requirement ids', () => {
    const requirements: any[] = [
      { id: 'r1' },
      { id: 'r2' },
      { id: 'r3' }
    ];

    const questions: any[] = [
      { requirement_ids: ['r1'] },
      { requirement_ids: ['r3'] }
    ];

    const uncovered = coverageService.checkCoverage(requirements, questions);

    expect(uncovered).toEqual(['r2']);
  });

  it('should return empty array if all covered', () => {
    const requirements: any[] = [
      { id: 'r1' },
    ];
    const questions: any[] = [
      { requirement_ids: ['r1'] },
    ];
    const uncovered = coverageService.checkCoverage(requirements, questions);
    expect(uncovered).toEqual([]);
  });
});
