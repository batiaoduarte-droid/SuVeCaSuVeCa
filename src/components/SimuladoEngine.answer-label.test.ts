import { describe, expect, it } from 'vitest';
import { simuladoAnswerLabel } from './SimuladoEngine';

describe('simuladoAnswerLabel', () => {
  it('presents binary answers semantically instead of as letters', () => {
    expect(simuladoAnswerLabel({ type: 'CERTO_ERRADO', correctAnswer: 'C' })).toBe('Certo');
    expect(simuladoAnswerLabel({ type: 'CERTO_ERRADO', correctAnswer: 'E' })).toBe('Errado');
  });

  it('preserves letters for multiple-choice questions', () => {
    expect(simuladoAnswerLabel({ type: 'MULTIPLA_ESCOLHA', correctAnswer: 'D' })).toBe('Letra D');
  });
});
