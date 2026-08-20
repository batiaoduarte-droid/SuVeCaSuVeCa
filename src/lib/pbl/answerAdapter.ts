const TRUE_ANSWERS = new Set(['C', 'CERTO', 'CORRETO', 'CORRECT', 'TRUE']);
const FALSE_ANSWERS = new Set(['E', 'ERRADO', 'INCORRETO', 'INCORRECT', 'FALSE']);

const cleanAnswer = (answer: string): string =>
  String(answer || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(OPTION|LETTER|ALTERNATIVA|OPCAO)[_\s-]*/, '')
    .replace(/^[([]|[)\].:]+$/g, '');

export type PBLAnswerMode = 'true_false' | 'multiple_choice';

export const normalizePBLAnswer = (answer: string, mode?: PBLAnswerMode): string => {
  const cleaned = cleanAnswer(answer);
  if (mode === 'multiple_choice') return cleaned.replace(/[^A-Z0-9]/g, '');
  if (TRUE_ANSWERS.has(cleaned)) return 'C';
  if (FALSE_ANSWERS.has(cleaned)) return 'E';
  return cleaned.replace(/[^A-Z0-9]/g, '');
};

export const isPBLAnswerCorrect = (
  userAnswer: string,
  correctAnswer: string,
  mode?: PBLAnswerMode
): boolean => {
  const resolvedMode = mode || (isExplicitMultipleChoiceAnswer(correctAnswer) ? 'multiple_choice' : undefined);
  return normalizePBLAnswer(userAnswer, resolvedMode) === normalizePBLAnswer(correctAnswer, resolvedMode);
};

export const isExplicitMultipleChoiceAnswer = (answer: string): boolean =>
  /^(?:option|letter|alternativa|opcao)[_\s-]*[a-z]$/i.test(String(answer || '').trim());

export const formatPBLAnswer = (answer: string, multipleChoice = false): string => {
  const normalized = normalizePBLAnswer(answer);
  if (!multipleChoice && normalized === 'C') return 'Certo';
  if (!multipleChoice && normalized === 'E') return 'Errado';
  return normalized || 'Não informado';
};

export const answerChoiceFor = (answer: string, multipleChoice: boolean): string =>
  formatPBLAnswer(answer, multipleChoice);

export const formatPBLPedagogicalText = (text: string): string =>
  String(text || '')
    .replace(/\boption_([A-E])\b/gi, 'alternativa $1')
    .replace(/\bletter_([A-E])\b/gi, 'alternativa $1')
    .replace(/(['"]?)incorrect\1/gi, 'Errado')
    .replace(/(['"]?)correct\1/gi, 'Certo');
