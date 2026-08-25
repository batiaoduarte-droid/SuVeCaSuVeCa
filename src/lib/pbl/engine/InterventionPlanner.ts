import type {
  DiagnosticResult,
  InterventionPayload,
  PBLCase,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { formatPBLAnswer, formatPBLPedagogicalText } from '../answerAdapter';

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

    const procSteps = (!isSecondaryAssignment && qp?.solutionStrategy.length
      ? qp.solutionStrategy.map((step) => step.action)
      : pblCase.solutionStrategy.stepByStepAlgorithm) || [
      '1. Identificar o termo nuclear da oração.',
      '2. Aplicar o teste canônico de verificação.',
      '3. Descartar atratores e validar o gabarito.',
    ];

    const contrast = pblCase.contrastingScaffold;

    return {
      interventionId: `int_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      competencyRef: diagResult.competencyRef,
      misconceptionRef: diagResult.misconceptionRefs[0] || null,
      trapRef: diagResult.trapRefs[0] || null,
      microLessonText: formatPBLPedagogicalText(
        diagResult.intervention.microLesson ||
        `Domínio de ${comp?.title || 'Tópico'}: aplique o procedimento sistemático e evite atratores sintáticos.`
      ),
      ruleTitle: `Critério decisivo — ${comp?.title || 'aplicação da regra'}`,
      ruleStatement:
        formatPBLPedagogicalText(diagResult.intervention.refutationText || '') ||
        'Aplicação direta da regra canônica conforme o padrão dos concursos públicos.',
      procedureSteps: procSteps.map(formatPBLPedagogicalText),
      contrastingPoleA: contrast?.poleA || 'Construção correta conforme a norma culta',
      contrastingPoleB: contrast?.poleB || 'Atrator de banca indutor de erro',
      workedExample: {
        stem: presentation?.prompt || pblCase.questionStem,
        stepByStep: procSteps.map(formatPBLPedagogicalText),
        resolution: `Gabarito oficial: ${formatPBLAnswer(
          presentation?.correctAnswer || pblCase.officialAnswer,
          Boolean(presentation?.options.length || pblCase.options.length)
        )}. Justificativa: aplicação estrita dos critérios gramaticais.`,
      },
    };
  }
}
