#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const curriculumRoot = path.join(root, 'public', 'knowledge', 'pedagogical', 'curriculum');
const catalogPath = path.join(curriculumRoot, 'macro-catalog.v1.json');
const manifestPath = path.join(curriculumRoot, 'macro-catalog.manifest.json');
const viewsRoot = path.join(root, 'public', 'knowledge', 'pedagogical', 'views');
const competencyPath = path.join(root, 'public', 'knowledge', 'pbl', 'pbl_competency_map.json');
const optionalWhenUnpublished = process.argv.includes('--optional');

if (!fs.existsSync(catalogPath) && !fs.existsSync(manifestPath) && optionalWhenUnpublished) {
  if (String(process.env.VITE_MACRO_CURRICULUM_ENABLED || '').toLowerCase() === 'true') {
    console.error('Pedagogical macro audit: FAIL');
    console.error('- VITE_MACRO_CURRICULUM_ENABLED=true sem catálogo publicado.');
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: 'skipped',
    reason: 'macro_catalog_not_published',
    rollout: 'atomic_navigation_preserved',
  }, null, 2));
  process.exit(0);
}

const ALLOWED_ENTRY_KINDS = new Set(['fusion', 'journey', 'autonomous', 'cumulative_review']);
const ALLOWED_TOPOLOGIES = new Set(['single', 'linear', 'parallel', 'branched', 'contrastive', 'capstone']);
const ALLOWED_ROLES = new Set(['foundation', 'acquisition', 'application', 'integration', 'capstone']);
const ALLOWED_EDGE_POLICIES = new Set([
  'open', 'checkpoint', 'advisory_prerequisite', 'diagnostic_remediation', 'blocked_transition',
]);
const SHA_PATTERN = /^[a-f0-9]{64}$/;
const REGULAR_UNIT_PATTERN = /^IP-A(?:0\d|1[0-3])-G\d{2}$/;
const CUMULATIVE_UNIT_PATTERN = /^IP-A14-S\d{2}$/;

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const readBytes = (file, label) => {
  check(fs.existsSync(file), `${label} ausente: ${path.relative(root, file)}.`);
  return fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
};
const readJson = (file, label) => {
  const bytes = readBytes(file, label);
  if (!bytes.length) return null;
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    failures.push(`${label} contém JSON inválido: ${error.message}.`);
    return null;
  }
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sameSet = (left, right) =>
  left.length === right.length && left.every((item) => right.includes(item));
const unique = (values, label) => {
  const set = new Set(values);
  check(set.size === values.length, `${label} contém valores duplicados.`);
  return set;
};

const catalogBytes = readBytes(catalogPath, 'Catálogo macro');
const catalog = readJson(catalogPath, 'Catálogo macro');
const manifest = readJson(manifestPath, 'Manifesto macro');
const competencies = readJson(competencyPath, 'Mapa de competências PBL');

if (!catalog || !manifest || !competencies) {
  console.error('Pedagogical macro audit: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

check(catalog.schemaVersion === '1.0.0', `schemaVersion do catálogo inválida '${catalog.schemaVersion}'.`);
check(typeof catalog.catalogId === 'string' && catalog.catalogId.length > 0, 'catalogId ausente.');
check(manifest.schemaVersion === '1.0.0', `schemaVersion do manifesto inválida '${manifest.schemaVersion}'.`);
check(manifest.catalogId === catalog.catalogId, 'catalogId diverge entre catálogo e manifesto.');
check(manifest.validation?.status === 'valid', 'manifesto não declara validation.status=valid.');
check(manifest.publicationStatus === 'publishable', 'manifesto não declara publicationStatus=publishable.');
check(manifest.gate0?.status === 'pass', 'manifesto não comprova Gate 0 verde.');
check(Array.isArray(manifest.validation?.checks) && manifest.validation.checks.length > 0, 'checks do manifesto ausentes.');
check(manifest.catalogSha256 === sha256(catalogBytes), 'SHA-256 do catálogo diverge do manifesto.');
check(manifest.catalogSizeBytes === catalogBytes.length, 'Tamanho em bytes do catálogo diverge do manifesto.');
check(Array.isArray(manifest.sourceFiles) && manifest.sourceFiles.length >= 3, 'sourceFiles do manifesto incompletos.');

for (const [role, field] of [
  ['atomic_group_manifest', 'atomicGroupManifest'],
  ['view_manifest', 'viewManifest'],
  ['pbl_manifest', 'pblManifest'],
]) {
  const source = catalog.sourceBuild?.[field];
  check(source && typeof source.path === 'string' && source.path.length > 0, `sourceBuild.${field}.path ausente.`);
  check(source && SHA_PATTERN.test(source.sha256), `sourceBuild.${field}.sha256 inválido.`);
  const declared = manifest.sourceFiles?.find((item) => item.role === role || item.path === source?.path);
  check(Boolean(declared), `manifesto não registra a origem '${role}'.`);
  if (declared && source) check(declared.sha256 === source.sha256, `hash de '${role}' diverge entre catálogo e manifesto.`);
}
for (const [index, source] of (manifest.sourceFiles ?? []).entries()) {
  check(typeof source.role === 'string' && source.role.length > 0, `sourceFiles[${index}].role ausente.`);
  check(typeof source.path === 'string' && source.path.length > 0, `sourceFiles[${index}].path ausente.`);
  check(SHA_PATTERN.test(source.sha256), `sourceFiles[${index}].sha256 inválido.`);
  check(Number.isInteger(source.sizeBytes) && source.sizeBytes > 0, `sourceFiles[${index}].sizeBytes inválido.`);
}

const viewIds = fs.existsSync(viewsRoot)
  ? fs.readdirSync(viewsRoot)
    .filter((name) => /^IP-A\d{2}-(?:G|S)\d{2}\.json$/.test(name))
    .map((name) => name.replace(/\.json$/, ''))
    .sort()
  : [];
const regularViewIds = viewIds.filter((unitId) => REGULAR_UNIT_PATTERN.test(unitId));
const cumulativeViewIds = viewIds.filter((unitId) => CUMULATIVE_UNIT_PATTERN.test(unitId));
check(regularViewIds.length === 102, `Views regulares: ${regularViewIds.length}/102.`);
check(cumulativeViewIds.length === 13, `Views A14: ${cumulativeViewIds.length}/13.`);
check(Array.isArray(competencies) && competencies.length === 190, `Competências PBL: ${competencies.length}/190.`);

const competenciesByUnit = new Map();
const learningObjectivesByUnit = new Map();
for (const competency of competencies) {
  check(REGULAR_UNIT_PATTERN.test(competency.unitId), `${competency.competencyId}: unitId inválido '${competency.unitId}'.`);
  const unitCompetencies = competenciesByUnit.get(competency.unitId) ?? [];
  unitCompetencies.push(competency.competencyId);
  competenciesByUnit.set(competency.unitId, unitCompetencies);
  const unitObjectives = learningObjectivesByUnit.get(competency.unitId) ?? [];
  unitObjectives.push(...(competency.learningObjectiveRefs ?? []));
  learningObjectivesByUnit.set(competency.unitId, unitObjectives);
}

check(Array.isArray(catalog.regularEntries), 'regularEntries ausente.');
check(Array.isArray(catalog.cumulativeReviewEntries), 'cumulativeReviewEntries ausente.');
check(Array.isArray(catalog.adaptiveLinks), 'adaptiveLinks ausente.');
const regularEntries = Array.isArray(catalog.regularEntries) ? catalog.regularEntries : [];
const cumulativeEntries = Array.isArray(catalog.cumulativeReviewEntries) ? catalog.cumulativeReviewEntries : [];
const allEntries = [...regularEntries, ...cumulativeEntries];
check(regularEntries.length === 55, `Macroentradas regulares: ${regularEntries.length}/55.`);
check(cumulativeEntries.length === 13, `Revisões A14: ${cumulativeEntries.length}/13.`);
check(allEntries.length === 68, `Entradas learner-facing: ${allEntries.length}/68.`);
check(catalog.cumulativeReviewProjection === 'one_entry_per_a14_view', 'Projeção A14 inválida.');

unique(allEntries.map((entry) => entry.macroId), 'macroId');
const allUnitRefs = [];
const allCompetencyRefs = [];
const allLearningObjectiveRefs = [];

const validateGraph = (entry, cumulative) => {
  const prefix = entry.macroId || '<macro sem id>';
  const macroIdValid = cumulative
    ? /^REVIEW-A14-S\d{2}$/.test(entry.macroId)
    : /^MACRO-A(?:0\d|1[0-3])-\d{2}$/.test(entry.macroId);
  check(macroIdValid, `${prefix}: macroId inválido.`);
  const macroLesson = cumulative ? entry.macroId?.slice(7, 10) : entry.macroId?.slice(6, 9);
  check(macroLesson === entry.lessonId, `${prefix}: lessonId diverge do macroId.`);
  check(ALLOWED_ENTRY_KINDS.has(entry.entryKind), `${prefix}: entryKind inválido '${entry.entryKind}'.`);
  check(ALLOWED_TOPOLOGIES.has(entry.topology), `${prefix}: topology inválida '${entry.topology}'.`);
  check(Number.isInteger(entry.order) && entry.order >= 1, `${prefix}: order inválida.`);
  check(typeof entry.title === 'string' && entry.title.trim().length > 0, `${prefix}: title ausente.`);
  check(Array.isArray(entry.unitRefs) && entry.unitRefs.length > 0, `${prefix}: unitRefs ausente.`);
  check(Array.isArray(entry.nodes), `${prefix}: nodes ausente.`);
  check(Array.isArray(entry.edges), `${prefix}: edges ausente.`);
  check(Array.isArray(entry.checkpoints), `${prefix}: checkpoints ausente.`);
  check(Array.isArray(entry.blockers), `${prefix}: blockers ausente.`);
  check(Array.isArray(entry.competencyRefs), `${prefix}: competencyRefs ausente.`);
  check(Array.isArray(entry.learningObjectiveRefs), `${prefix}: learningObjectiveRefs ausente.`);

  const expectedPattern = cumulative ? CUMULATIVE_UNIT_PATTERN : REGULAR_UNIT_PATTERN;
  unique(entry.unitRefs ?? [], `${prefix}.unitRefs`);
  for (const unitRef of entry.unitRefs ?? []) {
    check(expectedPattern.test(unitRef), `${prefix}: unitRef inválida '${unitRef}'.`);
    check(unitRef.slice(3, 6) === entry.lessonId, `${prefix}: unidade '${unitRef}' atravessa aulas.`);
    allUnitRefs.push(unitRef);
  }
  if (cumulative) {
    check(entry.entryKind === 'cumulative_review', `${prefix}: A14 deve ser cumulative_review.`);
    check(entry.topology === 'single' && entry.unitRefs?.length === 1, `${prefix}: A14 deve ser single.`);
  } else {
    check(entry.entryKind !== 'cumulative_review', `${prefix}: regular não pode ser cumulative_review.`);
  }

  const nodes = Array.isArray(entry.nodes) ? entry.nodes : [];
  const nodeIds = unique(nodes.map((node) => node.nodeId), `${prefix}.nodeId`);
  const nodeUnits = unique(nodes.map((node) => node.unitRef), `${prefix}.nodes.unitRef`);
  check(sameSet([...nodeUnits], entry.unitRefs ?? []), `${prefix}: deve haver exatamente um nó por unitRef.`);
  for (const node of nodes) {
    check(ALLOWED_ROLES.has(node.role), `${prefix}: role inválida '${node.role}'.`);
  }

  const edges = Array.isArray(entry.edges) ? entry.edges : [];
  unique(edges.map((edge) => edge.edgeId), `${prefix}.edgeId`);
  const adjacency = new Map([...nodeIds].map((nodeId) => [nodeId, []]));
  for (const edge of edges) {
    check(nodeIds.has(edge.from) && nodeIds.has(edge.to), `${prefix}: aresta '${edge.edgeId}' órfã.`);
    check(edge.from !== edge.to, `${prefix}: autoaresta '${edge.edgeId}'.`);
    check(ALLOWED_EDGE_POLICIES.has(edge.policy), `${prefix}: policy inválida '${edge.policy}'.`);
    check(edge.masteryInheritance === false, `${prefix}: aresta '${edge.edgeId}' herda mastery.`);
    adjacency.get(edge.from)?.push(edge.to);
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (nodeId) => {
    if (visiting.has(nodeId)) return false;
    if (visited.has(nodeId)) return true;
    visiting.add(nodeId);
    const valid = (adjacency.get(nodeId) ?? []).every(visit);
    visiting.delete(nodeId);
    visited.add(nodeId);
    return valid;
  };
  check([...nodeIds].every(visit), `${prefix}: grafo cíclico.`);

  const checkpoints = Array.isArray(entry.checkpoints) ? entry.checkpoints : [];
  unique(checkpoints.map((checkpoint) => checkpoint.checkpointId), `${prefix}.checkpointId`);
  for (const checkpoint of checkpoints) {
    check(Array.isArray(checkpoint.requiredNodeIds) && checkpoint.requiredNodeIds.length > 0, `${prefix}: checkpoint sem nós.`);
    check((checkpoint.requiredNodeIds ?? []).every((nodeId) => nodeIds.has(nodeId)), `${prefix}: checkpoint referencia nó órfão.`);
    check(checkpoint.mode === 'all' || checkpoint.mode === 'any', `${prefix}: checkpoint.mode inválido.`);
    check(checkpoint.evidenceSource === 'competency_mastery', `${prefix}: checkpoint usa evidência não pedagógica.`);
    check(checkpoint.masteryInheritance === false, `${prefix}: checkpoint herda mastery.`);
  }

  const blockers = Array.isArray(entry.blockers) ? entry.blockers : [];
  unique(blockers.map((blocker) => blocker.blockerId), `${prefix}.blockerId`);
  for (const blocker of blockers) {
    const edge = edges.find((candidate) => candidate.edgeId === blocker.edgeId);
    check(Boolean(edge), `${prefix}: blocker '${blocker.blockerId}' referencia aresta órfã.`);
    check(edge?.blockerRef === blocker.blockerId, `${prefix}: blocker '${blocker.blockerId}' não é recíproco.`);
    check(edge?.policy === 'blocked_transition', `${prefix}: blocker em aresta não bloqueada.`);
    check(blocker.masteryInheritance === false, `${prefix}: blocker herda mastery.`);
  }
  for (const edge of edges.filter((candidate) => candidate.policy === 'blocked_transition')) {
    check(blockers.some((blocker) => blocker.blockerId === edge.blockerRef), `${prefix}: aresta bloqueada sem blocker.`);
  }

  const actualCompetencies = [...new Set(entry.competencyRefs ?? [])].sort();
  if (cumulative) {
    check(
      actualCompetencies.length > 0 && actualCompetencies.every((competencyId) =>
        competencies.some((candidate) => candidate.competencyId === competencyId)),
      `${prefix}: revisão cumulativa referencia competência desconhecida.`,
    );
  } else {
    const expectedCompetencies = [...new Set(
      (entry.unitRefs ?? []).flatMap((unitRef) => competenciesByUnit.get(unitRef) ?? []),
    )].sort();
    check(sameSet(actualCompetencies, expectedCompetencies), `${prefix}: competencyRefs não é a união exata por unitRef.`);
  }
  allCompetencyRefs.push(...actualCompetencies);

  const actualObjectives = [...new Set(entry.learningObjectiveRefs ?? [])].sort();
  if (cumulative) {
    const knownObjectives = new Set([...learningObjectivesByUnit.values()].flat());
    check(
      actualObjectives.length > 0 && actualObjectives.every((objectiveId) => knownObjectives.has(objectiveId)),
      `${prefix}: revisão cumulativa referencia objetivo desconhecido.`,
    );
  } else {
    const expectedObjectives = [...new Set(
      (entry.unitRefs ?? []).flatMap((unitRef) => learningObjectivesByUnit.get(unitRef) ?? []),
    )].sort();
    check(sameSet(actualObjectives, expectedObjectives), `${prefix}: learningObjectiveRefs não é a união exata por unitRef.`);
  }
  allLearningObjectiveRefs.push(...actualObjectives);
};

regularEntries.forEach((entry) => validateGraph(entry, false));
cumulativeEntries.forEach((entry) => validateGraph(entry, true));
unique(allUnitRefs, 'Cobertura global de unidades');
check(sameSet(allUnitRefs.filter((id) => REGULAR_UNIT_PATTERN.test(id)).sort(), regularViewIds), 'Cobertura das 102 unidades regulares diverge.');
check(sameSet(allUnitRefs.filter((id) => CUMULATIVE_UNIT_PATTERN.test(id)).sort(), cumulativeViewIds), 'Cobertura das 13 A14 diverge.');
check(new Set(allCompetencyRefs).size === 190, `Cobertura de competências: ${new Set(allCompetencyRefs).size}/190.`);
check(new Set(allLearningObjectiveRefs).size === 190, `Cobertura de objetivos: ${new Set(allLearningObjectiveRefs).size}/190.`);

const distribution = {
  regularEntries: regularEntries.length,
  fusions: regularEntries.filter((entry) => entry.entryKind === 'fusion').length,
  journeys: regularEntries.filter((entry) => entry.entryKind === 'journey').length,
  autonomous: regularEntries.filter((entry) => entry.entryKind === 'autonomous').length,
  cumulativeReviewEntries: cumulativeEntries.length,
  learnerFacingEntries: allEntries.length,
  regularUnits: regularEntries.flatMap((entry) => entry.unitRefs ?? []).length,
  cumulativeReviewUnits: cumulativeEntries.flatMap((entry) => entry.unitRefs ?? []).length,
  competencies: new Set(allCompetencyRefs).size,
};
const expectedDistribution = {
  regularEntries: 55,
  fusions: 12,
  journeys: 21,
  autonomous: 22,
  cumulativeReviewEntries: 13,
  learnerFacingEntries: 68,
  regularUnits: 102,
  cumulativeReviewUnits: 13,
  competencies: 190,
};
for (const [key, expected] of Object.entries(expectedDistribution)) {
  check(distribution[key] === expected, `${key}: derivado ${distribution[key]}, esperado ${expected}.`);
  check(catalog.summary?.[key] === expected, `summary.${key}: ${catalog.summary?.[key]}, esperado ${expected}.`);
  check(manifest.summary?.[key] === expected, `manifest.summary.${key}: ${manifest.summary?.[key]}, esperado ${expected}.`);
}

const identityExpectedCounts = {
  regularUnitIds: 102,
  cumulativeReviewUnitIds: 13,
  competencyIds: 190,
  learningObjectiveIds: 190,
};
for (const [key, count] of Object.entries(identityExpectedCounts)) {
  check(catalog.identityIntegrity?.[key]?.count === count, `identityIntegrity.${key}.count inválido.`);
  check(SHA_PATTERN.test(catalog.identityIntegrity?.[key]?.sha256 ?? ''), `identityIntegrity.${key}.sha256 inválido.`);
}
check(Number.isInteger(catalog.identityIntegrity?.questionIds?.count) && catalog.identityIntegrity.questionIds.count > 0, 'identityIntegrity.questionIds.count inválido.');
check(SHA_PATTERN.test(catalog.identityIntegrity?.questionIds?.sha256 ?? ''), 'identityIntegrity.questionIds.sha256 inválido.');

const a03 = regularEntries.find((entry) =>
  ['IP-A03-G04', 'IP-A03-G05', 'IP-A03-G06'].every((unitId) => entry.unitRefs?.includes(unitId)));
const a03NodeByUnit = new Map((a03?.nodes ?? []).map((node) => [node.unitRef, node.nodeId]));
const a03BlockedEdge = a03?.edges?.find((edge) =>
  edge.from === a03NodeByUnit.get('IP-A03-G05')
  && edge.to === a03NodeByUnit.get('IP-A03-G06')
  && edge.policy === 'blocked_transition');
check(Boolean(a03BlockedEdge), 'Blocker A03 G05→G06 ausente.');
check(Boolean(a03?.blockers?.find((blocker) =>
  blocker.blockerId === a03BlockedEdge?.blockerRef
  && blocker.status === 'active'
  && blocker.directAccessAllowed === true
  && blocker.masteryInheritance === false)), 'Blocker A03 não preserva acesso direto e adjudicação ativa.');

const unitRefSet = new Set(allUnitRefs);
unique((catalog.adaptiveLinks ?? []).map((link) => link.adaptiveLinkId), 'adaptiveLinkId');
for (const link of catalog.adaptiveLinks ?? []) {
  check(unitRefSet.has(link.fromUnitRef) && unitRefSet.has(link.toUnitRef), `${link.adaptiveLinkId}: link adaptativo órfão.`);
  check(link.policy === 'advisory_prerequisite' || link.policy === 'diagnostic_remediation', `${link.adaptiveLinkId}: policy inválida.`);
  check(link.evidenceSource === 'competency_mastery', `${link.adaptiveLinkId}: evidência não é mastery por competência.`);
  check(link.masteryInheritance === false, `${link.adaptiveLinkId}: link herda mastery.`);
  const sameLesson = link.fromUnitRef?.slice(3, 6) === link.toUnitRef?.slice(3, 6);
  check(link.scope === (sameLesson ? 'within_lesson' : 'cross_lesson'), `${link.adaptiveLinkId}: scope diverge das unidades.`);
  if (link.returnUnitRef) check(unitRefSet.has(link.returnUnitRef), `${link.adaptiveLinkId}: retorno órfão.`);
}
check((catalog.adaptiveLinks ?? []).some((link) =>
  link.fromUnitRef?.startsWith('IP-A05-')
  && link.toUnitRef?.startsWith('IP-A06-')
  && link.scope === 'cross_lesson'
  && link.evidenceSource === 'competency_mastery'), 'Dependência adaptativa A05→A06 ausente.');

try {
  execFileSync(process.execPath, ['scripts/build-pedagogical-macro-index.mjs', '--check'], {
    cwd: root,
    stdio: 'pipe',
  });
} catch (error) {
  failures.push(`Índice generated diverge do catálogo: ${String(error.stderr || error.message).trim()}`);
}

if (failures.length) {
  console.error(`Pedagogical macro audit: FAIL (${failures.length} problema${failures.length === 1 ? '' : 's'})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'ok',
  catalogId: catalog.catalogId,
  regularEntries: regularEntries.length,
  cumulativeReviewEntries: cumulativeEntries.length,
  learnerFacingEntries: allEntries.length,
  regularUnits: regularViewIds.length,
  cumulativeReviewUnits: cumulativeViewIds.length,
  competencies: new Set(allCompetencyRefs).size,
  learningObjectives: new Set(allLearningObjectiveRefs).size,
  adaptiveLinks: catalog.adaptiveLinks.length,
  a03Blocker: 'active',
}, null, 2));
