#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const curriculumRoot = path.join(root, 'public', 'knowledge', 'pedagogical', 'curriculum');
const catalogPath = path.join(curriculumRoot, 'macro-catalog.v1.json');
const manifestPath = path.join(curriculumRoot, 'macro-catalog.manifest.json');
const viewsRoot = path.join(root, 'public', 'knowledge', 'pedagogical', 'views');
const competencyMapPath = path.join(root, 'public', 'knowledge', 'pbl', 'pbl_competency_map.json');
const outputPath = path.join(root, 'src', 'data', 'pedagogicalMacroCatalog.generated.ts');

const fail = (message) => {
  throw new Error(`Pedagogical macro index: ${message}`);
};
const readBytes = (file) => {
  if (!fs.existsSync(file)) fail(`arquivo ausente: ${path.relative(root, file)}.`);
  return fs.readFileSync(file);
};
const readJson = (file) => {
  try {
    return JSON.parse(readBytes(file).toString('utf8'));
  } catch (error) {
    fail(`JSON inválido em ${path.relative(root, file)} (${error.message}).`);
  }
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sameSet = (left, right) =>
  left.length === right.length && left.every((value) => right.includes(value));

const catalogBytes = readBytes(catalogPath);
const catalog = readJson(catalogPath);
const manifest = readJson(manifestPath);
const competencies = readJson(competencyMapPath);

if (catalog.schemaVersion !== '1.0.0') fail(`schemaVersion não suportada '${catalog.schemaVersion}'.`);
if (manifest.schemaVersion !== '1.0.0' || manifest.validation?.status !== 'valid') {
  fail('manifesto ausente, incompatível ou não validado.');
}
if (manifest.publicationStatus !== 'publishable' || manifest.gate0?.status !== 'pass') {
  fail('manifesto não está liberado pelo Gate 0; índice de produto não pode ser gerado.');
}
if (manifest.catalogId !== catalog.catalogId) fail('catalogId diverge do manifesto.');
if (manifest.catalogSha256 !== sha256(catalogBytes)) fail('SHA-256 do catálogo diverge do manifesto.');
if (manifest.catalogSizeBytes !== catalogBytes.length) fail('tamanho do catálogo diverge do manifesto.');
if (!Array.isArray(catalog.regularEntries) || !Array.isArray(catalog.cumulativeReviewEntries)) {
  fail('coleções de entradas ausentes.');
}
if (!Array.isArray(catalog.adaptiveLinks)) fail('adaptiveLinks ausente.');
if (!Array.isArray(competencies) || competencies.length !== 190) {
  fail(`mapa PBL incompatível (${Array.isArray(competencies) ? competencies.length : 'não-array'}/190).`);
}

const viewIds = fs.readdirSync(viewsRoot)
  .filter((name) => /^IP-A\d{2}-(?:G|S)\d{2}\.json$/.test(name))
  .map((name) => name.replace(/\.json$/, ''))
  .sort();
if (viewIds.length !== 115) fail(`acervo de Views incompatível (${viewIds.length}/115).`);

const competencyIdsByUnit = new Map();
for (const competency of competencies) {
  if (!competency || typeof competency !== 'object' || !competency.competencyId || !competency.unitId) {
    fail('registro inválido em pbl_competency_map.json.');
  }
  const ids = competencyIdsByUnit.get(competency.unitId) ?? [];
  ids.push(competency.competencyId);
  competencyIdsByUnit.set(competency.unitId, ids);
}
for (const ids of competencyIdsByUnit.values()) ids.sort();

const allEntries = [...catalog.regularEntries, ...catalog.cumulativeReviewEntries];
if (catalog.regularEntries.length !== 55 || catalog.cumulativeReviewEntries.length !== 13) {
  fail(`distribuição inválida (${catalog.regularEntries.length}/55 regulares, ${catalog.cumulativeReviewEntries.length}/13 A14).`);
}
if (allEntries.length !== 68) fail(`total learner-facing inválido (${allEntries.length}/68).`);

const macroIds = new Set();
const assignedUnits = new Set();
for (const entry of allEntries) {
  if (macroIds.has(entry.macroId)) fail(`macroId duplicado '${entry.macroId}'.`);
  macroIds.add(entry.macroId);
  if (!Array.isArray(entry.unitRefs) || !entry.unitRefs.length) fail(`${entry.macroId}: unitRefs ausente.`);
  for (const unitId of entry.unitRefs) {
    if (!viewIds.includes(unitId)) fail(`${entry.macroId}: View desconhecida '${unitId}'.`);
    if (assignedUnits.has(unitId)) fail(`${unitId}: unidade atribuída mais de uma vez.`);
    assignedUnits.add(unitId);
  }

  const actualCompetencies = Array.isArray(entry.competencyRefs)
    ? [...entry.competencyRefs].sort()
    : [];
  if (entry.entryKind === 'cumulative_review') {
    if (!actualCompetencies.length || actualCompetencies.some(
      (competencyId) => !competencies.some((candidate) => candidate.competencyId === competencyId)
    )) {
      fail(`${entry.macroId}: revisão cumulativa referencia competência desconhecida.`);
    }
  } else {
    const expectedCompetencies = [...new Set(
      entry.unitRefs.flatMap((unitId) => competencyIdsByUnit.get(unitId) ?? []),
    )].sort();
    if (!sameSet(actualCompetencies, expectedCompetencies)) {
      fail(`${entry.macroId}: competencyRefs não é a união exata das competências atômicas.`);
    }
  }
}
if (!sameSet([...assignedUnits].sort(), viewIds)) fail('cobertura das 115 Views não é exata.');

const projectedEntries = allEntries.map((entry) => ({
  macroId: entry.macroId,
  lessonId: entry.lessonId,
  order: entry.order,
  title: entry.title,
  entryKind: entry.entryKind,
  topology: entry.topology,
  unitRefs: entry.unitRefs,
  competencyRefs: entry.competencyRefs,
  competencies: entry.competencyRefs.map((competencyId) => {
    const competency = competencies.find((candidate) => candidate.competencyId === competencyId);
    if (!competency) fail(`${entry.macroId}: competência desconhecida '${competencyId}'.`);
    return {
      competencyId,
      unitId: competency.unitId,
      title: competency.title,
    };
  }),
  nodes: entry.nodes,
  edges: entry.edges,
  checkpoints: entry.checkpoints,
  blockers: entry.blockers,
}));

const source = `/* AUTO-GENERATED by scripts/build-pedagogical-macro-index.mjs. */
import type {
  PedagogicalMacroAdaptiveLink,
  PedagogicalMacroIndexEntry,
} from '../types/pedagogicalMacro';

export const PEDAGOGICAL_MACRO_CATALOG_ID = ${JSON.stringify(catalog.catalogId)};
export const PEDAGOGICAL_MACRO_INDEX = ${JSON.stringify(projectedEntries, null, 2)} as const satisfies readonly PedagogicalMacroIndexEntry[];
export const PEDAGOGICAL_MACRO_ADAPTIVE_LINKS = ${JSON.stringify(catalog.adaptiveLinks, null, 2)} as const satisfies readonly PedagogicalMacroAdaptiveLink[];
`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  if (current !== source) fail('arquivo generated desatualizado; execute npm run build:macro-index.');
  console.log(`Pedagogical macro index contract: PASS (${projectedEntries.length} entradas, ${assignedUnits.size} unidades).`);
} else {
  fs.writeFileSync(outputPath, source, 'utf8');
  console.log(`Pedagogical macro index: ${projectedEntries.length} entradas, ${assignedUnits.size} unidades, ${competencies.length} competências.`);
}
