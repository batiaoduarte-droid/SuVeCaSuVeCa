import type { ModuleData } from '../types/suveca';
import { fetchPublishedJson, publishedUrl, type PublishedFile } from './publishedData';
interface Catalog { deliveryVersion: number; modules: Record<string, PublishedFile>; search: PublishedFile }
async function catalog() {
  const value = await fetchPublishedJson<Catalog>('/knowledge/catalog/manifest.json');
  if (value.deliveryVersion !== 1) throw new Error('Catálogo incompatível.');
  return value;
}
export async function loadModule(id: string, signal?: AbortSignal): Promise<ModuleData> {
  const descriptor = (await catalog()).modules[id];
  if (!descriptor) throw new Error('Módulo ausente no catálogo.');
  const module = await fetchPublishedJson<ModuleData>(publishedUrl('/knowledge', descriptor.file), descriptor, signal);
  if (module.id !== id) throw new Error('Identidade do módulo divergente.');
  return module;
}
export async function loadModuleSearch(signal?: AbortSignal): Promise<ModuleData[]> {
  const descriptor = (await catalog()).search;
  return fetchPublishedJson(publishedUrl('/knowledge', descriptor.file), descriptor, signal);
}
