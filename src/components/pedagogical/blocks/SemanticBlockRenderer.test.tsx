import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  SemanticBlockRenderer,
  ResponsiveComparisonMatrix,
  ResponsiveAstTable,
  ClassificationRenderer,
} from './SemanticBlockRenderer';
import type {
  ConceptDefinitionBlock,
  ConceptExplanationBlock,
  ClassificationBlock,
  TaxonomyBlock,
  ComparisonMatrixBlock,
  RuleBoundaryBlock,
  FormulaBlock,
  ProcedureBlock,
  ContrastBlock,
  MinimalPairBlock,
  AnnotatedSentenceBlock,
  TableBlock,
  BulletListBlock,
  RuleBlock,
  WorkedExampleBlock,
  MnemonicBlock,
  ExamTrapBlock,
  RecallPromptBlock,
} from '../../../types/pedagogicalView';

describe('SemanticBlockRenderer - Unit Tests for v4.2 AST Blocks', () => {
  it('renderiza concept_definition com termo e definição sempre visíveis', () => {
    const block: ConceptDefinitionBlock = {
      type: 'concept_definition',
      term: 'Dígrafo',
      definition: 'Duas letras que representam um único fonema acústico.',
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Dígrafo')).toBeInTheDocument();
    expect(screen.getByText('Duas letras que representam um único fonema acústico.')).toBeInTheDocument();
  });

  it('renderiza concept_explanation com texto formatado', () => {
    const block: ConceptExplanationBlock = {
      type: 'concept_explanation',
      text: 'A fonética estuda os sons da fala humana.',
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('A fonética estuda os sons da fala humana.')).toBeInTheDocument();
  });

  it('renderiza classification com categorias e exemplos', () => {
    const block: ClassificationBlock = {
      type: 'classification',
      title: 'Classificação dos Dígrafos',
      categories: [
        {
          name: 'Consonantais Inseparáveis',
          description: 'Não se separam na partição silábica.',
          examples: ['CH (chuva)', 'LH (filho)', 'NH (ninho)'],
        },
        {
          name: 'Consonantais Separáveis',
          description: 'Separam-se em sílabas distintas.',
          examples: ['RR (carro)', 'SS (passo)'],
        },
      ],
    };
    render(<ClassificationRenderer block={block} />);

    expect(screen.getByText('Classificação dos Dígrafos')).toBeInTheDocument();
    expect(screen.getByText('Consonantais Inseparáveis')).toBeInTheDocument();
    expect(screen.getByText('CH (chuva)')).toBeInTheDocument();
    expect(screen.getByText('Consonantais Separáveis')).toBeInTheDocument();
  });

  it('renderiza comparison_matrix de forma responsiva com colunas e linhas', () => {
    const block: ComparisonMatrixBlock = {
      type: 'comparison_matrix',
      title: 'Dígrafo vs Encontro Consonantal',
      columns: ['Critério', 'Dígrafo', 'Encontro Consonantal'],
      rows: [
        ['Definição', '2 letras = 1 fonema', '2 consoantes = 2 fonemas'],
        ['Exemplo', 'Chuva (4 fonemas)', 'Prato (5 fonemas)'],
      ],
    };
    render(<ResponsiveComparisonMatrix block={block} />);

    expect(screen.getByText('Dígrafo vs Encontro Consonantal')).toBeInTheDocument();
    expect(screen.getAllByText('Critério').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 letras = 1 fonema').length).toBeGreaterThan(0);
  });

  it('renderiza rule_boundary com escopo, condições e exceções', () => {
    const block: RuleBoundaryBlock = {
      type: 'rule_boundary',
      title: 'Limite da Letra X como Dífono',
      scope: 'Fonologia e Ortografia',
      text: 'O X assume valor de /ks/ em certos contextos intervocálicos.',
      conditions: ['Estar entre vogais', 'Origem greco-latina erudita'],
      exceptions: ['X com som de /z/ como em exame', 'X com som de /ch/ como em enxame'],
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Limite da Letra X como Dífono')).toBeInTheDocument();
    expect(screen.getByText('Fonologia e Ortografia')).toBeInTheDocument();
    expect(screen.getByText('Estar entre vogais')).toBeInTheDocument();
    expect(screen.getByText('X com som de /z/ como em exame')).toBeInTheDocument();
  });

  it('renderiza rule com destaque normativo e modalidade', () => {
    const block: RuleBlock = {
      type: 'rule',
      title: 'Regra Geral de Contagem',
      statement: 'Cada dígrafo subtrai 1 unidade da contagem de letras.',
      modality: 'OBRIGATÓRIA',
      conditions: ['Identificar dígrafo válido'],
      exceptions: ['Encontros consonantais não subtraem'],
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Regra Geral de Contagem')).toBeInTheDocument();
    expect(screen.getByText('OBRIGATÓRIA')).toBeInTheDocument();
    expect(screen.getByText('Cada dígrafo subtrai 1 unidade da contagem de letras.')).toBeInTheDocument();
  });

  it('renderiza formula com expressão matemática e variáveis', () => {
    const block: FormulaBlock = {
      type: 'formula',
      title: 'Equação de Fonemas',
      expression: 'F = L - D + X',
      variables: [
        { name: 'F', description: 'Total de Fonemas' },
        { name: 'L', description: 'Total de Letras' },
      ],
      explanation: 'Subtraem-se dígrafos e somam-se dífonos.',
    };
    const { container } = render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Equação de Fonemas')).toBeInTheDocument();
    expect(container.querySelector('.katex')).toBeInTheDocument();
    expect(screen.getByText(/Total de Fonemas/i)).toBeInTheDocument();
  });

  it('quebra a equação de fonemas de forma semântica sem depender de rolagem horizontal', () => {
    const block: FormulaBlock = {
      type: 'formula',
      expression: '\\text{Fonemas} = \\text{Letras} - (\\text{Dígrafos} + \\text{H inicial}) + \\text{Dífonos}',
    };
    const { container } = render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByRole('math', { name: /Fonemas igual a Letras/i })).toBeInTheDocument();
    expect(container.querySelector('[data-responsive-formula="phoneme-count"]')).toBeInTheDocument();
    expect(container.querySelector('.katex-display')).not.toBeInTheDocument();
  });

  it('renderiza procedure com passos operacionais ordenados', () => {
    const block: ProcedureBlock = {
      type: 'procedure',
      title: 'Algoritmo de Cálculo Fonético',
      objective: 'Calcular fonemas de qualquer vocábulo em menos de 10 segundos',
      steps: [
        { order: 1, action: 'Conte o número de letras gráficas (L)' },
        { order: 2, action: 'Subtraia dígrafos consonantais e vocálicos (D)' },
      ],
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Algoritmo de Cálculo Fonético')).toBeInTheDocument();
    expect(screen.getByText(/Calcular fonemas de qualquer vocábulo/i)).toBeInTheDocument();
    expect(screen.getByText('Conte o número de letras gráficas (L)')).toBeInTheDocument();
  });

  it('renderiza contrast com comparação bilateral e critério de desempate', () => {
    const block: ContrastBlock = {
      type: 'contrast',
      title: 'Dígrafo vs Encontro Consonantal',
      conceptA: 'NASCER (dígrafo SC = 5 fonemas)',
      conceptB: 'ESCOLA (encontro consonantal SC = 6 fonemas)',
      decisiveDifference: 'Em NASCER o som é único (/s/); em ESCOLA são dois sons (/s/ + /k/).',
      decisionCriterion: 'Fale a palavra devagar e verifique se há articulação de dois fonemas.',
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Dígrafo vs Encontro Consonantal')).toBeInTheDocument();
    expect(screen.getByText(/NASCER \(dígrafo SC = 5 fonemas\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ESCOLA \(encontro consonantal SC = 6 fonemas\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Em NASCER o som é único/i)).toBeInTheDocument();
  });

  it('renderiza minimal_pair com contraponto direto', () => {
    const block: MinimalPairBlock = {
      type: 'minimal_pair',
      title: 'Par Mínimo PATA vs BATA',
      left: 'PATA (/p/a/t/a/)',
      right: 'BATA (/b/a/t/a/)',
      decisiveDifference: 'A oposição entre oclusiva surda /p/ e oclusiva sonora /b/ altera o sentido.',
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Par Mínimo PATA vs BATA')).toBeInTheDocument();
    expect(screen.getByText('PATA (/p/a/t/a/)')).toBeInTheDocument();
    expect(screen.getByText('BATA (/b/a/t/a/)')).toBeInTheDocument();
    expect(screen.getByText(/A oposição entre oclusiva surda/i)).toBeInTheDocument();
  });

  it('renderiza worked_example com prompt, passos e resultado', () => {
    const block: WorkedExampleBlock = {
      type: 'worked_example',
      title: 'Exemplo: HOMENAGEM',
      prompt: 'Quantas letras e fonemas tem o vocábulo HOMENAGEM?',
      analysisSteps: [
        'Contagem de letras: 9 letras.',
        'H inicial é mudo (-1).',
        'EM final é dígrafo nasal (-1).',
      ],
      result: '7 fonemas no total.',
      decisivePoint: 'H inicial não tem som e EM final é vogal nasal.',
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Exemplo: HOMENAGEM')).toBeInTheDocument();
    expect(screen.getByText('Quantas letras e fonemas tem o vocábulo HOMENAGEM?')).toBeInTheDocument();
    expect(screen.getByText('7 fonemas no total.')).toBeInTheDocument();
    expect(screen.getByText(/H inicial não tem som/i)).toBeInTheDocument();
  });

  it('renderiza mnemonic com conteúdo e limitações visíveis', () => {
    const block: MnemonicBlock = {
      type: 'mnemonic',
      title: 'Mantra do Dígrafo e Dífono',
      content: 'Letra menos dígrafo mais dífono!',
      classification: 'EXAM_HEURISTIC',
      limitations: 'Não se aplica a variantes regionais com rhotics especiais.',
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Mantra do Dígrafo e Dífono')).toBeInTheDocument();
    expect(screen.getByText('Letra menos dígrafo mais dífono!')).toBeInTheDocument();
    expect(screen.queryByText('EXAM_HEURISTIC')).not.toBeInTheDocument();
    expect(screen.getByText('Não se aplica a variantes regionais com rhotics especiais.')).toBeInTheDocument();
  });

  it('renderiza exam_trap com trigger, misleadingReasoning e correctReasoning', () => {
    const block: ExamTrapBlock = {
      type: 'exam_trap',
      title: 'Pegadinha do GU e QU',
      trigger: 'Ver GU ou QU e assumir que é dígrafo automaticamente',
      misleadingReasoning: 'O aluno esquece que o U pode ser sonoro como em água.',
      correctReasoning: 'Testar se o U é pronunciado. Se for pronunciado, não há dígrafo.',
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Pegadinha do GU e QU')).toBeInTheDocument();
    expect(screen.getByText(/Ver GU ou QU e assumir/i)).toBeInTheDocument();
    expect(screen.getByText(/O aluno esquece que o U pode ser sonoro/i)).toBeInTheDocument();
    expect(screen.getByText(/Testar se o U é pronunciado/i)).toBeInTheDocument();
  });

  it('renderiza recall_prompt com pergunta e pontos-chave', () => {
    const block: RecallPromptBlock = {
      type: 'recall_prompt',
      question: 'Qual a diferença entre dígrafo e encontro consonantal?',
      targetConcept: 'Fonética',
      keyPoints: ['Dígrafo = 2 letras e 1 som', 'Encontro consonantal = 2 letras e 2 sons'],
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Qual a diferença entre dígrafo e encontro consonantal?')).toBeInTheDocument();
    expect(screen.getByText('Fonética')).toBeInTheDocument();
    expect(screen.getByText('Dígrafo = 2 letras e 1 som')).toBeInTheDocument();
  });

  it('renderiza bullet_list e list com itens corretos', () => {
    const block: BulletListBlock = {
      type: 'bullet_list',
      items: ['Item A', 'Item B', 'Item C'],
    };
    render(<SemanticBlockRenderer block={block} />);

    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
    expect(screen.getByText('Item C')).toBeInTheDocument();
  });

  it('trata graciosamente bloco malformado / vazio sem quebrar', () => {
    const emptyBlock: any = { type: 'unknown_future_block' };
    const { container } = render(<SemanticBlockRenderer block={emptyBlock} />);
    expect(container.firstChild).toBeNull();
  });
});
