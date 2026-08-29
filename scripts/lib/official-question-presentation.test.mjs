import { describe, expect, it } from 'vitest';
import {
  separateEmbeddedSupportFromCommand,
  separateInlineOptionsFromCommand,
} from './official-question-presentation.mjs';

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

  it('separa contexto legado incorporado ao prompt sem reescrever os recortes', () => {
    const support = 'O mundo vegetal não é um silêncio absoluto. Plantas emitem sons em situações de estresse e outros organismos podem ouvi-los.';
    const command = 'No segundo período do primeiro parágrafo do texto CB2A1, a oração destacada expressa uma possibilidade.';
    expect(separateEmbeddedSupportFromCommand(`${support}\n\n${command}`)).toEqual({
      supportText: support,
      command,
      embeddedSupportSeparated: true,
    });
  });

  it('não fabrica contexto quando o prompt contém somente referência externa', () => {
    const command = 'No terceiro parágrafo do texto CG1A1-I, a forma pronominal “o” faz referência a qual termo?';
    expect(separateEmbeddedSupportFromCommand(command)).toEqual({
      supportText: '',
      command,
      embeddedSupportSeparated: false,
    });
  });
});
