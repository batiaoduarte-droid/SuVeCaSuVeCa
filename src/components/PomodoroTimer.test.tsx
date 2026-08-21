import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroTimer } from './PomodoroTimer';

vi.mock('../lib/firebase', () => ({ db: {}, doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  setDoc: vi.fn(async () => undefined),
}));

describe('PomodoroTimer persistente', () => {
  beforeEach(() => localStorage.clear());

  it('minimiza, mantém o mini-painel e restaura a página', () => {
    const onMinimize = vi.fn();
    const onExpandTab = vi.fn();
    const { rerender } = render(
      <PomodoroTimer isPageActive onMinimize={onMinimize} onExpandTab={onExpandTab} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /minimizar/i }));
    expect(onMinimize).toHaveBeenCalledOnce();

    rerender(<PomodoroTimer isPageActive={false} onMinimize={onMinimize} onExpandTab={onExpandTab} />);
    expect(screen.getByRole('region', { name: /mini-painel/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Expandir Cronômetro'));
    expect(onExpandTab).toHaveBeenCalledOnce();
    rerender(<PomodoroTimer isPageActive onMinimize={onMinimize} onExpandTab={onExpandTab} />);
    expect(screen.getByRole('heading', { name: /cronômetro de foco pomodoro/i })).toBeInTheDocument();
  });
});
