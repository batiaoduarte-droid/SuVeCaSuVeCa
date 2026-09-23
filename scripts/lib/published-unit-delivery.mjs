import fs from 'node:fs';
import path from 'node:path';

/** Checks delivery and identity; semantic block coverage is audited separately. */
export function auditPublishedUnits(root, sections) {
  const errors = [];
  const ids = new Set();
  for (const section of sections) {
    const id = section.editorial?.integrationUnitId;
    if (typeof id !== 'string' || !/^IP-A\d{2}-(?:G|S)\d{2}$/.test(id)) {
      errors.push(`${section.lessonId}/${section.groupId}: identidade de View ausente ou inválida.`);
      continue;
    }
    if (ids.has(id)) errors.push(`${id}: View referenciada por mais de uma seção.`);
    ids.add(id);
    const expectedId = section.lessonId === 'A14'
      ? `IP-A14-${String(section.groupId).replace(/^R/, 'S')}`
      : `IP-${section.lessonId}-${section.groupId}`;
    if (id !== expectedId) errors.push(`${id}: identidade diverge da seção ${expectedId}.`);
    const file = path.join(root, 'public', 'knowledge', 'pedagogical', 'views', `${id}.json`);
    try {
      const view = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (view.unit?.unitId !== id || (view.source?.unitId && view.source.unitId !== id)) {
        errors.push(`${id}: identidade da View divergente.`);
      }
      if (view.unit?.lessonId !== section.lessonId) errors.push(`${id}: aula da View divergente.`);
      const cumulative = section.lessonId === 'A14';
      if (cumulative
        ? view.unitType !== 'cumulative_review' || view.viewSchemaVersion !== '1.0.0'
        : view.unitType === 'cumulative_review' || !String(view.viewSchemaVersion).startsWith('4.2.')) {
        errors.push(`${id}: tipo ou versão da View incompatível.`);
      }
      if (!view.unit?.title || !view.sections || typeof view.sections !== 'object'
        || Array.isArray(view.sections) || !Object.keys(view.sections).length) {
        errors.push(`${id}: contrato de conteúdo incompleto.`);
      }
    } catch (error) {
      errors.push(`${id}: View ausente ou JSON inválido (${error.message}).`);
    }
  }
  return errors;
}
