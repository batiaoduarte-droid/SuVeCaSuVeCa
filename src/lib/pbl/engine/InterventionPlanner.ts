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
    const comp = await this.repo.getCompetency(diagResult.competencyRef);
    const qp = await this.repo.getQuestionPedagogy(diagResult.questionRef);

    const procSteps = qp?.solutionStrategy.map((s) => s.action) || [
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
        stem: pblCase.questionStem,
        stepByStep: pblCase.solutionStrategy.stepByStepAlgorithm.map(formatPBLPedagogicalText),
        resolution: `Gabarito oficial: ${formatPBLAnswer(pblCase.officialAnswer, pblCase.options.length > 0)}. Justificativa: aplicação estrita dos critérios gramaticais.`,
      },
    };
  }
}
