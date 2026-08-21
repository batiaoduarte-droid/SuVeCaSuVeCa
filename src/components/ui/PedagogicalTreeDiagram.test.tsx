import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseTreeDiagram, PedagogicalTreeDiagram } from './PedagogicalTreeDiagram';

describe('PedagogicalTreeDiagram', () => {
  const decisionSource = `TESTE DO PRONOME CUJO
1. A lacuna está entre dois substantivos?
NÃO -> ELIMINAR
SIM -> Prosseguir para o teste 2.`;

  it('classifica decisões e escolhe fluxo como visualização inicial', () => {
    expect(parseTreeDiagram(decisionSource).kind).toBe('decision');
    render(<PedagogicalTreeDiagram source={decisionSource} />);
    expect(screen.getByRole('tab', { name: /fluxo/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('list', { name: /fluxo de decisão/i })).toBeInTheDocument();
  });

  it('mantém o texto-fonte acessível como fallback', () => {
    render(<PedagogicalTreeDiagram source={decisionSource} />);
    fireEvent.click(screen.getByRole('tab', { name: /texto-fonte/i }));
    expect(screen.getByText(/NÃO -> ELIMINAR/)).toBeInTheDocument();
  });
});
