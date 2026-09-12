import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function verifyArtifact(root, descriptor) {
  if (!descriptor || typeof descriptor.file !== 'string' || !Number.isSafeInteger(descriptor.bytes)
    || descriptor.bytes < 0 || !/^[a-f0-9]{64}$/.test(descriptor.sha256)) {
    throw new Error('Invalid artifact descriptor');
  }
  const base = path.resolve(root);
  const file = path.resolve(base, descriptor.file);
  if (!file.startsWith(`${base}${path.sep}`)) throw new Error(`Artifact outside root: ${descriptor.file}`);
  const real = fs.realpathSync(file);
  if (!real.startsWith(`${fs.realpathSync(base)}${path.sep}`)) throw new Error(`Artifact link outside root: ${descriptor.file}`);
  const bytes = fs.readFileSync(file);
  if (bytes.length !== descriptor.bytes) throw new Error(`Artifact size mismatch: ${descriptor.file}`);
  if (createHash('sha256').update(bytes).digest('hex') !== descriptor.sha256) {
    throw new Error(`Artifact SHA-256 mismatch: ${descriptor.file}`);
  }
  return bytes;
}
