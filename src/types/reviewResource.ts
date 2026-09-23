/** Published review resource contract v1. Authored in the factory; no learner state. */
export const REVIEW_SCHEMA_VERSION = '1.0.0' as const;
export const REVIEW_ROLES = ['context', 'error', 'mechanism', 'correction', 'criterion', 'example', 'boundary', 'answer', 'step', 'left', 'right'] as const;
export type ReviewRole = typeof REVIEW_ROLES[number];
export interface ReviewBlock {
  id: string;
  role: ReviewRole;
  title: string;
  /** Native paragraph text. Markdown/LaTeX formatting remains presentation only. */
  text: string;
  provenanceRefs: string[];
}
export interface ReviewProvenance {
  ref: string;
  collection: string;
  recordSha256: string;
  field?: string;
  /** UTF-16 offsets in the exact source field; present only for verbatim extraction. */
  span?: [number, number];
  textSha256?: string;
}
export interface ReviewResource {
  schemaVersion: typeof REVIEW_SCHEMA_VERSION;
  deliveryVersion: 1;
  contentId: string;
  contentVersion: string;
  cardId: string;
  unitRefs: string[];
  learningObjectiveRefs: string[];
  conceptRefs: string[];
  front: string;
  back: string;
  hint?: string;
  explanation?: string;
  answer: { type: 'integral'; text: string } | { type: 'structured'; blocks: ReviewBlock[] };
  provenance: ReviewProvenance[];
  fieldAvailability: Record<string, 'available' | 'absent' | 'not_applicable' | 'blocked'>;
  publication: {
    operation: 'preserved' | 'restructured' | 'reauthored' | 'bizu_variant';
    reviewRef: string;
    preservesSchedule: boolean;
    supersedes?: string;
  };
}
export interface ReviewFile { file: string; bytes: number; sha256: string }
export interface ReviewManifest {
  schemaVersion: typeof REVIEW_SCHEMA_VERSION;
  deliveryVersion: 1;
  cards: Record<string, { contentId: string; contentVersion: string; unit: string }>;
  units: Record<string, ReviewFile>;
}
const object = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every(text);
const hash = (x: unknown) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
export function parseReviewResource(value: unknown, expectedCardId?: string): ReviewResource {
  if (!object(value) || value.schemaVersion !== REVIEW_SCHEMA_VERSION || value.deliveryVersion !== 1) throw new Error('Contrato de revisão incompatível.');
  if (![value.contentId, value.contentVersion, value.cardId, value.front, value.back].every(text)
    || (expectedCardId && value.cardId !== expectedCardId)
    || !strings(value.unitRefs) || !value.unitRefs.length || !strings(value.learningObjectiveRefs) || !strings(value.conceptRefs)) throw new Error('Identidade de revisão inválida.');
  if (!Array.isArray(value.provenance) || !value.provenance.length || !value.provenance.every(p => object(p) && text(p.ref) && text(p.collection) && hash(p.recordSha256))) throw new Error('Origem de revisão inválida.');
  const refs = new Set(value.provenance.map(p => p.ref));
  if (!object(value.answer)) throw new Error('Resposta de revisão ausente.');
  if (value.answer.type === 'integral') {
    if (value.answer.text !== value.back) throw new Error('Resposta integral divergente.');
  } else if (value.answer.type === 'structured') {
    if (!Array.isArray(value.answer.blocks) || !value.answer.blocks.length) throw new Error('Blocos de revisão ausentes.');
    const ids = new Set<string>();
    for (const block of value.answer.blocks) {
      if (!object(block) || !text(block.id) || ids.has(block.id) || !text(block.title) || !text(block.text)
        || !REVIEW_ROLES.includes(block.role as ReviewRole) || !strings(block.provenanceRefs) || !block.provenanceRefs.length
        || !block.provenanceRefs.every(r => refs.has(r))) throw new Error('Bloco de revisão inválido.');
      ids.add(block.id);
    }
  } else throw new Error('Tipo de resposta desconhecido.');
  if (!object(value.fieldAvailability) || !Object.values(value.fieldAvailability).every(v => ['available','absent','not_applicable','blocked'].includes(String(v)))) throw new Error('Disponibilidade inválida.');
  if (!object(value.publication) || !['preserved','restructured','reauthored','bizu_variant'].includes(String(value.publication.operation))
    || !text(value.publication.reviewRef) || typeof value.publication.preservesSchedule !== 'boolean') throw new Error('Recibo de publicação ausente.');
  if (value.publication.supersedes && (value.publication.preservesSchedule || value.publication.supersedes === value.cardId)) throw new Error('Migração de domínio inválida.');
  return value as unknown as ReviewResource;
}
export function parseReviewManifest(value: unknown): ReviewManifest {
  if (!object(value) || value.schemaVersion !== REVIEW_SCHEMA_VERSION || value.deliveryVersion !== 1 || !object(value.cards) || !object(value.units)) throw new Error('Índice de revisão incompatível.');
  for (const descriptor of Object.values(value.units)) {
    if (!object(descriptor) || !text(descriptor.file) || descriptor.file.includes('..') || descriptor.file.startsWith('/') || /[:?\\#]/.test(descriptor.file)
      || !Number.isSafeInteger(descriptor.bytes) || Number(descriptor.bytes) <= 0 || !hash(descriptor.sha256)) throw new Error('Fragmento de revisão inválido.');
  }
  for (const entry of Object.values(value.cards)) {
    if (!object(entry) || !text(entry.contentId) || !text(entry.contentVersion) || !text(entry.unit) || !value.units[entry.unit]) throw new Error('Referência de revisão inválida.');
  }
  return value as unknown as ReviewManifest;
}

