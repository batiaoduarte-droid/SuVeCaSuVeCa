import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  ResolutionSection,
  deriveSubDiagramHeader,
  normalizeProcedureStepAction,
} from './ResolutionSection';
import type { DiagramBlock, DiagramStructure, ProcedureView } from '../../../types/pedagogicalView';

const dummyProvenance: DiagramStructure['provenance'] = {
  sourceFormat: 'ascii',
  classificationMethod: 'deterministic_projection',
  reviewStatus: 'source_backed',
  confidence: 0.95,
};

describe('normalizeProcedureStepAction', () => {
  it.each([
    ['1. Identifique o verbo.', 'Identifique o verbo.'],
    ['Passo 2 — Aplique o teste.', 'Aplique o teste.'],
    ['• Verifique a exceção.', 'Verifique a exceção.'],
    ['SE SIM: use hífen -> encerre.', 'SE SIM: use hífen → encerre.'],
  ])('normaliza %s', (input, expected) => {
    expect(normalizeProcedureStepAction(input)).toBe(expected);
  });
});

describe('deriveSubDiagramHeader', () => {
  it('identifica passos e limpa títulos com sufixos', () => {
    const block: DiagramBlock = {
      type: 'diagram',
      title: 'Protocolo Mestre de Transposição (Voz Ativa -> Voz Passiva Analítica)',
      diagramType: 'sequence',
      structure: {
        schemaVersion: '2.0.0',
        visualType: 'sequence',
        layout: 'vertical',
        rootId: 'p2',
        nodes: [
          { id: 'p2', kind: 'process', label: 'Passo 2: Conversão do Sujeito (Protocolo Mestre)' },
        ],
        edges: [],
        provenance: dummyProvenance,
      },
    };

    const header = deriveSubDiagramHeader(block, 1, 5, 'Protocolo Mestre de Transposição (Voz Ativa -> Voz Passiva Analítica)');
    expect(header.badge).toBe('Passo 2');
    expect(header.title).toBe('Conversão do Sujeito');
  });

  it('atribui Visão Geral ao primeiro diagrama', () => {
    const block: DiagramBlock = {
      type: 'diagram',
      title: 'Sequência de Execução em 5 Passos',
      diagramType: 'sequence',
      structure: {
        schemaVersion: '2.0.0',
        visualType: 'sequence',
        layout: 'vertical',
        rootId: 'p1',
        nodes: [
          { id: 'p1', kind: 'process', label: 'Passo 1: Chamar o Feito à Ordem' },
        ],
        edges: [],
        provenance: dummyProvenance,
      },
    };

    const header = deriveSubDiagramHeader(block, 0, 5, 'Protocolo Mestre');
    expect(header.badge).toBe('Visão Geral');
    expect(header.title).toBe('Sequência de Execução em 5 Passos');
  });
});

describe('ResolutionSection — Composição de Mapas Relacionados', () => {
  const multiDiagramProcedure: ProcedureView = {
    procedureId: 'PROC-A05-G06-001',
    title: 'Protocolo Mestre de Transposição (Voz Ativa → Voz Passiva Analítica)',
    presentation: {
      status: 'source_backed',
      sourceKind: 'canonical_content_block',
      sourceEntityRefs: ['PROC-A05-G06-001'],
      renderStrategy: 'source_only',
      hideGenericScaffold: true,
    },
    blocks: [
      {
        type: 'heading',
        level: 3,
        text: 'Protocolo Mestre de Transposição',
      },
      {
        type: 'paragraph',
        text: 'Pré-requisito Obrigatório: Verificar se a oração possui VTD ou VTDI.',
      },
      {
        type: 'diagram',
        title: 'Sequência de Execução em 5 Passos',
        diagramType: 'sequence',
        text: 'Passo 1 -> Passo 2 -> Passo 3 -> Passo 4 -> Passo 5',
        structure: {
          schemaVersion: '2.0.0',
          visualType: 'sequence',
          layout: 'vertical',
          rootId: 'p1',
          structuredText: 'Sequência de Execução em 5 Passos:\n1. Chamar o feito\n2. Conversão',
          nodes: [
            { id: 'p1', kind: 'process', label: 'Passo 1: Chamar o Feito à Ordem no Enunciado' },
            { id: 'p2', kind: 'process', label: 'Passo 2: Conversão do Sujeito' },
          ],
          edges: [{ from: 'p1', to: 'p2', label: '' }],
          provenance: dummyProvenance,
        },
      },
      {
        type: 'diagram',
        title: 'Protocolo Mestre de Transposição (Voz Ativa → Voz Passiva Analítica)',
        diagramType: 'sequence',
        text: 'Passo 2: Conversão do Sujeito',
        structure: {
          schemaVersion: '2.0.0',
          visualType: 'sequence',
          layout: 'vertical',
          rootId: 'p2-start',
          structuredText: 'Passo 2: Conversão do Sujeito:\n- Isolar OD\n- Sujeito paciente estabelecido',
          nodes: [
            { id: 'p2-start', kind: 'process', label: 'Passo 2: Conversão do Sujeito (Protocolo Mestre)' },
            { id: 'p2-end', kind: 'result', label: 'Sujeito Paciente Estabelecido' },
          ],
          edges: [{ from: 'p2-start', to: 'p2-end', label: '' }],
          provenance: dummyProvenance,
        },
      },
      {
        type: 'diagram',
        title: 'Protocolo Mestre de Transposição (Voz Ativa → Voz Passiva Analítica)',
        diagramType: 'sequence',
        text: 'Passo 3: Montagem da Locução Passiva',
        structure: {
          schemaVersion: '2.0.0',
          visualType: 'sequence',
          layout: 'vertical',
          rootId: 'p3-start',
          structuredText: 'Passo 3: Montagem da Locução Passiva:\n- Auxiliar SER\n- Particípio',
          nodes: [
            { id: 'p3-start', kind: 'process', label: 'Passo 3: Montagem da Locução Passiva no Rascunho (Protocolo Mestre)' },
            { id: 'p3-end', kind: 'result', label: 'Locução Passiva Montada' },
          ],
          edges: [{ from: 'p3-start', to: 'p3-end', label: '' }],
          provenance: dummyProvenance,
        },
      },
    ],
  };

  it('renderiza o protocolo composto com toolbar compartilhada e sem cabeçalhos pretos repetidos', async () => {
    const user = userEvent.setup();
    render(<ResolutionSection procedures={[multiDiagramProcedure]} />);

    // 1. Título principal da seção e subtítulo
    expect(screen.getByText('Roteiros de Resolução')).toBeInTheDocument();
    expect(screen.getByText(/protocolo composto em 3 etapas estruturadas/i)).toBeInTheDocument();

    // 2. Toolbar única compartilhada no topo do protocolo
    const toolbar = screen.getByRole('tablist', { name: /modo de exibição do protocolo/i });
    expect(toolbar).toBeInTheDocument();
    expect(within(toolbar).getByRole('tab', { name: /visual/i })).toBeInTheDocument();
    expect(within(toolbar).getByRole('tab', { name: /estrutura textual/i })).toBeInTheDocument();
    expect(within(toolbar).getByRole('tab', { name: /fonte original/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar texto completo do protocolo/i })).toBeInTheDocument();

    // 3. Hierarquia pedagógica de passos
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Sequência de Execução em 5 Passos')).toBeInTheDocument();
    expect(screen.getByText('Passo 2')).toBeInTheDocument();
    expect(screen.getByText('Conversão do Sujeito')).toBeInTheDocument();
    expect(screen.getByText('Passo 3')).toBeInTheDocument();
    expect(screen.getByText('Montagem da Locução Passiva no Rascunho')).toBeInTheDocument();

    // 4. Pré-requisito renderizado normalmente
    expect(screen.getByText(/pré-requisito obrigatório/i)).toBeInTheDocument();

    // 5. Teste de alternância de abas na toolbar compartilhada
    await user.click(within(toolbar).getByRole('tab', { name: /estrutura textual/i }));
    expect(screen.getByText(/sequência de execução em 5 passos:/i)).toBeInTheDocument();
    expect(screen.getByText(/passo 2: conversão do sujeito:/i)).toBeInTheDocument();

    await user.click(within(toolbar).getByRole('tab', { name: /fonte original/i }));
    expect(screen.getByText('Passo 1 -> Passo 2 -> Passo 3 -> Passo 4 -> Passo 5')).toBeInTheDocument();
  });
});
