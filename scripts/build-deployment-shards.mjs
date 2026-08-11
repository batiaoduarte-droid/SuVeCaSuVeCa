import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const QUESTION_TARGET_BYTES = 650 * 1024;
const PROFILE_CHUNK_BYTES = 450 * 1024;
const KNOWLEDGE_INDEX_TARGET_BYTES = 600 * 1024;

const resolve = (...segments) => path.resolve(ROOT, ...segments);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');
const readJson = async (...segments) => JSON.parse(await readFile(resolve(...segments), 'utf8'));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const recreateGeneratedDir = async (...segments) => {
  const directory = resolve(...segments);
  const expectedParent = resolve(segments[0]);
  assert(directory.startsWith(`${expectedParent}${path.sep}`), `Diretório de saída inseguro: ${directory}`);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  return directory;
};

const writeBuffer = async (filePath, buffer) => {
  await writeFile(filePath, buffer);
  return {
    bytes: buffer.length,
    sha256: sha256(buffer),
  };
};

const getId = (record) => String(record?.id ?? record?.question_id ?? '');

const validateQuestionSources = (raw, normalized, indexPayload) => {
  assert(Array.isArray(raw), 'O corpus bruto não é um array.');
  assert(Array.isArray(normalized), 'O corpus normalizado não é um array.');
  assert(Array.isArray(indexPayload?.items), 'O índice oficial não contém items.');
  assert(raw.length === 372, `Corpus bruto: esperado 372, recebido ${raw.length}.`);
  assert(normalized.length === 372, `Corpus normalizado: esperado 372, recebido ${normalized.length}.`);
  assert(indexPayload.items.length === 372, `Índice: esperado 372, recebido ${indexPayload.items.length}.`);

  const rawIds = raw.map(getId);
  const normalizedIds = normalized.map(getId);
  const indexIds = indexPayload.items.map((item) => String(item.questionId || ''));
  for (const [label, ids] of [['bruto', rawIds], ['normalizado', normalizedIds], ['índice', indexIds]]) {
    assert(ids.every(Boolean), `O conjunto ${label} contém ID vazio.`);
    assert(new Set(ids).size === 372, `O conjunto ${label} contém IDs duplicados.`);
  }
  assert(JSON.stringify(rawIds) === JSON.stringify(normalizedIds), 'A ordem/IDs do bruto e do normalizado divergem.');
  assert(new Set(indexIds).size === new Set(rawIds).size && indexIds.every((id) => rawIds.includes(id)), 'Os IDs do índice divergem do corpus oficial.');
  return rawIds;
};

const buildQuestionShards = async () => {
  const rawPath = resolve('public', 'knowledge', 'official-questions.raw.json');
  const normalizedPath = resolve('public', 'knowledge', 'official-questions.normalized.json');
  const indexPath = resolve('public', 'knowledge', 'official-question-index.json');
  const [rawSource, normalizedSource, indexSource] = await Promise.all([
    readFile(rawPath),
    readFile(normalizedPath),
    readFile(indexPath),
  ]);
  const raw = JSON.parse(rawSource.toString('utf8'));
  const normalized = JSON.parse(normalizedSource.toString('utf8'));
  const indexPayload = JSON.parse(indexSource.toString('utf8'));
  validateQuestionSources(raw, normalized, indexPayload);

  const groups = [];
  let rawGroup = [];
  let normalizedGroup = [];
  const flush = () => {
    if (!rawGroup.length) return;
    groups.push({ raw: rawGroup, normalized: normalizedGroup });
    rawGroup = [];
    normalizedGroup = [];
  };

  for (let index = 0; index < raw.length; index += 1) {
    const candidateRaw = [...rawGroup, raw[index]];
    const candidateNormalized = [...normalizedGroup, normalized[index]];
    const exceedsTarget = jsonBytes(candidateRaw).length > QUESTION_TARGET_BYTES
      || jsonBytes(candidateNormalized).length > QUESTION_TARGET_BYTES;
    if (exceedsTarget && rawGroup.length) flush();
    rawGroup.push(raw[index]);
    normalizedGroup.push(normalized[index]);
    assert(jsonBytes(rawGroup).length <= QUESTION_TARGET_BYTES, `A questão ${getId(raw[index])} excede o limite individual do shard bruto.`);
    assert(jsonBytes(normalizedGroup).length <= QUESTION_TARGET_BYTES, `A questão ${getId(normalized[index])} excede o limite individual do shard normalizado.`);
  }
  flush();

  const outputDir = await recreateGeneratedDir('public', 'knowledge', 'official-question-parts');
  const shards = [];
  for (let index = 0; index < groups.length; index += 1) {
    const part = String(index + 1).padStart(3, '0');
    const rawFile = `official-questions.raw.part-${part}.json`;
    const normalizedFile = `official-questions.normalized.part-${part}.json`;
    const rawBuffer = jsonBytes(groups[index].raw);
    const normalizedBuffer = jsonBytes(groups[index].normalized);
    const [rawMeta, normalizedMeta] = await Promise.all([
      writeBuffer(path.join(outputDir, rawFile), rawBuffer),
      writeBuffer(path.join(outputDir, normalizedFile), normalizedBuffer),
    ]);
    shards.push({
      part: index + 1,
      count: groups[index].raw.length,
      questionIds: groups[index].raw.map(getId),
      raw: { file: `official-question-parts/${rawFile}`, ...rawMeta },
      normalized: { file: `official-question-parts/${normalizedFile}`, ...normalizedMeta },
    });
  }

  const manifest = {
    schemaVersion: '1.0.0',
    kind: 'suveca-official-question-shards',
    buildId: indexPayload.buildId,
    expectedTotal: 372,
    partitionPolicy: {
      ordering: 'official-source-order',
      targetBytesPerFile: QUESTION_TARGET_BYTES,
      equivalence: 'deep-json-with-stable-question-id-order',
    },
    sources: {
      raw: { file: 'official-questions.raw.json', bytes: rawSource.length, sha256: sha256(rawSource) },
      normalized: { file: 'official-questions.normalized.json', bytes: normalizedSource.length, sha256: sha256(normalizedSource) },
      index: { file: 'official-question-index.json', bytes: indexSource.length, sha256: sha256(indexSource) },
    },
    totals: {
      raw: raw.length,
      normalized: normalized.length,
      indexed: indexPayload.items.length,
      uniqueQuestionIds: new Set(raw.map(getId)).size,
      shards: shards.length,
    },
    shards,
  };
  await writeFile(resolve('public', 'knowledge', 'official-questions.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

const buildSemanticProfileShards = async () => {
  const sourcePath = resolve('knowledge', 'canonical', 'semantic-profiles-v3.json');
  const source = await readFile(sourcePath);
  const parsed = JSON.parse(source.toString('utf8'));
  assert(parsed?.status === 'complete', 'Os perfis semânticos V3 não estão completos.');
  assert(parsed?.metrics?.sources === 284, 'Os perfis V3 não registram 284 fontes.');
  assert(parsed?.metrics?.dispositions === 924, 'Os perfis V3 não registram 924 disposições.');
  assert(Array.isArray(parsed?.conceptProfiles) && parsed.conceptProfiles.length === 129, 'Os perfis V3 não contêm 129 perfis conceituais.');

  const outputDir = await recreateGeneratedDir('public', 'knowledge', 'semantic-profile-parts');
  const parts = [];
  for (let offset = 0, sequence = 1; offset < source.length; offset += PROFILE_CHUNK_BYTES, sequence += 1) {
    const decoded = source.subarray(offset, Math.min(offset + PROFILE_CHUNK_BYTES, source.length));
    const file = `semantic-profiles-v3.part-${String(sequence).padStart(3, '0')}.json`;
    const payload = {
      schemaVersion: '1.0.0',
      kind: 'suveca-semantic-profile-byte-part',
      sequence,
      contentEncoding: 'base64',
      data: decoded.toString('base64'),
    };
    const fileBuffer = jsonBytes(payload);
    const fileMeta = await writeBuffer(path.join(outputDir, file), fileBuffer);
    parts.push({
      sequence,
      file: `semantic-profile-parts/${file}`,
      ...fileMeta,
      decodedBytes: decoded.length,
      decodedSha256: sha256(decoded),
    });
  }

  const manifest = {
    schemaVersion: '1.0.0',
    kind: 'suveca-semantic-profile-shards',
    contentEncoding: 'base64',
    source: {
      file: 'knowledge/canonical/semantic-profiles-v3.json',
      bytes: source.length,
      sha256: sha256(source),
    },
    metrics: parsed.metrics,
    totals: { conceptProfiles: parsed.conceptProfiles.length, parts: parts.length },
    parts,
  };
  await writeFile(resolve('public', 'knowledge', 'semantic-profiles-v3.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

const parseConstLiteral = (source, exportName) => {
  const expression = new RegExp(`export const ${exportName} = ([\\s\\S]*?) as const;`).exec(source)?.[1];
  assert(expression, `Não foi possível localizar ${exportName}.`);
  return JSON.parse(expression);
};

const loadKnowledgeIndex = async () => {
  const aggregatorPath = resolve('src', 'data', 'knowledgeIndex.generated.ts');
  const aggregatorSource = await readFile(aggregatorPath, 'utf8');
  const build = parseConstLiteral(aggregatorSource, 'KNOWLEDGE_BUILD');
  try {
    return { build, records: parseConstLiteral(aggregatorSource, 'KNOWLEDGE_INDEX') };
  } catch {
    const manifest = await readJson('src', 'data', 'knowledge-index', 'manifest.json');
    const records = [];
    for (const part of manifest.parts) {
      const source = await readFile(resolve('src', 'data', 'knowledge-index', part.file), 'utf8');
      records.push(...parseConstLiteral(source, part.exportName));
    }
    return { build, records };
  }
};

const buildKnowledgeIndexShards = async () => {
  const { build, records } = await loadKnowledgeIndex();
  assert(Array.isArray(records) && records.length >= 129, `Índice semântico incompleto: recebido ${records?.length}.`);
  const recordKeys = records.map((record) => `${record.id}::${record.moduleId}::${record.sectionIndex}`);
  assert(new Set(recordKeys).size === records.length, 'O índice semântico contém registros estruturalmente duplicados.');

  const groups = [];
  let group = [];
  for (const record of records) {
    const candidate = [...group, record];
    const bytes = Buffer.byteLength(JSON.stringify(candidate, null, 2), 'utf8');
    if (bytes > KNOWLEDGE_INDEX_TARGET_BYTES && group.length) {
      groups.push(group);
      group = [];
    }
    group.push(record);
  }
  if (group.length) groups.push(group);

  const outputDir = await recreateGeneratedDir('src', 'data', 'knowledge-index');
  const parts = [];
  for (let index = 0; index < groups.length; index += 1) {
    const part = String(index + 1).padStart(3, '0');
    const file = `knowledge-index.part-${part}.generated.ts`;
    const exportName = `KNOWLEDGE_INDEX_PART_${part}`;
    const source = `/* AUTO-GENERATED by scripts/build-deployment-shards.mjs. */\nexport const ${exportName} = ${JSON.stringify(groups[index], null, 2)} as const;\n`;
    const buffer = Buffer.from(source, 'utf8');
    assert(buffer.length <= KNOWLEDGE_INDEX_TARGET_BYTES + 120_000, `Parte ${part} do índice semântico ficou excessivamente grande.`);
    const meta = await writeBuffer(path.join(outputDir, file), buffer);
    parts.push({ part: index + 1, file, exportName, count: groups[index].length, ...meta });
  }

  const imports = parts.map((part) => `import { ${part.exportName} } from './knowledge-index/${part.file.replace(/\.ts$/, '')}';`).join('\n');
  const spreads = parts.map((part) => `  ...${part.exportName},`).join('\n');
  const aggregator = `/* AUTO-GENERATED by scripts/build-deployment-shards.mjs. */\n${imports}\n\nexport const KNOWLEDGE_BUILD = ${JSON.stringify(build, null, 2)} as const;\n\nexport const KNOWLEDGE_INDEX = [\n${spreads}\n] as const;\n`;
  await writeFile(resolve('src', 'data', 'knowledgeIndex.generated.ts'), aggregator);

  const manifest = {
    schemaVersion: '1.0.0',
    kind: 'suveca-typescript-knowledge-index-shards',
    build,
    expectedRecords: records.length,
    uniqueCanonicalIds: new Set(records.map((record) => record.id)).size,
    duplicateCanonicalIds: [...new Set(records.map((record) => record.id).filter((id, index, values) => values.indexOf(id) !== index))],
    targetBytesPerFile: KNOWLEDGE_INDEX_TARGET_BYTES,
    recordsSha256: sha256(Buffer.from(JSON.stringify(records), 'utf8')),
    parts,
  };
  await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

const main = async () => {
  const [questions, profiles, knowledgeIndex] = await Promise.all([
    buildQuestionShards(),
    buildSemanticProfileShards(),
    buildKnowledgeIndexShards(),
  ]);
  console.log(JSON.stringify({
    status: 'ok',
    questionShards: questions.totals.shards,
    officialQuestions: questions.totals.uniqueQuestionIds,
    semanticProfileParts: profiles.totals.parts,
    semanticProfiles: profiles.totals.conceptProfiles,
    knowledgeIndexParts: knowledgeIndex.parts.length,
    knowledgeIndexRecords: knowledgeIndex.expectedRecords,
  }, null, 2));
};

await main();
