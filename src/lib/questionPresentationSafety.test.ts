import { describe, expect, it } from 'vitest';
import { containsRichEmphasis, requiresIdentifiedContext, requiresVisualEmphasis } from './questionPresentationSafety';

describe('question presentation safety', () => {
  it('recognizes identified external context', () => {
    expect(requiresIdentifiedContext('Empregado no texto CB2A1, o vocábulo...')).toBe(true);
    expect(requiresIdentifiedContext('Considere o texto anterior.')).toBe(true);
    expect(requiresIdentifiedContext('Analise a frase abaixo.')).toBe(false);
  });

  it('recognizes visual references and actual emphasis', () => {
    expect(requiresVisualEmphasis('A respeito das palavras destacadas, assinale.')).toBe(true);
    expect(containsRichEmphasis('Faz parte do **processo** de **amadurecimento**.')).toBe(true);
    expect(containsRichEmphasis('Faz parte do processo de amadurecimento.')).toBe(false);
  });
});
