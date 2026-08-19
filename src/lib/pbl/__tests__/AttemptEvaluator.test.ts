import { describe, it, expect } from 'vitest';
import { AttemptEvaluator } from '../engine/AttemptEvaluator';

describe('AttemptEvaluator', () => {
  const evaluator = new AttemptEvaluator();

  it('should evaluate strong_correct when answer is correct and confidence is high', () => {
    const res = evaluator.evaluate({
      sessionId: 'sess_123',
      questionRef: 'OQ-01',
      competencyRef: 'COMP-01',
      userAnswer: 'Certo',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 15000,
    });

    expect(res.isCorrect).toBe(true);
    expect(res.evaluation).toBe('strong_correct');
  });

  it('should evaluate fragile_correct when answer is correct but confidence is low', () => {
    const res = evaluator.evaluate({
      sessionId: 'sess_123',
      questionRef: 'OQ-01',
      competencyRef: 'COMP-01',
      userAnswer: 'Certo',
      correctAnswer: 'Certo',
      confidence: 'low',
      stage: 'initial',
      responseTimeMs: 15000,
    });

    expect(res.isCorrect).toBe(true);
    expect(res.evaluation).toBe('fragile_correct');
  });

  it('should evaluate high_confidence_error when answer is wrong and confidence is high', () => {
    const res = evaluator.evaluate({
      sessionId: 'sess_123',
      questionRef: 'OQ-01',
      competencyRef: 'COMP-01',
      userAnswer: 'Errado',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 12000,
    });

    expect(res.isCorrect).toBe(false);
    expect(res.evaluation).toBe('high_confidence_error');
  });

  it('should evaluate error when answer is wrong and confidence is low', () => {
    const res = evaluator.evaluate({
      sessionId: 'sess_123',
      questionRef: 'OQ-01',
      competencyRef: 'COMP-01',
      userAnswer: 'Errado',
      correctAnswer: 'Certo',
      confidence: 'guess',
      stage: 'initial',
      responseTimeMs: 8000,
    });

    expect(res.isCorrect).toBe(false);
    expect(res.evaluation).toBe('error');
  });
});
