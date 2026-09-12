import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyArtifact } from './release-integrity.mjs';

describe('published artifact integrity', () => {
  it('rejects missing, truncated, same-size corrupted and newline-transformed imports', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'suveca-integrity-'));
    try {
      const bytes = Buffer.from('{"id":"canonical"}\n');
      const descriptor = { file: 'part.json', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
      expect(() => verifyArtifact(root, descriptor)).toThrow();
      fs.writeFileSync(path.join(root, descriptor.file), bytes);
      expect(verifyArtifact(root, descriptor)).toEqual(bytes);
      for (const changed of [bytes.subarray(1), Buffer.from(bytes.toString().replace('canonical', 'CANONICAL')), Buffer.from(bytes.toString().replace('\n', '\r\n'))]) {
        fs.writeFileSync(path.join(root, descriptor.file), changed);
        expect(() => verifyArtifact(root, descriptor)).toThrow();
      }
      expect(() => verifyArtifact(root, { ...descriptor, file: '../escape.json' })).toThrow(/outside root/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
