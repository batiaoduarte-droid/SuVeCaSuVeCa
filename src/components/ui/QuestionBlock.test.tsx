import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { QuestionBlock } from './QuestionBlock';

describe('QuestionBlock em modo de tentativa', () => {
  it('restaura tentativa após desmontagem e isola contas', async () => {
    const user = userEvent.setup();
    const props = { title: 'Persistência', options: [{ letter: 'A', text: 'Primeira' }, { letter: 'B', text: 'Segunda' }], answer: 'B', solution: 'Resolução preservada.', renderMarkdown: (text: string) => text };
    const first = render(<QuestionBlock {...props} attemptIdentity={{ questionId: 'persist-test', lessonId: 'A00', userId: 'guest' }} />);
    await user.click(screen.getByRole('button', { name: /Primeira/ }));
    await user.click(screen.getByRole('button', { name: /^Pouco Seguro/ }));
    await user.type(screen.getByRole('textbox'), 'Usei o critério da aula.');
    await user.click(screen.getByRole('button', { name: /Confirmar tentativa/ }));
    first.unmount();
    const second = render(<QuestionBlock {...props} attemptIdentity={{ questionId: 'persist-test', lessonId: 'A00', userId: 'guest' }} />);
    expect(screen.getByText('Resolução preservada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Primeira/ })).toHaveAttribute('aria-pressed', 'true');
    second.rerender(<QuestionBlock {...props} attemptIdentity={{ questionId: 'persist-test', lessonId: 'A00', userId: 'other-user' }} />);
    expect(screen.queryByText('Resolução preservada.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Selecione uma resposta/ })).toBeDisabled();
    localStorage.removeItem('suveca_reading_attempts_v1_guest');
  });
  it('não expõe resposta antes de seleção e confirmação', async () => {
    const user = userEvent.setup();
    render(
      <QuestionBlock
        title="Questão de teste"
        prompt="Qual alternativa está correta?"
        options={[{ letter: 'A', text: 'Distrator' }, { letter: 'B', text: 'Resposta' }]}
        answer="B"
        solution="Justificativa decisiva."
        renderMarkdown={(text) => text}
      />,
    );

    const confirm = screen.getByRole('button', { name: /selecione uma resposta/i });
    expect(confirm).toBeDisabled();
    expect(screen.queryByText(/justificativa decisiva/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^B\s*Resposta$/i }));
    expect(screen.getByRole('button', { name: /confirmar tentativa/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /confirmar tentativa/i }));

    expect(screen.getByText(/justificativa decisiva/i)).toBeVisible();
    expect(screen.getByText(/gabarito oficial:/i)).toBeVisible();
    expect(screen.getAllByText(/^B$/).length).toBeGreaterThan(0);
  });

  it('não revela gabarito quando a questão não tem alternativas', async () => {
    const user = userEvent.setup();
    render(
      <QuestionBlock
        title="Questão incompleta"
        prompt="Assinale a alternativa correta."
        options={[]}
        answer="E"
        solution="Conteúdo protegido até uma tentativa válida."
        interactionUnavailableReason="Alternativas incompletas."
        renderMarkdown={(text) => text}
      />,
    );

    const unavailable = screen.getByRole('button', { name: /tentativa indisponível/i });
    expect(unavailable).toBeDisabled();
    expect(screen.getByText(/alternativas incompletas/i)).toBeVisible();
    await user.click(unavailable);
    expect(screen.queryByText(/conteúdo protegido/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gabarito oficial/i)).not.toBeInTheDocument();
  });

  it('aceita apresentação estruturada no lugar do enunciado plano', () => {
    render(
      <QuestionBlock
        title="Questão estruturada"
        prompt="Texto plano que não deve aparecer"
        promptContent={<div>Texto de apoio e comando separados</div>}
        options={[{ letter: 'A', text: 'Resposta' }]}
        answer="A"
        renderMarkdown={(text) => text}
      />,
    );

    expect(screen.getByText('Texto de apoio e comando separados')).toBeVisible();
    expect(screen.queryByText('Texto plano que não deve aparecer')).not.toBeInTheDocument();
  });
});
