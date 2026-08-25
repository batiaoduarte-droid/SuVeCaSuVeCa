import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PBLRepository } from '../data/PBLRepository';
import type { PBLCompetency, PBLCase, PBLTransferSet, PBLDiagnosticPath } from '../../../types/pbl';

describe('PBLRepository', () => {
  let repo: PBLRepository;

  const mockComp: PBLCompetency = {
    schemaVersion: '1.0.0',
    competencyId: 'COMP-A10-G05-01',
    lessonId: 'A10',
    unitId: 'IP-A10-G05',
    title: 'Competência: Crase com Nomes de Lugar',
    description: 'Domínio do uso da crase antes de topônimos.',
    pedagogicalDomain: 'norma_culta',
    bloomLevel: 'aplicacao',
    learningObjectiveRefs: ['LO-A10-G05-01'],
    conceptRefs: ['KB-A10-G05-CRASE-001'],
    ruleRefs: ['RULE-IP-A10-G05-001'],
    procedureRefs: ['PROC-IP-A10-G05-001'],
    contrastRefs: ['CONTRAST-IP-A10-G05-001'],
    examTrapRefs: ['WARN-IP-A10-G05-001'],
    misconceptionRefs: ['MISC-CRASE-01'],
    prerequisiteCompetencyRefs: ['COMP-A10-G01-01'],
    eligibleQuestionRefs: ['OQ-A10-aula10.q0010'],
    anchorCandidateRefs: ['OQ-A10-aula10.q0010'],
    diagnosticCandidateRefs: ['OQ-A10-aula10.q0010'],
    transferCandidateRefs: ['OQ-A10-aula10.q0012'],
    validationCandidateRefs: ['OQ-A10-aula10.q0015'],
    questionCount: 4,
  };

  const mockCase: PBLCase = {
    schemaVersion: '1.0.0',
    caseId: 'PBL-CASE-A10-G05-01',
    competencyRef: 'COMP-A10-G05-01',
    unitRef: 'IP-A10-G05',
    title: 'Caso Problema: Crase com Nomes de Lugar',
    pedagogicalRole: 'anchor',
    anchorQuestionRef: 'OQ-A10-aula10.q0010',
    questionStem: 'Julgue o item sobre crase em "Vou a Roma dos césares".',
    options: [{ label: 'Certo', text: 'Certo' }, { label: 'Errado', text: 'Errado' }],
    officialAnswer: 'Certo',
    learningObjectiveRefs: ['LO-A10-G05-01'],
    targetConceptRefs: ['KB-A10-G05-CRASE-001'],
    primaryDecisiveRuleRef: 'RULE-IP-A10-G05-001',
    decisiveRuleRefs: ['RULE-IP-A10-G05-001'],
    procedureRef: 'PROC-IP-A10-G05-001',
    solutionStrategy: {
      stepByStepAlgorithm: ['1. Localizar o nome de lugar', '2. Aplicar o teste "Vou a, volto de/da"'],
      stoppingCondition: 'Confirmação da regra',
      formulasOrRulesApplied: ['RULE-IP-A10-G05-001'],
    },
    cognitiveDiagnostic: {
      primaryExamTrapRef: 'WARN-IP-A10-G05-001',
      associatedMisconceptionRef: 'MISC-CRASE-01',
      triggerCondition: 'Esquecer da especificação do nome de lugar',
      errorPattern: 'Generalização indevida de Roma sem crase',
      correctiveGuidance: 'Verificar se o topônimo está determinado por adjunto adnominal',
      distractorBreakdown: [],
    },
    prerequisiteRefs: ['COMP-A10-G01-01'],
    transferSetRef: 'PBL-XFER-A10-G05-01',
    diagnosticPathRef: 'PBL-DIAG-A10-G05-01',
    validationQuestionRefs: ['OQ-A10-aula10.q0015'],
  };

  beforeEach(() => {
    repo = new PBLRepository();
    repo.loadDirectly({
      competencies: [mockComp],
      cases: [mockCase],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should initialize and retrieve competency by ID', async () => {
    const comp = await repo.getCompetency('COMP-A10-G05-01');
    expect(comp).toBeDefined();
    expect(comp?.title).toContain('Crase com Nomes de Lugar');
    expect(comp?.lessonId).toBe('A10');
  });

  it('should retrieve competencies for a given lesson', async () => {
    const comps = await repo.getCompetenciesForLesson('A10');
    expect(comps.length).toBe(1);
    expect(comps[0].competencyId).toBe('COMP-A10-G05-01');
  });

  it('should retrieve case for a competency', async () => {
    const pCase = await repo.getCaseForCompetency('COMP-A10-G05-01');
    expect(pCase).toBeDefined();
    expect(pCase?.caseId).toBe('PBL-CASE-A10-G05-01');
    expect(pCase?.anchorQuestionRef).toBe('OQ-A10-aula10.q0010');
  });

  it('resolve a referência técnica para uma regra compreensível', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({
        sections: {
          rules: {
            items: [{
              entityId: 'RULE-IP-A10-G05-01',
              title: 'Teste do topônimo',
              statement: 'Use o teste: vou a, volto da; vou a, volto de.',
            }],
          },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const rule = await repo.getRulePresentation('IP-A10-G05', 'RULF-IP-A10-G05-001');

    expect(rule).toEqual({
      ruleRef: 'RULE-IP-A10-G05-01',
      title: 'Teste do topônimo',
      statement: 'Use o teste: vou a, volto da; vou a, volto de.',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/knowledge/pedagogical/views/IP-A10-G05.json',
      expect.any(Object)
    );
  });
});
