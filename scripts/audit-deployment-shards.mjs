import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const resolve = (...segments) => path.resolve(ROOT, ...segments);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (...segments) => JSON.parse(await readFile(resolve(...segments), 'utf8'));
const errors = [];

const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const getId = (record) => String(record?.id ?? record?.question_id ?? '');

const auditFile = async (baseDirectory, descriptor) => {
  const buffer = await readFile(resolve(baseDirectory, descriptor.file));
  check(buffer.length === descriptor.bytes, `${descriptor.file}: bytes divergentes.`);
  check(sha256(buffer) === descriptor.sha256, `${descriptor.file}: SHA-256 divergente.`);
  return buffer;
};

const auditOfficialQuestions = async () => {
  const base = path.join('public', 'knowledge');
  const manifest = await readJson(base, 'official-questions.manifest.json');
  const raw = [];
  const normalized = [];
  const manifestIds = [];
  for (const shard of manifest.shards) {
    const [rawBuffer, normalizedBuffer] = await Promise.all([
      auditFile(base, shard.raw),
      auditFile(base, shard.normalized),
    ]);
    const rawItems = JSON.parse(rawBuffer.toString('utf8'));
    const normalizedItems = JSON.parse(normalizedBuffer.toString('utf8'));
    check(rawItems.length === shard.count, `Shard ${shard.part}: contagem bruta divergente.`);
    check(normalizedItems.length === shard.count, `Shard ${shard.part}: contagem normalizada divergente.`);
    check(JSON.stringify(rawItems.map(getId)) === JSON.stringify(shard.questionIds), `Shard ${shard.part}: IDs brutos divergentes.`);
    check(JSON.stringify(normalizedItems.map(getId)) === JSON.stringify(shard.questionIds), `Shard ${shard.part}: IDs normalizados divergentes.`);
    raw.push(...rawItems);
    normalized.push(...normalizedItems);
    manifestIds.push(...shard.questionIds);
  }

  const indexPayload = await readJson(base, 'official-question-index.json');
  const indexIds = indexPayload.items.map((item) => String(item.questionId));
  const generatedKeySource = await readFile(resolve('functions', 'src', 'officialCorpus.generated.ts'), 'utf8');
  const generatedKeyMatch = /export const OFFICIAL_CORPUS_ANSWER_KEY = ([\s\S]*?) as const;/.exec(generatedKeySource);
  const generatedKey = generatedKeyMatch ? JSON.parse(generatedKeyMatch[1]) : {};
  const expectedKey = Object.fromEntries(indexPayload.items.map((item) => [String(item.questionId), item.officialProjection.correctAnswer]));
  check(raw.length === 372, `Corpus bruto particionado: ${raw.length}/372.`);
  check(normalized.length === 372, `Corpus normalizado particionado: ${normalized.length}/372.`);
  check(indexIds.length === 372, `Índice oficial: ${indexIds.length}/372.`);
  check(new Set(manifestIds).size === 372, `IDs únicos particionados: ${new Set(manifestIds).size}/372.`);
  check(JSON.stringify(raw.map(getId)) === JSON.stringify(normalized.map(getId)), 'Ordem entre bruto e normalizado divergente.');
  check(indexIds.every((id) => manifestIds.includes(id)), 'O índice contém IDs ausentes das partições.');
  check(JSON.stringify(generatedKey) === JSON.stringify(expectedKey), 'Gabarito server-side do corpus oficial diverge do índice preservado.');
  check(manifest.totals.shards === manifest.shards.length, 'Quantidade de shards divergente no manifesto.');

  const rawSourcePath = resolve(base, manifest.sources.raw.file);
  const normalizedSourcePath = resolve(base, manifest.sources.normalized.file);
  try {
    const [rawSource, normalizedSource] = await Promise.all([readFile(rawSourcePath), readFile(normalizedSourcePath)]);
    check(sha256(rawSource) === manifest.sources.raw.sha256, 'Hash do monólito bruto divergente.');
    check(sha256(normalizedSource) === manifest.sources.normalized.sha256, 'Hash do monólito normalizado divergente.');
    check(JSON.stringify(JSON.parse(rawSource.toString('utf8'))) === JSON.stringify(raw), 'As partições brutas não são equivalentes ao monólito.');
    check(JSON.stringify(JSON.parse(normalizedSource.toString('utf8'))) === JSON.stringify(normalized), 'As partições normalizadas não são equivalentes ao monólito.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return { raw: raw.length, normalized: normalized.length, indexed: indexIds.length, uniqueIds: new Set(manifestIds).size, serverAnswerKey: Object.keys(generatedKey).length, shards: manifest.shards.length };
};

const auditSemanticProfiles = async () => {
  const base = path.join('public', 'knowledge');
  const manifest = await readJson(base, 'semantic-profiles-v3.manifest.json');
  const decodedParts = [];
  for (const part of manifest.parts) {
    const fileBuffer = await auditFile(base, part);
    const payload = JSON.parse(fileBuffer.toString('utf8'));
    const decoded = Buffer.from(payload.data, 'base64');
    check(payload.sequence === part.sequence, `${part.file}: sequência divergente.`);
    check(decoded.length === part.decodedBytes, `${part.file}: tamanho decodificado divergente.`);
    check(sha256(decoded) === part.decodedSha256, `${part.file}: hash decodificado divergente.`);
    decodedParts.push(decoded);
  }
  const reconstructed = Buffer.concat(decodedParts);
  check(reconstructed.length === manifest.source.bytes, 'Tamanho reconstruído dos perfis V3 divergente.');
  check(sha256(reconstructed) === manifest.source.sha256, 'Hash reconstruído dos perfis V3 divergente.');
  const profiles = JSON.parse(reconstructed.toString('utf8'));
  check(profiles.metrics.sources === 284, 'Perfis V3: fontes divergentes.');
  check(profiles.metrics.dispositions === 924, 'Perfis V3: disposições divergentes.');
  check(profiles.conceptProfiles.length === 129, 'Perfis V3: perfis conceituais divergentes.');
  try {
    const source = await readFile(resolve(manifest.source.file));
    check(source.equals(reconstructed), 'Reconstrução dos perfis V3 não é byte a byte idêntica ao original.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return { sources: profiles.metrics.sources, dispositions: profiles.metrics.dispositions, conceptProfiles: profiles.conceptProfiles.length, parts: manifest.parts.length };
};

const parseConstLiteral = (source, exportName) => {
  const expression = new RegExp(`export const ${exportName} = ([\\s\\S]*?) as const;`).exec(source)?.[1];
  if (!expression) throw new Error(`Export ${exportName} ausente.`);
  return JSON.parse(expression);
};

const auditKnowledgeIndex = async () => {
  const base = path.join('src', 'data', 'knowledge-index');
  const manifest = await readJson(base, 'manifest.json');
  const records = [];
  for (const part of manifest.parts) {
    const buffer = await auditFile(base, part);
    const parsed = parseConstLiteral(buffer.toString('utf8'), part.exportName);
    check(parsed.length === part.count, `${part.file}: contagem de registros divergente.`);
    records.push(...parsed);
  }
  check(records.length === manifest.expectedRecords, `Índice semântico: ${records.length}/${manifest.expectedRecords}.`);
  const recordKeys = records.map((record) => `${record.id}::${record.moduleId}::${record.sectionIndex}`);
  check(new Set(recordKeys).size === records.length, 'Índice semântico contém registros estruturalmente duplicados.');
  check(new Set(records.map((record) => record.id)).size === manifest.uniqueCanonicalIds, 'Quantidade de IDs canônicos únicos divergente.');
  check(sha256(Buffer.from(JSON.stringify(records), 'utf8')) === manifest.recordsSha256, 'Hash lógico do índice semântico divergente.');
  check(manifest.build.sourceCount === 284, 'KNOWLEDGE_BUILD não registra 284 fontes.');
  check(manifest.build.officialQuestionCount === 372, 'KNOWLEDGE_BUILD não registra 372 questões oficiais.');
  return { records: records.length, parts: manifest.parts.length, buildId: manifest.build.buildId };
};

const [officialQuestions, semanticProfiles, knowledgeIndex] = await Promise.all([
  auditOfficialQuestions(),
  auditSemanticProfiles(),
  auditKnowledgeIndex(),
]);

if (errors.length) {
  console.error(JSON.stringify({ status: 'error', errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: 'ok', officialQuestions, semanticProfiles, knowledgeIndex }, null, 2));
}
