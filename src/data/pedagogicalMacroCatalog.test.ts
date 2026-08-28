import { describe, expect, it } from 'vitest';
import type {
  PedagogicalMacroAdaptiveLink,
  PedagogicalMacroIndexEntry,
} from '../types/pedagogicalMacro';
import { createPedagogicalMacroResolvers } from './pedagogicalMacroCatalog';

const graph = {
  nodes: [{ nodeId: 'G01', unitRef: 'IP-A00-G01', role: 'acquisition' as const }],
  edges: [],
  checkpoints: [],
  blockers: [],
};

const entries: readonly PedagogicalMacroIndexEntry[] = [
  {
    macroId: 'MACRO-A00-01',
    lessonId: 'A00',
    order: 1,
    title: 'Primeira macroentrada',
    entryKind: 'autonomous',
    topology: 'single',
    unitRefs: ['IP-A00-G01'],
    competencyRefs: ['COMP-A00-G01-01'],
    competencies: [{ competencyId: 'COMP-A00-G01-01', unitId: 'IP-A00-G01', title: 'Competência 1' }],
    ...graph,
  },
  {
    macroId: 'MACRO-A01-01',
    lessonId: 'A01',
    order: 1,
    title: 'Segunda macroentrada',
    entryKind: 'autonomous',
    topology: 'single',
    unitRefs: ['IP-A01-G01'],
    competencyRefs: ['COMP-A01-G01-01'],
    competencies: [{ competencyId: 'COMP-A01-G01-01', unitId: 'IP-A01-G01', title: 'Competência 2' }],
    nodes: [{ nodeId: 'G01', unitRef: 'IP-A01-G01', role: 'acquisition' }],
    edges: [],
    checkpoints: [],
    blockers: [],
  },
];

const links: readonly PedagogicalMacroAdaptiveLink[] = [{
  adaptiveLinkId: 'ADAPT-A00-A01-01',
  fromUnitRef: 'IP-A00-G01',
  toUnitRef: 'IP-A01-G01',
  scope: 'cross_lesson',
  relationType: 'prerequisite',
  policy: 'advisory_prerequisite',
  evidenceSource: 'competency_mastery',
  masteryInheritance: false,
}];

describe('pedagogicalMacroCatalog resolvers', () => {
  it('resolve macro, unidades e competências somente por IDs exatos', () => {
    const catalog = createPedagogicalMacroResolvers(entries, links);
    expect(catalog.resolveUnits('MACRO-A00-01')).toEqual(['IP-A00-G01']);
    expect(catalog.resolveCompetencies('MACRO-A00-01')).toEqual(['COMP-A00-G01-01']);
    expect(catalog.resolveMacroForUnit('IP-A00-G01')?.macroId).toBe('MACRO-A00-01');
    expect(catalog.getForLesson('A01').map((entry) => entry.macroId)).toEqual(['MACRO-A01-01']);
    expect(catalog.getById('macro-a00-01')).toBeUndefined();
    expect(catalog.resolveMacroForUnit('IP-A00-G99')).toBeUndefined();
  });

  it('expõe links adaptativos sem herdar mastery', () => {
    const catalog = createPedagogicalMacroResolvers(entries, links);
    expect(catalog.resolveAdaptiveLinksFromUnit('IP-A00-G01')).toEqual(links);
    expect(catalog.resolveAdaptiveLinksToUnit('IP-A01-G01')[0].masteryInheritance).toBe(false);
  });

  it('falha ao construir índice ambíguo ou com link órfão', () => {
    expect(() => createPedagogicalMacroResolvers([...entries, entries[0]])).toThrow(/macroId duplicado/i);
    expect(() => createPedagogicalMacroResolvers(entries, [{
      ...links[0],
      toUnitRef: 'IP-A99-G01',
    }])).toThrow(/link adaptativo/i);
  });
});
