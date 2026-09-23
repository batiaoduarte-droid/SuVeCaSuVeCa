import type { CumulativeReviewView, PedagogicalUnitView } from '../types/pedagogicalView';
import type { ModuleSection } from '../types/suveca';

// All 115 published sections, including A14, already carry this stable ID.
// Routing and persisted notes/progress must never infer it from a legacy URL.
export const unitIdForSection = (section?: ModuleSection): string | null =>
  section?.editorial?.integrationUnitId || null;

export type PublishedPedagogicalView = PedagogicalUnitView | CumulativeReviewView;

export const isSupportedPedagogicalViewVersion = (version: unknown) =>
  version === '1.0.0' || (typeof version === 'string' && version.startsWith('4.2.'));

export const parsePublishedPedagogicalView = (
  value: unknown,
  expectedUnitId: string,
): PublishedPedagogicalView => {
  if (!value || typeof value !== 'object') throw new Error('View Model inválida.');
  const view = value as Record<string, any>;
  if (!isSupportedPedagogicalViewVersion(view.viewSchemaVersion)) {
    throw new Error(`Versão de View Model não suportada: ${String(view.viewSchemaVersion)}.`);
  }

  const unitId = view.unit?.unitId || view.source?.unitId;
  if (unitId !== expectedUnitId) {
    throw new Error(`View Model divergente: esperado ${expectedUnitId}, recebido ${String(unitId)}.`);
  }
  if (!view.unit?.title || !view.sections || typeof view.sections !== 'object') {
    throw new Error(`${expectedUnitId}: contrato pedagógico incompleto.`);
  }

  const expectedLessonId = expectedUnitId.slice(3, 6);
  const lessonId = view.unit?.lessonId || view.source?.lessonId || expectedLessonId;
  if (lessonId !== expectedLessonId) {
    throw new Error(`${expectedUnitId}: aula divergente (${String(lessonId)}).`);
  }

  return value as PublishedPedagogicalView;
};

export const isCumulativeReviewView = (
  view: PublishedPedagogicalView,
): view is CumulativeReviewView =>
  'unitType' in view && view.unitType === 'cumulative_review';
