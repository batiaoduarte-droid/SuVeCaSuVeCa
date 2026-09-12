import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export class ArtifactIntegrityError extends Error {
  constructor(cause, file, detail) {
    super(`Artifact ${cause}: ${file}${detail ? ` (${detail})` : ''}`);
    this.name = 'ArtifactIntegrityError';
    this.cause = cause;
    this.file = file;
  }
}

export function verifyArtifact(root, descriptor) {
  if (!descriptor || typeof descriptor.file !== 'string' || !Number.isSafeInteger(descriptor.bytes)
    || descriptor.bytes < 0 || !/^[a-f0-9]{64}$/.test(descriptor.sha256)) {
    throw new Error('Invalid artifact descriptor');
  }
  const base = path.resolve(root);
  const file = path.resolve(base, descriptor.file);
  if (!file.startsWith(`${base}${path.sep}`)) throw new ArtifactIntegrityError('outside-root', descriptor.file);
  if (!fs.existsSync(file)) throw new ArtifactIntegrityError('missing', descriptor.file, `expected ${descriptor.bytes} bytes`);
  const real = fs.realpathSync(file);
  if (!real.startsWith(`${fs.realpathSync(base)}${path.sep}`)) throw new ArtifactIntegrityError('symlink-outside-root', descriptor.file);
  const bytes = fs.readFileSync(real);
  if (bytes.length !== descriptor.bytes) {
    // A missing final chunk is the signature of a truncated import (large files dropped by the importer),
    // not corrupted content. Report the cause so agents repair the import instead of deleting files.
    throw new ArtifactIntegrityError('size-mismatch', descriptor.file, `expected ${descriptor.bytes} bytes, found ${bytes.length}`);
  }
  if (createHash('sha256').update(bytes).digest('hex') !== descriptor.sha256) {
    throw new ArtifactIntegrityError('sha256-mismatch', descriptor.file);
  }
  return bytes;
}
