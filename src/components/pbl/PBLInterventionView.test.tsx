import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { InterventionPayload } from '../../types/pbl';
import { PBLInterventionView } from './PBLInterventionView';

const intervention: InterventionPayload = {
  interventionId: 'INT-1',
  competencyRef: 'COMP-1',
  microLessonText: 'Localize o núcleo antes de classificar o termo.',
  ruleTitle: 'Teste do núcleo',
  ruleStatement: 'O núcleo determina a relação sintática.',
  procedureSteps: ['Localize o verbo.', 'Pergunte quem pratica a ação.'],
  contrastingPoleA: 'O sujeito concorda com o verbo.',
  contrastingPoleB: 'O termo vizinho nem sempre é o sujeito.',
  workedExample: {
    stem: 'Chegaram os convidados.',
    stepByStep: ['Localize chegaram.', 'Pergunte quem chegou.'],
    resolution: 'Os convidados é o sujeito posposto.',
  },
};

describe('PBLInterventionView', () => {
  it('oferece scaffolding graduado e só revela a resolução no apoio completo', async () => {
    const user = userEvent.setup();
    const onAssistanceChange = vi.fn();
    render(
      <PBLInterventionView
        intervention={intervention}
        onAssistanceChange={onAssistanceChange}
        onReattempt={vi.fn()}
      />
    );

    expect(screen.getByText('Pista decisiva')).toBeInTheDocument();
    expect(screen.queryByText('Localize o verbo.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Os convidados é o sujeito/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ver procedimento e contraste/i }));
    expect(screen.getByText('Localize o verbo.')).toBeInTheDocument();
    expect(onAssistanceChange).toHaveBeenLastCalledWith('partial');

    await user.click(screen.getByRole('button', { name: /ver exemplo resolvido/i }));
    expect(screen.getByText(/Os convidados é o sujeito/)).toBeInTheDocument();
    expect(onAssistanceChange).toHaveBeenLastCalledWith('full');
  });

  it('informa o nível efetivamente usado ao iniciar a nova aplicação', async () => {
    const user = userEvent.setup();
    const onReattempt = vi.fn();
    render(
      <PBLInterventionView
        intervention={intervention}
        initialAssistanceLevel="partial"
        onReattempt={onReattempt}
      />
    );

    await user.click(screen.getByRole('button', { name: /aplicar sem apoio visível/i }));
    expect(onReattempt).toHaveBeenCalledWith('partial');
  });
});
