export interface LessonCatalogEntry {
  lessonId: string;
  moduleId: string;
  order: number;
  shortTitle: string;
  fullTitle: string;
}

export const LESSON_CATALOG: readonly LessonCatalogEntry[] = [
  { lessonId: 'A00', moduleId: 'mod0', order: 0, shortTitle: 'Ortografia e fonologia', fullTitle: 'Ortografia, fonologia e convenções gráficas' },
  { lessonId: 'A01', moduleId: 'mod1', order: 1, shortTitle: 'Classes de palavras I', fullTitle: 'Substantivos, adjetivos, artigos, numerais, advérbios e interjeições' },
  { lessonId: 'A02', moduleId: 'mod2', order: 2, shortTitle: 'Classes de palavras II', fullTitle: 'Preposições e conjunções' },
  { lessonId: 'A03', moduleId: 'mod3', order: 3, shortTitle: 'Pronomes e colocação', fullTitle: 'Pronomes e colocação pronominal' },
  { lessonId: 'A04', moduleId: 'mod4', order: 4, shortTitle: 'Verbos I', fullTitle: 'Tempos, modos e formas verbais' },
  { lessonId: 'A05', moduleId: 'mod5', order: 5, shortTitle: 'Verbos II', fullTitle: 'Correlação, vozes e relações verbais' },
  { lessonId: 'A06', moduleId: 'mod6', order: 6, shortTitle: 'Sintaxe I', fullTitle: 'Estrutura morfossintática e termos da oração' },
  { lessonId: 'A07', moduleId: 'mod7', order: 7, shortTitle: 'Sintaxe II', fullTitle: 'Período composto, coordenação e subordinação' },
  { lessonId: 'A08', moduleId: 'mod8', order: 8, shortTitle: 'Pontuação', fullTitle: 'Pontuação e organização sintática' },
  { lessonId: 'A09', moduleId: 'mod9', order: 9, shortTitle: 'Concordância', fullTitle: 'Concordância verbal e nominal' },
  { lessonId: 'A10', moduleId: 'mod10', order: 10, shortTitle: 'Regência e crase', fullTitle: 'Regência verbal e nominal e crase' },
  { lessonId: 'A11', moduleId: 'mod11', order: 11, shortTitle: 'Coesão e reescrita', fullTitle: 'Coesão textual, referenciação e reescrita' },
  { lessonId: 'A12', moduleId: 'mod12', order: 12, shortTitle: 'Semântica', fullTitle: 'Semântica e significação das palavras' },
  { lessonId: 'A13', moduleId: 'mod13', order: 13, shortTitle: 'Interpretação e tipologia', fullTitle: 'Compreensão, interpretação e tipologia textual' },
  { lessonId: 'A14', moduleId: 'mod14', order: 14, shortTitle: 'Revisão geral', fullTitle: 'Revisão geral de Língua Portuguesa' },
] as const;

const BY_LESSON_ID = new Map(LESSON_CATALOG.map((entry) => [entry.lessonId, entry]));
const BY_MODULE_ID = new Map(LESSON_CATALOG.map((entry) => [entry.moduleId, entry]));

export const normalizeLessonId = (value?: string | number | null): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `A${String(value).padStart(2, '0')}`;
  }
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  const lessonMatch = normalized.match(/^A?(\d{1,2})$/);
  if (lessonMatch) return `A${lessonMatch[1].padStart(2, '0')}`;
  const moduleMatch = normalized.match(/^MOD(\d{1,2})$/);
  return moduleMatch ? `A${moduleMatch[1].padStart(2, '0')}` : null;
};
export const getLessonEntry = (value?: string | number | null): LessonCatalogEntry | undefined => {
  if (typeof value === 'string' && BY_MODULE_ID.has(value.toLowerCase())) {
    return BY_MODULE_ID.get(value.toLowerCase());
  }
  const lessonId = normalizeLessonId(value);
  return lessonId ? BY_LESSON_ID.get(lessonId) : undefined;
};

export const getLessonName = (
  value?: string | number | null,
  variant: 'short' | 'full' = 'short',
): string => {
  const entry = getLessonEntry(value);
  if (entry) return variant === 'full' ? entry.fullTitle : entry.shortTitle;
  return typeof value === 'string' && value.trim() ? value.trim() : 'Conteúdo de Língua Portuguesa';
};

export const getLessonSearchLabel = (value?: string | number | null): string => {
  const entry = getLessonEntry(value);
  return entry ? `${entry.shortTitle} ${entry.fullTitle} ${entry.lessonId}` : getLessonName(value);
};

export const formatLessonRange = (start: string, end: string): string => {
  const startEntry = getLessonEntry(start);
  const endEntry = getLessonEntry(end);
  if (!startEntry || !endEntry) return `${getLessonName(start)} a ${getLessonName(end)}`;
  if (startEntry.lessonId === endEntry.lessonId) return startEntry.shortTitle;
  return `${startEntry.shortTitle} até ${endEntry.shortTitle}`;
};
