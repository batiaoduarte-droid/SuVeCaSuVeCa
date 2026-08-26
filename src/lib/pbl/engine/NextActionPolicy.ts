import type {
  PBLSession,
  NextActionDecision,
  PBLAttempt,
  PBLCompetencyOutcome,
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
    const budgetReached = (session.wallTimeMs || 0) >= (session.sessionBudgetMs || 12 * 60_000);

    // Stage 1: Initial Attempt on Problem Case
    if (stage === 'initial') {
      if (budgetReached) {
        return this.stopAtSessionBudget();
      }
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
      if (budgetReached) {
        return this.stopAtSessionBudget();
      }
      if (evaluation === 'strong_correct') {
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
            reason: 'A sondagem não confirmou um déficit estável; validando em novo item.',
            feedbackMessage: 'A sondagem indica um lapso pontual. Vamos confirmar em outro contexto.',
          };
        }
      }
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
      if (budgetReached) {
        return this.stopAtSessionBudget();
      }
      if (evaluation === 'strong_correct' || evaluation === 'fragile_correct') {
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
        const reattemptErrors = session.attempts.filter(
          (attempt) => attempt.competencyRef === competencyRef
            && attempt.stage === 'reattempt'
            && !attempt.isCorrect
        ).length;
        if (reattemptErrors < 2) {
          return {
            type: 'trigger_intervention',
            targetCompetencyRef: competencyRef,
            targetQuestionRef: lastAttempt.questionRef,
            reason: 'A primeira reaplicação ainda não estabilizou o procedimento.',
            feedbackMessage: 'Ainda há oscilação. Vamos revelar um apoio adicional antes de uma nova tentativa.',
          };
        }
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
      const qualifyingTransfer = (attempt: PBLAttempt): boolean =>
        attempt.evaluation === 'strong_correct'
        && attempt.transferValidationStatus === 'audited'
        && (!attempt.assistanceLevel || attempt.assistanceLevel === 'none');
      const transferAccuracy = transferAttempts.length
        ? transferAttempts.filter(qualifyingTransfer).length / transferAttempts.length
        : 0;
      let consecutiveCorrect = 0;
      for (
        let index = transferAttempts.length - 1;
        index >= 0 && qualifyingTransfer(transferAttempts[index]);
        index -= 1
      ) {
        consecutiveCorrect += 1;
      }
      const requiredEvidence = session.mode === 'review' ? 1 : consecutiveRequired;
      const reviewAnchorQualified = session.mode !== 'review' || session.attempts.some(
        (attempt) => attempt.competencyRef === competencyRef
          && attempt.stage === 'initial'
          && attempt.evaluation === 'strong_correct'
          && attempt.isDelayedRetrieval === true
          && (!attempt.assistanceLevel || attempt.assistanceLevel === 'none')
      );
      const masteryDemonstrated =
        transferAccuracy >= minPassingScore
        && consecutiveCorrect >= requiredEvidence
        && reviewAnchorQualified;

      if (masteryDemonstrated) {
        return this.advanceOrComplete(
          session,
          session.mode === 'review' ? 'retention_confirmed' : 'transfer_confirmed'
        );
      }

      if (budgetReached) {
        return this.stopAtSessionBudget();
      }

      const maxTransferAttempts = 4;
      if (!isCorrect && transferAttempts.length < maxTransferAttempts) {
        return {
          type: 'trigger_intervention',
          targetCompetencyRef: competencyRef,
          targetQuestionRef: lastAttempt.questionRef,
          reason: 'O erro de transferência exige retorno ao critério antes de novo contexto.',
          feedbackMessage: 'Retome o critério decisivo antes de continuar a progressão.',
        };
      }

      const xferItem = await this.transferSelector.selectNextTransferItem(
        competencyRef,
        evaluation,
        transferAttempts.length,
        currentMastery,
        attemptedQuestionRefs,
        true,
        session.sessionId
      );

      if (!xferItem || transferAttempts.length >= maxTransferAttempts) {
        return this.advanceOrComplete(session, 'needs_review');
      } else {
        return {
          type: 'request_transfer',
          targetCompetencyRef: competencyRef,
          targetQuestionRef: xferItem.officialQuestionRef,
          transferItem: xferItem,
          reason: 'Continuando progressão de transferência.',
            feedbackMessage: evaluation === 'fragile_correct'
              ? 'A resposta foi correta, mas a confiança ainda está baixa. Confirme o critério em outro item.'
              : isCorrect
                ? 'Ótimo avanço! Próximo item de transferência.'
              : 'Este item revelou um ponto de atenção. Veja o diagnóstico antes de tentar outro contexto.',
        };
      }
    }

    return this.advanceOrComplete(session, 'needs_review');
  }

  private stopAtSessionBudget(): NextActionDecision {
    return {
      type: 'complete_session',
      outcome: 'needs_review',
      reason: 'O limite adaptativo da sessão foi alcançado no ponto seguro seguinte.',
      feedbackMessage: 'O tempo ativo planejado foi alcançado. O ponto atual ficará na fila de revisão, sem transformar encerramento em domínio.',
    };
  }

  private async advanceOrComplete(
    session: PBLSession,
    outcome: PBLCompetencyOutcome
  ): Promise<NextActionDecision> {
    const nextCompIdx = session.currentCompetencyIndex + 1;

    if (nextCompIdx < session.targetCompetencyRefs.length) {
      const nextCompId = session.targetCompetencyRefs[nextCompIdx];
      const nextCase = await this.repo.getCaseForCompetency(nextCompId);
      const onlineAnchor = await this.questionPoolSelector.selectQuestion(nextCompId, 'anchor', {
        onlineOnly: true,
        seed: session.sessionId,
      });
      const anchor = onlineAnchor || await this.questionPoolSelector.selectQuestion(nextCompId, 'anchor', {
        seed: session.sessionId,
      });

      if (!anchor) {
        return {
          type: 'complete_session',
          outcome: 'needs_review',
          reason: 'A cobertura publicada da próxima competência mudou durante a sessão.',
          feedbackMessage: 'A sessão foi encerrada com segurança; nenhuma questão sem vínculo aprovado foi exibida.',
        };
      }

      return {
        type: 'advance_competency',
        targetCompetencyRef: nextCompId,
        targetCaseRef: nextCase?.caseId,
        targetQuestionRef: anchor.questionRef,
        outcome,
        reason: outcome === 'retention_confirmed'
          ? 'A recuperação atrasada confirmou retenção desta competência.'
          : outcome === 'transfer_confirmed'
            ? 'A transferência imediata foi confirmada e será revisada após intervalo.'
          : 'A competência precisa de revisão programada; a sessão seguirá sem repetir indefinidamente.',
        feedbackMessage: outcome === 'retention_confirmed'
          ? 'Retenção confirmada sem ajuda.'
          : outcome === 'transfer_confirmed'
            ? 'Transferência imediata confirmada. A retenção será verificada na revisão.'
          : 'Ponto de revisão registrado. Vamos consolidá-lo na próxima revisão.',
      };
    } else {
      return {
        type: 'complete_session',
        outcome,
        reason: outcome === 'retention_confirmed'
          ? 'A prática atrasada confirmou retenção.'
          : outcome === 'transfer_confirmed'
            ? 'A prática concluiu com evidência de transferência imediata.'
          : 'A prática foi concluída e o ponto de dificuldade foi encaminhado para revisão.',
        feedbackMessage: outcome === 'retention_confirmed'
          ? 'Sessão concluída com retenção confirmada.'
          : outcome === 'transfer_confirmed'
            ? 'Sessão concluída. A transferência foi confirmada; programe a recuperação atrasada.'
          : 'Sessão concluída. O objetivo agora é revisar e tentar novamente em outro momento.',
      };
    }
  }
}
