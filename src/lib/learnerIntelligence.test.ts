import { describe, it, expect } from 'vitest';
import {
  diagnoseWeaknesses,
  generateChallengeRound,
  generateMemoryGameDeck,
  computeMetacognitiveMatrix,
  computeExamBoardStats,
  generateRecoverySimulado,
  computeWeeklyGoalProgress,
  computeModuleDomain360,
  computeRetentionCurveEstimate,
  CANONICAL_BANK_TRAPS,
  SYNTAX_MATCH_PAIRS,
} from './learnerIntelligence';
import type { CadernoErroItem } from '../types/suveca';

describe('learnerIntelligence', () => {
  it('falls back to canonical bank traps when Caderno de Erros is empty', () => {
    const diagnoses = diagnoseWeaknesses([]);
    expect(diagnoses).toHaveLength(3);
    expect(diagnoses[0].topic).toBe(CANONICAL_BANK_TRAPS[0].topic);
    expect(diagnoses[1].topic).toBe(CANONICAL_BANK_TRAPS[1].topic);
    expect(diagnoses[2].topic).toBe(CANONICAL_BANK_TRAPS[2].topic);
  });

  it('extracts and ranks unmastered weaknesses from Caderno de Erros', () => {
    const mockErrors: CadernoErroItem[] = [
      {
        id: 'err1',
        date: '2026-08-20',
        conteudo: 'Crase Diante de Pronomes',
        erroCometido: 'Coloquei crase antes de "ela"',
        regraDecisiva: 'Proibida crase antes de pronome pessoal',
        novoExemplo: 'Entreguei o documento a ela.',
        status: 'dia0',
      },
      {
        id: 'err2',
        date: '2026-08-21',
        conteudo: 'Crase Diante de Pronomes',
        erroCometido: 'Coloquei crase antes de "mim"',
        regraDecisiva: 'Proibida crase antes de pronome pessoal',
        novoExemplo: 'Isso não diz respeito a mim.',
        status: 'dia1',
      },
      {
        id: 'err3',
        date: '2026-08-21',
        conteudo: 'Concordância com Verbo Fazer',
        erroCometido: 'Fazem dois anos',
        regraDecisiva: 'Fazer no sentido de tempo é impessoal',
        novoExemplo: 'Faz dois anos.',
        status: 'dia0',
      },
      {
        id: 'err4',
        date: '2026-08-15',
        conteudo: 'Acentuação',
        erroCometido: 'Erro antigo',
        regraDecisiva: 'Proparoxítonas são acentuadas',
        novoExemplo: 'Médico',
        status: 'dominado', // Ignorado
      },
    ];

    const diagnoses = diagnoseWeaknesses(mockErrors);
    expect(diagnoses).toHaveLength(3);
    // Crase tem 2 erros não dominados (peso maior)
    expect(diagnoses[0].topic).toBe('Crase Diante de Pronomes');
    expect(diagnoses[1].topic).toBe('Concordância com Verbo Fazer');
    // Terceiro item deve ser preenchido por uma trap canônica
    expect(diagnoses[2].source).toBe('bank_trap');
  });

  it('generates a 3-question challenge round with 45s metadata', () => {
    const mockErrors: CadernoErroItem[] = [
      {
        id: 'err10',
        date: '2026-08-20',
        conteudo: 'Regência do Verbo Visar',
        erroCometido: 'Visar a com sentido de mirar',
        regraDecisiva: 'Visar no sentido de almejar é VTI',
        novoExemplo: 'Viso ao cargo.',
        status: 'dia0',
        questionId: 'OQ-1234',
        questionText: 'O projeto visa o bem-estar da população.',
        correctAnswer: 'E',
        bank: 'CEBRASPE',
      },
    ];

    const round = generateChallengeRound(mockErrors);
    expect(round).toHaveLength(3);
    expect(round[0].prompt).toBe('O projeto visa o bem-estar da população.');
    expect(round[0].correctAnswer).toBe('E');
    expect(round[0].targetWeakness).toBe('Regência do Verbo Visar');
    expect(round[1].options.length).toBeGreaterThanOrEqual(2);
    expect(round[2].options.length).toBeGreaterThanOrEqual(2);
  });

  it('generates a valid syntactic memory game deck with distinct terms and definitions', () => {
    const deck = generateMemoryGameDeck(4);
    expect(deck.terms).toHaveLength(4);
    expect(deck.definitions).toHaveLength(4);

    const termPairIds = new Set(deck.terms.map((t) => t.pairId));
    const defPairIds = new Set(deck.definitions.map((d) => d.pairId));

    expect(termPairIds.size).toBe(4);
    expect(defPairIds.size).toBe(4);
    // Every term pair has a matching definition pair
    termPairIds.forEach((pairId) => {
      expect(defPairIds.has(pairId)).toBe(true);
    });
  });

  it('computes 2x2 metacognitive matrix correctly', () => {
    const mockErrors: CadernoErroItem[] = [
      {
        id: 'err1',
        date: '2026-08-20',
        conteudo: 'Crase Proibida',
        erroCometido: 'Crase antes de verbo',
        regraDecisiva: 'Proibido crase antes de verbo',
        novoExemplo: 'Começou a falar.',
        status: 'dia0', // Q4 - Ilusão de competência
      },
    ];

    const matrix = computeMetacognitiveMatrix(20, 16, mockErrors);
    expect(matrix.totalAnalyzed).toBeGreaterThan(0);
    expect(matrix.quadrants.q1_mastery.count).toBeGreaterThan(0);
    expect(matrix.quadrants.q4_illusion.count).toBe(1);
    expect(matrix.calibrationScore).toBeGreaterThan(0);
  });

  it('prefers observed PBL confidence over heuristic quadrant estimates', () => {
    const matrix = computeMetacognitiveMatrix(40, 35, [], [
      { isCorrect: true, confidence: 'high' },
      { isCorrect: true, confidence: 'guess' },
      { isCorrect: false, confidence: 'low' },
      { isCorrect: false, confidence: 'high' },
    ]);

    expect(matrix.totalAnalyzed).toBe(4);
    expect(matrix.quadrants.q1_mastery.count).toBe(1);
    expect(matrix.quadrants.q2_fragile.count).toBe(1);
    expect(matrix.quadrants.q3_conscious_doubt.count).toBe(1);
    expect(matrix.quadrants.q4_illusion.count).toBe(1);
  });

  it('computes exam board vulnerability analysis', () => {
    const mockErrors: CadernoErroItem[] = [
      {
        id: 'err_cebraspe',
        date: '2026-08-20',
        conteudo: 'Partícula SE',
        erroCometido: 'Confundi IIS com PA',
        regraDecisiva: 'VTD + SE = PA com sujeito paciente',
        novoExemplo: 'Vendem-se casas.',
        status: 'dia0',
        bank: 'CEBRASPE',
      },
    ];

    const boardStats = computeExamBoardStats(mockErrors, 10, 8);
    expect(boardStats.boards).toHaveLength(4);
    const cebraspe = boardStats.boards.find((b) => b.board === 'CEBRASPE');
    expect(cebraspe?.errorCount).toBe(1);
    expect(boardStats.topOverallTraps.length).toBeGreaterThan(0);
  });

  it('generates recovery simulado from pending errors', () => {
    const mockErrors: CadernoErroItem[] = [
      {
        id: 'rec_err1',
        date: '2026-08-20',
        conteudo: 'Regência de Assistir',
        erroCometido: 'Assistir o filme',
        regraDecisiva: 'Assistir no sentido de ver é VTI',
        novoExemplo: 'Assisti ao filme.',
        status: 'dia0',
        questionText: 'Julgue o item sobre a regência do verbo assistir.',
        correctAnswer: 'E',
      },
    ];

    const simulado = generateRecoverySimulado(mockErrors);
    expect(simulado).toHaveLength(1);
    expect(simulado[0].topic).toBe('Regência de Assistir');
    expect(simulado[0].correctAnswer).toBe('E');
    expect(simulado[0].resolution?.decisiveRule).toBe('Assistir no sentido de ver é VTI');
  });

  it('computes weekly study goal progress accurately', () => {
    const progress = computeWeeklyGoalProgress(4, 10, { targetSections: 8, targetQuestions: 20 });
    expect(progress.targetSections).toBe(8);
    expect(progress.sectionsCompleted).toBe(4);
    expect(progress.sectionsPercentage).toBe(50);
    expect(progress.questionsPercentage).toBe(50);
    expect(progress.overallPercentage).toBe(50);
    expect(progress.isGoalMet).toBe(false);
  });

  it('computes 360 domain score combining theory, practice and notebook errors', () => {
    const mockModules = [
      { id: 'mod01', num: 1, title: 'Aula 01 - Ortografia', sections: [{}, {}, {}, {}] },
      { id: 'mod02', num: 2, title: 'Aula 02 - Morfossintaxe', sections: [{}, {}] },
    ];
    const mockErrors: CadernoErroItem[] = [
      {
        id: 'err_mod1',
        date: '2026-08-20',
        conteudo: 'Ortografia',
        erroCometido: 'Erro de grafia',
        regraDecisiva: 'Uso do SS',
        novoExemplo: 'Excesso',
        status: 'dia0',
        moduleRef: 'mod01',
      },
    ];

    const domain360 = computeModuleDomain360(
      mockModules,
      mockErrors,
      ['mod01:sec1', 'mod01:sec2'],
      { mod01: { answered: 10, correct: 9 } }
    );

    expect(domain360).toHaveLength(2);
    expect(domain360[0].moduleId).toBe('mod01');
    expect(domain360[0].theoryReadCount).toBe(2);
    expect(domain360[0].theoryProgressPct).toBe(50);
    expect(domain360[0].practiceProgressPct).toBe(90);
    expect(domain360[0].pendingErrorsCount).toBe(1);
    expect(domain360[0].overallScore).toBeGreaterThan(0);
  });

  it('computes retention curve estimate with decay projection and tactical advice', () => {
    const mockErrors: CadernoErroItem[] = [
      {
        id: 'err_ret',
        date: '2026-08-20',
        conteudo: 'Crase',
        erroCometido: 'Crase facultativa',
        regraDecisiva: 'Crase antes de nome próprio feminino',
        novoExemplo: 'Entreguei à Maria.',
        status: 'dia0',
      },
    ];

    const estimate = computeRetentionCurveEstimate(mockErrors, 10, 5);
    expect(estimate.estimatedRetentionRate).toBeGreaterThanOrEqual(50);
    expect(estimate.estimatedRetentionRate).toBeLessThanOrEqual(100);
    expect(estimate.projectedDecay).toHaveLength(4);
    expect(estimate.projectedDecay[0].retentionPct).toBe(100);
    expect(estimate.cardsAtRiskCount).toBe(1);
    expect(estimate.tacticalAdvice.length).toBeGreaterThan(10);
  });
});
