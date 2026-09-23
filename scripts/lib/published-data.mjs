import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function readVerifiedJson(base, descriptor) {
  const file = path.resolve(base, descriptor.file);
  if (!file.startsWith(`${path.resolve(base)}${path.sep}`)) throw new Error(`Invalid published path: ${descriptor.file}`);
  const bytes = fs.readFileSync(file);
  if (bytes.length !== descriptor.bytes || createHash('sha256').update(bytes).digest('hex') !== descriptor.sha256) {
    throw new Error(`Published content integrity mismatch: ${file}`);
  }
  return JSON.parse(bytes.toString('utf8'));
}

export function readPublishedView(file) {
  const view = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!view.questionDelivery) return view;
  const { questionDelivery: delivery, ...original } = view;
  if (delivery.version !== 1) throw new Error('Unknown question delivery version');
  const base = path.resolve(path.dirname(file), '..');
  const records = [...delivery.pages, ...(delivery.excluded ? [delivery.excluded] : [])]
    .flatMap(descriptor => {
      const records = readVerifiedJson(base, descriptor);
      if (records.length !== descriptor.count) throw new Error('Question page count mismatch');
      return records;
    }).sort((a, b) => a.index - b.index);
  if (records.length !== delivery.totalOccurrences || records.some((r, i) => r.index !== i)) {
    throw new Error('Question occurrences are missing or duplicated');
  }
  original.officialQuestions = records.map(r => r.question);
  const digest = createHash('sha256').update(JSON.stringify(original)).digest('hex');
  if (digest !== delivery.reconstructedSha256) throw new Error('Reconstructed View differs from publication');
  return original;
}

export function readPublishedPackages(file) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Array.isArray(payload)) return payload;
  if (payload.deliveryVersion !== 1) throw new Error('Unknown authored package delivery version');
  return payload.packages.map(descriptor => readVerifiedJson(path.dirname(file), descriptor));
}

export function readPublishedCollection(file) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (payload.deliveryVersion !== 1 || !payload.parts) return payload;
  const entries = payload.parts.flatMap(d => readVerifiedJson(path.dirname(file), d));
  if (entries.length !== payload.count) throw new Error('Published collection count mismatch');
  const value = payload.shape === 'record' ? Object.fromEntries(entries) : entries;
  if (createHash('sha256').update(JSON.stringify(value)).digest('hex') !== payload.reconstructedSha256) throw new Error('Published collection differs from source');
  return value;
}
