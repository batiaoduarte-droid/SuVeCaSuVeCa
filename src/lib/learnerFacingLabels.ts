const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export type CompetencyKind = 'Fundamentos' | 'Aplicação e decisão' | 'SuVeCA e armadilhas' | 'Objetivo de aprendizagem' | 'Prática de questões';

export interface CompetencyPresentation {
  title: string;
  kind: CompetencyKind;
}

const stripRepeatedTopic = (value: string): string => {
  const parts = value.split(/\s+—\s+/).map(normalizeWhitespace).filter(Boolean);
  if (parts.length < 2) return value;
  const normalized = parts.map((part) => part.toLocaleLowerCase('pt-BR').replace(/\s+-\s+/g, ' '));
  if (normalized[0].endsWith(normalized[normalized.length - 1])) return parts[0];
  return [...new Set(parts)].join(' — ');
};

export const presentCompetencyTitle = (sourceTitle: string): CompetencyPresentation => {
  let title = normalizeWhitespace(sourceTitle).replace(/^Competência:\s*/i, '');
  let kind: CompetencyKind = 'Objetivo de aprendizagem';
  const isQuestionPractice = /\s+-\s+Questões(?=\s*(?:—|$))/i.test(title);

  const patterns: Array<[RegExp, CompetencyKind]> = [
    [/^Fundamentos\s+(?:de|do|da|dos|das)\s+/i, 'Fundamentos'],
    [/^Aplicação Prática e Decisão\s+(?:em|no|na|nos|nas)\s+/i, 'Aplicação e decisão'],
    [/^Articulação SuVeCA e Armadilhas de Prova\s+(?:em|no|na|nos|nas)\s+/i, 'SuVeCA e armadilhas'],
    [/^Objetivo\s+\d+\s+—\s+/i, 'Objetivo de aprendizagem'],
  ];

  for (const [pattern, resolvedKind] of patterns) {
    if (!pattern.test(title)) continue;
    kind = resolvedKind;
    title = title.replace(pattern, '');
    break;
  }

  title = stripRepeatedTopic(title)
    .replace(/\s+-\s+Questões(?=\s*(?:—|$))/gi, '')
    .replace(/\s+-\s+Teoria(?=\s*(?:—|$))/gi, '')
    .replace(/\s+—\s+(.+?)\s+—\s+\1$/i, ' — $1');

  if (isQuestionPractice && kind === 'Objetivo de aprendizagem') kind = 'Prática de questões';

  return {
    title: normalizeWhitespace(title) || 'Competência curricular',
    kind,
  };
};

export const stripContextualPrefix = (value: string, prefix: RegExp): string =>
  normalizeWhitespace(value).replace(prefix, '').trim();
