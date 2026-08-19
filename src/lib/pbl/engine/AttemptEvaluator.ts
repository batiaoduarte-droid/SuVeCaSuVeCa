import type {
  PBLConfidenceLevel,
  ConfidenceEvaluation,
  PBLAttemptStage,
  PBLAttempt,
} from '../../../types/pbl';

export interface EvaluateAttemptParams {
  sessionId: string;
  questionRef: string;
  competencyRef: string;
  userAnswer: string;
  correctAnswer: string;
  confidence: PBLConfidenceLevel;
  stage: PBLAttemptStage;
  reasoning?: string;
  responseTimeMs: number;
  detectedTrapRefs?: string[];
  detectedMisconceptionRefs?: string[];
  transferType?: import('../../../types/pbl').TransferType;
}

export class AttemptEvaluator {
  public static evaluateConfidence(
    isCorrect: boolean,
    confidence: PBLConfidenceLevel
  ): ConfidenceEvaluation {
    if (isCorrect) {
      if (confidence === 'high' || confidence === 'medium') {
        return 'strong_correct';
      }
      return 'fragile_correct';
    } else {
      if (confidence === 'high') {
        return 'high_confidence_error';
      }
      return 'error';
    }
  }

  public evaluate(params: EvaluateAttemptParams): PBLAttempt {
    const isCorrect = this.isAnswerCorrect(params.userAnswer, params.correctAnswer);
    const evaluation = AttemptEvaluator.evaluateConfidence(isCorrect, params.confidence);

    return {
      attemptId: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: params.sessionId,
      questionRef: params.questionRef,
      competencyRef: params.competencyRef,
      stage: params.stage,
      userAnswer: params.userAnswer,
      correctAnswer: params.correctAnswer,
      isCorrect,
      confidence: params.confidence,
      evaluation,
      reasoning: params.reasoning,
      responseTimeMs: params.responseTimeMs,
      detectedTrapRefs: params.detectedTrapRefs || [],
      detectedMisconceptionRefs: params.detectedMisconceptionRefs || [],
      interventionRefs: [],
      transferType: params.transferType,
      createdAt: new Date().toISOString(),
    };
  }

  private isAnswerCorrect(userAns: string, correctAns: string): boolean {
    const cleanUser = userAns.trim().toUpperCase();
    const cleanCorr = correctAns.trim().toUpperCase();

    if (cleanUser === cleanCorr) return true;

    // Handle Certo / Errados
    if (
      (cleanUser === 'C' || cleanUser === 'CERTO' || cleanUser === 'CORRETO') &&
      (cleanCorr === 'C' || cleanCorr === 'CERTO' || cleanCorr === 'CORRETO')
    ) {
      return true;
    }
    if (
      (cleanUser === 'E' || cleanUser === 'ERRADO' || cleanUser === 'INCORRETO') &&
      (cleanCorr === 'E' || cleanCorr === 'ERRADO' || cleanCorr === 'INCORRETO')
    ) {
      return true;
    }

    return false;
  }
}
