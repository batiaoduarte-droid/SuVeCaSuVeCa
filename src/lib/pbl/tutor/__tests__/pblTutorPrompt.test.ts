import { describe, it, expect } from 'vitest';
import { formatTutorPrompt } from '../pblTutorPrompt';
import type { PBLTutorQuestionContext, PBLTutorTurnRequest } from '../../../../types/pblTutor';

describe('formatTutorPrompt (ATU-001, ATU-002, ATU-003, ATU-008 Verification)', () => {
  const baseContext: PBLTutorQuestionContext = {
    questionRef: 'OQ-A00-aula00.q0089',
    primaryCompetencyRef: 'COMP-A00-G02-01',
    competencyTitle: 'Objetivo 1 – Estudo da Sílaba - Teoria',
    presentation: {
      prompt: 'Os vocábulos "países" e "línguas" possuem a mesma classificação...',
      command: 'Assinale a opção que indica a correta classificação...',
      supportBlocks: [],
      options: [
        { label: 'A', letter: 'A', text: 'Ambos os vocábulos são paroxítonos...' },
        { label: 'B', letter: 'B', text: 'Ambos os vocábulos são proparoxítonos...' },
      ],
      officialAnswer: 'A',
      questionType: 'multiple_choice',
    },
    pedagogy: {
      difficulty: 'medio',
      learningObjectives: ['OBJ-IP-A00-G02-01'],
      testedConcepts: ['pt.orthography.acento_grafico'],
      decisivePoint: 'Ambos os vocábulos são paroxítonos, mas diferem pela regra.',
      commonMistake: 'Confundir hiato com ditongo crescente.',
    },
    criteria: {
      rules: [
        {
          ruleRef: 'RULE-IP-A00-G02-001',
          title: 'Regra dos Hiatos',
          statement: 'Acentuam-se o I e U tônicos em hiato.',
          boundaries: [
            {
              title: 'Limites dos Hiatos',
              scope: 'Acentuação gráfica',
              limits: ['Não acentua se seguido de NH na sílaba seguinte'],
              traps: ['Bancas cobram rainha e bainha sem acento'],
            },
          ],
        },
      ],
      procedures: [
        {
          procedureRef: 'PROC-001',
          title: 'Procedimento de Separação',
          markdown: '1. **Separar sílabas**: Identifique o núcleo silábico.',
        },
      ],
      contrasts: [
        {
          contrastRef: 'CONTRAST-001',
          title: 'Hiato vs Ditongo Crescente',
          poleA: 'Hiato',
          poleB: 'Ditongo Crescente',
          sideACriteria: ['Vogais em sílabas distintas'],
          sideBCriteria: ['Semivogal + vogal na mesma sílaba'],
          decisionCriterion: 'Separação silábica fonética',
        },
      ],
      tables: [
        {
          id: 'TABLE-001',
          title: 'Contrastes Decisivos de Sílaba',
          columns: ['Critério', 'Ditongo Crescente', 'Hiato'],
          rows: [['Alocação', 'Mesma sílaba', 'Sílabas distintas']],
        },
      ],
    },
    solutionStrategy: [
      {
        stepNumber: 1,
        action: 'Isolar os vocábulos',
        rationale: 'Permite examinar a tonicidade separadamente.',
      },
    ],
    objectiveOptionAnalyses: [
      {
        label: 'A',
        isCorrect: true,
        optionText: 'Ambos os vocábulos são paroxítonos...',
        refutation: 'CORRETO. Análise canônica precisa.',
        authoritative: false,
      },
      {
        label: 'B',
        isCorrect: false,
        optionText: 'Ambos os vocábulos são proparoxítonos...',
        refutation: 'INCORRETO. São paroxítonos.',
        authoritative: false,
      },
    ],
    curriculum: {
      macroGroupId: 'MG-01',
      macroGroupTitle: 'Fonética e Ortografia',
    },
    provenance: {
      questionSha256: 'abc123',
      hasGaps: false,
    },
  };

  const request: PBLTutorTurnRequest = {
    sessionId: 'session-123',
    competencyRef: 'COMP-A00-G02-01',
    questionRef: 'OQ-A00-aula00.q0089',
    userMessage: 'Por que a letra A é a correta?',
  };

  it('formats prompt cleanly without any [undefined] option markers', () => {
    const prompt = formatTutorPrompt(request, baseContext);
    expect(prompt).not.toContain('[undefined]');
    expect(prompt).toContain('[A] Ambos os vocábulos são paroxítonos...');
    expect(prompt).toContain('[B] Ambos os vocábulos são proparoxítonos...');
  });

  it('includes solutionStrategy, decisivePoint, commonMistake, boundaries, and tables', () => {
    const attemptedRequest: PBLTutorTurnRequest = {
      ...request,
      studentAttemptContext: {
        userAnswer: 'B',
        isCorrect: false,
        confidence: 'medium',
        attemptStage: 'initial',
      },
    };
    const prompt = formatTutorPrompt(attemptedRequest, baseContext);
    expect(prompt).toContain('=== ESTRATÉGIA DE RESOLUÇÃO GUIADA (WORKED EXAMPLE) ===');
    expect(prompt).toContain('Passo 1: Isolar os vocábulos');
    expect(prompt).toContain('Justificativa: Permite examinar a tonicidade separadamente.');

    expect(prompt).toContain('=== INTELIGÊNCIA PEDAGÓGICA DA BANCA ===');
    expect(prompt).toContain('• Ponto Decisivo: Ambos os vocábulos são paroxítonos, mas diferem pela regra.');
    expect(prompt).toContain('• Hipótese Frequente de Distrator (Banca): Confundir hiato com ditongo crescente.');

    expect(prompt).toContain('Limite/Contorno da Regra (Limites dos Hiatos):');
    expect(prompt).toContain('Limites: Não acentua se seguido de NH na sílaba seguinte');
    expect(prompt).toContain('Armadilhas de banca: Bancas cobram rainha e bainha sem acento');

    expect(prompt).toContain('=== TABELAS DE APOIO E MATRIZES NORMATIVAS ===');
    expect(prompt).toContain('• Tabela: Contrastes Decisivos de Sílaba');
    expect(prompt).toContain('Colunas: Critério | Ditongo Crescente | Hiato');
    expect(prompt).toContain('Linha: Alocação | Mesma sílaba | Sílabas distintas');

    expect(prompt).toContain('Critérios Polo A (Hiato): Vogais em sílabas distintas');
    expect(prompt).toContain('Critérios Polo B (Ditongo Crescente): Semivogal + vogal na mesma sílaba');
  });

  it('formats disclaimer when question is marked isUnavailable', () => {
    const unavailableContext: PBLTutorQuestionContext = {
      ...baseContext,
      presentation: {
        ...baseContext.presentation,
        prompt: '',
        officialAnswer: '',
        isUnavailable: true,
      },
    };
    const prompt = formatTutorPrompt(request, unavailableContext);
    expect(prompt).toContain('[QUESTÃO INDISPONÍVEL]');
  });
});
