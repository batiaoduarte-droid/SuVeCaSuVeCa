import { describe, expect, it } from 'vitest';
import {
  isPedagogicalMacroCatalog,
  parsePedagogicalMacroCatalog,
  parsePublishedPedagogicalMacroCatalog,
  PedagogicalMacroContractError,
} from './pedagogicalMacroContract';

const HASH = 'a'.repeat(64);

const makeCatalog = () => ({
  schemaVersion: '1.0.0',
  documentKind: 'compiled_macro_catalog',
  catalogId: 'fixture-macro-catalog',
  sourceBuild: {
    buildId: 'fixture-build',
    atomicGroupManifest: { path: 'atomic.json', sha256: HASH, sizeBytes: 1 },
    viewManifest: { path: 'views/manifest.json', sha256: HASH, sizeBytes: 1 },
    pblManifest: { path: 'pbl_manifest.json', sha256: HASH, sizeBytes: 1 },
  },
  summary: {
    regularEntries: 1,
    fusions: 0,
    journeys: 1,
    autonomous: 0,
    cumulativeReviewEntries: 1,
    learnerFacingEntries: 2,
    regularUnits: 2,
    cumulativeReviewUnits: 1,
    competencies: 2,
  },
  regularEntries: [{
    macroId: 'MACRO-A00-01',
    lessonId: 'A00',
    order: 1,
    title: 'Fundamentos',
    entryKind: 'journey',
    topology: 'linear',
    unitRefs: ['IP-A00-G01', 'IP-A00-G02'],
    nodes: [
      { nodeId: 'G01', unitRef: 'IP-A00-G01', role: 'foundation' },
      { nodeId: 'G02', unitRef: 'IP-A00-G02', role: 'application' },
    ],
    edges: [{
      edgeId: 'EDGE-A00-01',
      from: 'G01',
      to: 'G02',
      policy: 'checkpoint',
      masteryInheritance: false,
    }],
    checkpoints: [{
      checkpointId: 'CHECK-A00-01',
      requiredNodeIds: ['G01'],
      mode: 'all',
      evidenceSource: 'competency_mastery',
      masteryInheritance: false,
    }],
    blockers: [],
    competencyRefs: ['COMP-A00-G01-01', 'COMP-A00-G02-01'],
    learningObjectiveRefs: ['OBJ-IP-A00-G01-01', 'OBJ-IP-A00-G02-01'],
  }],
  cumulativeReviewEntries: [{
    macroId: 'REVIEW-A14-S01',
    lessonId: 'A14',
    order: 1,
    title: 'Revisão cumulativa',
    entryKind: 'cumulative_review',
    topology: 'single',
    unitRefs: ['IP-A14-S01'],
    nodes: [{ nodeId: 'S01', unitRef: 'IP-A14-S01', role: 'integration' }],
    edges: [],
    checkpoints: [],
    blockers: [],
    competencyRefs: [],
    learningObjectiveRefs: [],
  }],
  cumulativeReviewProjection: 'one_entry_per_a14_view',
  adaptiveLinks: [],
  identityIntegrity: {
    regularUnitIds: { count: 2, sha256: HASH },
    cumulativeReviewUnitIds: { count: 1, sha256: HASH },
    competencyIds: { count: 2, sha256: HASH },
    learningObjectiveIds: { count: 2, sha256: HASH },
    questionIds: { count: 3, sha256: HASH },
  },
});

describe('pedagogicalMacroContract', () => {
  it('aceita o contrato estrutural e comprova evidência atômica exata', () => {
    const catalog = makeCatalog();
    const parsed = parsePedagogicalMacroCatalog(catalog, {
      regularUnitIds: ['IP-A00-G01', 'IP-A00-G02'],
      cumulativeReviewUnitIds: ['IP-A14-S01'],
      competencyRefsByUnit: {
        'IP-A00-G01': ['COMP-A00-G01-01'],
        'IP-A00-G02': ['COMP-A00-G02-01'],
        'IP-A14-S01': [],
      },
      learningObjectiveRefsByUnit: {
        'IP-A00-G01': ['OBJ-IP-A00-G01-01'],
        'IP-A00-G02': ['OBJ-IP-A00-G02-01'],
        'IP-A14-S01': [],
      },
    });
    expect(parsed.catalogId).toBe('fixture-macro-catalog');
    expect(isPedagogicalMacroCatalog(catalog)).toBe(true);
  });

  it('rejeita ciclos, herança de mastery e referências duplicadas', () => {
    const catalog = makeCatalog();
    catalog.regularEntries[0].edges.push({
      edgeId: 'EDGE-A00-02',
      from: 'G02',
      to: 'G01',
      policy: 'open',
      masteryInheritance: false,
    });
    catalog.regularEntries[0].edges[0].masteryInheritance = true;
    catalog.regularEntries[0].unitRefs.push('IP-A00-G01');
    expect(() => parsePedagogicalMacroCatalog(catalog)).toThrow(PedagogicalMacroContractError);
    try {
      parsePedagogicalMacroCatalog(catalog);
    } catch (error) {
      expect((error as PedagogicalMacroContractError).issues.join('\n')).toMatch(/ciclo|duplicado|masteryInheritance/i);
    }
  });

  it('rejeita competencyRefs que não sejam a união exata dos unitRefs', () => {
    const catalog = makeCatalog();
    catalog.regularEntries[0].competencyRefs = ['COMP-A00-G01-01'];
    catalog.summary.competencies = 1;
    catalog.identityIntegrity.competencyIds.count = 1;
    expect(() => parsePedagogicalMacroCatalog(catalog, {
      competencyRefsByUnit: {
        'IP-A00-G01': ['COMP-A00-G01-01'],
        'IP-A00-G02': ['COMP-A00-G02-01'],
        'IP-A14-S01': [],
      },
    })).toThrow(/união exata/i);
  });

  it('não promove fixture parcial ao contrato publicado 55/13/68', () => {
    expect(() => parsePublishedPedagogicalMacroCatalog(makeCatalog())).toThrow(/esperado 55/i);
  });
});
