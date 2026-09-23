// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PBLRepository } from '../data/PBLRepository';
import { resetPublishedDataCache } from '../../publishedData';
const root = path.resolve('public/knowledge');
let requested: string[];
beforeEach(() => {
  resetPublishedDataCache(); requested = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requested.push(url);
    return new Response(fs.readFileSync(path.join(root, url.replace('/knowledge/', ''))), { headers: { 'content-type': 'application/json' } });
  }));
});
afterEach(() => vi.unstubAllGlobals());
it('opens the dashboard without question, structure or authored package payloads', async () => {
  const repository = new PBLRepository();
  await Promise.all([repository.init(), repository.init()]);
  expect(await repository.getAllCompetencies()).toHaveLength(190);
  expect(await repository.getCumulativeSessions()).toHaveLength(13);
  expect(requested).toHaveLength(4);
  expect(requested.every(url => !/parts|authored/.test(url))).toBe(true);
  const competency = (await repository.getAllCompetencies())[0];
  const item = await repository.getCaseForCompetency(competency.competencyId);
  expect(item?.competencyRef).toBe(competency.competencyId);
  expect(requested.filter(url => url.includes('structure-parts/cases/'))).toHaveLength(1);
  const pkg = await repository.getAuthoredPackage(competency.competencyId);
  expect(pkg.competencyRef).toBe(competency.competencyId);
  expect(requested.filter(url => url.includes('authored-parts/'))).toHaveLength(1);
});
it('retries a failed question fragment without substituting another question', async () => {
  const repository = new PBLRepository(); await repository.init();
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'pbl/pbl_runtime_manifest.json'), 'utf8'));
  const descriptor = manifest.datasets.questionPedagogy.shards[0];
  const ref = descriptor.firstQuestionRef;
  const originalFetch = globalThis.fetch;
  let corrupted = true;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (corrupted && url.endsWith(descriptor.file)) { corrupted = false; return new Response('{}'); }
    return originalFetch(url, init);
  }));
  await expect(repository.getQuestionPedagogy(ref)).rejects.toThrow('Tamanho');
  const value = await repository.getQuestionPedagogy(ref);
  const source = JSON.parse(fs.readFileSync(path.join(root, 'pbl', descriptor.file), 'utf8'));
  expect(value).toEqual(source[ref]);
});
