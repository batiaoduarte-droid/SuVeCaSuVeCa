import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DecisionTreeViewer } from './DecisionTreeViewer';

const payload = {
  schemaVersion: '4.0.0',
  buildId: 'test-build',
  count: 2,
  procedures: [
    {
      id: 'decision:one',
      unitId: 'IP-A00-G01',
      lessonId: 'A00',
      groupId: 'G01',
      moduleId: 'mod0',
      topic: 'Fonética e Fonologia',
      canonicalTopicId: 'pt:a00:fonetica',
      title: 'Contar letras e fonemas',
      markdown: '### Procedimento\n\n1. Conte os grafemas.\n2. Aplique os ajustes fonéticos.',
      sourceText: 'Contar letras → verificar dígrafos → calcular fonemas',
      structure: {
        schemaVersion: '2.0.0',
        visualType: 'sequence',
        layout: 'vertical',
        rootId: 'count',
        nodes: [
          { id: 'count', kind: 'process', label: 'Contar letras', details: [] },
          { id: 'digraphs', kind: 'process', label: 'Verificar dígrafos', details: [] },
          { id: 'result', kind: 'formula', label: 'Calcular fonemas', details: [] },
        ],
        edges: [
          { from: 'count', to: 'digraphs', label: '' },
          { from: 'digraphs', to: 'result', label: '' },
        ],
        provenance: {
          sourceFormat: 'ascii',
          classificationMethod: 'deterministic_projection',
          reviewStatus: 'source_backed',
          confidence: 0.95,
        },
      },
      sourceRefs: ['EDITORIAL:IP-A00-G01'],
    },
    {
      id: 'decision:two',
      unitId: 'IP-A10-G06',
      lessonId: 'A10',
      groupId: 'G06',
      moduleId: 'mod10',
      topic: 'Crase',
      canonicalTopicId: 'pt:a10:crase',
      title: 'Aplicar o teste da crase',
      markdown: '### Procedimento\n\n1. Verifique a regência.\n2. Teste a presença do artigo.',
      sourceRefs: ['EDITORIAL:IP-A10-G06'],
    },
  ],
};

describe('DecisionTreeViewer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carrega a base editorial e permite selecionar um roteiro', async () => {
    const user = userEvent.setup();
    render(<DecisionTreeViewer />);

    expect(screen.getByRole('status')).toHaveTextContent(/carregando roteiros/i);
    expect(await screen.findByRole('heading', { level: 2, name: /contar letras e fonemas/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar nos roteiros/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tema curricular/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^tema$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sequência de análise/i)).toBeInTheDocument();

    const results = screen.getByRole('navigation', { name: /roteiros de resolução encontrados/i });
    const crase = within(results).getByRole('button', { name: /aplicar o teste da crase/i });
    await user.click(crase);
    expect(screen.getByRole('heading', { level: 2, name: /aplicar o teste da crase/i })).toBeInTheDocument();
    expect(screen.getByText(/verifique a regência/i)).toBeInTheDocument();
  });

  it('filtra por texto e por tema curricular sem expor os identificadores editoriais', async () => {
    const user = userEvent.setup();
    render(<DecisionTreeViewer />);
    await screen.findByRole('heading', { level: 2, name: /contar letras e fonemas/i });

    await user.type(screen.getByLabelText(/buscar nos roteiros/i), 'artigo');
    const results = screen.getByRole('navigation', { name: /roteiros de resolução encontrados/i });
    expect(within(results).getAllByRole('button')).toHaveLength(1);
    expect(within(results).getByRole('button', { name: /crase/i })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/buscar nos roteiros/i));
    await user.selectOptions(screen.getByLabelText(/tema curricular/i), 'A00');
    expect(within(results).getAllByRole('button')).toHaveLength(1);
    expect(within(results).getByRole('button', { name: /fonética e fonologia/i })).toBeInTheDocument();
    expect(screen.queryByText(/IP-A|G0[16]|EDITORIAL:/)).not.toBeInTheDocument();
  });

  it('alterna para o Modo Foco em largura total com resultados em faixa horizontal e sem modal', async () => {
    const user = userEvent.setup();
    render(<DecisionTreeViewer />);
    await screen.findByRole('heading', { level: 2, name: /contar letras e fonemas/i });

    // In normal mode: sidebar results is present
    expect(screen.getByTestId('sidebar-results')).toBeInTheDocument();
    expect(screen.queryByTestId('focus-results-strip')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const focusButton = screen.getByRole('button', { name: /modo foco/i });
    expect(focusButton).toBeInTheDocument();

    // Click focus mode
    await user.click(focusButton);

    // Verify no dialog / modal / overlay
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Verify results repositioned into horizontal strip above the procedure
    expect(screen.getByTestId('focus-results-strip')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-results')).not.toBeInTheDocument();

    // Verify selected procedure is preserved and heading is visible
    expect(screen.getByRole('heading', { level: 2, name: /contar letras e fonemas/i })).toBeInTheDocument();

    // Verify restore button is available
    const restoreButton = screen.getByRole('button', { name: /restaurar/i });
    expect(restoreButton).toBeInTheDocument();

    // Test restoring via button
    await user.click(restoreButton);
    expect(screen.getByTestId('sidebar-results')).toBeInTheDocument();
    expect(screen.queryByTestId('focus-results-strip')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /contar letras e fonemas/i })).toBeInTheDocument();

    // Test entering focus mode and exiting via Escape key
    await user.click(screen.getByRole('button', { name: /modo foco/i }));
    expect(screen.getByTestId('focus-results-strip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('sidebar-results')).toBeInTheDocument();
    expect(screen.queryByTestId('focus-results-strip')).not.toBeInTheDocument();
  });
});
