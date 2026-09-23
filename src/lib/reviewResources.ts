import { parseReviewManifest, parseReviewResource, type ReviewResource } from '../types/reviewResource';
import { fetchPublishedJson, invalidatePublishedData, publishedUrl } from './publishedData';

export async function loadReviewResource(cardId: string, signal?: AbortSignal): Promise<ReviewResource | null> {
  const base = '/knowledge/review-resources';
  const manifestUrl = base + '/manifest.json';
  let manifest;
  try { manifest = parseReviewManifest(await fetchPublishedJson(manifestUrl, undefined, signal)); }
  catch (error) { invalidatePublishedData(manifestUrl); throw error; }
  const entry = manifest.cards[cardId];
  if (!entry) return null; // Personal/legacy cards remain supported.
  const descriptor = manifest.units[entry.unit];
  const url = publishedUrl(base, descriptor.file);
  try {
    const payload = await fetchPublishedJson<{ resources: unknown[] }>(url, descriptor, signal);
    if (!Array.isArray(payload.resources)) throw new Error('Fragmento de revisão inválido.');
    const resources = payload.resources.map(value => parseReviewResource(value));
    if (new Set(resources.map(r => r.cardId)).size !== resources.length) throw new Error('Cartões duplicados no fragmento.');
    const resource = resources.find(r => r.cardId === cardId);
    if (!resource || resource.contentId !== entry.contentId || resource.contentVersion !== entry.contentVersion) throw new Error('Recurso de outra revisão.');
    return resource;
  } catch (error) { invalidatePublishedData(url); throw error; }
}

