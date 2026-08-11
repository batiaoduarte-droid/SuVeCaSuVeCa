import { KNOWLEDGE_BUILD, KNOWLEDGE_INDEX } from '../data/knowledgeIndex.generated';

export type KnowledgeRecord = (typeof KNOWLEDGE_INDEX)[number];

export interface KnowledgeSourceFact {
  id?: string;
  title?: string;
  keywords?: string[];
  sourceFact?: string;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP_WORDS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e',
  'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'por', 'que', 'se',
  'um', 'uma', 'uma', 'isso', 'essa', 'esse', 'esta', 'este',
]);

const tokens = (value: string) =>
  [...new Set(normalize(value).split(' ').filter((token) => token.length > 2 && !STOP_WORDS.has(token)))];

const recordSearchFields = (record: KnowledgeRecord) => ({
  title: normalize(record.title),
  routing: normalize(record.routingTerms.join(' ')),
  normalizedRule: normalize(
    `${record.normalizedRule.description} ${record.normalizedRule.sections
      .map((section) => `${section.title} ${section.content}`)
      .join(' ')}`
  ),
  canonicalProfile: normalize([
    ...record.canonicalProfile.normalizedClaims,
    ...record.canonicalProfile.limitsAndExceptions,
    ...record.canonicalProfile.examTraps,
  ].join(' ')),
  sources: normalize(
    (record.sourceFacts as unknown as KnowledgeSourceFact[])
      .map((source) => `${source.title || ''} ${(source.keywords || []).join(' ')}`)
      .join(' ')
  ),
});

export const retrieveKnowledge = (query: string, limit = 3): KnowledgeRecord[] => {
  const normalizedQuery = normalize(query);
  const queryTokens = tokens(query);
  const ranked = KNOWLEDGE_INDEX.map((record) => {
    const fields = recordSearchFields(record);
    let score = 0;

    if (normalizedQuery.length > 3 && fields.title.includes(normalizedQuery)) score += 40;
    if (normalizedQuery.length > 3 && fields.routing.includes(normalizedQuery)) score += 32;
    for (const token of queryTokens) {
      if (fields.title.includes(token)) score += 9;
      if (fields.routing.includes(token)) score += 7;
      if (fields.canonicalProfile.includes(token)) score += 6;
      if (fields.normalizedRule.includes(token)) score += 3;
      if (fields.sources.includes(token)) score += 2;
    }
    return { record, score };
  }).sort((first, second) => second.score - first.score);

  const matches = ranked.filter((item) => item.score > 0).slice(0, Math.max(1, limit));
  if (matches.length) return matches.map((item) => item.record);

  return KNOWLEDGE_INDEX.filter((record) => ['mod0', 'mod7', 'mod8'].includes(record.moduleId)).slice(0, limit);
};

const compact = (value: string, maxLength: number) => {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}…`;
};

/** Produces a bounded, provenance-aware context for Gemini/RAG prompts. */
export const formatKnowledgeContext = (records: readonly KnowledgeRecord[]) => {
  const body = records.map((record) => {
    const normalizedRules = record.normalizedRule.sections
      .slice(0, 3)
      .map((section) => `- ${section.title}: ${compact(section.content, 900)}`)
      .join('\n');
    const provenance = (record.sourceFacts as unknown as KnowledgeSourceFact[])
      .slice(0, 4)
      .map((source) => `- [KB:${source.id || ''}] ${source.title || ''}`)
      .join('\n');
    const canonicalClaims = record.canonicalProfile.normalizedClaims
      .slice(0, 8)
      .map((claim) => `- ${compact(claim, 520)}`)
      .join('\n');
    const limits = record.canonicalProfile.limitsAndExceptions
      .slice(0, 6)
      .map((limit) => `- ${compact(limit, 420)}`)
      .join('\n');
    const traps = record.canonicalProfile.examTraps
      .slice(0, 5)
      .map((trap) => `- ${compact(trap, 320)}`)
      .join('\n');
    const evidenceRefs = record.canonicalProfile.evidenceRefs
      .slice(0, 8)
      .map((ref) => `- [PASSAGE:${ref}]`)
      .join('\n');

    return [
      `REGISTRO ${record.id} — ${record.title}`,
      `Estado editorial: ${record.audit.editorialStatus}; suporte: ${record.audit.structuralStatus}.`,
      'REGRA NORMALIZADA:',
      normalizedRules,
      'PERFIL CANÔNICO V3 — AFIRMAÇÕES ADJUDICADAS:',
      canonicalClaims || '- Sem afirmação específica; use apenas a regra normalizada da seção.',
      'LIMITES E EXCEÇÕES V3:',
      limits || '- Nenhum limite específico recuperado.',
      'PEGADINHAS DE PROVA V3:',
      traps || '- Nenhuma pegadinha específica recuperada.',
      'INTERPRETAÇÃO SuVeCA:',
      record.suvecaInterpretation.subtitle,
      'PROVENIÊNCIA (títulos de fontes; não usar como regra sem o perfil adjudicado):',
      provenance,
      'PASSAGENS AUDITADAS:',
      evidenceRefs,
    ].join('\n');
  }).join('\n\n');

  return `BASE CANÔNICA SuVeCA ${KNOWLEDGE_BUILD.schemaVersion} (build ${KNOWLEDGE_BUILD.buildId})\n${body}`;
};

export { KNOWLEDGE_BUILD };
