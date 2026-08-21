export interface PresentedQuestionOption {
  letter: string;
  text: string;
}

const BINARY_TYPES = new Set([
  'certo_errado',
  'true_false',
  'open_or_judgment',
  'true_false_or_open',
  'true_false_or_statement',
  'true_false_or_judgment',
]);

const normalizeToken = (value?: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeOfficialAnswer = (answer?: string): string | undefined => {
  const token = normalizeToken(answer);
  if (!token) return undefined;

  if (/^(c|correct|correta?|certo|verdadeir[oa])$/.test(token)) return 'C';
  if (/^(e|incorrect|errada?|errado|incorreta?|incorreto|fals[oa])$/.test(token)) return 'E';

  const letterMatch = token.match(/(?:letter|option|letra|alternativa|item)_?([a-e])(?:_|$)/);
  if (letterMatch) return letterMatch[1].toUpperCase();
  if (/^[a-e]$/.test(token)) return token.toUpperCase();

  return answer?.trim();
};

export const isBinaryOfficialQuestion = ({
  questionType,
  answer,
  prompt,
}: {
  questionType?: string;
  answer?: string;
  prompt?: string;
}): boolean => {
  const type = normalizeToken(questionType);
  const answerToken = normalizeToken(answer);
  // option_X is unequivocally multiple choice. Some C/E sources use letter_C
  // and letter_E, so those remain binary only when type and prompt agree.
  if (/^option_[a-e]$/.test(answerToken)) return false;
  const encodedLetter = answerToken.match(/^letter_([a-e])$/)?.[1];
  if (encodedLetter) {
    return (encodedLetter === 'c' || encodedLetter === 'e')
      && BINARY_TYPES.has(type)
      && /\bjulgue\b|\bcerto\s*(?:ou|\/)\s*errado\b/i.test(prompt || '');
  }
  if (BINARY_TYPES.has(type)) return true;

  // Respostas por extenso são inequívocas mesmo quando o tipo legado está ausente.
  if (/^(correct|incorrect|correta?|certo|verdadeir[oa]|errada?|errado|incorreta?|incorreto|fals[oa])$/.test(answerToken)) {
    return true;
  }

  // C/E isolados só são binários quando o próprio enunciado pede julgamento.
  return /^[ce]$/.test(answerToken) && /\b(julgue|certo|errado|correto|incorreto)\b/i.test(prompt || '');
};

export const presentOfficialQuestionOptions = ({
  options,
  questionType,
  answer,
  prompt,
}: {
  options: PresentedQuestionOption[];
  questionType?: string;
  answer?: string;
  prompt?: string;
}): PresentedQuestionOption[] => {
  // A few legacy C/E records contain one extraction fragment masquerading as
  // an option. A single alternative can never form a valid interaction; when
  // the question is demonstrably binary, project the safe C/E presentation.
  if (options.length >= 2) return options;
  if (!isBinaryOfficialQuestion({ questionType, answer, prompt })) return [];

  return [
    { letter: 'C', text: 'Certo' },
    { letter: 'E', text: 'Errado' },
  ];
};
