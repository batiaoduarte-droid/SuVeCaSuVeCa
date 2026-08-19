import type {
  PBLSession,
  NextActionDecision,
  PBLAttempt,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { TransferSelector } from './TransferSelector';

export class NextActionPolicy {
  private transferSelector: TransferSelector;

  constructor(private repo: IPBLRepository) {
    this.transferSelector = new TransferSelector(repo);
  }

  public async decideNextAction(
    session: PBLSession,
    lastAttempt: PBLAttempt
  ): Promise<NextActionDecision> {
    const { competencyRef, evaluation, stage, isCorrect } = lastAttempt;
    const currentMastery = session.masterySnapshot[competencyRef];
    const masteryScore = currentMastery?.score ?? 0;

    // Stage 1: Initial Attempt on Problem Case
    if (stage === 'initial') {
      if (evaluation === 'strong_correct') {
        // Strong mastery evidence -> Jump directly to transfer problems
        const xferItem = await this.transferSelector.selectNextTransferItem(
          competencyRef,
          evaluation,
          0,
          currentMastery
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
          return this.advanceOrComplete(session);
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

    // Stage 2: Reattempt after Intervention
    if (stage === 'reattempt') {
      if (isCorrect) {
        // Reattempt passed -> Proceed to Transfer
        const xferItem = await this.transferSelector.selectNextTransferItem(
          competencyRef,
          evaluation,
          0,
          currentMastery
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
          return this.advanceOrComplete(session);
        }
      } else {
        // Repeated error -> Check prerequisite or show contrast again
        const comp = await this.repo.getCompetency(competencyRef);
        const prereq = comp?.prerequisiteCompetencyRefs[0];

        if (prereq) {
          return {
            type: 'branch_to_prerequisite',
            targetCompetencyRef: prereq,
            reason: 'Dificuldade persistente. Redirecionando para competência de pré-requisito.',
            feedbackMessage: 'Vamos revisar o conceito fundamental antes de retornar a este tópico.',
          };
        } else {
          return {
            type: 'request_reattempt',
            targetCompetencyRef: competencyRef,
            reason: 'Nova tentativa com scaffold reforçado.',
          };
        }
      }
    }

    // Stage 3: Transfer Attempt
    if (stage === 'transfer') {
      const nextIdx = session.currentTransferItemIndex + 1;
      const xferItem = await this.transferSelector.selectNextTransferItem(
        competencyRef,
        evaluation,
        nextIdx,
        currentMastery
      );

      // If learner achieved mastery or finished transfer items -> Advance
      if (masteryScore >= 0.80 || !xferItem || nextIdx >= 3) {
        return this.advanceOrComplete(session);
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

    return this.advanceOrComplete(session);
  }

  private async advanceOrComplete(session: PBLSession): Promise<NextActionDecision> {
    const nextCompIdx = session.currentCompetencyIndex + 1;

    if (nextCompIdx < session.targetCompetencyRefs.length) {
      const nextCompId = session.targetCompetencyRefs[nextCompIdx];
      const nextCase = await this.repo.getCaseForCompetency(nextCompId);

      return {
        type: 'advance_competency',
        targetCompetencyRef: nextCompId,
        targetCaseRef: nextCase?.caseId,
        targetQuestionRef: nextCase?.anchorQuestionRef,
        reason: 'Competência concluída com sucesso. Avançando para o próximo tópico da sessão.',
        feedbackMessage: 'Competência dominada! Avançando para a próxima meta.',
      };
    } else {
      return {
        type: 'complete_session',
        reason: 'Todas as competências da sessão foram dominadas com sucesso!',
        feedbackMessage: 'Parabéns! Sessão de Aprendizagem Baseada em Problemas concluída com êxito.',
      };
    }
  }
}
