import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Node fetch cannot resolve browser-relative URLs. Integration tests read the
// same published files as the browser, without consulting the editorial factory.
// Tests of unavailable/corrupt responses can still replace fetch explicitly.
const networkFetch = globalThis.fetch;
const unexpectedLoads: string[] = [];
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith('/knowledge/')) return networkFetch(input, init);
  const root = path.resolve('public/knowledge');
  const file = path.resolve(root, decodeURIComponent(url.slice('/knowledge/'.length).split('?')[0]));
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error(`Invalid published resource path: ${url}`);
  try {
    const body = await fs.readFile(file, 'utf8');
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    unexpectedLoads.push(url);
    throw error;
  }
};

afterEach(() => {
  if (typeof document !== 'undefined') cleanup();
  if (unexpectedLoads.length) {
    const failed = unexpectedLoads.splice(0);
    throw new Error(`Unexpected published resource failures: ${failed.join(', ')}`);
  }
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  Element.prototype.scrollIntoView = () => undefined;
  Element.prototype.scrollBy = () => undefined;

  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserverMock;
}
