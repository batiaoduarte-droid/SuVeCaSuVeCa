import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecallSection } from './RecallSection';

describe('RecallSection', () => {
  beforeEach(() => localStorage.clear());

  it('exige tentativa antes da autoavaliação e persiste o domínio por unidade', async () => {
    const user = userEvent.setup();
    const props = {
      unitId: 'IP-A00-G01',
      prompts: [{ promptId: 'R1', question: 'Explique a diferença.', keyPoints: ['Ponto decisivo'] }],
    };
    const first = render(<RecallSection {...props} />);
    expect(screen.getByRole('button', { name: /dominado/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /já respondi/i }));
    await user.click(screen.getByRole('button', { name: /dominado/i }));
    expect(screen.getByText(/1 de 1 dominados \(100%\)/i)).toBeVisible();

    first.unmount();
    render(<RecallSection {...props} />);
    expect(screen.getByText(/1 de 1 dominados \(100%\)/i)).toBeVisible();
  });
});
