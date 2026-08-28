import {
  PEDAGOGICAL_MACRO_ADAPTIVE_LINKS,
  PEDAGOGICAL_MACRO_INDEX,
} from './pedagogicalMacroCatalog.generated';
import type {
  PedagogicalMacroAdaptiveLink,
  PedagogicalMacroIndexEntry,
} from '../types/pedagogicalMacro';

export interface PedagogicalMacroResolvers {
  getAll(): readonly PedagogicalMacroIndexEntry[];
  getById(macroId: string): PedagogicalMacroIndexEntry | undefined;
  getForLesson(lessonId: string): readonly PedagogicalMacroIndexEntry[];
  resolveUnits(macroId: string): readonly string[] | undefined;
  resolveMacroForUnit(unitId: string): PedagogicalMacroIndexEntry | undefined;
  resolveCompetencies(macroId: string): readonly string[] | undefined;
  resolveAdaptiveLinksFromUnit(unitId: string): readonly PedagogicalMacroAdaptiveLink[];
  resolveAdaptiveLinksToUnit(unitId: string): readonly PedagogicalMacroAdaptiveLink[];
}

/**
 * Builds exact-ID resolvers. Invalid or ambiguous indexes are rejected at
 * construction time; lookup functions never guess a similar macro or unit.
 */
export const createPedagogicalMacroResolvers = (
  entries: readonly PedagogicalMacroIndexEntry[],
  adaptiveLinks: readonly PedagogicalMacroAdaptiveLink[] = [],
): PedagogicalMacroResolvers => {
  const byId = new Map<string, PedagogicalMacroIndexEntry>();
  const byUnit = new Map<string, PedagogicalMacroIndexEntry>();
  const byLesson = new Map<string, PedagogicalMacroIndexEntry[]>();

  for (const entry of entries) {
    if (byId.has(entry.macroId)) {
      throw new Error(`Índice macro inválido: macroId duplicado '${entry.macroId}'.`);
    }
    byId.set(entry.macroId, entry);
    const lessonEntries = byLesson.get(entry.lessonId) ?? [];
    lessonEntries.push(entry);
    byLesson.set(entry.lessonId, lessonEntries);

    if (new Set(entry.unitRefs).size !== entry.unitRefs.length) {
      throw new Error(`Índice macro inválido: unitRef duplicada em '${entry.macroId}'.`);
    }
    if (new Set(entry.competencyRefs).size !== entry.competencyRefs.length) {
      throw new Error(`Índice macro inválido: competencyRef duplicada em '${entry.macroId}'.`);
    }
    for (const unitId of entry.unitRefs) {
      const previous = byUnit.get(unitId);
      if (previous) {
        throw new Error(
          `Índice macro inválido: unidade '${unitId}' pertence a '${previous.macroId}' e '${entry.macroId}'.`,
        );
      }
      byUnit.set(unitId, entry);
    }
  }

  for (const lessonEntries of byLesson.values()) {
    lessonEntries.sort((left, right) => left.order - right.order || left.macroId.localeCompare(right.macroId));
  }

  const linksFromUnit = new Map<string, PedagogicalMacroAdaptiveLink[]>();
  const linksToUnit = new Map<string, PedagogicalMacroAdaptiveLink[]>();
  for (const link of adaptiveLinks) {
    if (!byUnit.has(link.fromUnitRef) || !byUnit.has(link.toUnitRef)) {
      throw new Error(
        `Índice macro inválido: link adaptativo referencia '${link.fromUnitRef}' → '${link.toUnitRef}'.`,
      );
    }
    const from = linksFromUnit.get(link.fromUnitRef) ?? [];
    from.push(link);
    linksFromUnit.set(link.fromUnitRef, from);
    const to = linksToUnit.get(link.toUnitRef) ?? [];
    to.push(link);
    linksToUnit.set(link.toUnitRef, to);
  }

  return {
    getAll: () => entries,
    getById: (macroId) => byId.get(macroId),
    getForLesson: (lessonId) => byLesson.get(lessonId) ?? [],
    resolveUnits: (macroId) => byId.get(macroId)?.unitRefs,
    resolveMacroForUnit: (unitId) => byUnit.get(unitId),
    resolveCompetencies: (macroId) => byId.get(macroId)?.competencyRefs,
    resolveAdaptiveLinksFromUnit: (unitId) => linksFromUnit.get(unitId) ?? [],
    resolveAdaptiveLinksToUnit: (unitId) => linksToUnit.get(unitId) ?? [],
  };
};

export const PEDAGOGICAL_MACRO_CATALOG = createPedagogicalMacroResolvers(
  PEDAGOGICAL_MACRO_INDEX,
  PEDAGOGICAL_MACRO_ADAPTIVE_LINKS,
);

export const getPedagogicalMacroById = (macroId: string) =>
  PEDAGOGICAL_MACRO_CATALOG.getById(macroId);

export const getPedagogicalMacrosForLesson = (lessonId: string) =>
  PEDAGOGICAL_MACRO_CATALOG.getForLesson(lessonId);

export const resolvePedagogicalUnitsForMacro = (macroId: string) =>
  PEDAGOGICAL_MACRO_CATALOG.resolveUnits(macroId);

export const resolvePedagogicalMacroForUnit = (unitId: string) =>
  PEDAGOGICAL_MACRO_CATALOG.resolveMacroForUnit(unitId);

export const resolvePedagogicalCompetenciesForMacro = (macroId: string) =>
  PEDAGOGICAL_MACRO_CATALOG.resolveCompetencies(macroId);

export const resolveAdaptiveMacroLinksFromUnit = (unitId: string) =>
  PEDAGOGICAL_MACRO_CATALOG.resolveAdaptiveLinksFromUnit(unitId);

export const resolveAdaptiveMacroLinksToUnit = (unitId: string) =>
  PEDAGOGICAL_MACRO_CATALOG.resolveAdaptiveLinksToUnit(unitId);
