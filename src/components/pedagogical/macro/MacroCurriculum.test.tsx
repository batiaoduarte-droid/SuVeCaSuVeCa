import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CompetencyMastery } from '../../../types/pbl';
import type { PedagogicalMacroIndexEntry } from '../../../types/pedagogicalMacro';
import {
  evaluateMacroTransition,
  MacroChapterNavigator,
  selectActionableAdaptiveRequirements,
} from './MacroCurriculum';

const entry: PedagogicalMacroIndexEntry = {
  macroId: 'MACRO-A03-03',
  lessonId: 'A03',
  order: 3,
  title: 'Demonstrativos, relativos, regência e reescrita',
  entryKind: 'journey',
  topology: 'linear',
  unitRefs: ['IP-A03-G04', 'IP-A03-G05', 'IP-A03-G06'],
  competencyRefs: ['COMP-A03-G04-01', 'COMP-A03-G05-01', 'COMP-A03-G06-01'],
  competencies: [
    { competencyId: 'COMP-A03-G04-01', unitId: 'IP-A03-G04', title: 'Demonstrativos' },
    { competencyId: 'COMP-A03-G05-01', unitId: 'IP-A03-G05', title: 'Relativos' },
    { competencyId: 'COMP-A03-G06-01', unitId: 'IP-A03-G06', title: 'Reescrita' },
  ],
  nodes: [
    { nodeId: 'G04', unitRef: 'IP-A03-G04', role: 'foundation' },
    { nodeId: 'G05', unitRef: 'IP-A03-G05', role: 'acquisition' },
    { nodeId: 'G06', unitRef: 'IP-A03-G06', role: 'application' },
  ],
  edges: [
    { edgeId: 'E-A03-04-05', from: 'G04', to: 'G05', policy: 'checkpoint', masteryInheritance: false },
    { edgeId: 'E-A03-05-06', from: 'G05', to: 'G06', policy: 'blocked_transition', masteryInheritance: false, blockerRef: 'B-A03-QUEM' },
  ],
  checkpoints: [{
    checkpointId: 'C-A03-G04',
    requiredNodeIds: ['G04'],
    mode: 'all',
    evidenceSource: 'competency_mastery',
    masteryInheritance: false,
  }],
  blockers: [{
    blockerId: 'B-A03-QUEM',
    edgeId: 'E-A03-05-06',
    status: 'active',
    reasonCode: 'normative_conflict',
    description: 'Conflito normativo preservado.',
    directAccessAllowed: true,
    resolutionPolicy: 'external_editorial_adjudication_required',
    masteryInheritance: false,
  }],
};

const retained: CompetencyMastery = {
  competencyId: 'COMP-A03-G04-01',
  unitId: 'IP-A03-G04',
  lessonId: 'A03',
  score: 0.9,
  level: 'mastered',
  learningState: 'retention_confirmed',
  totalAttempts: 4,
  correctAttempts: 4,
  transferSuccessCount: 2,
  activeMisconceptions: [],
  resolvedMisconceptions: [],
  lastPracticedAt: '2026-08-20T00:00:00.000Z',
  nextReviewRecommendedAt: '2026-09-20T00:00:00.000Z',
};

describe('macro curriculum transitions', () => {
  it('usa evidência PBL, e não leitura, para o checkpoint', () => {
    const withoutEvidence = evaluateMacroTransition(
      entry,
      'IP-A03-G04',
      'IP-A03-G05',
      {},
      Date.parse('2026-08-27T00:00:00.000Z'),
    );
    expect(withoutEvidence.readinessConfirmed).toBe(false);
    expect(withoutEvidence.autoAdvanceAllowed).toBe(true);

    const withEvidence = evaluateMacroTransition(
      entry,
      'IP-A03-G04',
      'IP-A03-G05',
      { 'COMP-A03-G04-01': retained },
      Date.parse('2026-08-27T00:00:00.000Z'),
    );
    expect(withEvidence.readinessConfirmed).toBe(true);
  });

  it('bloqueia somente o avanço automático A03 G05→G06 e preserva acesso direto', () => {
    const onSelectUnit = vi.fn();
    render(
      <MacroChapterNavigator
        entry={entry}
        activeUnitId="IP-A03-G05"
        unitTitles={{
          'IP-A03-G04': 'Demonstrativos',
          'IP-A03-G05': 'Relativos e regência',
          'IP-A03-G06': 'Reescrita',
        }}
        masteryByCompetency={{}}
        onSelectUnit={onSelectUnit}
      />,
    );

    expect(screen.getByRole('button', { name: /próximo capítulo/i })).toBeDisabled();
    const directButton = screen.getByRole('button', { name: /reescrita/i });
    expect(directButton).toBeEnabled();
    fireEvent.click(directButton);
    expect(onSelectUnit).toHaveBeenCalledWith('IP-A03-G06');
    expect(screen.getByText(/avanço automático está suspenso/i)).toBeInTheDocument();
  });

  it('recomenda retorno A05→A06 apenas com evidência por competência', () => {
    const requirement = {
      requirementId: 'ADAPT-A05-G01-A06-G03',
      kind: 'prerequisite' as const,
      evidenceCompetencyIds: ['COMP-A03-G04-01'],
      actionMacroId: 'MACRO-A05-01',
      actionUnitId: 'IP-A05-G01',
      actionTitle: 'Transitividade verbal',
    };
    const now = Date.parse('2026-08-27T00:00:00.000Z');
    expect(selectActionableAdaptiveRequirements([requirement], {}, now)).toEqual([requirement]);
    expect(selectActionableAdaptiveRequirements(
      [requirement],
      { 'COMP-A03-G04-01': retained },
      now,
    )).toEqual([]);
  });
});
