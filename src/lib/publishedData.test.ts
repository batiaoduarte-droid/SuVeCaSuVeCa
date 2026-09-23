// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublishedJson, resetPublishedDataCache } from './publishedData';
const body = JSON.stringify({ id: 'preserved', answer: 'B' });
const descriptor = { file: 'part.json', bytes: Buffer.byteLength(body), sha256: createHash('sha256').update(body).digest('hex') };
beforeEach(resetPublishedDataCache);
afterEach(() => vi.unstubAllGlobals());
describe('verified delivery cache', () => {
  it('evicts inactive cached bytes while preserving data held by a consumer', async () => {
    const large = JSON.stringify({ payload: 'x'.repeat(17 * 1024 * 1024) });
    const fetcher = vi.fn().mockImplementation(async () => new Response(large));
    vi.stubGlobal('fetch', fetcher);
    const active = await fetchPublishedJson<{ payload: string }>('/first.json');
    await fetchPublishedJson('/second.json');
    await fetchPublishedJson('/second.json');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(active.payload.length).toBe(17 * 1024 * 1024);
    await fetchPublishedJson('/first.json');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('shares simultaneous requests and permits retry after a hash mismatch', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(body.replace('B', 'C'))).mockImplementation(async () => new Response(body));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchPublishedJson('/part.json', descriptor)).rejects.toThrow('SHA-256');
    const [a, b] = await Promise.all([fetchPublishedJson('/part.json', descriptor), fetchPublishedJson('/part.json', descriptor)]);
    expect(a).toBe(b); expect(a).toEqual({ id: 'preserved', answer: 'B' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects missing, truncated and invalid JSON without caching failures', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(body.slice(1)))
      .mockResolvedValueOnce(new Response('invalid')).mockResolvedValueOnce(new Response(body));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchPublishedJson('/part.json', descriptor)).rejects.toThrow('404');
    await expect(fetchPublishedJson('/part.json', descriptor)).rejects.toThrow('Tamanho');
    await expect(fetchPublishedJson('/part.json')).rejects.toThrow();
    await expect(fetchPublishedJson('/part.json', descriptor)).resolves.toHaveProperty('answer', 'B');
  });
  it('discards an obsolete response even when the transport ignores cancellation', async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockImplementation(async () => new Response(body));
    vi.stubGlobal('fetch', fetcher);
    const controller = new AbortController();
    const obsolete = fetchPublishedJson('/part.json', descriptor, controller.signal);
    controller.abort(); finish(new Response(body));
    await expect(obsolete).rejects.toThrow();
    await fetchPublishedJson('/part.json', descriptor);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
