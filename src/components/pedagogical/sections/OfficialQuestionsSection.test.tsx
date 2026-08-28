import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfficialQuestionView } from '../../../types/pedagogicalView';
import { fetchNormalizedQuestionsByRefs } from '../../../lib/officialQuestionsLoader';
import { OfficialQuestionsSection } from './OfficialQuestionsSection';

vi.mock('../../../lib/officialQuestionsLoader', () => ({
  fetchNormalizedQuestionsByRefs: vi.fn().mockResolvedValue({}),
}));

const makeQuestions = (count: number, lessonId = 'A00'): OfficialQuestionView[] =>
  Array.from({ length: count }, (_, index) => {
    const sourceQuestionId = `aula.q${String(index + 1).padStart(4, '0')}`;
    return {
      officialQuestionId: `OQ-${lessonId}-${sourceQuestionId}`,
      sourceQuestionId,
      lessonId,
      organization: `Banca ${index + 1}`,
      prompt: `Enunciado ${index + 1}`,
      options: [
        { label: 'A', text: 'Alternativa A' },
        { label: 'B', text: 'Alternativa B' },
      ],
      officialAnswer: 'A',
    };
  });

describe('OfficialQuestionsSection', () => {
  beforeEach(() => {
    vi.mocked(fetchNormalizedQuestionsByRefs).mockClear();
  });

  it('mantém no máximo cinco questões no DOM e carrega somente a página visível', async () => {
    const user = userEvent.setup();
    const questions = makeQuestions(12);
    const { container } = render(
      <OfficialQuestionsSection questions={questions} lessonId="A00" />,
    );

    expect(container.querySelectorAll('.question-block')).toHaveLength(5);
    expect(screen.getByText('Página 1 de 3. Exibindo 1–5 de 12 questões.')).toBeVisible();
    await waitFor(() => {
      expect(fetchNormalizedQuestionsByRefs).toHaveBeenLastCalledWith(
        questions.slice(0, 5).map((question) => question.officialQuestionId),
        'A00',
        expect.any(AbortSignal),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(container.querySelectorAll('.question-block')).toHaveLength(5);
    expect(screen.getByText('Página 2 de 3. Exibindo 6–10 de 12 questões.')).toBeVisible();
    await waitFor(() => {
      expect(fetchNormalizedQuestionsByRefs).toHaveBeenLastCalledWith(
        questions.slice(5, 10).map((question) => question.officialQuestionId),
        'A00',
        expect.any(AbortSignal),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(container.querySelectorAll('.question-block')).toHaveLength(2);
    expect(screen.getByText('Página 3 de 3. Exibindo 11–12 de 12 questões.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(container.querySelectorAll('.question-block')).toHaveLength(5);
  });

  it('reinicia o lote visível quando a unidade muda', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <OfficialQuestionsSection questions={makeQuestions(9, 'A00')} lessonId="A00" />,
    );
    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(container.querySelectorAll('.question-block')).toHaveLength(4);

    rerender(<OfficialQuestionsSection questions={makeQuestions(8, 'A01')} lessonId="A01" />);
    await waitFor(() => {
      expect(container.querySelectorAll('.question-block')).toHaveLength(5);
    });
    expect(screen.getByText('Página 1 de 2. Exibindo 1–5 de 8 questões.')).toBeVisible();
  });

  it('cancela o carregamento anterior ao trocar de unidade', async () => {
    let firstSignal: AbortSignal | undefined;
    vi.mocked(fetchNormalizedQuestionsByRefs).mockImplementationOnce(
      async (_refs, _lessonId, signal) => {
        firstSignal = signal;
        return {};
      },
    );
    const { rerender } = render(
      <OfficialQuestionsSection questions={makeQuestions(6, 'A00')} lessonId="A00" />,
    );
    await waitFor(() => expect(firstSignal).toBeDefined());

    rerender(<OfficialQuestionsSection questions={makeQuestions(6, 'A01')} lessonId="A01" />);
    expect(firstSignal?.aborted).toBe(true);
  });
});
