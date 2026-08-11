import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DECISION_TREES } from '../data/decisionTrees';
import { DecisionTreeViewer } from './DecisionTreeViewer';

describe('DecisionTreeViewer', () => {
  it('expõe controles explícitos e semântica de abas para todas as matrizes', () => {
    render(<DecisionTreeViewer />);
    expect(screen.getByRole('button', { name: /matrizes anteriores/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próximas matrizes/i })).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(Object.keys(DECISION_TREES).length);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabs[0].id);
  });

  it('troca de matriz com as teclas direcionais, Home e End', async () => {
    const user = userEvent.setup();
    render(<DecisionTreeViewer />);
    const tabs = screen.getAllByRole('tab');

    tabs[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();

    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(screen.getAllByRole('tab').at(-1)).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getAllByRole('tab').at(-1)!, { key: 'Home' });
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
  });
});
