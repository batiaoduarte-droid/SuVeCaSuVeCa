import { describe, expect, it } from 'vitest';
import {
  isBinaryOfficialQuestion,
  normalizeOfficialAnswer,
  presentOfficialQuestionOptions,
} from './officialQuestionPresentation';

describe('officialQuestionPresentation', () => {
  it.each([
    ['CERTO_ERRADO', 'E'],
    ['open_or_judgment', 'incorrect'],
    ['true_false_or_statement', 'CORRETA'],
  ])('projeta %s como questão Certo/Errado', (questionType, answer) => {
    expect(presentOfficialQuestionOptions({ options: [], questionType, answer, prompt: '' })).toEqual([
      { letter: 'C', text: 'Certo' },
      { letter: 'E', text: 'Errado' },
    ]);
  });

  it('não inventa alternativas para múltipla escolha incompleta', () => {
    expect(presentOfficialQuestionOptions({
      options: [],
      questionType: 'multiple_choice',
      answer: 'C',
      prompt: 'Assinale a alternativa correta.',
    })).toEqual([]);
  });

  it('substitui fragmento único extraído de uma questão C/E por opções válidas', () => {
    expect(presentOfficialQuestionOptions({
      options: [{ letter: 'E', text: 'fragmento repetido do enunciado' }],
      questionType: 'multiple_choice',
      answer: 'correct',
      prompt: 'Julgue (C ou E) o item que se segue.',
    })).toEqual([
      { letter: 'C', text: 'Certo' },
      { letter: 'E', text: 'Errado' },
    ]);
  });

  it('reconhece julgamento legado pelo enunciado sem confundir letra de múltipla escolha', () => {
    expect(isBinaryOfficialQuestion({ questionType: 'other', answer: 'E', prompt: 'Julgue o item.' })).toBe(true);
    expect(isBinaryOfficialQuestion({ questionType: 'other', answer: 'E', prompt: 'Assinale a alternativa.' })).toBe(false);
    expect(isBinaryOfficialQuestion({ questionType: 'true_false_or_open', answer: 'letter_E', prompt: 'Julgue o item.' })).toBe(true);
    expect(isBinaryOfficialQuestion({ questionType: 'true_false_or_open', answer: 'letter_B', prompt: 'Julgue o item.' })).toBe(false);
  });

  it.each([
    ['correct', 'C'],
    ['CORRETA', 'C'],
    ['incorrect', 'E'],
    ['incorreto', 'E'],
    ['Gabarito letra B', 'B'],
    ['letter_C', 'C'],
  ])('normaliza o gabarito %s', (answer, expected) => {
    expect(normalizeOfficialAnswer(answer)).toBe(expected);
  });
});
