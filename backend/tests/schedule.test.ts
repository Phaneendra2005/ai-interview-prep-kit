import { SchedulingService } from '../src/services/scheduling.service';
import { Requirement } from '../src/services/extraction.service';

describe('SchedulingService', () => {
  let schedulingService: SchedulingService;

  beforeEach(() => {
    schedulingService = new SchedulingService();
  });

  const requirements: Requirement[] = [
    { id: 'r1', text: 'React', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node', kind: 'technical', priority: 'nice' }
  ];

  const questions: any[] = [
    { id: 'q1', requirement_ids: ['r1'], difficulty: 2, category: 'technical' },
    { id: 'q2', requirement_ids: ['r2'], difficulty: 1, category: 'technical' }
  ];

  it('should allocate exact number of requested days', () => {
    const daysToTest = [1, 2, 5, 60];
    
    for (const days of daysToTest) {
      const schedule = schedulingService.allocateSchedule(days, requirements, questions);
      expect(schedule.days_available).toBe(days);
      expect(schedule.days.length).toBe(days);
    }
  });

  it('should allocate must-have requirements and integer minutes', () => {
    const schedule = schedulingService.allocateSchedule(2, requirements, questions);
    
    let totalMinutes = 0;
    const assignedQids = new Set<string>();

    schedule.days.forEach(d => {
      expect(Number.isInteger(d.minutes)).toBe(true);
      totalMinutes += d.minutes;
      d.question_ids.forEach(id => assignedQids.add(id));
    });

    expect(totalMinutes).toBeGreaterThan(0);
    expect(assignedQids.has('q1')).toBe(true); // r1 must have
  });
});
