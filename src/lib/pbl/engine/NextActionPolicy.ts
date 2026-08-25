import type {
  PBLSession,
  NextActionDecision,
  PBLAttempt,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { TransferSelector } from './TransferSelector';
import { QuestionPoolSelector } from './QuestionPoolSelector';

export class NextActionPolicy {
  private transferSelector: TransferSelector;
  private questionPoolSelector: QuestionPoolSelector;

  constructor(private repo: IPBLRepository) {
    this.transferSelector = new TransferSelector(repo);
    this.questionPoolSelector = new QuestionPoolSelector(repo);
  }

  public async decideNextAction(
    session: PBLSession,
    lastAttempt: PBLAttempt
  ): Promise<NextActionDecision> {
    const { competencyRef, evaluation, stage, isCorrect } = lastAttempt;
    const currentMastery = session.masterySnapshot[competencyRef];
    const attemptedQuestionRefs = session.attempts
      .filter((attempt) => attempt.competencyRef === competencyRef)
      .map((attempt) => attempt.questionRef);

    // Stage 1: Initial Attempt on Problem Case
    if (stage === 'initial') {
      if (evaluation === 'strong_correct') {
        // Strong mastery evidence -> Jump directly to transfer problems
        const xferItem = await this.transferSelector.selectNextTransferItem(
          competencyRef,
          evaluation,
          0,
          currentMastery,
          attemptedQuestionRefs,
          true,
          session.sessionId
        );

        if (xferItem) {
          return {
            type: 'request_transfer',
            targetCompetencyRef: competencyRef,
            targetQuestionRef: xferItem.officialQuestionRef,
            transferItem: xferItem,
            reason: 'Acerto com alta confiança. Avançando para teste de transferência cognitiva.',
            feedbackMessage: 'Excelente raciocínio! Vamos testar a regra em um novo contexto de prova.',
          };
        } else {
          return this.advanceOrComplete(session, 'needs_review');
        }
      } else {
        // Error or Fragile Correct -> Show Diagnostic and Trigger Intervention
        return {
          type: 'trigger_intervention',
          targetCompetencyRef: competencyRef,
          targetQuestionRef: lastAttempt.questionRef,
          reason: isCorrect
            ? 'Acerto com baixa confiança. Reforço preventivo de procedimento.'
            : 'Erro identificado. Ativação de diagnóstico cognitivo e microaula corretiva.',
          feedbackMessage: isCorrect
            ? 'Você acertou, mas identificamos oportunidade de consolidar o procedimento.'
            : 'Identificamos um ponto de atenção no seu raciocínio. Vamos examinar a regra decisiva.',
        };
      }
    }

    if (stage === 'probe') {
      return {
        type: 'trigger_intervention',
        targetCompetencyRef: competencyRef,
        targetQuestionRef: lastAttempt.questionRef,
        reason: 'A sondagem refinou o diagnóstico antes da intervenção.',
        feedbackMessage: 'Diagnóstico refinado. Agora vamos aplicar o procedimento decisivo.',
      };
    }

    // Stage 2: Reattempt after Intervention
    if (stage === 'reattempt') {
      if (isCorrect) {
        // Reattempt passed -> Proceed to Transfer
        const xferItem = await this.transferSelector.selectNextTransferItem(
          competencyRef,
          evaluation,
          0,
          currentMastery,
          attemptedQuestionRefs,
          true,
          session.sessionId
        );

        if (xferItem) {
          return {
            type: 'request_transfer',
            targetCompetencyRef: competencyRef,
            targetQuestionRef: xferItem.officialQuestionRef,
            transferItem: xferItem,
            reason: 'Intervenção bem-sucedida! Testando transferência.',
            feedbackMessage: 'Muito bem! Agora aplique a regra neste novo desafio.',
          };
        } else {
          return this.advanceOrComplete(session, 'needs_review');
        }
      } else {
        return this.advanceOrComplete(session, 'needs_review');
      }
    }

    // Stage 3: Transfer Attempt
    if (stage === 'transfer') {
      const transferAttempts = session.attempts.filter(
        (attempt) => attempt.competencyRef === competencyRef && attempt.stage === 'transfer'
      );
      const transferSet = await this.repo.getTransferSetForCompetency(competencyRef);
      const minPassingScore = transferSet?.masteryCriteria.minPassingScore ?? 0.75;
      const consecutiveRequired = transferSet?.masteryCriteria.consecutiveCorrectRequired ?? 2;
      const transferAccuracy = transferAttempts.length
        ? transferAttempts.filter((attempt) => attempt.isCorrect).length / transferAttempts.length
        : 0;
      let consecutiveCorrect = 0;
      for (let index = transferAttempts.length - 1; index >= 0 && transferAttempts[index].isCorrect; index -= 1) {
        consecutiveCorrect += 1;
      }
      const masteryDemonstrated =
        transferAccuracy >= minPassingScore && consecutiveCorrect >= consecutiveRequired;

      if (masteryDemonstrated) {
        return this.advanceOrComplete(session, 'mastered');
      }

      const xferItem = await this.transferSelector.selectNextTransferItem(
        competencyRef,
        evaluation,
        0,
        currentMastery,
        attemptedQuestionRefs,
        true,
        session.sessionId
      );

      if (!xferItem || transferAttempts.length >= 3) {
        return this.advanceOrComplete(session, 'needs_review');
      } else {
        return {
          type: 'request_transfer',
          targetCompetencyRef: competencyRef,
          targetQuestionRef: xferItem.officialQuestionRef,
          transferItem: xferItem,
          reason: 'Continuando progressão de transferência.',
          feedbackMessage: 'Ótimo avanço! Próximo item de transferência.',
        };
      }
    }

    return this.advanceOrComplete(session, 'needs_review');
  }

  private async advanceOrComplete(
    session: PBLSession,
    outcome: 'mastered' | 'needs_review'
  ): Promise<NextActionDecision> {
    const nextCompIdx = session.currentCompetencyIndex + 1;

    if (nextCompIdx < session.targetCompetencyRefs.length) {
      const nextCompId = session.targetCompetencyRefs[nextCompIdx];
      const nextCase = await this.repo.getCaseForCompetency(nextCompId);
      const onlineAnchor = await this.questionPoolSelector.selectQuestion(nextCompId, 'anchor', {
        onlineOnly: true,
        seed: session.sessionId,
      });

      return {
        type: 'advance_competency',
        targetCompetencyRef: nextCompId,
        targetCaseRef: nextCase?.caseId,
        targetQuestionRef: onlineAnchor?.questionRef || nextCase?.anchorQuestionRef,
        outcome,
        reason: outcome === 'mastered'
          ? 'A transferência confirmou o domínio desta competência.'
          : 'A competência precisa de revisão programada; a sessão seguirá sem repetir indefinidamente.',
        feedbackMessage: outcome === 'mastered'
          ? 'Domínio demonstrado em novo contexto.'
          : 'Ponto de revisão registrado. Vamos consolidá-lo na próxima revisão.',
      };
    } else {
      return {
        type: 'complete_session',
        outcome,
        reason: outcome === 'mastered'
          ? 'A prática foi concluída com evidência de transferência.'
          : 'A prática foi concluída e o ponto de dificuldade foi encaminhado para revisão.',
        feedbackMessage: outcome === 'mastered'
          ? 'Sessão concluída com domínio demonstrado.'
          : 'Sessão concluída. O objetivo agora é revisar e tentar novamente em outro momento.',
      };
    }
  }
}
