import { Requirement } from './extraction.service';
import { z } from 'zod';
import { QuestionSchema } from './generation.service';

type Question = z.infer<typeof QuestionSchema>;

export class SchedulingService {
  allocateSchedule(daysAvailable: number, requirements: Requirement[], questions: Question[]) {
    if (daysAvailable <= 0) {
      throw new Error('Days available must be greater than 0');
    }

    // Map questions by priority and difficulty
    const reqMap = new Map<string, Requirement>();
    requirements.forEach(r => reqMap.set(r.id, r));

    // Sort questions: must-haves first, then by difficulty (hardest first)
    const sortedQuestions = [...questions].sort((a, b) => {
      const aIsMust = a.requirement_ids.some(id => reqMap.get(id)?.priority === 'must');
      const bIsMust = b.requirement_ids.some(id => reqMap.get(id)?.priority === 'must');
      
      if (aIsMust && !bIsMust) return -1;
      if (!aIsMust && bIsMust) return 1;
      
      return b.difficulty - a.difficulty;
    });

    const days = Array.from({ length: daysAvailable }, (_, i) => ({
      day: i + 1,
      focus: '',
      question_ids: [] as string[],
      minutes: 0
    }));

    // Distribute questions evenly across days (or front-load if not enough days)
    sortedQuestions.forEach((q, idx) => {
      const dayIdx = idx % daysAvailable;
      days[dayIdx].question_ids.push(q.id);
      
      // Assume difficulty 1 = 15m, 2 = 30m, 3 = 45m
      days[dayIdx].minutes += q.difficulty * 15;
    });

    // Determine focus based on dominant category/requirement of the day
    days.forEach(day => {
      if (day.question_ids.length === 0) {
        day.focus = 'General Review / Rest';
        return;
      }
      const cats = new Map<string, number>();
      day.question_ids.forEach(qid => {
        const q = questions.find(x => x.id === qid);
        if (q) {
          cats.set(q.category, (cats.get(q.category) || 0) + 1);
        }
      });
      let maxCat = '';
      let maxCount = 0;
      cats.forEach((count, cat) => {
        if (count > maxCount) {
          maxCount = count;
          maxCat = cat;
        }
      });
      day.focus = `${maxCat.charAt(0).toUpperCase() + maxCat.slice(1)} Focus`;
    });

    return {
      days_available: daysAvailable,
      days
    };
  }
}
