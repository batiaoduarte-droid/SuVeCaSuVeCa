import { MODULES_DATA } from '../data/modulesData';
import {
  getPedagogicalMacroById,
  resolvePedagogicalMacroForUnit,
} from '../data/pedagogicalMacroCatalog';

export interface StudyLocation {
  moduleId: string | null;
  macroId: string | null;
  unitId: string | null;
  sectionId: string | null;
  routeIssue: 'invalid_unit' | 'invalid_macro' | null;
}

export interface StudyLocationResolver {
  isKnownModule(moduleId: string): boolean;
  moduleIdForUnit(unitId: string): string | null;
  macroIdForUnit(unitId: string): string | null;
  unitsForMacro(macroId: string): readonly string[] | null;
}

const unitIdForSection = (section: (typeof MODULES_DATA)[number]['sections'][number]) => {
  const cumulativeMatch = section.contentUrl?.match(/A14-(S\d+)/);
  return section.editorial?.integrationUnitId
    || (cumulativeMatch ? `IP-A14-${cumulativeMatch[1]}` : null);
};
export const moduleIdForUnit = (unitId: string | null): string | null => {
  if (!unitId) return null;
  return MODULES_DATA.find((module) => module.sections.some(
    (section) => unitIdForSection(section) === unitId,
  ))?.id || null;
};

export const DEFAULT_STUDY_LOCATION_RESOLVER: StudyLocationResolver = {
  isKnownModule: (moduleId) => MODULES_DATA.some((module) => module.id === moduleId),
  moduleIdForUnit,
  macroIdForUnit: (unitId) => resolvePedagogicalMacroForUnit(unitId)?.macroId || null,
  unitsForMacro: (macroId) => getPedagogicalMacroById(macroId)?.unitRefs || null,
};

const validSectionId = (value: string | null): string | null =>
  /^[a-z][a-z0-9-]*$/.test(value || '') ? value : null;

/**
 * Parses exact curriculum identities only. Invalid units are never replaced by
 * a similar ID; a valid atomic unit always wins over a stale/invalid macro.
 */
export const parseStudyLocation = (
  search: string,
  resolver: StudyLocationResolver = DEFAULT_STUDY_LOCATION_RESOLVER,
): StudyLocation => {
  const params = new URLSearchParams(search);
  const requestedUnit = params.get('unit');
  const requestedMacro = params.get('macro');
  const requestedModule = params.get('module');
  const unitModule = requestedUnit ? resolver.moduleIdForUnit(requestedUnit) : null;

  if (requestedUnit && !unitModule) {
    return {
      moduleId: requestedModule && resolver.isKnownModule(requestedModule) ? requestedModule : null,
      macroId: null,
      unitId: null,
      sectionId: null,
      routeIssue: 'invalid_unit',
    };
  }

  if (requestedUnit && unitModule) {
    const inferredMacro = resolver.macroIdForUnit(requestedUnit);
    const requestedMacroUnits = requestedMacro ? resolver.unitsForMacro(requestedMacro) : null;
    const macroId = requestedMacroUnits?.includes(requestedUnit)
      ? requestedMacro
      : inferredMacro;
    return {
      moduleId: unitModule,
      macroId,
      unitId: requestedUnit,
      sectionId: validSectionId(params.get('section')),
      routeIssue: null,
    };
  }

  if (requestedMacro) {
    const unitRefs = resolver.unitsForMacro(requestedMacro);
    if (!unitRefs?.length) {
      return {
        moduleId: requestedModule && resolver.isKnownModule(requestedModule) ? requestedModule : null,
        macroId: null,
        unitId: null,
        sectionId: null,
        routeIssue: 'invalid_macro',
      };
    }
    const firstUnit = unitRefs[0];
    return {
      moduleId: resolver.moduleIdForUnit(firstUnit),
      macroId: requestedMacro,
      unitId: firstUnit,
      sectionId: null,
      routeIssue: null,
    };
  }

  return {
    moduleId: requestedModule && resolver.isKnownModule(requestedModule) ? requestedModule : null,
    macroId: null,
    unitId: null,
    sectionId: null,
    routeIssue: null,
  };
};

export const readStudyLocation = (): StudyLocation =>
  parseStudyLocation(window.location.search);

export const studyLocationUrl = (currentUrl: string, location: StudyLocation): string => {
  const url = new URL(currentUrl);
  const setOrDelete = (key: string, value: string | null) => value
    ? url.searchParams.set(key, value)
    : url.searchParams.delete(key);
  setOrDelete('module', location.moduleId);
  setOrDelete('macro', location.macroId);
  setOrDelete('unit', location.unitId);
  setOrDelete('section', location.sectionId);
  return `${url.pathname}${url.search}${url.hash}`;
};

export const writeStudyLocation = (
  location: Omit<StudyLocation, 'routeIssue'>,
  mode: 'push' | 'replace',
) => {
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](
    {},
    '',
    studyLocationUrl(window.location.href, { ...location, routeIssue: null }),
  );
};
