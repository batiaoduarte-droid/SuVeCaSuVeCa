// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getOfficialQuestion,
  getOfficialQuestionStoreHealth,
  queryOfficialQuestions,
  resetOfficialQuestionStoreForTests,
  sampleOfficialQuestions,
} from './officialQuestions.server';

let temporaryKnowledgeDirectory = '';

beforeEach(async () => {
  temporaryKnowledgeDirectory = await mkdtemp(path.join(os.tmpdir(), 'suveca-question-shards-'));
  const source = path.resolve('public', 'knowledge');
  await Promise.all([
    cp(path.join(source, 'official-question-parts'), path.join(temporaryKnowledgeDirectory, 'official-question-parts'), { recursive: true }),
    cp(path.join(source, 'official-question-search.json'), path.join(temporaryKnowledgeDirectory, 'official-question-search.json')),
    cp(path.join(source, 'official-question-index.json'), path.join(temporaryKnowledgeDirectory, 'official-question-index.json')),
    cp(path.join(source, 'official-questions.manifest.json'), path.join(temporaryKnowledgeDirectory, 'official-questions.manifest.json')),
  ]);
  process.env.SUVECA_KNOWLEDGE_DIR = temporaryKnowledgeDirectory;
  resetOfficialQuestionStoreForTests();
}, 30000);

afterEach(async () => {
  resetOfficialQuestionStoreForTests();
  delete process.env.SUVECA_KNOWLEDGE_DIR;
  await rm(temporaryKnowledgeDirectory, { recursive: true, force: true });
}, 30000);

describe('official question shard store', () => {
  it('loads the complete editorial bank from verified shards', async () => {
    const manifest = JSON.parse(
      await readFile(path.join(temporaryKnowledgeDirectory, 'official-questions.manifest.json'), 'utf8')
    );
    const health = await getOfficialQuestionStoreHealth();
    expect(health).toMatchObject({
      expected: manifest.expectedTotal,
      raw: manifest.expectedTotal,
      normalized: manifest.expectedTotal,
      indexed: manifest.expectedTotal,
      uniqueIds: manifest.expectedTotal,
      buildId: manifest.buildId,
      questionSetVersion: manifest.questionSetVersion,
      source: 'sharded',
      location: 'configured/knowledge',
    });
    expect(manifest.expectedTotal).toBeGreaterThan(1000);

    const page = await queryOfficialQuestions({}, { limit: 1 });
    expect(page.total).toBe(manifest.expectedTotal);
    expect(page.items).toHaveLength(1);
    const detail = await getOfficialQuestion(page.items[0].questionId);
    expect(detail?.questionId).toBe(page.items[0].questionId);
    expect(detail?.provenance).toMatchObject({
      kind: 'editorial_question',
      payloadPolicy: 'source_preserved',
      buildId: manifest.buildId,
      questionSetVersion: manifest.questionSetVersion,
    });
  });

  it('samples unique question ids', async () => {
    const sample = (await sampleOfficialQuestions({}, 10)).filter(Boolean);
    expect(sample).toHaveLength(10);
    expect(new Set(sample.map((item) => item?.questionId)).size).toBe(10);
    expect(sample.every((item) => /^A(?:0\d|1[0-3]):/.test(item!.questionId))).toBe(true);
  });

  it('rejects a corrupted shard and can retry after it is restored', async () => {
    const manifest = JSON.parse(await readFile(path.join(temporaryKnowledgeDirectory, 'official-questions.manifest.json'), 'utf8'));
    const shardPath = path.join(temporaryKnowledgeDirectory, manifest.shards[0].raw.file);
    const original = await readFile(shardPath);
    await writeFile(shardPath, Buffer.concat([original, Buffer.from('corruption')]));
    await expect(getOfficialQuestion(manifest.shards[0].questionIds[0])).rejects.toThrow(/Tamanho divergente/);

    await writeFile(shardPath, original);
    await expect(getOfficialQuestion(manifest.shards[0].questionIds[0])).resolves.toMatchObject({
      questionId: manifest.shards[0].questionIds[0],
    });
  });
  it('preserves text ranking while raw shards are unavailable and keeps practice opt-in', async () => {
    const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    const manifest = JSON.parse(await readFile(path.join(temporaryKnowledgeDirectory, 'official-questions.manifest.json'), 'utf8'));
    const index = JSON.parse(await readFile(path.join(temporaryKnowledgeDirectory, 'official-question-index.json'), 'utf8')).items;
    const normalized = (await Promise.all(manifest.shards.map((s: any) => readFile(path.join(temporaryKnowledgeDirectory, s.normalized.file), 'utf8').then(JSON.parse)))).flat();
    const byId = new Map(normalized.map(q => [q.id, q]));
    const practice = await getOfficialQuestion(index[0].questionId, 'practice');
    const full = await getOfficialQuestion(index[0].questionId);
    expect(practice?.editorial).not.toHaveProperty('raw');
    expect(full?.editorial).toHaveProperty('raw');
    expect(practice?.editorial.normalized).toEqual(full?.editorial.normalized);
    for (const shard of manifest.shards) await rm(path.join(temporaryKnowledgeDirectory, shard.raw.file));
    resetOfficialQuestionStoreForTests();
    for (const query of ['concordância verbal', 'crase', 'FGV', 'interpretação', 'de']) {
      const terms = normalize(query).split(/\s+/).filter(t => t.length > 2);
      const expected = index.map((item: any) => {
        const q: any = byId.get(item.questionId);
        const p = item.editorialProjection;
        const text = normalize([q.supportText, q.prompt, q.commentary, ...(q.options || []).map((o: any) => o.text), ...p.topicNames, ...p.banks, ...p.organizations].join(' '));
        return { id: item.questionId, score: terms.reduce((sum, term) => sum + Number(text.includes(term)), 0) };
      }).filter((r: any) => r.score > 0).sort((a: any, b: any) => b.score - a.score || a.id.localeCompare(b.id, 'en'));
      const actual = await queryOfficialQuestions({ query }, { limit: 100 });
      expect(actual.total).toBe(expected.length);
      expect(actual.items.map(i => i.questionId)).toEqual(expected.slice(0, 100).map((i: any) => i.id));
    }
  });

});
