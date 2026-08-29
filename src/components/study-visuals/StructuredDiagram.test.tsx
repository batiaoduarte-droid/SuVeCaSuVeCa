import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StructuredDiagram } from './StructuredDiagram';

describe('StructuredDiagram', () => {
  const structure = {
    kind: 'sequence' as const,
    rootLabel: 'Algoritmo dos 3 passos',
    items: [
      { id: 'step-1', label: 'Achar a vogal temática', details: ['Identificar a vogal antes de -r.'] },
      { id: 'step-2', label: 'Achar a DMT', details: ['Isolar a desinência comum.'] },
      { id: 'step-3', label: 'Achar a DNP', details: ['Observar a pessoa solicitada.'] },
    ],
  };

  it('renderiza a sequência declarada sem inventar categorias genéricas', () => {
    render(<StructuredDiagram title="Explicação consolidada" source="ASCII original" structure={structure} />);
    expect(screen.getByRole('list', { name: /sequência de análise/i })).toBeInTheDocument();
    expect(screen.getByText('Achar a vogal temática')).toBeVisible();
    expect(screen.getByText('Achar a DMT')).toBeVisible();
    expect(screen.queryByText(/tópicos principais/i)).not.toBeInTheDocument();
  });

  it('preserva o texto-fonte em modo separado', () => {
    render(<StructuredDiagram title="Explicação consolidada" source="ASCII original" structure={structure} />);
    fireEvent.click(screen.getByRole('tab', { name: /texto-fonte/i }));
    expect(screen.getByText('ASCII original')).toBeVisible();
  });
});
