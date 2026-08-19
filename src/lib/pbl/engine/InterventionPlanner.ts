import type {
  DiagnosticResult,
  InterventionPayload,
  PBLCase,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';

export class InterventionPlanner {
  constructor(private repo: IPBLRepository) {}

  public async planIntervention(
    diagResult: DiagnosticResult,
    pblCase: PBLCase
  ): Promise<InterventionPayload> {
    const comp = await this.repo.getCompetency(diagResult.competencyRef);
    const qp = await this.repo.getQuestionPedagogy(diagResult.questionRef);

    const primaryRule = qp?.primaryDecisiveRuleRef || comp?.ruleRefs[0] || 'Regra Canônica SuVeCa';
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
      microLessonText:
        diagResult.intervention.microLesson ||
        `Domínio de ${comp?.title || 'Tópico'}: aplique o procedimento sistemático e evite atratores sintáticos.`,
      ruleTitle: `Regra Decisiva: ${primaryRule}`,
      ruleStatement:
        diagResult.intervention.refutationText ||
        'Aplicação direta da regra canônica conforme o padrão dos concursos públicos.',
      procedureSteps: procSteps,
      contrastingPoleA: contrast?.poleA || 'Construção correta conforme a norma culta',
      contrastingPoleB: contrast?.poleB || 'Atrator de banca indutor de erro',
      workedExample: {
        stem: pblCase.questionStem,
        stepByStep: pblCase.solutionStrategy.stepByStepAlgorithm,
        resolution: `Gabarito oficial: ${pblCase.officialAnswer}. Justificativa: aplicação estrita dos critérios gramaticais.`,
      },
    };
  }
}
