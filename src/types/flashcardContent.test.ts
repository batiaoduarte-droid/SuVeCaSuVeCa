import { describe, expect, it } from 'vitest';
import { flashcardAnswerBlocks, flashcardContentBack, parseFlashcardBatch, parseFlashcardContent, type FlashcardContentV21, type FlashcardContentV22 } from './flashcardContent';
import { projectFlashcardContent } from '../lib/flashcardContent';
import { EDITORIAL_FLASHCARDS } from '../data/editorialFlashcards.generated';

const stimulus = {
  schemaVersion: '2.2.0' as const, front: 'Qual critério se aplica ao caso apresentado?',
  hint: null, deepDive: null, difficulty: 'medio' as const,
  topic: 'Tema específico', tags: ['tema'], sourceRefs: ['EDITORIAL:TEST'],
};
const verification = {
  directAnswer: 'Resposta direta verificável.', normativeRule: null,
  canonicalExample: null, contraExample: null, quickTest: null,
};
const variants: FlashcardContentV22[] = [
  { ...stimulus, family: 'rule', back: { ...verification, normativeRule: 'Regra contextualizada.', conditions: 'Nesta condição.' } },
  { ...stimulus, family: 'trap_diagnostic', back: { ...verification, error: 'Erro específico.', correction: 'Correção específica.', whyItFailsOrTraps: 'Mecanismo do erro.' } },
  { ...stimulus, family: 'contrast', back: { ...verification, left: { label: 'A', text: 'Primeiro sentido.' }, right: { label: 'B', text: 'Segundo sentido.' }, criterion: 'Critério comparável.' } },
  { ...stimulus, family: 'procedure', back: { ...verification, steps: ['Identifique o termo.', 'Aplique o teste.'] } },
  { ...stimulus, family: 'boundary_exception', back: { ...verification, normativeRule: 'Regra delimitada.', boundary: 'Limite de aplicação.' } },
  { ...stimulus, family: 'mnemonic', back: { ...verification, cue: 'Lembrete.', meaning: 'Significado do lembrete.', limits: null } },
];

describe('contrato comum dos flashcards', () => {
  it.each(variants)('valida e apresenta a família $family sem inferência textual', content => {
    const value = parseFlashcardContent(content, new Set(['EDITORIAL:TEST']));
    const blocks = flashcardAnswerBlocks(value);
    expect(blocks[0]).toEqual({ slot: 'direct_answer', kind: 'answer', title: 'Resposta direta', text: verification.directAnswer });
    expect(blocks.length).toBeGreaterThan(1);
    const card = { id: 'test', source: 'caderno' as const, topic: 'Teste', front: 'Cache legado', back: 'Cache legado', content: value, createdAt: '2026-09-30', correctCount: 0, incorrectCount: 0 };
    const projection = projectFlashcardContent(card);
    expect(projection.family).toBe(content.family);
    expect(projection.semanticBlocks).toEqual(blocks);
    expect(projection.back).toBe(flashcardContentBack(value));
    expect(projection.front).toBe(value.front);
    expect(projection.shouldShowExplanation).toBe(false);
  });

  it.each(variants)('aceita ausências explícitas sem inventar campos na família $family', content => {
    const parsed = parseFlashcardContent({ ...content, hint: null, deepDive: null });
    const blocks = flashcardAnswerBlocks(parsed);
    expect(blocks.some(block => ['Correto', 'Errado', 'Exemplo', 'Aplicação da Regra', 'Limite da Regra', 'Caso Contrastante', 'Teste rápido'].includes(block.title))).toBe(false);
    expect(blocks.every(block => block.text.trim().length > 0)).toBe(true);
  });

  it('distingue erro gramatical de caso contrastante e de limite da regra no contraexemplo', () => {
    const baseRule = variants[0] as Extract<FlashcardContentV22, { family: 'rule' }>;
    const baseBoundary = variants[4] as Extract<FlashcardContentV22, { family: 'boundary_exception' }>;
    const errorCard: FlashcardContentV22 = {
      ...baseRule,
      back: { ...baseRule.back, canonicalExample: 'mão de obra', contraExample: { role: 'incorrect', text: 'mão-de-obra', explanation: 'Grafia incorreta neste composto sem hífen.' } }
    };
    const errorBlocks = flashcardAnswerBlocks(errorCard);
    expect(errorBlocks.find(b => b.title === 'Correto')?.text).toBe('mão de obra');
    expect(errorBlocks.find(b => b.title === 'Errado')?.text).toBe('mão-de-obra');

    const contrastCard: FlashcardContentV22 = {
      ...baseRule,
      back: { ...baseRule.back, canonicalExample: 'Eles haviam acreditado', contraExample: { role: 'valid_contrast', text: 'Havia muitos consumidores na loja', explanation: 'Haver existencial é principal e impessoal, diferente do auxiliar pessoal.' } }
    };
    const contrastBlocks = flashcardAnswerBlocks(contrastCard);
    expect(contrastBlocks.find(b => b.title === 'Exemplo')?.text).toBe('Eles haviam acreditado');
    expect(contrastBlocks.find(b => b.exampleRole === 'valid_contrast')?.text).toBe('Havia muitos consumidores na loja');

    const boundaryCard: FlashcardContentV22 = {
      ...baseBoundary,
      back: { ...baseBoundary.back, canonicalExample: 'Guerra e quilo', contraExample: { role: 'boundary', text: 'Água e quase (o u é semivogal)', explanation: 'Com u pronunciado, gu/qu não constitui dígrafo.' } }
    };
    const boundaryBlocks = flashcardAnswerBlocks(boundaryCard);
    expect(boundaryBlocks.find(b => b.title === 'Aplicação da Regra')?.text).toBe('Guerra e quilo');
    expect(boundaryBlocks.find(b => b.exampleRole === 'boundary')?.text).toBe('Água e quase (o u é semivogal)');
  });

  it('distingue a frase causal válida da substituição rejeitada em texto e áudio', () => {
    const base = variants[3] as Extract<FlashcardContentV22, { family: 'procedure' }>;
    const content: FlashcardContentV22 = { ...base, back: { ...base.back, contraExample: {
      role: 'invalid_transform', text: 'Chorou, uma vez que caiu da escada. (Incorreto substituir por contanto que.)',
      operation: 'Substituir uma vez que por contanto que.', explanation: 'A substituição troca causa por condição; a frase original é válida.',
    } } };
    const block = flashcardAnswerBlocks(content).find(b => b.slot === 'contra_example')!;
    expect(block.kind).toBe('example');
    expect(block.title).toBe('Trecho analisado');
    expect(block.exampleRole).toBe('invalid_transform');
    expect(flashcardContentBack(content)).toContain('Operação inválida: Substituir');
    expect(flashcardContentBack(content)).not.toContain('Errado: Chorou');
  });

  it('lê snapshots 2.1 sem inferir papel pelo texto ou pela família, mas geração exige 2.2', () => {
    const base = variants[4] as Extract<FlashcardContentV22, { family: 'boundary_exception' }>;
    const legacy: FlashcardContentV21 = { ...base, schemaVersion: '2.1.0', back: { ...base.back, contraExample: '*Elas estão a sósas (incorreto).' } };
    const before = JSON.stringify(legacy);
    const block = flashcardAnswerBlocks(parseFlashcardContent(legacy)).find(b => b.slot === 'contra_example')!;
    expect(block.exampleRole).toBe('unreviewed');
    expect(block.title).toBe('Observação');
    expect(JSON.stringify(legacy)).toBe(before);
    expect(() => parseFlashcardBatch({ cards: [legacy] })).toThrow();
    expect(() => parseFlashcardContent({ ...base, back: { ...base.back, contraExample: legacy.back.contraExample } })).toThrow();
  });

  it('recusa classificação ausente e transformação sem operação ou justificativa', () => {
    const base = variants[0];
    for (const contraExample of [
      { text: 'antiinflamatório', explanation: 'Grafia incorreta.' },
      { role: 'invalid_transform', text: 'Chorou.', explanation: 'Troca de sentido.' },
      { role: 'incorrect', text: 'antiinflamatório', explanation: '' },
      { role: 'boundary', text: 'Água', explanation: 'U pronunciado.', guessed: true },
    ]) expect(() => parseFlashcardContent({ ...base, back: { ...base.back, contraExample } })).toThrow();
  });

  it.each([
    ['rule', 'normativeRule'], ['trap_diagnostic', 'whyItFailsOrTraps'], ['contrast', 'right'],
    ['procedure', 'steps'], ['boundary_exception', 'boundary'], ['mnemonic', 'meaning'],
  ])('rejeita a família %s sem seu campo específico %s', (family, field) => {
    const content = structuredClone(variants.find(card => card.family === family)!);
    delete (content.back as unknown as Record<string, unknown>)[field];
    expect(() => parseFlashcardContent(content)).toThrow();
  });

  it('rejeita famílias desconhecidas, passos vazios, null obrigatório e propriedades extras', () => {
    expect(() => parseFlashcardContent({ ...variants[0], family: 'application' })).toThrow();
    expect(() => parseFlashcardContent({ ...variants[3], back: { ...variants[3].back, steps: [] } })).toThrow();
    expect(() => parseFlashcardContent({ ...variants[0], back: { ...variants[0].back, normativeRule: null } })).toThrow();
    expect(() => parseFlashcardContent({ ...variants[0], extra: 'Ignorado?' })).toThrow();
    expect(() => parseFlashcardContent({ ...variants[0], back: { ...variants[0].back, extra: 'Ignorado?' } })).toThrow();
    expect(() => parseFlashcardContent({ ...variants[2], back: { ...variants[2].back, left: { label: 'A', text: 'Texto.', extra: true } } })).toThrow();
  });

  it('exige os campos nullable presentes, sem aceitar string vazia como ausência', () => {
    const { hint: _hint, ...withoutHint } = variants[0];
    const { deepDive: _deepDive, ...withoutDeepDive } = variants[0];
    expect(() => parseFlashcardContent(withoutHint)).toThrow();
    expect(() => parseFlashcardContent(withoutDeepDive)).toThrow();
    expect(() => parseFlashcardContent({ ...variants[0], hint: ' ' })).toThrow();
    expect(() => parseFlashcardContent({ ...variants[0], deepDive: '' })).toThrow();
  });

  it('rejeita dica igual à pergunta ou resposta, inclusive com diferenças de espaços e caixa', () => {
    expect(() => parseFlashcardContent({ ...variants[0], hint: `  ${variants[0].front.toUpperCase()}  ` })).toThrow(/Dica/);
    expect(() => parseFlashcardContent({ ...variants[0], hint: ' RESPOSTA   DIRETA VERIFICÁVEL. ' })).toThrow(/Dica/);
    expect(parseFlashcardContent({ ...variants[0], hint: 'Observe o termo que estabelece a relação.' }).hint).toBeTruthy();
  });

  it('rejeita aprofundamento que repete qualquer trecho estruturado do verso', () => {
    expect(() => parseFlashcardContent({ ...variants[0], deepDive: '  REGRA CONTEXTUALIZADA. ' })).toThrow(/Aprofundamento/);
    expect(() => parseFlashcardContent({ ...variants[2], deepDive: 'Segundo sentido.' })).toThrow(/Aprofundamento/);
    expect(() => parseFlashcardContent({ ...variants[3], deepDive: 'Identifique o termo.' })).toThrow(/Aprofundamento/);
    const projection = projectFlashcardContent({ id: 'deep', source: 'caderno', topic: 'Tema', front: 'Legado', back: 'Legado', content: { ...variants[0], deepDive: 'Informação adicional sustentada pela fonte.' }, createdAt: '2026-09-30', correctCount: 0, incorrectCount: 0 });
    expect(projection.explanation).toBe('Informação adicional sustentada pela fonte.');
    expect(projection.shouldShowExplanation).toBe(true);
  });

  it('rejeita proveniência inventada, repetida, ausente e versões desconhecidas', () => {
    expect(() => parseFlashcardContent(variants[0], new Set(['OTHER']))).toThrow(/Origem/);
    expect(() => parseFlashcardContent({ ...variants[0], sourceRefs: ['EDITORIAL:TEST', 'EDITORIAL:TEST'] })).toThrow(/Origem/);
    expect(() => parseFlashcardContent({ ...variants[0], sourceRefs: [] })).toThrow();
    expect(() => parseFlashcardContent({ ...variants[0], schemaVersion: '2.0.0' })).toThrow();
  });

  it('valida o lote completo, recusando duplicações e preservando resultado vazio sem suporte', () => {
    expect(parseFlashcardBatch({ cards: [] })).toEqual([]);
    expect(parseFlashcardBatch({ cards: [variants[0]] }, new Set(['EDITORIAL:TEST']))).toEqual([variants[0]]);
    expect(() => parseFlashcardBatch({ cards: [variants[0], { ...variants[1], front: `  ${variants[0].front.toUpperCase()} ` }] })).toThrow(/duplicadas/);
    expect(() => parseFlashcardBatch({ cards: [variants[0]], extra: true })).toThrow();
    expect(() => parseFlashcardBatch({ cards: [variants[0]] }, new Set(['OTHER']))).toThrow(/Origem/);
  });
});

describe('regressões editoriais publicadas', () => {
  const get = (suffix: string) => EDITORIAL_FLASHCARDS.find(c => c.id === `editorial-flash-ip-${suffix}`)!;
  it('valida o catálogo inteiro e exige classificação explícita em cada contraexemplo publicado', () => {
    expect(EDITORIAL_FLASHCARDS).toHaveLength(1525);
    expect(new Set(EDITORIAL_FLASHCARDS.map(c => c.id)).size).toBe(1525);
    let classified = 0;
    for (const card of EDITORIAL_FLASHCARDS) {
      const content = parseFlashcardContent(card.content);
      expect(content.schemaVersion, card.id).toBe('2.2.0');
      if (content.schemaVersion === '2.2.0' && content.back.contraExample) {
        classified++;
        const block = flashcardAnswerBlocks(content).find(b => b.slot === 'contra_example')!;
        expect(block.text).toBe(content.back.contraExample.text);
        expect(block.exampleRole).toBe(content.back.contraExample.role);
      }
      expect(projectFlashcardContent(card).shouldShowExplanation).toBe(Boolean(content.deepDive));
    }
    expect(classified).toBe(1045);
  });
  it.each([
    ['a00-g05-001', 'incorrect'], ['a09-g02-003', 'incorrect'],
    ['a02-g03-008', 'invalid_transform'], ['a01-g01-011', 'incorrect'],
    ['a10-g01-011', 'incorrect'], ['a02-g01-006', 'invalid_transform'],
  ])('mantém o alvo do julgamento em %s', (suffix, role) => {
    const projection = projectFlashcardContent(get(suffix));
    const example = projection.semanticBlocks?.find(b => b.slot === 'contra_example');
    expect(example?.exampleRole).toBe(role);
    expect(example?.explanation).toBeTruthy();
    if (role === 'invalid_transform') {
      expect(example?.operation).toBeTruthy();
      expect(projection.back).not.toContain(`Errado: ${example?.text}`);
    }
  });
  it('mantém reescrita coerente e conserva complemento útil sem repetir letra × fonema', () => {
    const rewrite = projectFlashcardContent(get('a02-g01-006'));
    expect(rewrite.back).toContain('modo adequado ao conector e ao contexto');
    expect(rewrite.back).not.toContain('Locução conjuntiva + Subjuntivo');
    expect(rewrite.explanation).toBeUndefined();
    const letters = projectFlashcardContent(get('a00-g01-001'));
    expect(letters.hint).toBeUndefined();
    expect(letters.shouldShowExplanation).toBe(false);
    const chamar = projectFlashcardContent(get('a10-g01-007'));
    expect(chamar.hint).toBeUndefined();
    expect(chamar.shouldShowExplanation).toBe(true);
    expect(chamar.explanation).toContain('predicativo');
  });
});
