import type { PBLCase, PBLCompetency } from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';

export class CaseSelector {
  constructor(private repo: IPBLRepository) {}

  public async selectAnchorCase(competencyId: string): Promise<PBLCase | null> {
    const pblCase = await this.repo.getCaseForCompetency(competencyId);
    if (pblCase) return pblCase;

    const comp = await this.repo.getCompetency(competencyId);
    if (!comp) return null;

    // Fallback: build case dynamically if needed
    const anchorQid = comp.anchorCandidateRefs[0] || comp.eligibleQuestionRefs[0];
    if (!anchorQid) return null;

    const qp = await this.repo.getQuestionPedagogy(anchorQid);
    if (!qp) return null;

    return {
      schemaVersion: '1.0.0',
      caseId: `PBL-CASE-${competencyId.replace('COMP-', '')}`,
      competencyRef: competencyId,
      unitRef: comp.unitId,
      canonicalTopicRef: comp.canonicalTopicId,
      title: `Caso Problema: ${comp.title.replace('Competência: ', '')}`,
      pedagogicalRole: 'anchor',
      anchorQuestionRef: anchorQid,
      questionStem: '',
      options: [],
      officialAnswer: 'Certo',
      learningObjectiveRefs: comp.learningObjectiveRefs,
      targetConceptRefs: comp.conceptRefs,
      primaryDecisiveRuleRef: qp.primaryDecisiveRuleRef,
      decisiveRuleRefs: qp.decisiveRuleRefs,
      procedureRef: qp.procedureRefs[0] || 'PROC-GENERIC-01',
      solutionStrategy: {
        stepByStepAlgorithm: qp.solutionStrategy.map((s) => s.action),
        stoppingCondition: 'Confirmação do gabarito oficial.',
        formulasOrRulesApplied: qp.decisiveRuleRefs,
      },
      cognitiveDiagnostic: {
        primaryExamTrapRef: qp.examTrapRefs[0] || null,
        associatedMisconceptionRef: qp.misconceptionRefs[0] || null,
        triggerCondition: 'Indução por semelhança formal.',
        errorPattern: 'Aplicação mecânica sem distinção funcional.',
        correctiveGuidance: 'Aplicar teste canônico antes de fechar.',
        distractorBreakdown: qp.distractorAnalysis.map((d) => ({
          option: d.label,
          text: d.optionText,
          isCorrect: d.isCorrect,
          misconceptionTriggered: d.likelyMisconceptionRef,
          refutation: d.refutation,
        })),
      },
      prerequisiteRefs: comp.prerequisiteCompetencyRefs,
      transferSetRef: `PBL-XFER-${competencyId.replace('COMP-', '')}`,
      diagnosticPathRef: `PBL-DIAG-${competencyId.replace('COMP-', '')}`,
      validationQuestionRefs: comp.validationCandidateRefs.slice(0, 3),
    };
  }
}
