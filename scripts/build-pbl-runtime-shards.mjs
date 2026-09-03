import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PBL_DIR = path.resolve(ROOT, 'public', 'knowledge', 'pbl');
const OUTPUT_DIR = path.join(PBL_DIR, 'runtime-parts');
const TARGET_BYTES = 2 * 1024 * 1024;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const jsonBuffer = (value) => Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');

const readJsonWithSource = async (fileName) => {
  const source = await readFile(path.join(PBL_DIR, fileName));
  const value = JSON.parse(source.toString('utf8'));
  assert(value && typeof value === 'object' && !Array.isArray(value), `${fileName} deve conter um objeto indexado.`);
  return { source, value };
};

const buildDataset = async ({ sourceFile, filePrefix }) => {
  const { source, value } = await readJsonWithSource(sourceFile);
  const entries = Object.entries(value);
  assert(entries.length > 0, `${sourceFile} está vazio.`);

  const groups = [];
  let current = [];
  let currentBytes = 3; // chaves do objeto + quebra final
  for (const entry of entries) {
    const entryBytes = Buffer.byteLength(`${JSON.stringify(entry[0])}:${JSON.stringify(entry[1])}`, 'utf8');
    const candidateBytes = currentBytes + entryBytes + (current.length > 0 ? 1 : 0);
    if (current.length > 0 && candidateBytes > TARGET_BYTES) {
      groups.push(current);
      current = [];
      currentBytes = 3;
    }
    current.push(entry);
    currentBytes += entryBytes + (current.length > 1 ? 1 : 0);
    assert(
      currentBytes <= TARGET_BYTES,
      `O registro ${entry[0]} de ${sourceFile} excede sozinho o limite de shard.`,
    );
  }
  if (current.length) groups.push(current);

  const shards = [];
  for (let index = 0; index < groups.length; index += 1) {
    const part = String(index + 1).padStart(3, '0');
    const file = `runtime-parts/${filePrefix}.part-${part}.json`;
    const buffer = jsonBuffer(Object.fromEntries(groups[index]));
    await writeFile(path.join(PBL_DIR, file), buffer);
    shards.push({
      part: index + 1,
      file,
      recordCount: groups[index].length,
      bytes: buffer.length,
      sha256: sha256(buffer),
      firstQuestionRef: groups[index][0][0],
      lastQuestionRef: groups[index].at(-1)[0],
    });
  }

  return {
    source: {
      file: sourceFile,
      bytes: source.length,
      sha256: sha256(source),
    },
    totalRecords: entries.length,
    shards,
  };
};

assert(OUTPUT_DIR.startsWith(`${PBL_DIR}${path.sep}`), `Diretório de saída inseguro: ${OUTPUT_DIR}`);
await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(OUTPUT_DIR, { recursive: true });

const [questionCompetencyLinks, questionPedagogy] = await Promise.all([
  buildDataset({
    sourceFile: 'question_competency_links.json',
    filePrefix: 'question-competency-links',
  }),
  buildDataset({
    sourceFile: 'question_pedagogy_index.json',
    filePrefix: 'question-pedagogy',
  }),
]);

assert(
  questionCompetencyLinks.totalRecords === questionPedagogy.totalRecords,
  'Os universos de links e pedagogias PBL divergem.',
);

const pblManifestPath = path.join(PBL_DIR, 'pbl_manifest.json');
const pblManifest = JSON.parse(await readFile(pblManifestPath, 'utf8'));
assert(
  questionCompetencyLinks.totalRecords === (pblManifest.totalRuntimeQuestionLinks ?? pblManifest.totalQuestionLinks),
  'A contagem de links não coincide com pbl_manifest.json.',
);
assert(
  questionPedagogy.totalRecords === (pblManifest.totalRuntimeQuestionPedagogy ?? pblManifest.totalQuestionPedagogy),
  'A contagem de pedagogias não coincide com pbl_manifest.json.',
);

const runtimeManifest = {
  schemaVersion: '1.0.0',
  kind: 'suveca-pbl-runtime-shards',
  generatedAt: pblManifest.generatedAt,
  partitionPolicy: {
    ordering: 'source-object-key-order',
    targetBytesPerFile: TARGET_BYTES,
    equivalence: 'deep-json-by-question-reference',
  },
  datasets: {
    questionCompetencyLinks,
    questionPedagogy,
  },
};

const runtimeManifestFile = 'pbl_runtime_manifest.json';
await writeFile(
  path.join(PBL_DIR, runtimeManifestFile),
  `${JSON.stringify(runtimeManifest, null, 2)}\n`,
);

pblManifest.runtimeProjection = {
  kind: runtimeManifest.kind,
  manifestFile: runtimeManifestFile,
  questionLinks: questionCompetencyLinks.totalRecords,
  questionPedagogy: questionPedagogy.totalRecords,
  maximumShardBytes: TARGET_BYTES,
};
await writeFile(pblManifestPath, `${JSON.stringify(pblManifest, null, 2)}\n`);

console.log(JSON.stringify({
  status: 'ok',
  manifest: runtimeManifestFile,
  questionLinks: questionCompetencyLinks.totalRecords,
  questionLinkShards: questionCompetencyLinks.shards.length,
  questionPedagogy: questionPedagogy.totalRecords,
  questionPedagogyShards: questionPedagogy.shards.length,
  maximumShardBytes: TARGET_BYTES,
}, null, 2));
