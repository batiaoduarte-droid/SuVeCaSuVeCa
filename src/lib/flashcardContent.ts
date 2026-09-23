import { toLearnerFacingContent } from './learnerContent';
import type { ErrorFlashcard } from '../types/suveca';
import type { ReviewResource } from '../types/reviewResource';

export interface FlashcardSemanticBlock {
  kind: 'trap' | 'mechanism' | 'correction' | 'example' | 'context' | 'boundary' | 'answer' | 'step' | 'left' | 'right';
  title: string;
  text: string;
}

export interface FlashcardContentProjection {
  front: string;
  back: string;
  hint?: string;
  explanation?: string;
  shouldShowExplanation: boolean;
  /**
   * Blocos semânticos reconhecidos de forma inequívoca.
   * Quando presente, a UI renderiza esses blocos (SEM duplicar o back geral).
   * Quando ausente, a UI renderiza o back integral (fallback canônico).
   */
  semanticBlocks?: FlashcardSemanticBlock[];
}

/**
 * Normalização técnica conservadora para deduplicação.
 * Remove apenas identificadores de proveniência interna e colapsa espaços em branco repetidos.
 * PRESERVA estritamente: pontuação gramatical, acentuação, parênteses e caracteres gráficos.
 */
export const normalizeForDeduplication = (text?: string): string => {
  if (!text || typeof text !== 'string') return '';
  return toLearnerFacingContent(text)
    .replace(/[ \t]+/g, ' ')
    .trim();
};

/**
 * Parser estritamente conservador para decomposição de respostas (back).
 * Critérios:
 * 1. Delimitadores exatos e na ordem obrigatória:
 *    - Padrão 3 blocos: "O Erro:" -> "Por que ocorre:" -> "Como evitar:"
 *    - Padrão 2 blocos A: "Problema:" -> "Forma Correta:"
 *    - Padrão 2 blocos B: "Pegadinha da Banca:" -> "Correção:"
 * 2. Ausência de delimitadores repetidos ou conflitantes.
 * 3. Conteúdo não vazio em todos os blocos.
 * 4. Preservação integral do texto e pontuação original (inclusive prefixo se houver).
 * 5. Se qualquer critério falhar: retorna undefined (fallback canônico integral).
 */
export const parseSemanticBlocks = (rawBack: string): FlashcardSemanticBlock[] | undefined => {
  if (!rawBack || typeof rawBack !== 'string') return undefined;

  const text = toLearnerFacingContent(rawBack).trim();

  // Testar Padrão 3 blocos: "O Erro:" seguido de "Por que ocorre:" seguido de "Como evitar:"
  const p3First = /\bO\s+Erro\s*:/i;
  const p3Second = /\bPor\s+que\s+ocorre\s*:/i;
  const p3Third = /\bComo\s+evitar\s*:/i;

  const mP3First = p3First.exec(text);
  const mP3Second = p3Second.exec(text);
  const mP3Third = p3Third.exec(text);

  if (
    mP3First &&
    mP3Second &&
    mP3Third &&
    mP3First.index < mP3Second.index &&
    mP3Second.index < mP3Third.index
  ) {
    const allP3First = Array.from(text.matchAll(new RegExp(p3First, 'gi')));
    const allP3Second = Array.from(text.matchAll(new RegExp(p3Second, 'gi')));
    const allP3Third = Array.from(text.matchAll(new RegExp(p3Third, 'gi')));

    if (allP3First.length === 1 && allP3Second.length === 1 && allP3Third.length === 1) {
      const prefix = text.slice(0, mP3First.index).trim();
      const trapText = text.slice(mP3First.index + mP3First[0].length, mP3Second.index).trim();
      const mechanismText = text.slice(mP3Second.index + mP3Second[0].length, mP3Third.index).trim();
      const correctionText = text.slice(mP3Third.index + mP3Third[0].length).trim();

      if (trapText && mechanismText && correctionText) {
        const blocks: FlashcardSemanticBlock[] = [];
        if (prefix) {
          blocks.push({
            kind: 'example',
            title: 'Contexto',
            text: prefix,
          });
        }
        blocks.push({
          kind: 'trap',
          title: 'O Erro',
          text: trapText,
        });
        blocks.push({
          kind: 'mechanism',
          title: 'Por que ocorre',
          text: mechanismText,
        });
        blocks.push({
          kind: 'correction',
          title: 'Como evitar',
          text: correctionText,
        });
        return blocks;
      }
    }
    return undefined;
  }

  // Testar Padrão 2 blocos: "Problema:" seguido de "Forma Correta:"
  const p1First = /\bProblema\s*:/i;
  const p1Second = /\bForma\s+Correta\s*:/i;

  const mP1First = p1First.exec(text);
  const mP1Second = p1Second.exec(text);

  // Testar Padrão 2 blocos: "Pegadinha da Banca:" seguido de "Correção:"
  const p2First = /\bPegadinha(?:\s+da\s+Banca)?\s*:/i;
  const p2Second = /\bCorre[çc][ãa]o\s*:/i;

  const mP2First = p2First.exec(text);
  const mP2Second = p2Second.exec(text);

  if (mP1First && mP1Second && mP1First.index < mP1Second.index) {
    const allP1First = Array.from(text.matchAll(new RegExp(p1First, 'gi')));
    const allP1Second = Array.from(text.matchAll(new RegExp(p1Second, 'gi')));
    if (allP1First.length === 1 && allP1Second.length === 1 && !mP2First && !mP2Second && !mP3First) {
      const prefix = text.slice(0, mP1First.index).trim();
      const trapText = text.slice(mP1First.index + mP1First[0].length, mP1Second.index).trim();
      const correctionText = text.slice(mP1Second.index + mP1Second[0].length).trim();

      if (trapText && correctionText) {
        const blocks: FlashcardSemanticBlock[] = [];
        if (prefix) {
          blocks.push({ kind: 'example', title: 'Contexto', text: prefix });
        }
        blocks.push({ kind: 'trap', title: 'Atenção ao Erro Comum', text: trapText });
        blocks.push({ kind: 'correction', title: 'Forma Correta', text: correctionText });
        return blocks;
      }
    }
  } else if (mP2First && mP2Second && mP2First.index < mP2Second.index) {
    const allP2First = Array.from(text.matchAll(new RegExp(p2First, 'gi')));
    const allP2Second = Array.from(text.matchAll(new RegExp(p2Second, 'gi')));
    if (allP2First.length === 1 && allP2Second.length === 1 && !mP1First && !mP1Second && !mP3First) {
      const prefix = text.slice(0, mP2First.index).trim();
      const trapText = text.slice(mP2First.index + mP2First[0].length, mP2Second.index).trim();
      const correctionText = text.slice(mP2Second.index + mP2Second[0].length).trim();

      if (trapText && correctionText) {
        const blocks: FlashcardSemanticBlock[] = [];
        if (prefix) {
          blocks.push({ kind: 'example', title: 'Contexto', text: prefix });
        }
        blocks.push({ kind: 'trap', title: 'Pegadinha da Banca', text: trapText });
        blocks.push({ kind: 'correction', title: 'Critério Decisivo', text: correctionText });
        return blocks;
      }
    }
  }

  return undefined;
};

/**
 * Projeta o conteúdo de um flashcard de forma pura para consumo na UI.
 * - Deduplica conservadoramente o campo explanation em relação ao back.
 * - Identifica blocos semânticos garantindo preservação integral sem duplicação visual.
 * - Mantém o objeto de entrada ErrorFlashcard estritamente imutável.
 */
export const projectFlashcardContent = (card: ErrorFlashcard, resource?: ReviewResource | null): FlashcardContentProjection => {
  const front = toLearnerFacingContent(card.front).trim();
  const back = toLearnerFacingContent(card.back).trim();
  const hint = card.hint ? toLearnerFacingContent(card.hint).trim() : undefined;
  const explanation = card.explanation ? toLearnerFacingContent(card.explanation).trim() : undefined;

  // Deduplicação conservadora:
  // Se a explicação for idêntica ao verso após normalização técnica mínima,
  // ou se for vazia, não há por que exibir o botão secundário.
  const normBack = normalizeForDeduplication(back);
  const normExp = normalizeForDeduplication(explanation);
  const shouldShowExplanation = Boolean(normExp && normExp !== normBack);

  if (resource && (resource.cardId !== card.id || resource.front !== card.front || resource.back !== card.back)) {
    throw new Error('Recurso de revisão incompatível com o cartão.');
  }
  const semanticBlocks: FlashcardSemanticBlock[] | undefined = resource
    ? resource.answer.type === 'structured'
      ? resource.answer.blocks.map(block => ({
        kind: block.role === 'error' ? 'trap' : block.role === 'criterion' ? 'correction' : block.role,
        title: block.title,
        text: toLearnerFacingContent(block.text),
      }))
      : undefined
    : parseSemanticBlocks(back);

  return {
    front,
    back,
    hint,
    explanation,
    shouldShowExplanation,
    semanticBlocks,
  };
};
