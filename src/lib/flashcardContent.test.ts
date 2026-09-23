import { describe, expect, it } from 'vitest';
import {
  normalizeForDeduplication,
  parseSemanticBlocks,
  projectFlashcardContent,
} from './flashcardContent';
import type { ErrorFlashcard } from '../types/suveca';

describe('flashcardContent', () => {
  describe('normalizeForDeduplication', () => {
    it('preserva pontuação gramatical relevante e remove apenas proveniência e espaços múltiplos', () => {
      const input = 'Oração explicativa: todos, que vieram, passaram.   [KB:123]   ';
      const output = normalizeForDeduplication(input);
      expect(output).toBe('Oração explicativa: todos, que vieram, passaram.');
    });

    it('mantém diferenças linguísticas sutis entre orações restritivas e explicativas', () => {
      const restritiva = normalizeForDeduplication('Os alunos que estudaram passaram.');
      const explicativa = normalizeForDeduplication('Os alunos, que estudaram, passaram.');
      expect(restritiva).not.toBe(explicativa);
    });
  });

  describe('parseSemanticBlocks', () => {
    it('decomposta padrão de 3 blocos "O Erro: ... Por que ocorre: ... Como evitar: ..."', () => {
      const raw =
        'O Erro: Escrever ou aceitar formas como "Haviam muitas pessoas", "Fazem dez meses", "Houveram problemas". Por que ocorre: No cotidiano informal, o falante transfere a concordância de existir para o verbo haver e pluraliza fazer pelo valor numérico. Como evitar: Haver (= existir) e fazer (tempo) são estritamente impessoais. Os substantivos associados são objetos diretos ou adjuntos. A flexão correta é sempre no singular: Havia muitas pessoas, Faz dez meses, Houve problemas.';
      const blocks = parseSemanticBlocks(raw);

      expect(blocks).toBeDefined();
      expect(blocks).toHaveLength(3);
      expect(blocks![0]).toEqual({
        kind: 'trap',
        title: 'O Erro',
        text: 'Escrever ou aceitar formas como "Haviam muitas pessoas", "Fazem dez meses", "Houveram problemas".',
      });
      expect(blocks![1]).toEqual({
        kind: 'mechanism',
        title: 'Por que ocorre',
        text: 'No cotidiano informal, o falante transfere a concordância de existir para o verbo haver e pluraliza fazer pelo valor numérico.',
      });
      expect(blocks![2]).toEqual({
        kind: 'correction',
        title: 'Como evitar',
        text: 'Haver (= existir) e fazer (tempo) são estritamente impessoais. Os substantivos associados são objetos diretos ou adjuntos. A flexão correta é sempre no singular: Havia muitas pessoas, Faz dez meses, Houve problemas.',
      });
    });

    it('decomposta padrão "Problema: ... Forma Correta: ..."', () => {
      const raw =
        'Problema: Separar a consoante muda em sílaba autônoma (*co-la-pso*). Forma Correta: Não existe sílaba sem vogal. A consoante muda deve ficar na sílaba anterior: co-lap-so.';
      const blocks = parseSemanticBlocks(raw);

      expect(blocks).toBeDefined();
      expect(blocks).toHaveLength(2);
      expect(blocks![0]).toEqual({
        kind: 'trap',
        title: 'Atenção ao Erro Comum',
        text: 'Separar a consoante muda em sílaba autônoma (*co-la-pso*).',
      });
      expect(blocks![1]).toEqual({
        kind: 'correction',
        title: 'Forma Correta',
        text: 'Não existe sílaba sem vogal. A consoante muda deve ficar na sílaba anterior: co-lap-so.',
      });
    });

    it('decomposta padrão "Pegadinha da Banca: ... Correção: ..."', () => {
      const raw =
        'Pegadinha da Banca: A banca tenta equiparar móveis a elétricos. Correção: Apenas ditongos crescentes admitem proparoxítona eventual.';
      const blocks = parseSemanticBlocks(raw);

      expect(blocks).toBeDefined();
      expect(blocks).toHaveLength(2);
      expect(blocks![0].kind).toBe('trap');
      expect(blocks![0].title).toBe('Pegadinha da Banca');
      expect(blocks![0].text).toBe('A banca tenta equiparar móveis a elétricos.');
      expect(blocks![1].kind).toBe('correction');
      expect(blocks![1].title).toBe('Critério Decisivo');
      expect(blocks![1].text).toBe('Apenas ditongos crescentes admitem proparoxítona eventual.');
    });

    it('preserva contexto anterior se houver prefixo antes do primeiro delimitador', () => {
      const raw =
        'Regra geral da acentuação: Pegadinha da Banca: Confundir hiato com ditongo. Correção: Na dúvida, separe as sílabas.';
      const blocks = parseSemanticBlocks(raw);

      expect(blocks).toBeDefined();
      expect(blocks).toHaveLength(3);
      expect(blocks![0]).toEqual({
        kind: 'example',
        title: 'Contexto',
        text: 'Regra geral da acentuação:',
      });
      expect(blocks![1].kind).toBe('trap');
      expect(blocks![2].kind).toBe('correction');
    });

    it('retorna undefined (fallback integral) se os delimitadores estiverem em ordem invertida', () => {
      const inverted = 'Forma Correta: O certo é isto. Problema: O erro foi aquilo.';
      expect(parseSemanticBlocks(inverted)).toBeUndefined();
    });

    it('retorna undefined se houver delimitadores duplicados ou conflitantes', () => {
      const duplicated = 'Problema: Erro 1. Forma Correta: Solução 1. Problema: Erro 2. Forma Correta: Solução 2.';
      expect(parseSemanticBlocks(duplicated)).toBeUndefined();
    });

    it('retorna undefined se um dos blocos for vazio', () => {
      const emptyTrap = 'Problema: Forma Correta: Solução aqui.';
      expect(parseSemanticBlocks(emptyTrap)).toBeUndefined();
    });

    it('retorna undefined para textos canônicos sem delimitadores suportados', () => {
      const plain = 'O verbo haver no sentido de existir é impessoal e permanece na 3ª pessoa do singular.';
      expect(parseSemanticBlocks(plain)).toBeUndefined();
    });
  });

  describe('projectFlashcardContent', () => {
    it('marca shouldShowExplanation como false quando back e explanation forem idênticos', () => {
      const card: ErrorFlashcard = {
        id: 'test-1',
        source: 'suveca',
        topic: 'Acentuação',
        front: 'Qual é a regra?',
        back: 'Palavras oxítonas terminadas em A, E, O são acentuadas. [EDITORIAL:123]',
        explanation: 'Palavras oxítonas terminadas em A, E, O são acentuadas.',
        createdAt: '2026-08-17T00:00:00.000Z',
        correctCount: 0,
        incorrectCount: 0,
      };

      const projection = projectFlashcardContent(card);
      expect(projection.shouldShowExplanation).toBe(false);
      expect(projection.back).toBe('Palavras oxítonas terminadas em A, E, O são acentuadas.');
    });

    it('marca shouldShowExplanation como true quando explanation trouxer aprofundamento real', () => {
      const card: ErrorFlashcard = {
        id: 'test-2',
        source: 'suveca',
        topic: 'Acentuação',
        front: 'Qual é a regra?',
        back: 'Palavras oxítonas terminadas em A, E, O são acentuadas.',
        explanation: 'Inclui também formas seguidas de S ou pronomes clíticos (ex: amá-los, vendê-los).',
        createdAt: '2026-08-17T00:00:00.000Z',
        correctCount: 0,
        incorrectCount: 0,
      };

      const projection = projectFlashcardContent(card);
      expect(projection.shouldShowExplanation).toBe(true);
      expect(projection.explanation).toBe('Inclui também formas seguidas de S ou pronomes clíticos (ex: amá-los, vendê-los).');
    });

    it('mantém o objeto original ErrorFlashcard estritamente imutável', () => {
      const originalCard: ErrorFlashcard = {
        id: 'test-immutable',
        source: 'suveca',
        topic: 'Verbos',
        front: 'Original Front',
        back: 'Original Back',
        explanation: 'Original Explanation',
        createdAt: '2026-08-17T00:00:00.000Z',
        correctCount: 1,
        incorrectCount: 2,
      };

      const snapshot = JSON.stringify(originalCard);
      projectFlashcardContent(originalCard);
      expect(JSON.stringify(originalCard)).toBe(snapshot);
    });
  });
});
