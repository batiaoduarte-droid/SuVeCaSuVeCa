import { describe, expect, it } from 'vitest';
import { computeMetacognitiveMatrix } from '../lib/learnerIntelligence';
import {
  summarizeLearningEvidence,
  type LearningAttempt,
} from './StatisticsDashboard';

describe('StatisticsDashboard learning evidence', () => {
  it('conta cada item PBL uma vez e preserva a confiança observada', () => {
    const pblAttempt: LearningAttempt = {
      id: 'pbl-attempt-1',
      source: 'pbl',
      total: 1,
      correct: 0,
      isCorrect: false,
      confidence: 'high',
      stage: 'initial',
    };
    const simuladoAttempt: LearningAttempt = {
      id: 'simulado-1',
      source: 'simulado',
      totalQuestions: 10,
      correctCount: 8,
    };

    // O mesmo attempt pode reaparecer após merge local/cloud. O ID torna a
    // agregação idempotente e o exercício PBL não entra em modulePractice.
    const summary = summarizeLearningEvidence(
      [pblAttempt, simuladoAttempt, { ...pblAttempt }],
      4,
      3
    );

    expect(summary.attemptAnswered).toBe(11);
    expect(summary.attemptCorrect).toBe(8);
    expect(summary.totalAnswered).toBe(15);
    expect(summary.totalCorrect).toBe(11);
    expect(summary.simuladoAnswered).toBe(10);
    expect(summary.simuladoCorrect).toBe(8);
    expect(summary.simuladoAttempts).toHaveLength(1);
    expect(summary.observedPblAttempts).toEqual([
      { isCorrect: false, confidence: 'high' },
    ]);

    const metacognition = computeMetacognitiveMatrix(
      summary.totalAnswered,
      summary.totalCorrect,
      [],
      summary.observedPblAttempts
    );
    expect(metacognition.totalAnalyzed).toBe(1);
    expect(metacognition.quadrants.q4_illusion.count).toBe(1);
  });

  it('mantém prática da aula como canal separado dos attempts', () => {
    const summary = summarizeLearningEvidence([
      {
        id: 'pbl-correct-1',
        source: 'pbl',
        total: 1,
        correct: 1,
        isCorrect: true,
        confidence: 'low',
      },
    ], 2, 1);

    expect(summary.attemptAnswered).toBe(1);
    expect(summary.attemptCorrect).toBe(1);
    expect(summary.totalAnswered).toBe(3);
    expect(summary.totalCorrect).toBe(2);
    expect(summary.observedPblAttempts).toEqual([
      { isCorrect: true, confidence: 'low' },
    ]);
  });
});
