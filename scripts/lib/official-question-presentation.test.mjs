import { describe, expect, it } from 'vitest';
import { separateInlineOptionsFromCommand } from './official-question-presentation.mjs';

const options = [
  { label: 'A', text: 'Primeira resposta.' },
  { label: 'B', text: 'Segunda resposta.' },
];

describe('official question presentation projection', () => {
  it('separa alternativas duplicadas somente quando correspondem ao array estruturado', () => {
    expect(separateInlineOptionsFromCommand(
      'Assinale a resposta correta:\na) Primeira resposta.\nb) Segunda resposta.',
      options,
    )).toEqual({
      command: 'Assinale a resposta correta:',
      duplicatedInlineOptions: true,
    });
  });

  it('preserva enumeração do comando quando o conteúdo não corresponde às alternativas', () => {
    const prompt = 'Considere: a) o contexto; b) a regra. Assinale a resposta.';
    expect(separateInlineOptionsFromCommand(prompt, options)).toEqual({
      command: prompt,
      duplicatedInlineOptions: false,
    });
  });
});
