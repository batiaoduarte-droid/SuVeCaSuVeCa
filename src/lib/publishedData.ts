export interface PublishedFile { file: string; bytes: number; sha256: string }
const MAX_BYTES = 32 * 1024 * 1024;
const cache = new Map<string, { value: unknown; bytes: number }>();
const pending = new Map<string, Promise<unknown>>();
let totalBytes = 0;

export function publishedUrl(base: string, file: string): string {
  if (!file || file.startsWith('/') || file.includes('..') || file.includes('\\') || /[:?#]/.test(file)) {
    throw new Error('Caminho de publicação inválido.');
  }
  return `${base.replace(/\/$/, '')}/${file}`;
}

export async function fetchPublishedJson<T>(url: string, descriptor?: PublishedFile, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const key = `${url}:${descriptor?.sha256 || ''}`;
  const existing = cache.get(key);
  if (existing) { cache.delete(key); cache.set(key, existing); return existing.value as T; }
  if (!signal && pending.has(key)) return pending.get(key) as Promise<T>;
  const request = (async () => {
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Falha ao carregar ${url}: HTTP ${response.status}.`);
    const text = await response.text();
    const bytes = new TextEncoder().encode(text);
    if (descriptor) {
      if (bytes.byteLength !== descriptor.bytes) throw new Error(`Tamanho divergente: ${url}.`);
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      const digest = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
      if (digest !== descriptor.sha256) throw new Error(`SHA-256 divergente: ${url}.`);
    }
    const value = JSON.parse(text) as T;
    signal?.throwIfAborted();
    // Eviction releases only the cache reference. Mounted consumers retain their
    // data and answers; no user state lives in this cache.
    if (bytes.byteLength <= MAX_BYTES) {
      const replaced = cache.get(key);
      if (replaced) { totalBytes -= replaced.bytes; cache.delete(key); }
      cache.set(key, { value, bytes: bytes.byteLength }); totalBytes += bytes.byteLength;
      while (totalBytes > MAX_BYTES) {
        const first = cache.keys().next().value!;
        totalBytes -= cache.get(first)!.bytes; cache.delete(first);
      }
    }
    return value;
  })();
  if (!signal) pending.set(key, request);
  try { return await request; } finally { if (pending.get(key) === request) pending.delete(key); }
}

export function resetPublishedDataCache() { cache.clear(); pending.clear(); totalBytes = 0; }

export function invalidatePublishedData(url: string) {
  for (const [key, entry] of cache) if (key.startsWith(url + ':')) {
    totalBytes -= entry.bytes; cache.delete(key);
  }
}
