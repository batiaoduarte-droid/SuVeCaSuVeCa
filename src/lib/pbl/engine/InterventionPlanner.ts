import type {
  DiagnosticResult,
  InterventionPayload,
  PBLCase,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { formatPBLAnswer, formatPBLPedagogicalText } from '../answerAdapter';

const cleanCompiledProcedureStep = (value: string): string => {
  const withoutSerializedPayload = String(value || '')
    .replace(/\s*\(\{['"]order['"][\s\S]*\}\)\s*$/u, '')
    .replace(/\s*\([^)]*(?:\.\.\.|…)[^)]*\)\s*$/u, '')
    .replace(/\bNone\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return formatPBLPedagogicalText(withoutSerializedPayload);
};

const isGenericContrast = (poleA?: string, poleB?: string): boolean =>
  /construção padrão|forma correta/i.test(poleA || '')
  && /desvio|atrator/i.test(poleB || '');

export class InterventionPlanner {
  constructor(private repo: IPBLRepository) {}

  public async planIntervention(
    diagResult: DiagnosticResult,
    pblCase: PBLCase
  ): Promise<InterventionPayload> {
    const [comp, qp, link, presentation] = await Promise.all([
      this.repo.getCompetency(diagResult.competencyRef),
      this.repo.getQuestionPedagogy(diagResult.questionRef),
      this.repo.getQuestionCompetencyLink(diagResult.questionRef),
      this.repo.getQuestionPresentation(diagResult.questionRef),
    ]);
    const assignment = link?.competencyAssignments?.find((candidate) =>
      candidate.competencyId === diagResult.competencyRef
      && candidate.semanticStatus === 'approved'
    );
    const isSecondaryAssignment = assignment?.relation === 'secondary';
    const ruleRef = diagResult.intervention.ruleRefs[0]
      || qp?.primaryDecisiveRuleRef
      || pblCase.primaryDecisiveRuleRef
      || '';
    const rulePresentation = comp?.unitId && ruleRef
      ? await this.repo.getRulePresentation(comp.unitId, ruleRef)
      : null;

    const procSteps = ((!isSecondaryAssignment && qp?.solutionStrategy.length
      ? qp.solutionStrategy.map((step) => step.action)
      : pblCase.solutionStrategy.stepByStepAlgorithm) || [])
      .map(cleanCompiledProcedureStep)
      .filter(Boolean);
    const resolvedProcedureSteps = procSteps.length ? procSteps : [
      '1. Identifique exatamente o que o enunciado pede.',
      '2. Recupere o critério decisivo desta competência.',
      '3. Aplique o critério e confira cada opção antes de responder.',
    ];

    const contrast = pblCase.contrastingScaffold;
    const useSpecificContrast = Boolean(
      contrast
      && !isGenericContrast(contrast.poleA, contrast.poleB)
    );
    const mappedDiagnosis = diagResult.diagnosisKind === 'mapped_misconception';

    return {
      interventionId: `int_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      competencyRef: diagResult.competencyRef,
      misconceptionRef: mappedDiagnosis ? diagResult.misconceptionRefs[0] || null : null,
      trapRef: diagResult.trapRefs[0] || null,
      microLessonText: formatPBLPedagogicalText(
        diagResult.intervention.microLesson ||
        `Domínio de ${comp?.title || 'Tópico'}: aplique o procedimento sistemático e evite atratores sintáticos.`
      ),
      ruleTitle: rulePresentation?.title || `Critério decisivo — ${comp?.title || 'aplicação da regra'}`,
      ruleStatement:
        formatPBLPedagogicalText(rulePresentation?.statement || '')
        || formatPBLPedagogicalText(diagResult.intervention.refutationText || '') ||
        'Use o critério apresentado na microaula e verifique-o diretamente no enunciado.',
      procedureSteps: resolvedProcedureSteps,
      contrastingPoleA: useSpecificContrast ? contrast?.poleA : undefined,
      contrastingPoleB: useSpecificContrast ? contrast?.poleB : undefined,
      workedExample: {
        stem: presentation?.prompt || pblCase.questionStem,
        stepByStep: resolvedProcedureSteps,
        resolution: formatPBLPedagogicalText(presentation?.commentary || '') || `Gabarito oficial: ${formatPBLAnswer(
          presentation?.correctAnswer || pblCase.officialAnswer,
          Boolean(presentation?.options.length || pblCase.options.length)
        )}. Justificativa: aplicação estrita dos critérios gramaticais.`,
      },
    };
  }
}
