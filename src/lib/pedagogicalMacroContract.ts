import {
  PEDAGOGICAL_MACRO_EDGE_POLICIES,
  PEDAGOGICAL_MACRO_ENTRY_KINDS,
  PEDAGOGICAL_MACRO_NODE_ROLES,
  PEDAGOGICAL_MACRO_SCHEMA_VERSION,
  PEDAGOGICAL_MACRO_TOPOLOGIES,
  type PedagogicalMacroCatalog,
  type PedagogicalMacroEntry,
} from '../types/pedagogicalMacro';

const REGULAR_UNIT_PATTERN = /^IP-(A(?:0\d|1[0-3]))-G\d{2}$/;
const CUMULATIVE_UNIT_PATTERN = /^IP-A14-S\d{2}$/;
const MACRO_ID_PATTERN = /^(?:MACRO-A(?:0\d|1[0-3])-\d{2}|REVIEW-A14-S\d{2})$/;
const COMPETENCY_ID_PATTERN = /^COMP-A(?:0\d|1[0-3])-G\d{2}-\d{2}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

type UnknownRecord = Record<string, unknown>;

export interface PedagogicalMacroValidationExpectations {
  regularUnitIds?: readonly string[];
  cumulativeReviewUnitIds?: readonly string[];
  competencyRefsByUnit?: Readonly<Record<string, readonly string[]>>;
  learningObjectiveRefsByUnit?: Readonly<Record<string, readonly string[]>>;
}

export class PedagogicalMacroContractError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Catálogo de macroentradas inválido:\n- ${issues.join('\n- ')}`);
    this.name = 'PedagogicalMacroContractError';
    this.issues = issues;
  }
}

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const stringArray = (
  value: unknown,
  path: string,
  issues: string[],
  pattern?: RegExp,
): string[] => {
  if (!Array.isArray(value)) {
    issues.push(`${path}: esperado array.`);
    return [];
  }
  const parsed: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !item.trim()) {
      issues.push(`${path}[${index}]: esperado texto não vazio.`);
    } else if (pattern && !pattern.test(item)) {
      issues.push(`${path}[${index}]: ID inválido '${item}'.`);
    } else {
      parsed.push(item);
    }
  });
  return parsed;
};

const requireString = (
  record: UnknownRecord,
  key: string,
  path: string,
  issues: string[],
  pattern?: RegExp,
): string => {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    issues.push(`${path}.${key}: esperado texto não vazio.`);
    return '';
  }
  if (pattern && !pattern.test(value)) issues.push(`${path}.${key}: valor inválido '${value}'.`);
  return value;
};

const requireInteger = (
  record: UnknownRecord,
  key: string,
  path: string,
  issues: string[],
): number => {
  const value = record[key];
  if (!Number.isInteger(value) || Number(value) < 0) {
    issues.push(`${path}.${key}: esperado inteiro não negativo.`);
    return -1;
  }
  return Number(value);
};

const assertUnique = (values: readonly string[], path: string, issues: string[]) => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) issues.push(`${path}: valor duplicado '${value}'.`);
    seen.add(value);
  }
};

const sameSet = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

const validateSourceArtifact = (value: unknown, path: string, issues: string[]) => {
  if (!isRecord(value)) {
    issues.push(`${path}: artefato de origem ausente.`);
    return;
  }
  requireString(value, 'path', path, issues);
  requireString(value, 'sha256', path, issues, SHA256_PATTERN);
  const sizeBytes = requireInteger(value, 'sizeBytes', path, issues);
  if (sizeBytes < 1) issues.push(`${path}.sizeBytes: esperado inteiro positivo.`);
};

const validateAcyclicGraph = (
  nodeIds: readonly string[],
  edges: readonly { from: string; to: string }[],
  path: string,
  issues: string[],
) => {
  const adjacency = new Map(nodeIds.map((nodeId) => [nodeId, [] as string[]]));
  for (const edge of edges) adjacency.get(edge.from)?.push(edge.to);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return false;
    if (visited.has(nodeId)) return true;
    visiting.add(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) {
      if (!visit(target)) return false;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return true;
  };

  if (nodeIds.some((nodeId) => !visit(nodeId))) issues.push(`${path}: o grafo contém ciclo.`);
};

interface ParsedEntryEvidence {
  entry: UnknownRecord;
  macroId: string;
  lessonId: string;
  entryKind: string;
  topology: string;
  order: number;
  unitRefs: string[];
  nodeByUnit: Map<string, string>;
  edges: Array<{ edgeId: string; from: string; to: string; policy: string; blockerRef?: string }>;
  blockerIds: Set<string>;
  competencyRefs: string[];
  learningObjectiveRefs: string[];
}

const validateEntry = (
  value: unknown,
  path: string,
  expectedKind: 'regular' | 'cumulative',
  issues: string[],
): ParsedEntryEvidence | null => {
  if (!isRecord(value)) {
    issues.push(`${path}: esperado objeto.`);
    return null;
  }

  const macroId = requireString(value, 'macroId', path, issues, MACRO_ID_PATTERN);
  const lessonId = requireString(value, 'lessonId', path, issues, /^A(?:0\d|1[0-4])$/);
  const order = requireInteger(value, 'order', path, issues);
  if (order < 1) issues.push(`${path}.order: a ordenação começa em 1.`);
  requireString(value, 'title', path, issues);
  const entryKind = requireString(value, 'entryKind', path, issues);
  const topology = requireString(value, 'topology', path, issues);

  if (!(PEDAGOGICAL_MACRO_ENTRY_KINDS as readonly string[]).includes(entryKind)) {
    issues.push(`${path}.entryKind: valor fechado inválido '${entryKind}'.`);
  }
  if (!(PEDAGOGICAL_MACRO_TOPOLOGIES as readonly string[]).includes(topology)) {
    issues.push(`${path}.topology: valor fechado inválido '${topology}'.`);
  }
  const macroLesson = macroId.startsWith('REVIEW-') ? macroId.slice(7, 10) : macroId.slice(6, 9);
  if (macroId && lessonId && macroLesson !== lessonId) {
    issues.push(`${path}: macroId '${macroId}' diverge da aula '${lessonId}'.`);
  }
  if (expectedKind === 'regular' && entryKind === 'cumulative_review') {
    issues.push(`${path}: entrada regular marcada como revisão cumulativa.`);
  }
  if (expectedKind === 'cumulative' && (entryKind !== 'cumulative_review' || lessonId !== 'A14')) {
    issues.push(`${path}: revisão cumulativa deve usar entryKind=cumulative_review e lessonId=A14.`);
  }

  const unitPattern = expectedKind === 'regular' ? REGULAR_UNIT_PATTERN : CUMULATIVE_UNIT_PATTERN;
  const unitRefs = stringArray(value.unitRefs, `${path}.unitRefs`, issues, unitPattern);
  if (unitRefs.length === 0) issues.push(`${path}.unitRefs: ao menos uma unidade é obrigatória.`);
  assertUnique(unitRefs, `${path}.unitRefs`, issues);
  for (const unitRef of unitRefs) {
    const unitLesson = unitRef.slice(3, 6);
    if (unitLesson !== lessonId) issues.push(`${path}: '${unitRef}' atravessa a aula '${lessonId}'.`);
  }

  if (!Array.isArray(value.nodes)) issues.push(`${path}.nodes: esperado array.`);
  const nodes = Array.isArray(value.nodes) ? value.nodes : [];
  const nodeIds: string[] = [];
  const nodeByUnit = new Map<string, string>();
  nodes.forEach((node, index) => {
    const nodePath = `${path}.nodes[${index}]`;
    if (!isRecord(node)) {
      issues.push(`${nodePath}: esperado objeto.`);
      return;
    }
    const nodeId = requireString(node, 'nodeId', nodePath, issues);
    const unitRef = requireString(node, 'unitRef', nodePath, issues, unitPattern);
    const role = requireString(node, 'role', nodePath, issues);
    if (!(PEDAGOGICAL_MACRO_NODE_ROLES as readonly string[]).includes(role)) {
      issues.push(`${nodePath}.role: valor fechado inválido '${role}'.`);
    }
    if (!unitRefs.includes(unitRef)) issues.push(`${nodePath}.unitRef: '${unitRef}' não pertence à entrada.`);
    nodeIds.push(nodeId);
    if (nodeByUnit.has(unitRef)) issues.push(`${path}.nodes: unidade duplicada '${unitRef}'.`);
    nodeByUnit.set(unitRef, nodeId);
  });
  assertUnique(nodeIds, `${path}.nodes.nodeId`, issues);
  if (!sameSet([...nodeByUnit.keys()], unitRefs)) {
    issues.push(`${path}.nodes: deve haver exatamente um nó para cada unitRef.`);
  }

  if (!Array.isArray(value.edges)) issues.push(`${path}.edges: esperado array.`);
  const edgeValues = Array.isArray(value.edges) ? value.edges : [];
  const edges: ParsedEntryEvidence['edges'] = [];
  edgeValues.forEach((edge, index) => {
    const edgePath = `${path}.edges[${index}]`;
    if (!isRecord(edge)) {
      issues.push(`${edgePath}: esperado objeto.`);
      return;
    }
    const edgeId = requireString(edge, 'edgeId', edgePath, issues);
    const from = requireString(edge, 'from', edgePath, issues);
    const to = requireString(edge, 'to', edgePath, issues);
    const policy = requireString(edge, 'policy', edgePath, issues);
    if (!(PEDAGOGICAL_MACRO_EDGE_POLICIES as readonly string[]).includes(policy)) {
      issues.push(`${edgePath}.policy: valor fechado inválido '${policy}'.`);
    }
    if (!nodeIds.includes(from) || !nodeIds.includes(to)) {
      issues.push(`${edgePath}: aresta referencia nó inexistente.`);
    }
    if (from === to) issues.push(`${edgePath}: autoaresta não permitida.`);
    if (edge.masteryInheritance !== false) {
      issues.push(`${edgePath}.masteryInheritance: deve ser false.`);
    }
    const blockerRef = edge.blockerRef;
    if (blockerRef !== undefined && (typeof blockerRef !== 'string' || !blockerRef)) {
      issues.push(`${edgePath}.blockerRef: esperado ID não vazio.`);
    }
    edges.push({ edgeId, from, to, policy, blockerRef: typeof blockerRef === 'string' ? blockerRef : undefined });
  });
  assertUnique(edges.map((edge) => edge.edgeId), `${path}.edges.edgeId`, issues);
  validateAcyclicGraph(nodeIds, edges, `${path}.edges`, issues);

  if (topology === 'single' && unitRefs.length !== 1) {
    issues.push(`${path}: topologia single exige exatamente uma unidade.`);
  }
  if (expectedKind === 'cumulative' && (topology !== 'single' || unitRefs.length !== 1)) {
    issues.push(`${path}: revisão cumulativa deve ser uma entrada single de uma unidade.`);
  }

  if (!Array.isArray(value.checkpoints)) issues.push(`${path}.checkpoints: esperado array.`);
  const checkpointIds: string[] = [];
  if (Array.isArray(value.checkpoints)) {
    value.checkpoints.forEach((checkpoint, index) => {
      const checkpointPath = `${path}.checkpoints[${index}]`;
      if (!isRecord(checkpoint)) {
        issues.push(`${checkpointPath}: esperado objeto.`);
        return;
      }
      checkpointIds.push(requireString(checkpoint, 'checkpointId', checkpointPath, issues));
      const requiredNodeIds = stringArray(
        checkpoint.requiredNodeIds,
        `${checkpointPath}.requiredNodeIds`,
        issues,
      );
      if (requiredNodeIds.length === 0) {
        issues.push(`${checkpointPath}.requiredNodeIds: ao menos um nó é obrigatório.`);
      }
      assertUnique(requiredNodeIds, `${checkpointPath}.requiredNodeIds`, issues);
      for (const nodeId of requiredNodeIds) {
        if (!nodeIds.includes(nodeId)) issues.push(`${checkpointPath}: nó inexistente '${nodeId}'.`);
      }
      if (checkpoint.mode !== 'all' && checkpoint.mode !== 'any') {
        issues.push(`${checkpointPath}.mode: esperado 'all' ou 'any'.`);
      }
      if (checkpoint.evidenceSource !== 'competency_mastery') {
        issues.push(`${checkpointPath}.evidenceSource: somente competency_mastery é aceito.`);
      }
      if (checkpoint.masteryInheritance !== false) {
        issues.push(`${checkpointPath}.masteryInheritance: deve ser false.`);
      }
    });
  }
  assertUnique(checkpointIds, `${path}.checkpoints.checkpointId`, issues);

  if (!Array.isArray(value.blockers)) issues.push(`${path}.blockers: esperado array.`);
  const blockerIds = new Set<string>();
  if (Array.isArray(value.blockers)) {
    value.blockers.forEach((blocker, index) => {
      const blockerPath = `${path}.blockers[${index}]`;
      if (!isRecord(blocker)) {
        issues.push(`${blockerPath}: esperado objeto.`);
        return;
      }
      const blockerId = requireString(blocker, 'blockerId', blockerPath, issues);
      if (blockerIds.has(blockerId)) issues.push(`${path}.blockers: blockerId duplicado '${blockerId}'.`);
      blockerIds.add(blockerId);
      const edgeId = requireString(blocker, 'edgeId', blockerPath, issues);
      if (!edges.some((edge) => edge.edgeId === edgeId)) {
        issues.push(`${blockerPath}.edgeId: aresta inexistente '${edgeId}'.`);
      }
      if (blocker.status !== 'active' && blocker.status !== 'resolved') {
        issues.push(`${blockerPath}.status: esperado 'active' ou 'resolved'.`);
      }
      requireString(blocker, 'reasonCode', blockerPath, issues);
      requireString(blocker, 'description', blockerPath, issues);
      if (typeof blocker.directAccessAllowed !== 'boolean') {
        issues.push(`${blockerPath}.directAccessAllowed: esperado booleano.`);
      }
      if (blocker.resolutionPolicy !== 'external_editorial_adjudication_required') {
        issues.push(`${blockerPath}.resolutionPolicy: política não suportada.`);
      }
      if (blocker.masteryInheritance !== false) {
        issues.push(`${blockerPath}.masteryInheritance: deve ser false.`);
      }
    });
  }
  for (const edge of edges) {
    if (edge.policy === 'blocked_transition' && (!edge.blockerRef || !blockerIds.has(edge.blockerRef))) {
      issues.push(`${path}: aresta bloqueada '${edge.edgeId}' exige blockerRef resolvido.`);
    }
    if (edge.policy !== 'blocked_transition' && edge.blockerRef) {
      issues.push(`${path}: blockerRef em aresta não bloqueada '${edge.edgeId}'.`);
    }
    if (edge.blockerRef && Array.isArray(value.blockers)) {
      const blocker = value.blockers.find((candidate) =>
        isRecord(candidate) && candidate.blockerId === edge.blockerRef);
      if (isRecord(blocker) && blocker.edgeId !== edge.edgeId) {
        issues.push(`${path}: blocker '${edge.blockerRef}' aponta para outra aresta.`);
      }
    }
  }

  const competencyRefs = stringArray(
    value.competencyRefs,
    `${path}.competencyRefs`,
    issues,
    COMPETENCY_ID_PATTERN,
  );
  const learningObjectiveRefs = stringArray(
    value.learningObjectiveRefs,
    `${path}.learningObjectiveRefs`,
    issues,
  );
  assertUnique(competencyRefs, `${path}.competencyRefs`, issues);
  assertUnique(learningObjectiveRefs, `${path}.learningObjectiveRefs`, issues);

  return {
    entry: value,
    macroId,
    lessonId,
    entryKind,
    topology,
    order,
    unitRefs,
    nodeByUnit,
    edges,
    blockerIds,
    competencyRefs,
    learningObjectiveRefs,
  };
};

const validateExpectedAtomicEvidence = (
  entries: readonly ParsedEntryEvidence[],
  expectations: PedagogicalMacroValidationExpectations,
  issues: string[],
) => {
  const validateMap = (
    field: 'competencyRefs' | 'learningObjectiveRefs',
    refsByUnit: Readonly<Record<string, readonly string[]>> | undefined,
  ) => {
    if (!refsByUnit) return;
    for (const entry of entries) {
      const expected = [...new Set(entry.unitRefs.flatMap((unitRef) => refsByUnit[unitRef] ?? []))].sort();
      const actual = [...entry[field]].sort();
      if (!sameSet(actual, expected)) {
        issues.push(
          `${entry.macroId}.${field}: deve ser a união exata dos IDs atômicos `
          + `(esperado ${expected.length}, recebido ${actual.length}).`,
        );
      }
    }
  };
  validateMap('competencyRefs', expectations.competencyRefsByUnit);
  validateMap('learningObjectiveRefs', expectations.learningObjectiveRefsByUnit);
};

/**
 * Validates the versioned structural contract and all internal references.
 * It does not accept partial catalogs: every declared node, edge and identity
 * must resolve before a value is returned.
 */
export const parsePedagogicalMacroCatalog = (
  value: unknown,
  expectations: PedagogicalMacroValidationExpectations = {},
): PedagogicalMacroCatalog => {
  const issues: string[] = [];
  if (!isRecord(value)) throw new PedagogicalMacroContractError(['raiz: esperado objeto JSON.']);

  if (value.schemaVersion !== PEDAGOGICAL_MACRO_SCHEMA_VERSION) {
    issues.push(`schemaVersion: versão não suportada '${String(value.schemaVersion)}'.`);
  }
  requireString(value, 'catalogId', 'catalog', issues);
  if (value.documentKind !== 'compiled_macro_catalog' && value.documentKind !== 'curated_macro_catalog') {
    issues.push(`catalog.documentKind: valor inválido '${String(value.documentKind)}'.`);
  }

  if (!isRecord(value.sourceBuild)) {
    issues.push('catalog.sourceBuild: esperado objeto.');
  } else {
    requireString(value.sourceBuild, 'buildId', 'catalog.sourceBuild', issues);
    validateSourceArtifact(value.sourceBuild.atomicGroupManifest, 'catalog.sourceBuild.atomicGroupManifest', issues);
    validateSourceArtifact(value.sourceBuild.viewManifest, 'catalog.sourceBuild.viewManifest', issues);
    validateSourceArtifact(value.sourceBuild.pblManifest, 'catalog.sourceBuild.pblManifest', issues);
  }

  const summaryKeys = [
    'regularEntries', 'fusions', 'journeys', 'autonomous',
    'cumulativeReviewEntries', 'learnerFacingEntries', 'regularUnits',
    'cumulativeReviewUnits', 'competencies',
  ] as const;
  const summary: Record<(typeof summaryKeys)[number], number> = Object.fromEntries(
    summaryKeys.map((key) => [key, -1]),
  ) as Record<(typeof summaryKeys)[number], number>;
  if (!isRecord(value.summary)) {
    issues.push('catalog.summary: esperado objeto.');
  } else {
    for (const key of summaryKeys) summary[key] = requireInteger(value.summary, key, 'catalog.summary', issues);
  }

  if (!Array.isArray(value.regularEntries)) issues.push('catalog.regularEntries: esperado array.');
  if (!Array.isArray(value.cumulativeReviewEntries)) {
    issues.push('catalog.cumulativeReviewEntries: esperado array.');
  }
  const regularEntries = (Array.isArray(value.regularEntries) ? value.regularEntries : [])
    .map((entry, index) => validateEntry(entry, `regularEntries[${index}]`, 'regular', issues))
    .filter((entry): entry is ParsedEntryEvidence => Boolean(entry));
  const cumulativeEntries = (Array.isArray(value.cumulativeReviewEntries) ? value.cumulativeReviewEntries : [])
    .map((entry, index) => validateEntry(entry, `cumulativeReviewEntries[${index}]`, 'cumulative', issues))
    .filter((entry): entry is ParsedEntryEvidence => Boolean(entry));
  const allEntries = [...regularEntries, ...cumulativeEntries];

  assertUnique(allEntries.map((entry) => entry.macroId), 'catalog.macroId', issues);
  const allUnitRefs = allEntries.flatMap((entry) => entry.unitRefs);
  assertUnique(allUnitRefs, 'catalog.unitRefs', issues);
  for (const lessonId of new Set(allEntries.map((entry) => entry.lessonId))) {
    const lessonOrders = allEntries
      .filter((entry) => entry.lessonId === lessonId)
      .map((entry) => String(entry.order));
    assertUnique(lessonOrders, `catalog.${lessonId}.order`, issues);
  }

  const distributions = {
    regularEntries: regularEntries.length,
    fusions: regularEntries.filter((entry) => entry.entryKind === 'fusion').length,
    journeys: regularEntries.filter((entry) => entry.entryKind === 'journey').length,
    autonomous: regularEntries.filter((entry) => entry.entryKind === 'autonomous').length,
    cumulativeReviewEntries: cumulativeEntries.length,
    learnerFacingEntries: allEntries.length,
    regularUnits: regularEntries.flatMap((entry) => entry.unitRefs).length,
    cumulativeReviewUnits: cumulativeEntries.flatMap((entry) => entry.unitRefs).length,
    competencies: new Set(regularEntries.flatMap((entry) => entry.competencyRefs)).size,
  };
  for (const key of summaryKeys) {
    if (summary[key] !== distributions[key]) {
      issues.push(`catalog.summary.${key}: declarado ${summary[key]}, derivado ${distributions[key]}.`);
    }
  }

  if (value.cumulativeReviewProjection !== 'one_entry_per_a14_view') {
    issues.push('catalog.cumulativeReviewProjection: política não suportada.');
  }
  if (!Array.isArray(value.adaptiveLinks)) issues.push('catalog.adaptiveLinks: esperado array.');
  if (Array.isArray(value.adaptiveLinks)) {
    const adaptiveLinkIds: string[] = [];
    value.adaptiveLinks.forEach((link, index) => {
      const path = `catalog.adaptiveLinks[${index}]`;
      if (!isRecord(link)) {
        issues.push(`${path}: esperado objeto.`);
        return;
      }
      adaptiveLinkIds.push(requireString(link, 'adaptiveLinkId', path, issues));
      const from = requireString(link, 'fromUnitRef', path, issues, REGULAR_UNIT_PATTERN);
      const to = requireString(link, 'toUnitRef', path, issues, REGULAR_UNIT_PATTERN);
      const policy = requireString(link, 'policy', path, issues);
      if (policy !== 'advisory_prerequisite' && policy !== 'diagnostic_remediation') {
        issues.push(`${path}.policy: política adaptativa inválida '${policy}'.`);
      }
      if (link.scope !== 'within_lesson' && link.scope !== 'cross_lesson') {
        issues.push(`${path}.scope: valor inválido '${String(link.scope)}'.`);
      }
      if (!['prerequisite', 'remediation', 'capstone_readiness', 'integration_readiness']
        .includes(String(link.relationType))) {
        issues.push(`${path}.relationType: valor inválido '${String(link.relationType)}'.`);
      }
      if (link.evidenceSource !== 'competency_mastery') {
        issues.push(`${path}.evidenceSource: somente competency_mastery é aceito.`);
      }
      if (from && !allUnitRefs.includes(from)) issues.push(`${path}.fromUnitRef: unidade desconhecida '${from}'.`);
      if (to && !allUnitRefs.includes(to)) issues.push(`${path}.toUnitRef: unidade desconhecida '${to}'.`);
      if (from && to) {
        const sameLesson = from.slice(3, 6) === to.slice(3, 6);
        if ((sameLesson && link.scope !== 'within_lesson') || (!sameLesson && link.scope !== 'cross_lesson')) {
          issues.push(`${path}.scope: diverge das aulas das unidades de origem e destino.`);
        }
      }
      if (link.masteryInheritance !== false) issues.push(`${path}.masteryInheritance: deve ser false.`);
      if (link.returnUnitRef !== undefined
        && (typeof link.returnUnitRef !== 'string' || !allUnitRefs.includes(link.returnUnitRef))) {
        issues.push(`${path}.returnUnitRef: unidade desconhecida '${String(link.returnUnitRef)}'.`);
      }
    });
    assertUnique(adaptiveLinkIds, 'catalog.adaptiveLinks.linkId', issues);
  }
  if (!isRecord(value.identityIntegrity)) {
    issues.push('catalog.identityIntegrity: esperado objeto.');
  } else {
    const identityCounts: Record<string, number> = {
      regularUnitIds: distributions.regularUnits,
      cumulativeReviewUnitIds: distributions.cumulativeReviewUnits,
      competencyIds: distributions.competencies,
    };
    for (const key of [
      'regularUnitIds',
      'cumulativeReviewUnitIds',
      'competencyIds',
      'learningObjectiveIds',
      'questionIds',
    ]) {
      const digest = value.identityIntegrity[key];
      const path = `catalog.identityIntegrity.${key}`;
      if (!isRecord(digest)) {
        issues.push(`${path}: esperado objeto.`);
        continue;
      }
      const count = requireInteger(digest, 'count', path, issues);
      requireString(digest, 'sha256', path, issues, SHA256_PATTERN);
      if (identityCounts[key] !== undefined && count !== identityCounts[key]) {
        issues.push(`${path}.count: esperado ${identityCounts[key]}, recebido ${count}.`);
      }
    }
  }

  if (expectations.regularUnitIds) {
    const actual = regularEntries.flatMap((entry) => entry.unitRefs).sort();
    const expected = [...expectations.regularUnitIds].sort();
    if (!sameSet(actual, expected)) issues.push('catalog.regularEntries: cobertura atômica divergente.');
  }
  if (expectations.cumulativeReviewUnitIds) {
    const actual = cumulativeEntries.flatMap((entry) => entry.unitRefs).sort();
    const expected = [...expectations.cumulativeReviewUnitIds].sort();
    if (!sameSet(actual, expected)) issues.push('catalog.cumulativeReviewEntries: cobertura A14 divergente.');
  }
  validateExpectedAtomicEvidence(allEntries, expectations, issues);

  if (issues.length) throw new PedagogicalMacroContractError(issues);
  return value as unknown as PedagogicalMacroCatalog;
};

/** Enforces the closed 55 + 13 publication contract used by the product. */
export const parsePublishedPedagogicalMacroCatalog = (
  value: unknown,
  expectations: PedagogicalMacroValidationExpectations = {},
): PedagogicalMacroCatalog => {
  const catalog = parsePedagogicalMacroCatalog(value, expectations);
  const issues: string[] = [];
  if ((value as { documentKind?: unknown }).documentKind !== 'compiled_macro_catalog') {
    issues.push('documentKind: publicação exige compiled_macro_catalog.');
  }
  const expectedSummary = {
    regularEntries: 55,
    fusions: 12,
    journeys: 21,
    autonomous: 22,
    cumulativeReviewEntries: 13,
    learnerFacingEntries: 68,
    regularUnits: 102,
    cumulativeReviewUnits: 13,
    competencies: 190,
  } as const;
  for (const [key, expected] of Object.entries(expectedSummary)) {
    const actual = catalog.summary[key as keyof typeof expectedSummary];
    if (actual !== expected) issues.push(`summary.${key}: esperado ${expected}, recebido ${actual}.`);
  }

  const a03Units = ['IP-A03-G04', 'IP-A03-G05', 'IP-A03-G06'];
  const a03 = catalog.regularEntries.find((entry) => a03Units.every((unitId) => entry.unitRefs.includes(unitId)));
  if (!a03) {
    issues.push('blocker A03: macroentrada G04/G05/G06 ausente.');
  } else {
    const nodeByUnit = new Map(a03.nodes.map((node) => [node.unitRef, node.nodeId]));
    const blockedEdge = a03.edges.find((edge) =>
      edge.from === nodeByUnit.get('IP-A03-G05')
      && edge.to === nodeByUnit.get('IP-A03-G06')
      && edge.policy === 'blocked_transition'
      && Boolean(edge.blockerRef));
    if (!blockedEdge || !a03.blockers.some((blocker) => blocker.blockerId === blockedEdge.blockerRef)) {
      issues.push('blocker A03: transição G05→G06 não está bloqueada por referência resolvida.');
    }
  }

  if (issues.length) throw new PedagogicalMacroContractError(issues);
  return catalog;
};

export const isPedagogicalMacroCatalog = (value: unknown): value is PedagogicalMacroCatalog => {
  try {
    parsePedagogicalMacroCatalog(value);
    return true;
  } catch {
    return false;
  }
};

export const getAllPedagogicalMacroEntries = (
  catalog: PedagogicalMacroCatalog,
): readonly PedagogicalMacroEntry[] => [
  ...catalog.regularEntries,
  ...catalog.cumulativeReviewEntries,
];
