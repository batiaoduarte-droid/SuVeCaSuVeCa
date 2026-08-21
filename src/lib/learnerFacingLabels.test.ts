import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { presentCompetencyTitle, stripContextualPrefix } from './learnerFacingLabels';

describe('learner-facing labels', () => {
  it('remove contexto redundante dos títulos de competência', () => {
    expect(presentCompetencyTitle('Competência: Objetivo 1 — Fonética e Fonologia')).toEqual({
      title: 'Fonética e Fonologia',
      kind: 'Objetivo de aprendizagem',
    });
    expect(presentCompetencyTitle('Competência: Fundamentos de Artigos — Artigos')).toEqual({
      title: 'Artigos',
      kind: 'Fundamentos',
    });
  });

  it('remove prefixos já informados pelo contêiner', () => {
    expect(stripContextualPrefix('Revisão Cumulativa: Ortografia', /^Revisão Cumulativa:\s*/i)).toBe('Ortografia');
  });

  it('produz 190 apresentações de competência não vazias e distinguíveis', () => {
    const payload = JSON.parse(readFileSync(resolve(process.cwd(), 'public/knowledge/pbl/pbl_competency_map.json'), 'utf8')) as Array<{
      competencyId: string; lessonId: string; title: string;
    }>;
    const presentations = payload.map((competency) => ({
      competencyId: competency.competencyId,
      key: `${competency.lessonId}:${presentCompetencyTitle(competency.title).kind}:${presentCompetencyTitle(competency.title).title}`,
      display: presentCompetencyTitle(competency.title),
    }));

    expect(presentations).toHaveLength(190);
    expect(presentations.every(({ display }) => display.title.length > 0 && !display.title.startsWith('Competência:'))).toBe(true);
    const duplicates = presentations.filter((item, index) =>
      presentations.findIndex((candidate) => candidate.key === item.key) !== index,
    );
    expect(duplicates).toEqual([]);
  });
});
