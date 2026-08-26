import type {
  DiagnosticPathNode,
  DiagnosticResult,
  PBLAttempt,
  PBLDiagnosisKind,
  PBLDiagnosticPath,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import {
  findSelectedDistractor,
  normalizeDistractorAnalysis,
  type NormalizedQuestionDistractor,
} from './distractorAnalysisAdapter';
import { QuestionPoolSelector } from './QuestionPoolSelector';

interface DiagnosticClassification {
  diagnosisKind: PBLDiagnosisKind;
  diagnosticConfidence: number;
  diagnosticEvidence: NonNullable<DiagnosticResult['diagnosticEvidence']>;
  misconceptionRefs: string[];
  candidateMisconceptionRefs: string[];
  trapRefs: string[];
  prerequisiteCompetencyRef: string | null;
}

const uniqueRefs = (refs: Array<string | null | undefined>): string[] =>
  Array.from(new Set(refs.filter((ref): ref is string => Boolean(ref))));

export class DiagnosticResolver {
  private questionPoolSelector: QuestionPoolSelector;

  constructor(private repo: IPBLRepository) {
    this.questionPoolSelector = new QuestionPoolSelector(repo);
  }

  public async resolveDiagnostic(
    attempt: PBLAttempt,
    previousDiagnostic?: DiagnosticResult
  ): Promise<DiagnosticResult> {
    const { competencyRef, questionRef, userAnswer, evaluation, isCorrect } = attempt;

    const [qp, diagPath, comp, link] = await Promise.all([
      this.repo.getQuestionPedagogy(questionRef),
      this.repo.getDiagnosticPathForCompetency(competencyRef),
      this.repo.getCompetency(competencyRef),
      this.repo.getQuestionCompetencyLink(questionRef),
    ]);
    const assignment = link?.competencyAssignments?.find((candidate) =>
      candidate.competencyId === competencyRef && candidate.semanticStatus === 'approved'
    );
    const isSecondaryAssignment = assignment?.relation === 'secondary';
    const causalUnitRefs = qp?.causalDiagnosticReview?.unitRefs || [];
    const causalMappingAuthorized = Boolean(
      qp?.causalDiagnosticReview?.status === 'dual_pass_reviewed'
      && comp
      && (assignment?.relation === 'primary' || causalUnitRefs.includes(comp.unitId))
    );

    const distractors = normalizeDistractorAnalysis(qp?.distractorAnalysis);
    const matchedDistractor = findSelectedDistractor(distractors, userAnswer, isCorrect);
    const currentPathNode = diagPath?.nodes.find((node) => node.questionRef === questionRef);
    const classification = this.classifyEvidence(
      attempt,
      matchedDistractor,
      currentPathNode,
      causalMappingAuthorized,
      previousDiagnostic
    );

    const microLesson = this.resolveMicroLesson(
      isCorrect,
      currentPathNode,
      classification.diagnosisKind,
      comp?.title
    );
    const shouldProbe = !isCorrect && (
      classification.diagnosisKind === 'mapped_error_hypothesis'
      || classification.diagnosisKind === 'unknown'
      || classification.diagnosisKind === 'slip'
    );
    const probeQuestionRef = shouldProbe
      ? await this.selectDiscriminativeProbe(
          competencyRef,
          questionRef,
          attempt.sessionId,
          diagPath,
          currentPathNode,
          comp?.prerequisiteCompetencyRefs || [],
          classification.candidateMisconceptionRefs,
          classification.diagnosticEvidence.errorMechanism || undefined
        )
      : undefined;

    return {
      competencyRef,
      questionRef,
      evaluation,
      diagnosisKind: classification.diagnosisKind,
      diagnosticEvidence: classification.diagnosticEvidence,
      trapRefs: classification.trapRefs,
      misconceptionRefs: classification.misconceptionRefs,
      candidateMisconceptionRefs: classification.candidateMisconceptionRefs,
      prerequisiteCompetencyRef: classification.prerequisiteCompetencyRef,
      diagnosticConfidence: classification.diagnosticConfidence,
      needsProbe: Boolean(probeQuestionRef),
      probeQuestionRef,
      diagnosticSummary: this.resolveDiagnosticSummary(
        classification.diagnosisKind,
        matchedDistractor,
        isCorrect
      ),
      trapSummary: classification.trapRefs.length > 0
        ? matchedDistractor?.refutation
        : undefined,
      intervention: {
        microLesson,
        ruleRefs: isSecondaryAssignment ? comp?.ruleRefs || [] : qp?.decisiveRuleRefs || comp?.ruleRefs || [],
        procedureRefs: isSecondaryAssignment ? comp?.procedureRefs || [] : qp?.procedureRefs || comp?.procedureRefs || [],
        contrastRefs: isSecondaryAssignment ? comp?.contrastRefs || [] : qp?.contrastRefs || comp?.contrastRefs || [],
        refutationText: matchedDistractor?.refutation,
      },
    };
  }

  private classifyEvidence(
    attempt: PBLAttempt,
    matchedDistractor: NormalizedQuestionDistractor | undefined,
    currentPathNode: DiagnosticPathNode | undefined,
    causalMappingAuthorized: boolean,
    previousDiagnostic?: DiagnosticResult
  ): DiagnosticClassification {
    if (attempt.isCorrect) {
      return {
        diagnosisKind: 'unknown',
        diagnosticConfidence: 0.25,
        diagnosticEvidence: {
          source: 'none',
          matchedOptionLabel: matchedDistractor?.label,
          pathNodeId: currentPathNode?.nodeId,
        },
        misconceptionRefs: [],
        candidateMisconceptionRefs: [],
        trapRefs: [],
        prerequisiteCompetencyRef: null,
      };
    }

    const pathIndicatesPrerequisite = Boolean(
      attempt.stage === 'probe'
      && currentPathNode?.evaluatedPrerequisiteRef
      && currentPathNode.onIncorrect.nextAction === 'branch_to_prerequisite'
    );
    if (pathIndicatesPrerequisite) {
      return {
        diagnosisKind: 'prerequisite_deficit',
        diagnosticConfidence: 0.88,
        diagnosticEvidence: {
          source: 'diagnostic_path',
          matchedOptionLabel: matchedDistractor?.label,
          pathNodeId: currentPathNode?.nodeId,
        },
        // A prerequisite branch and a stable misconception are competing
        // explanations. Do not persist both from a single response.
        misconceptionRefs: [],
        candidateMisconceptionRefs: [],
        trapRefs: [],
        prerequisiteCompetencyRef: currentPathNode?.evaluatedPrerequisiteRef || null,
      };
    }

    const reviewedMapping = causalMappingAuthorized
      && matchedDistractor?.evidenceSource === 'semantic_mapping';
    const currentMisconception = reviewedMapping
      ? matchedDistractor?.likelyMisconceptionRef || null
      : null;
    const currentMechanism = reviewedMapping
      ? matchedDistractor?.errorMechanism || null
      : null;
    const currentTrap = reviewedMapping
      ? matchedDistractor?.triggeredTrapRef || null
      : null;
    const priorMechanism = previousDiagnostic?.diagnosticEvidence?.errorMechanism || null;
    const priorCandidates = previousDiagnostic?.candidateMisconceptionRefs || [];
    const repeatedCanonicalMisconception = Boolean(
      attempt.stage === 'probe'
      && previousDiagnostic?.diagnosisKind === 'mapped_error_hypothesis'
      && currentMisconception
      && priorCandidates.includes(currentMisconception)
    );
    const repeatedMechanism = Boolean(
      attempt.stage === 'probe'
      && previousDiagnostic?.diagnosisKind === 'mapped_error_hypothesis'
      && currentMechanism
      && priorMechanism === currentMechanism
    );

    if (reviewedMapping && (repeatedCanonicalMisconception || repeatedMechanism)) {
      const diagnosisKind: PBLDiagnosisKind = repeatedCanonicalMisconception
        ? 'mapped_misconception'
        : 'confirmed_error_pattern';
      return {
        diagnosisKind,
        diagnosticConfidence: Math.min(
          0.95,
          Math.max(0.78, matchedDistractor?.mappingConfidence || 0.78)
        ),
        diagnosticEvidence: {
          source: 'distractor_mapping',
          matchedOptionLabel: matchedDistractor?.label,
          pathNodeId: currentPathNode?.nodeId,
          errorMechanism: currentMechanism,
          mappingConfidence: matchedDistractor?.mappingConfidence,
          confirmedByQuestionRef: attempt.questionRef,
        },
        misconceptionRefs: repeatedCanonicalMisconception
          ? uniqueRefs([currentMisconception])
          : [],
        candidateMisconceptionRefs: uniqueRefs([currentMisconception]),
        trapRefs: uniqueRefs([currentTrap]),
        prerequisiteCompetencyRef: null,
      };
    }

    if (reviewedMapping && attempt.stage !== 'probe') {
      const mappingConfidence = matchedDistractor?.mappingConfidence || 0.60;
      return {
        diagnosisKind: 'mapped_error_hypothesis',
        diagnosticConfidence: Math.min(0.79, Math.max(0.60, mappingConfidence * 0.82)),
        diagnosticEvidence: {
          source: 'distractor_mapping',
          matchedOptionLabel: matchedDistractor?.label,
          pathNodeId: currentPathNode?.nodeId,
          errorMechanism: currentMechanism,
          mappingConfidence,
        },
        misconceptionRefs: [],
        candidateMisconceptionRefs: uniqueRefs([currentMisconception]),
        trapRefs: uniqueRefs([currentTrap]),
        prerequisiteCompetencyRef: null,
      };
    }

    // A segunda resposta que não reproduz o mecanismo anterior desfaz a
    // hipótese em vez de substituí-la por outro rótulo estável.
    if (matchedDistractor) {
      return {
        diagnosisKind: 'slip',
        diagnosticConfidence: matchedDistractor.evidenceSource === 'option_analysis' ? 0.55 : 0.50,
        diagnosticEvidence: {
          source: matchedDistractor.evidenceSource === 'option_analysis'
            ? 'option_analysis'
            : 'none',
          matchedOptionLabel: matchedDistractor.label,
          pathNodeId: currentPathNode?.nodeId,
          errorMechanism: currentMechanism,
          mappingConfidence: matchedDistractor.mappingConfidence,
        },
        misconceptionRefs: [],
        candidateMisconceptionRefs: [],
        trapRefs: [],
        prerequisiteCompetencyRef: null,
      };
    }

    return {
      diagnosisKind: 'unknown',
      diagnosticConfidence: 0.30,
      diagnosticEvidence: {
        source: 'none',
        pathNodeId: currentPathNode?.nodeId,
      },
      misconceptionRefs: [],
      candidateMisconceptionRefs: [],
      trapRefs: [],
      prerequisiteCompetencyRef: null,
    };
  }

  private resolveMicroLesson(
    isCorrect: boolean,
    currentPathNode: DiagnosticPathNode | undefined,
    diagnosisKind: PBLDiagnosisKind,
    competencyTitle?: string
  ): string {
    if (isCorrect) {
      return 'O acerto ainda est\u00e1 fr\u00e1gil. Antes de receber mais explica\u00e7\u00e3o, explicite o crit\u00e9rio decisivo e aplique-o novamente.';
    }
    if (currentPathNode?.onIncorrect.correctiveMicroLesson) {
      return currentPathNode.onIncorrect.correctiveMicroLesson;
    }
    if (diagnosisKind === 'unknown' || diagnosisKind === 'slip') {
      return `A causa do erro ainda n\u00e3o est\u00e1 determinada. Use uma sondagem antes de revisar ${competencyTitle || 'esta compet\u00eancia'}.`;
    }
    if (diagnosisKind === 'mapped_error_hypothesis') {
      return 'A alternativa sugere um mecanismo de erro, mas a interven\u00e7\u00e3o adaptativa deve esperar uma sondagem independente.';
    }
    return `Revise os crit\u00e9rios normativos e o teste decisivo para ${competencyTitle || 'esta compet\u00eancia'}.`;
  }

  private resolveDiagnosticSummary(
    diagnosisKind: PBLDiagnosisKind,
    matchedDistractor: NormalizedQuestionDistractor | undefined,
    isCorrect: boolean
  ): string {
    if (isCorrect) {
      return 'Acerto com baixa confian\u00e7a: n\u00e3o h\u00e1 evid\u00eancia de misconception; falta confirmar o crit\u00e9rio usado.';
    }
    if (diagnosisKind === 'prerequisite_deficit') {
      return 'A resposta n\u00e3o superou uma sondagem espec\u00edfica de pr\u00e9-requisito.';
    }
    if (diagnosisKind === 'mapped_misconception') {
      return matchedDistractor?.errorPattern
        || 'O mesmo padr\u00e3o can\u00f4nico reapareceu em duas quest\u00f5es independentes.';
    }
    if (diagnosisKind === 'confirmed_error_pattern') {
      return matchedDistractor?.errorPattern
        || 'O mesmo mecanismo de erro reapareceu em uma sondagem independente.';
    }
    if (diagnosisKind === 'mapped_error_hypothesis') {
      return matchedDistractor?.errorPattern
        || 'A alternativa escolhida \u00e9 compat\u00edvel com um mecanismo causal, ainda n\u00e3o confirmado.';
    }
    if (diagnosisKind === 'slip') {
      return matchedDistractor?.errorPattern
        || 'O erro foi localizado na alternativa, mas n\u00e3o comprova uma misconception est\u00e1vel.';
    }
    return 'Esta resposta, isoladamente, n\u00e3o identifica a causa do erro com seguran\u00e7a.';
  }

  private async selectDiscriminativeProbe(
    competencyRef: string,
    attemptedQuestionRef: string,
    seed: string,
    diagPath: PBLDiagnosticPath | null,
    currentPathNode: DiagnosticPathNode | undefined,
    prerequisiteCompetencyRefs: string[],
    targetMisconceptionRefs: string[],
    targetErrorMechanism?: NormalizedQuestionDistractor['errorMechanism']
  ): Promise<string | undefined> {
    if (targetMisconceptionRefs.length || targetErrorMechanism) {
      const causalProbe = await this.questionPoolSelector.selectQuestion(
        competencyRef,
        'diagnostic',
        {
          excludedQuestionRefs: [attemptedQuestionRef],
          seed: `${seed}:causal-confirmation`,
          targetMisconceptionRefs,
          targetErrorMechanisms: targetErrorMechanism ? [targetErrorMechanism] : [],
        }
      );
      if (causalProbe) return causalProbe.questionRef;
    }

    const pathCandidate = this.findPathProbeCandidate(
      diagPath,
      currentPathNode,
      attemptedQuestionRef,
      prerequisiteCompetencyRefs
    );
    const pathCompetencyRef = pathCandidate?.evaluatedPrerequisiteRef || competencyRef;
    if (
      pathCandidate
      && await this.isPublishedEligibleProbe(pathCompetencyRef, pathCandidate.questionRef)
    ) {
      return pathCandidate.questionRef;
    }

    const onlineProbe = await this.questionPoolSelector.selectQuestion(competencyRef, 'diagnostic', {
      excludedQuestionRefs: [attemptedQuestionRef],
      onlineOnly: true,
      seed,
    });
    if (onlineProbe) return onlineProbe.questionRef;

    // If the online pool is unavailable, a different audited path node is a
    // safer fallback than an arbitrary competency question.
    const fallbackPathNode = diagPath?.nodes.find((node) => node.questionRef !== attemptedQuestionRef);
    if (
      fallbackPathNode
      && await this.isPublishedEligibleProbe(
        fallbackPathNode.evaluatedPrerequisiteRef || competencyRef,
        fallbackPathNode.questionRef
      )
    ) {
      return fallbackPathNode.questionRef;
    }
    return undefined;
  }

  private findPathProbeCandidate(
    diagPath: PBLDiagnosticPath | null,
    currentPathNode: DiagnosticPathNode | undefined,
    attemptedQuestionRef: string,
    prerequisiteCompetencyRefs: string[]
  ): DiagnosticPathNode | undefined {
    if (!diagPath) return undefined;

    const explicitTargetId = currentPathNode?.onIncorrect.targetNodeId;
    if (explicitTargetId) {
      return diagPath.nodes.find((node) =>
        node.nodeId === explicitTargetId && node.questionRef !== attemptedQuestionRef
      );
    }

    // An attempt outside the authored diagnostic path should enter through a
    // prerequisite probe when one exists, rather than receiving the path's
    // misconception as a fallback diagnosis.
    if (!currentPathNode && prerequisiteCompetencyRefs.length > 0) {
      const entryNode = diagPath.nodes.find((node) => node.nodeId === diagPath.entryNodeId)
        || diagPath.nodes[0];
      if (
        entryNode?.questionRef !== attemptedQuestionRef
        && entryNode?.evaluatedPrerequisiteRef
        && prerequisiteCompetencyRefs.includes(entryNode.evaluatedPrerequisiteRef)
      ) {
        return entryNode;
      }
      return diagPath.nodes.find((node) =>
        node.questionRef !== attemptedQuestionRef
        && Boolean(node.evaluatedPrerequisiteRef)
        && prerequisiteCompetencyRefs.includes(node.evaluatedPrerequisiteRef || '')
      );
    }

    return undefined;
  }

  private async isPublishedEligibleProbe(
    competencyRef: string,
    questionRef: string
  ): Promise<boolean> {
    const [eligible, presentation] = await Promise.all([
      this.questionPoolSelector.isQuestionEligibleForCompetency(competencyRef, questionRef),
      this.repo.getQuestionPresentation(questionRef),
    ]);
    return Boolean(eligible && presentation?.prompt?.trim() && presentation.correctAnswer?.trim());
  }
}
