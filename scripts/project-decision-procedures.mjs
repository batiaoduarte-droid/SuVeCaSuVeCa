import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { projectStructuredDiagramFromMarkdown } from './lib/structured-diagram.mjs';

const ROOT = process.cwd();
const artifactPath = path.join(ROOT, 'public', 'knowledge', 'pedagogical', 'decision-procedures.json');
const structuredMapsPath = path.join(ROOT, 'public', 'knowledge', 'pedagogical', 'structured-map-presentations.json');
const factoryRoot = path.resolve(ROOT, '..', 'Notebook LM', '02_Portugues', 'Aula Processada');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/u, ''));
const readJsonl = (file) => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (!fs.existsSync(artifactPath)) throw new Error(`Artefato não encontrado: ${artifactPath}`);
if (!fs.existsSync(structuredMapsPath)) throw new Error(`Overlay de mapas não encontrado: ${structuredMapsPath}`);
if (!fs.existsSync(factoryRoot)) throw new Error(`Fábrica não encontrada: ${factoryRoot}`);

const candidates = new Map();
for (const lessonDir of fs.readdirSync(factoryRoot, { withFileTypes: true })) {
  if (!lessonDir.isDirectory() || !/^Aula \d{2}\b/u.test(lessonDir.name)) continue;
  const source = path.join(factoryRoot, lessonDir.name, 'Integracao_Pedagogica', 'suveca', 'decision_tree_candidates.jsonl');
  if (!fs.existsSync(source)) continue;
  for (const candidate of readJsonl(source)) candidates.set(candidate.decision_candidate_id, candidate);
}

const payload = readJson(artifactPath);
if (!Array.isArray(payload.procedures) || payload.procedures.length === 0) {
  throw new Error('A base de roteiros não contém procedimentos publicáveis.');
}

let visualProjectionCount = 0;
let sourceBackedRefCount = 0;
payload.procedures = payload.procedures.map((procedure) => {
  const candidate = candidates.get(procedure.id);
  if (!candidate) throw new Error(`${procedure.id}: candidato de origem não localizado.`);
  const projection = projectStructuredDiagramFromMarkdown(procedure.markdown);
  if (projection) visualProjectionCount += 1;
  const sourceRefs = Array.isArray(candidate.source_refs) && candidate.source_refs.length
    ? candidate.source_refs
    : procedure.sourceRefs;
  if (sourceRefs.some((ref) => /^PROC-/u.test(ref))) sourceBackedRefCount += 1;
  return {
    ...procedure,
    ...(projection || {}),
    sourceRefs,
  };
});

payload.schemaVersion = '4.3.0';
payload.projection = {
  kind: 'source_backed_semantically_typed_decision_procedures',
  visualProjectionCount,
  markdownProcedureCount: payload.procedures.length - visualProjectionCount,
  sourceBackedRefCount,
};
fs.writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const artifactBuffer = fs.readFileSync(artifactPath);
const artifactRelativePath = 'public/knowledge/pedagogical/decision-procedures.json';
const structuredMapsBuffer = fs.readFileSync(structuredMapsPath);
const structuredMapsRelativePath = 'public/knowledge/pedagogical/structured-map-presentations.json';
const structuredMaps = readJson(structuredMapsPath);
for (const manifestPath of [
  path.join(ROOT, 'public', 'knowledge', 'pedagogical', 'manifest.json'),
  path.join(ROOT, 'knowledge', 'canonical', 'pedagogical-source-manifest.json'),
]) {
  const manifest = readJson(manifestPath);
  const descriptor = manifest.artifacts?.find((entry) => entry.path === artifactRelativePath);
  if (!descriptor) throw new Error(`${manifestPath}: descritor do artefato ausente.`);
  descriptor.bytes = artifactBuffer.length;
  descriptor.sha256 = createHash('sha256').update(artifactBuffer).digest('hex');
  let mapDescriptor = manifest.artifacts?.find((entry) => entry.path === structuredMapsRelativePath);
  if (!mapDescriptor) {
    mapDescriptor = { path: structuredMapsRelativePath, bytes: 0, sha256: '' };
    manifest.artifacts.push(mapDescriptor);
  }
  mapDescriptor.bytes = structuredMapsBuffer.length;
  mapDescriptor.sha256 = createHash('sha256').update(structuredMapsBuffer).digest('hex');
  manifest.totals = { ...(manifest.totals || {}), structuredMapPresentations: structuredMaps.count };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({
  status: 'PASS',
  procedures: payload.procedures.length,
  visualProjectionCount,
  markdownProcedureCount: payload.procedures.length - visualProjectionCount,
  sourceBackedRefCount,
}));
