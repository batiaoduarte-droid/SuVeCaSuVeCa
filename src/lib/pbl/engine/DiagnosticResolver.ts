import type {
  DiagnosticResult,
  PBLAttempt,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { QuestionPoolSelector } from './QuestionPoolSelector';

export class DiagnosticResolver {
  private questionPoolSelector: QuestionPoolSelector;

  constructor(private repo: IPBLRepository) {
    this.questionPoolSelector = new QuestionPoolSelector(repo);
  }

  public async resolveDiagnostic(attempt: PBLAttempt): Promise<DiagnosticResult> {
    const { competencyRef, questionRef, userAnswer, evaluation, isCorrect } = attempt;

    const qp = await this.repo.getQuestionPedagogy(questionRef);
    const diagPath = await this.repo.getDiagnosticPathForCompetency(competencyRef);
    const comp = await this.repo.getCompetency(competencyRef);

    // 1. Identify distractor or assertion error
    let matchedDistractor = qp?.distractorAnalysis.find(
      (d) => d.label.toUpperCase() === userAnswer.toUpperCase()
    );

    if (!matchedDistractor && qp?.distractorAnalysis.length === 1) {
      matchedDistractor = qp.distractorAnalysis[0];
    }

    const trapRefs: string[] = [];
    const misconceptionRefs: string[] = [];

    if (matchedDistractor?.triggeredTrapRef) {
      trapRefs.push(matchedDistractor.triggeredTrapRef);
    } else if (qp?.examTrapRefs && qp.examTrapRefs.length > 0) {
      trapRefs.push(qp.examTrapRefs[0]);
    }

    if (matchedDistractor?.likelyMisconceptionRef) {
      misconceptionRefs.push(matchedDistractor.likelyMisconceptionRef);
    } else if (qp?.misconceptionRefs && qp.misconceptionRefs.length > 0) {
      misconceptionRefs.push(qp.misconceptionRefs[0]);
    }

    // 2. Check diagnostic path node
    const firstNode = diagPath?.nodes.find((node) => node.nodeId === diagPath.entryNodeId) || diagPath?.nodes[0];
    const microLesson =
      firstNode?.onIncorrect?.correctiveMicroLesson ||
      `Revise os critérios normativos e teste decisivo para ${comp?.title || 'a competência'}.`;

    // 3. Diagnostic Confidence calculation
    let diagnosticConfidence = 0.5;
    if (evaluation === 'high_confidence_error') {
      diagnosticConfidence = 0.92; // High conviction mistake implies distinct misconception
    } else if (matchedDistractor?.likelyMisconceptionRef) {
      diagnosticConfidence = 0.85;
    } else if (trapRefs.length > 0) {
      diagnosticConfidence = 0.75;
    } else {
      diagnosticConfidence = 0.42; // Low confidence, may need probe question
    }

    const targetProbeNode = firstNode?.onIncorrect.targetNodeId
      ? diagPath?.nodes.find((node) => node.nodeId === firstNode.onIncorrect.targetNodeId)
      : diagPath?.nodes.find((node) => node.questionRef !== questionRef);
    const shouldProbe = !isCorrect && (diagnosticConfidence < 0.60 || evaluation === 'error');
    const onlineProbe = shouldProbe
      ? await this.questionPoolSelector.selectQuestion(competencyRef, 'diagnostic', {
          excludedQuestionRefs: [questionRef],
          onlineOnly: true,
          seed: attempt.sessionId,
        })
      : null;
    const candidateProbeRef = shouldProbe
      ? onlineProbe?.questionRef || targetProbeNode?.questionRef
      : undefined;
    const probePresentation = candidateProbeRef
      ? await this.repo.getQuestionPresentation(candidateProbeRef)
      : null;
    const needsProbe = Boolean(candidateProbeRef && probePresentation);
    const probeQuestionRef = needsProbe ? candidateProbeRef : undefined;

    return {
      competencyRef,
      questionRef,
      evaluation,
      trapRefs,
      misconceptionRefs,
      prerequisiteCompetencyRef: comp?.prerequisiteCompetencyRefs[0] || null,
      diagnosticConfidence,
      needsProbe,
      probeQuestionRef,
      diagnosticSummary:
        matchedDistractor?.errorPattern ||
        (!isCorrect ? comp?.description : 'O procedimento foi aplicado com segurança.'),
      trapSummary: matchedDistractor?.refutation,
      intervention: {
        microLesson,
        ruleRefs: qp?.decisiveRuleRefs || comp?.ruleRefs || [],
        procedureRefs: qp?.procedureRefs || comp?.procedureRefs || [],
        contrastRefs: qp?.contrastRefs || comp?.contrastRefs || [],
        refutationText: matchedDistractor?.refutation,
      },
    };
  }
}
