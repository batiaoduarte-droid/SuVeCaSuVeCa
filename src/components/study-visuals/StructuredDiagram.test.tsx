import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DiagramStructure } from '../../types/pedagogicalView';
import { StructuredDiagram } from './StructuredDiagram';

const provenance = {
  sourceFormat: 'ascii' as const,
  classificationMethod: 'semantic_review' as const,
  reviewStatus: 'reviewed' as const,
  confidence: 0.94,
};

describe('StructuredDiagram', () => {
  const sequence: DiagramStructure = {
    schemaVersion: '2.1.0',
    visualType: 'sequence',
    layout: 'vertical',
    rootId: 'step-1',
    structuredText: '[Processo] Achar a vogal temática\n→ [Processo] Achar a DMT\n→ [Resultado] Achar a DNP',
    nodes: [
      { id: 'step-1', kind: 'process', label: 'Achar a vogal temática', details: ['Identificar a vogal antes de -r.'] },
      { id: 'step-2', kind: 'process', label: 'Achar a DMT', details: ['Isolar a desinência comum.'] },
      { id: 'step-3', kind: 'result', label: 'Achar a DNP', details: ['Observar a pessoa solicitada.'] },
    ],
    edges: [
      { from: 'step-1', to: 'step-2' },
      { from: 'step-2', to: 'step-3' },
    ],
    provenance,
  };

  it('renderiza uma sequência conforme as arestas declaradas', () => {
    render(<StructuredDiagram title="Explicação consolidada" source="ASCII original" structure={sequence} />);
    expect(screen.getByRole('list', { name: /sequência de análise/i })).toBeInTheDocument();
    expect(screen.getByText('Achar a vogal temática')).toBeVisible();
    expect(screen.getByText('Achar a DMT')).toBeVisible();
    expect(screen.queryByText(/tópicos principais/i)).not.toBeInTheDocument();
  });

  it('renderiza condições de um fluxo decisório sem achatá-las', () => {
    const decision: DiagramStructure = {
      ...sequence,
      visualType: 'decision_flow',
      rootId: 'start',
      nodes: [
        { id: 'start', kind: 'start', label: 'Palavra-alvo' },
        { id: 'test', kind: 'decision', label: 'O X representa /ks/?' },
        { id: 'add', kind: 'result', label: 'Somar um fonema' },
        { id: 'keep', kind: 'result', label: 'Manter a contagem' },
      ],
      edges: [
        { from: 'start', to: 'test' },
        { from: 'test', to: 'add', label: 'Sim' },
        { from: 'test', to: 'keep', label: 'Não' },
      ],
    };
    render(<StructuredDiagram title="Contagem de fonemas" structure={decision} />);
    expect(screen.getByLabelText(/fluxo de decisão/i)).toBeVisible();
    expect(screen.getByText('Sim')).toBeVisible();
    expect(screen.getByText('Não')).toBeVisible();
  });

  it('renderiza comparacoes como matriz responsiva', () => {
    const comparison: DiagramStructure = {
      ...sequence,
      visualType: 'comparison',
      layout: 'responsive',
      rootId: 'root',
      nodes: [
        { id: 'root', kind: 'category', label: 'Infinitivo' },
        { id: 'personal', kind: 'category', label: 'Pessoal', details: ['Sujeito determinado', 'Pode flexionar'] },
        { id: 'impersonal', kind: 'category', label: 'Impessoal', details: ['Sujeito nao destacado', 'Nao flexiona'] },
      ],
      edges: [
        { from: 'root', to: 'personal', label: 'Com sujeito' },
        { from: 'root', to: 'impersonal', label: 'Sem sujeito destacado' },
      ],
    };

    render(<StructuredDiagram title="Comparacao" structure={comparison} />);
    expect(screen.getByRole('table', { name: 'Infinitivo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Elemento comparado' })).toBeInTheDocument();
    expect(screen.getAllByText('Pode flexionar').length).toBeGreaterThan(0);
  });

  it('separa a estrutura textual derivada da fonte original', () => {
    render(<StructuredDiagram title="Explicação consolidada" source="ASCII original" structure={sequence} />);
    fireEvent.click(screen.getByRole('tab', { name: /estrutura textual/i }));
    expect(screen.getByText(/\[Processo\] Achar a vogal temática/)).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: /fonte original/i }));
    expect(screen.getByText('ASCII original')).toBeVisible();
  });

  it('preserva ramos multinível sob a decisão que realmente os origina', () => {
    const nestedDecision: DiagramStructure = {
      ...sequence,
      visualType: 'decision_flow',
      rootId: 'first',
      nodes: [
        { id: 'first', kind: 'decision', label: 'Começa com H?' },
        { id: 'hyphen', kind: 'result', label: 'Use hífen' },
        { id: 'prefix', kind: 'decision', label: 'Qual prefixo?' },
        { id: 'co', kind: 'result', label: 'Escreva junto' },
        { id: 'regular', kind: 'decision', label: 'Qual encontro?' },
        { id: 'same', kind: 'result', label: 'Use hífen por colisão' },
        { id: 'different', kind: 'result', label: 'Escreva junto por diferença' },
      ],
      edges: [
        { from: 'first', to: 'hyphen', label: 'Sim' },
        { from: 'first', to: 'prefix', label: 'Não' },
        { from: 'prefix', to: 'co', label: 'CO-' },
        { from: 'prefix', to: 'regular', label: 'Regular' },
        { from: 'regular', to: 'same', label: 'Iguais' },
        { from: 'regular', to: 'different', label: 'Diferentes' },
      ],
    };
    render(<StructuredDiagram title="Hifenização" structure={nestedDecision} />);
    expect(screen.getByText('CO-')).toBeVisible();
    expect(screen.getByText('Regular')).toBeVisible();
    expect(screen.getByText('Iguais')).toBeVisible();
    expect(screen.getByText('Diferentes')).toBeVisible();
  });

  it('renderiza ramos paralelos com convergência única e sem duplicação', () => {
    const parallelWithConvergence: DiagramStructure = {
      schemaVersion: '2.1.0',
      visualType: 'branches',
      layout: 'vertical',
      rootId: 'root',
      structuredText: 'Root -> [Eixo 1, Eixo 2] -> Convergência -> Final',
      nodes: [
        { id: 'root', kind: 'start', label: 'Protocolo Principal' },
        { id: 'branch-1', kind: 'process', label: 'Eixo 1: Divisão Silábica' },
        { id: 'branch-2', kind: 'process', label: 'Eixo 2: Varredura de Dígrafos' },
        { id: 'join-node', kind: 'process', label: 'Encontros Vocálicos e Consonantais' },
        { id: 'final-node', kind: 'formula', label: 'Equação de Fonemas vs Letras' },
      ],
      edges: [
        { from: 'root', to: 'branch-1', label: 'Eixo 1' },
        { from: 'root', to: 'branch-2', label: 'Eixo 2' },
        { from: 'branch-1', to: 'join-node', label: 'Convergência' },
        { from: 'branch-2', to: 'join-node', label: 'Convergência' },
        { from: 'join-node', to: 'final-node', label: 'Cálculo' },
      ],
      provenance,
    };

    render(<StructuredDiagram title="Análise Fonética" structure={parallelWithConvergence} />);
    expect(screen.getByText('Protocolo Principal')).toBeVisible();
    expect(screen.getByText('Eixo 1: Divisão Silábica')).toBeVisible();
    expect(screen.getByText('Eixo 2: Varredura de Dígrafos')).toBeVisible();
    expect(screen.getByText('Convergência')).toBeVisible();
    expect(screen.getAllByText('Encontros Vocálicos e Consonantais')).toHaveLength(1);
    expect(screen.getAllByText('Equação de Fonemas vs Letras')).toHaveLength(1);
  });

  it('renderiza decisão com convergência pós-ramos sem duplicar passos subsequentes', () => {
    const decisionWithConvergence: DiagramStructure = {
      schemaVersion: '2.1.0',
      visualType: 'decision_flow',
      layout: 'vertical',
      rootId: 'start',
      structuredText: 'Start -> Decisão -> [SIM, NÃO] -> Auxiliares -> Concordância',
      nodes: [
        { id: 'start', kind: 'start', label: 'Localizar Verbo Principal' },
        { id: 'decision', kind: 'decision', label: 'Possui Sujeito?' },
        { id: 'branch-sim', kind: 'process', label: 'Sujeito Pessoal Identificado' },
        { id: 'branch-nao', kind: 'process', label: 'Oração Sem Sujeito (Impessoal)' },
        { id: 'aux-node', kind: 'process', label: 'Classificar Auxiliares Anteriores' },
        { id: 'conc-node', kind: 'result', label: 'Aplicar Concordância na Locução' },
      ],
      edges: [
        { from: 'start', to: 'decision' },
        { from: 'decision', to: 'branch-sim', label: 'SIM: Pessoal' },
        { from: 'decision', to: 'branch-nao', label: 'NÃO: Impessoal' },
        { from: 'branch-sim', to: 'aux-node', label: 'Convergência' },
        { from: 'branch-nao', to: 'aux-node', label: 'Convergência' },
        { from: 'aux-node', to: 'conc-node', label: 'Conclusão' },
      ],
      provenance,
    };

    render(<StructuredDiagram title="Análise Verbal" structure={decisionWithConvergence} />);
    expect(screen.getByText('Possui Sujeito?')).toBeVisible();
    expect(screen.getByText('SIM: Pessoal')).toBeVisible();
    expect(screen.getByText('NÃO: Impessoal')).toBeVisible();
    expect(screen.getByText('Convergência')).toBeVisible();
    expect(screen.getAllByText('Classificar Auxiliares Anteriores')).toHaveLength(1);
    expect(screen.getAllByText('Aplicar Concordância na Locução')).toHaveLength(1);
  });

  it('especializa decision_flow com espinha central e saída terminal lateral (padrão Porquês)', () => {
    const porquesTree: DiagramStructure = {
      schemaVersion: '2.1.0',
      visualType: 'decision_flow',
      layout: 'vertical',
      rootId: 'd1',
      structuredText: 'D1 -> [SIM: R1, NÃO: D2 -> [SIM: R2, NÃO: R3]]',
      nodes: [
        { id: 'd1', kind: 'decision', label: 'Há determinante antes da lacuna?' },
        { id: 'r1', kind: 'result', label: 'Escreva PORQUÊ (substantivo)' },
        { id: 'd2', kind: 'decision', label: 'A lacuna introduz justificativa / causa?' },
        { id: 'r2', kind: 'result', label: 'Escreva PORQUE (conjunção)' },
        { id: 'r3', kind: 'result', label: 'Escreva POR QUE ou POR QUÊ' },
      ],
      edges: [
        { from: 'd1', to: 'r1', label: 'SIM (Determinante presente)' },
        { from: 'd1', to: 'd2', label: 'NÃO (Sem determinante)' },
        { from: 'd2', to: 'r2', label: 'SIM (Causal/Explicativo)' },
        { from: 'd2', to: 'r3', label: 'NÃO (Interrogativo/Relativo)' },
      ],
      provenance,
    };

    render(<StructuredDiagram title="Roteiro dos Porquês" structure={porquesTree} />);
    expect(screen.getByText('Há determinante antes da lacuna?')).toBeVisible();
    expect(screen.getByText('Escreva PORQUÊ (substantivo)')).toBeVisible();
    expect(screen.getByText('A lacuna introduz justificativa / causa?')).toBeVisible();
    expect(screen.getByText('Escreva PORQUE (conjunção)')).toBeVisible();
    expect(screen.getAllByText(/saída terminal/i).length).toBeGreaterThan(0);
  });

  it('deduplica groupLabel e node.label quando há sobreposição ou redundância de texto', () => {
    const withDuplicateGroups: DiagramStructure = {
      schemaVersion: '2.1.0',
      visualType: 'sequence',
      layout: 'vertical',
      rootId: 's1',
      groups: [
        { id: 'g1', label: 'Fase 1: Divisão Silábica Fonética', order: 1 },
      ],
      nodes: [
        {
          id: 's1',
          groupId: 'g1',
          kind: 'process',
          label: 'Fase 1: Divisão Silábica Fonética',
          details: ['Dividir as sílabas ouvindo a fala real.'],
        },
      ],
      edges: [],
      provenance,
    };

    render(<StructuredDiagram title="Deduplicação" structure={withDuplicateGroups} />);
    expect(screen.getByText('Fase 1: Divisão Silábica Fonética')).toBeVisible();
    // Verify no ugly duplicate block or stuttering text
    expect(screen.getByText('Dividir as sílabas ouvindo a fala real.')).toBeVisible();
  });
});
