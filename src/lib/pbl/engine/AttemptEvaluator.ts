import type {
  PBLAssistanceLevel,
  PBLConfidenceLevel,
  ConfidenceEvaluation,
  PBLAttemptStage,
  PBLAttempt,
} from '../../../types/pbl';
import { isPBLAnswerCorrect } from '../answerAdapter';
import type { PBLAnswerMode } from '../answerAdapter';

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
  assistanceLevel?: PBLAssistanceLevel;
  isDelayedRetrieval?: boolean;
  elapsedSinceLastPracticeMs?: number;
  detectedTrapRefs?: string[];
  detectedMisconceptionRefs?: string[];
  transferType?: import('../../../types/pbl').TransferType;
  answerMode?: PBLAnswerMode;
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
    const isCorrect = isPBLAnswerCorrect(params.userAnswer, params.correctAnswer, params.answerMode);
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
      assistanceLevel: params.assistanceLevel || 'none',
      isDelayedRetrieval: params.isDelayedRetrieval,
      elapsedSinceLastPracticeMs: params.elapsedSinceLastPracticeMs,
      detectedTrapRefs: params.detectedTrapRefs || [],
      detectedMisconceptionRefs: params.detectedMisconceptionRefs || [],
      interventionRefs: [],
      transferType: params.transferType,
      createdAt: new Date().toISOString(),
    };
  }

}
