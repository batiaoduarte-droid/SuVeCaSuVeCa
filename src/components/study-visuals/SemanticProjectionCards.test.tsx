import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BankTrapCard } from './BankTrapCard';
import { WorkedExampleCard } from './WorkedExampleCard';
import { ContrastBoard } from './ContrastBoard';
import { GoldenRuleCard } from './GoldenRuleCard';
import { ProcedureStepper } from './ProcedureStepper';
import { ContentBlockRenderer } from '../pedagogical/blocks/ContentBlockRenderer';
import { ResolutionSection } from '../pedagogical/sections/ResolutionSection';

const sourceBacked = {
  status: 'source_backed' as const,
  sourceKind: 'canonical_content_block' as const,
  sourceEntityRefs: ['ENTITY-001', 'EXP-001'],
  hideGenericScaffold: true,
};

const renderBlock = (block: Parameters<typeof ContentBlockRenderer>[0]['block']) => (
  <ContentBlockRenderer block={block} />
);

describe('semantic projection cards', () => {
  it('renders the complete v4.2 contrast projection instead of only the pair labels', () => {
    render(<ContrastBoard contrast={{
      conceptA: 'Dígrafo Vocálico',
      conceptB: 'Encontro Consonantal',
      statement: 'Enunciado comparativo preservado',
      decisiveDifference: 'Diferença decisiva preservada',
      minimalPair: {
        sentenceA: 'Exemplo A preservado',
        sentenceB: 'Exemplo B preservado',
        difference: 'Explicação do par preservada',
      },
      practicalHeuristic: 'Atalho prático preservado',
      pitfall: 'Armadilha preservada',
    }} />);

    expect(screen.getByText('Dígrafo Vocálico × Encontro Consonantal')).toBeInTheDocument();
    expect(screen.getByText('Enunciado comparativo preservado')).toBeInTheDocument();
    expect(screen.getByText('Exemplo A preservado')).toBeInTheDocument();
    expect(screen.getByText('Exemplo B preservado')).toBeInTheDocument();
    expect(screen.getByText('Diferença decisiva preservada')).toBeInTheDocument();
    expect(screen.getByText('Explicação do par preservada')).toBeInTheDocument();
    expect(screen.getByText('Atalho prático preservado')).toBeInTheDocument();
    expect(screen.getByText('Armadilha preservada')).toBeInTheDocument();
  });

  it('renders textual side descriptions from legacy published contrasts', () => {
    render(<ContrastBoard contrast={{
      title: 'Dígrafo vs encontro',
      conceptA: 'Dígrafo',
      conceptB: 'Encontro',
      sideA: 'Descrição completa do lado A',
      sideB: 'Descrição completa do lado B',
      decisionCriterion: 'Critério de desempate preservado',
    }} />);

    expect(screen.getByText('Descrição completa do lado A')).toBeInTheDocument();
    expect(screen.getByText('Descrição completa do lado B')).toBeInTheDocument();
    expect(screen.getByText('Critério de desempate preservado')).toBeInTheDocument();
  });

  it('renders the full commentary from canonical worked-example aliases', () => {
    render(<WorkedExampleCard example={{
      title: 'Aplicação guiada',
      sentence: 'Frase preservada',
      analysis: 'Comentário analítico preservado',
      pedagogicalTakeaway: 'Conclusão pedagógica preservada',
      commonMistake: 'Erro recorrente preservado',
    }} />);

    expect(screen.getByText('Frase preservada')).toBeInTheDocument();
    expect(screen.getByText('Comentário analítico preservado')).toBeInTheDocument();
    expect(screen.getByText('Conclusão pedagógica preservada')).toBeInTheDocument();
    expect(screen.getByText('Erro recorrente preservado')).toBeInTheDocument();
  });

  it('renders correction and reasoning from legacy trap aliases', () => {
    render(<BankTrapCard trap={{
      title: 'Armadilha recorrente',
      trigger: 'Atrator superficial',
      whyItFails: 'Ignora a condição normativa',
      correctApproach: 'Aplicar o teste decisivo',
      counterRule: 'Verificar a exceção antes de concluir',
      bankTechnique: 'A banca desloca o termo relevante',
    }} />);

    expect(screen.getByText('Ignora a condição normativa')).toBeInTheDocument();
    expect(screen.getByText('Aplicar o teste decisivo')).toBeInTheDocument();
    expect(screen.getByText(/Verificar a exceção antes de concluir/)).toBeInTheDocument();
    expect(screen.getByText('A banca desloca o termo relevante')).toBeInTheDocument();
  });

  it('renders every learner-facing field from the canonical rule projection', () => {
    render(<GoldenRuleCard rule={{
      title: 'Regra preservada',
      statement: 'Enunciado preservado',
      formalCondition: 'Condição formal preservada',
      conditions: ['Condição obrigatória preservada'],
      exceptions: ['Exceção preservada'],
      boundaries: ['Limite preservado'],
      examples: ['Exemplo preservado'],
    }} />);

    for (const text of [
      'Enunciado preservado',
      'Condição formal preservada',
      'Condição obrigatória preservada',
      'Exceção preservada',
      'Limite preservado',
      'Exemplo preservado',
    ]) expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('renders goals, complete inputs and formulas from procedure projections', () => {
    render(<ProcedureStepper procedure={{
      title: 'Roteiro preservado',
      goal: 'Objetivo legado preservado',
      inputs: [{ name: 'Entrada', description: 'Descrição da entrada preservada' }],
      formulas: ['Fórmula preservada'],
      steps: [{ order: 1, action: 'Ação preservada' }],
      outputs: [{ name: 'Saída', description: 'Descrição da saída preservada' }],
    }} />);

    for (const text of [
      'Objetivo legado preservado',
      'Descrição da entrada preservada',
      'Fórmula preservada',
      'Ação preservada',
      'Descrição da saída preservada',
    ]) expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('renders the extended diagnostic fields from trap projections', () => {
    render(<BankTrapCard trap={{
      title: 'Armadilha completa',
      errorPattern: 'Padrão de erro preservado',
      examBoardBehavior: 'Comportamento da banca preservado',
      studentCaveat: 'Alerta ao aluno preservado',
      example: 'Exemplo da armadilha preservado',
      counterexample: 'Contraprova preservada',
    }} />);

    for (const text of [
      'Padrão de erro preservado',
      'Comportamento da banca preservado',
      'Alerta ao aluno preservado',
      'Exemplo da armadilha preservado',
      'Contraprova preservada',
    ]) expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('replaces generic projection scaffolds with canonical source blocks', () => {
    const { rerender } = render(<GoldenRuleCard rule={{
      title: 'Regra source-backed',
      statement: 'Enunciado genérico oculto',
      conditions: ['Aplicação direta dos critérios normativos canônicos de Regra source-backed.'],
      presentation: sourceBacked,
      blocks: [{ type: 'paragraph', text: 'Formulação canônica completa da regra.' }],
    }} renderBlock={renderBlock} />);
    expect(screen.getByText('Formulação canônica completa da regra.')).toBeInTheDocument();
    expect(screen.queryByText('Enunciado genérico oculto')).not.toBeInTheDocument();

    rerender(<WorkedExampleCard example={{
      title: 'Exemplo source-backed',
      reasoning: 'Aplicação analítica e passo a passo da regra canônica genérica',
      presentation: sourceBacked,
      blocks: [{ type: 'paragraph', text: 'Comentário canônico completo do exemplo.' }],
    }} renderBlock={renderBlock} />);
    expect(screen.getByText('Comentário canônico completo do exemplo.')).toBeInTheDocument();
    expect(screen.queryByText(/Aplicação analítica e passo a passo/)).not.toBeInTheDocument();

    rerender(<BankTrapCard trap={{
      title: 'Pegadinha source-backed',
      errorPattern: 'Indução a falso raciocínio por semelhança genérica',
      presentation: sourceBacked,
      blocks: [{ type: 'paragraph', text: 'Vacina lógica canônica completa.' }],
    }} renderBlock={renderBlock} />);
    expect(screen.getByText('Vacina lógica canônica completa.')).toBeInTheDocument();
    expect(screen.queryByText(/Indução a falso raciocínio/)).not.toBeInTheDocument();

    rerender(<ContrastBoard contrast={{
      title: 'Contraste source-backed',
      sideA: { label: 'Elemento A', criteria: ['Critério genérico A'] },
      sideB: { label: 'Elemento B', criteria: ['Critério genérico B'] },
      presentation: sourceBacked,
      blocks: [{ type: 'paragraph', text: 'Pares e critérios canônicos completos.' }],
    }} renderBlock={renderBlock} />);
    expect(screen.getByText('Pares e critérios canônicos completos.')).toBeInTheDocument();
    expect(screen.queryByText('Elemento A')).not.toBeInTheDocument();
    expect(screen.queryByText('Elemento B')).not.toBeInTheDocument();
  });

  it('renders a source-backed procedure without the generic stepper', () => {
    render(<ResolutionSection procedures={[{
      title: 'Procedimento source-backed',
      goal: 'Executar o algoritmo decisório para um resumo genérico',
      steps: [{ order: 1, action: 'Passo genérico oculto' }],
      presentation: sourceBacked,
      blocks: [{ type: 'paragraph', text: 'Sequência canônica completa do procedimento.' }],
    }]} />);

    expect(screen.getByText('Sequência canônica completa do procedimento.')).toBeInTheDocument();
    expect(screen.queryByText('Passo genérico oculto')).not.toBeInTheDocument();
    expect(screen.queryByText(/Executar o algoritmo decisório/)).not.toBeInTheDocument();
  });
});
