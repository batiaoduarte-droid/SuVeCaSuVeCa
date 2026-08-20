import { describe, expect, it } from 'vitest';
import { MODULES_DATA } from './modulesData';
import { PEDAGOGICAL_VIEW_BY_ID, PEDAGOGICAL_VIEW_INDEX } from './pedagogicalViewIndex.generated';

const unitIdForSection = (section: (typeof MODULES_DATA)[number]['sections'][number]) => {
  const cumulative = section.contentUrl?.match(/A14-(S\d+)/);
  return section.editorial?.integrationUnitId || (cumulative ? `IP-A14-${cumulative[1]}` : null);
};

describe('índice de publicação pedagógica', () => {
  it('representa exatamente as 115 unidades publicadas', () => {
    expect(PEDAGOGICAL_VIEW_INDEX).toHaveLength(115);
    expect(PEDAGOGICAL_VIEW_INDEX.filter((entry) => entry.unitType === 'regular')).toHaveLength(102);
    expect(PEDAGOGICAL_VIEW_INDEX.filter((entry) => entry.unitType === 'cumulative_review')).toHaveLength(13);
    expect(new Set(PEDAGOGICAL_VIEW_INDEX.map((entry) => entry.unitId)).size).toBe(115);
  });

  it('alinha todas as seções do catálogo com a identidade e o título publicados', () => {
    const sections = MODULES_DATA.flatMap((module) => module.sections);
    const mapped = sections
      .map((section) => ({ section, unitId: unitIdForSection(section) }))
      .filter(({ unitId }) => Boolean(unitId));
    expect(mapped.every(({ unitId }) => PEDAGOGICAL_VIEW_BY_ID[unitId!])).toBe(true);
    expect(mapped).toHaveLength(115);
    for (const { section, unitId } of mapped) {
      expect(section.title).toBe(PEDAGOGICAL_VIEW_BY_ID[unitId!].title);
    }
  });
});
