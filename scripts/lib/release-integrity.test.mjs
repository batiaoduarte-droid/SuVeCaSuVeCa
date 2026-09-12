import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyArtifact, ArtifactIntegrityError } from './release-integrity.mjs';

const causeOf = (fn) => {
  try { fn(); } catch (error) { if (error instanceof ArtifactIntegrityError) return error.cause; throw error; }
  throw new Error('expected verifyArtifact to throw');
};

describe('published artifact integrity', () => {
  it('rejects missing, truncated, same-size corrupted and newline-transformed imports', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'suveca-integrity-'));
    try {
      const bytes = Buffer.from('{"id":"canonical"}\n');
      const descriptor = { file: 'part.json', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
      expect(causeOf(() => verifyArtifact(root, descriptor))).toBe('missing');
      fs.writeFileSync(path.join(root, descriptor.file), bytes);
      expect(verifyArtifact(root, descriptor)).toEqual(bytes);
      for (const changed of [bytes.subarray(1), Buffer.from(bytes.toString().replace('canonical', 'CANONICAL')), Buffer.from(bytes.toString().replace('\n', '\r\n'))]) {
        fs.writeFileSync(path.join(root, descriptor.file), changed);
        expect(() => verifyArtifact(root, descriptor)).toThrow();
      }
      expect(causeOf(() => verifyArtifact(root, { ...descriptor, file: '../escape.json' }))).toBe('outside-root');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports a truncated final chunk as size-mismatch, not generic corruption', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'suveca-truncated-'));
    try {
      const full = Buffer.from(JSON.stringify({ large: 'x'.repeat(4096) }) + '\n');
      const descriptor = { file: 'agg.json', bytes: full.length, sha256: createHash('sha256').update(full).digest('hex') };
      fs.writeFileSync(path.join(root, descriptor.file), full.subarray(0, 1024));
      expect(causeOf(() => verifyArtifact(root, descriptor))).toBe('size-mismatch');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
