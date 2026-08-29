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

  it('valida o conjunto completo antes de paginar e mantém no máximo cinco questões no DOM', async () => {
    const user = userEvent.setup();
    const questions = makeQuestions(12);
    const { container } = render(
      <OfficialQuestionsSection questions={questions} lessonId="A00" />,
    );

    expect(screen.getByText(/verificando a integridade/i)).toBeVisible();
    await waitFor(() => {
      expect(fetchNormalizedQuestionsByRefs).toHaveBeenLastCalledWith(
        questions.map((question) => question.officialQuestionId),
        'A00',
        expect.any(AbortSignal),
      );
    });
    await waitFor(() => expect(container.querySelectorAll('.question-block')).toHaveLength(5));
    expect(screen.getByText('Página 1 de 3. Exibindo 1–5 de 12 questões.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(container.querySelectorAll('.question-block')).toHaveLength(5);
    expect(screen.getByText('Página 2 de 3. Exibindo 6–10 de 12 questões.')).toBeVisible();
    expect(fetchNormalizedQuestionsByRefs).toHaveBeenCalledTimes(1);

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
    await screen.findByRole('button', { name: 'Próxima página' });
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

  it('omite da sequência praticável uma questão com fonte incompleta', async () => {
    const questions = makeQuestions(2);
    questions[0].questionPresentation = {
      status: 'source_incomplete',
      options: [],
      reason: 'Destaque tipográfico ausente.',
      sourcePayloadPreserved: true,
    };
    const { container } = render(
      <OfficialQuestionsSection questions={questions} lessonId="A00" />,
    );

    await waitFor(() => expect(container.querySelectorAll('.question-block')).toHaveLength(1));
    expect(screen.getByText(/1 questão foi omitida da prática/i)).toBeVisible();
    expect(screen.getByText(/Questões Oficiais de Prova \(1\)/i)).toBeVisible();
  });

  it('omite antes da paginação uma questão normalizada sem destaque tipográfico recuperável', async () => {
    const questions = makeQuestions(2);
    vi.mocked(fetchNormalizedQuestionsByRefs).mockResolvedValueOnce({
      [questions[0].officialQuestionId!]: {
        id: 'A00:aula.q0001',
        originalQuestionId: 'aula.q0001',
        prompt: 'A forma verbal destacada indica:',
        presentation: {
          schemaVersion: '1.0.0',
          supportBlocks: [],
          command: 'A forma verbal destacada indica:',
          mediaKind: 'none',
          displayMode: 'text_only',
          media: [],
          contextStatus: 'not_required',
          formattingStatus: 'source_missing',
          provenance: { kind: 'source_backed_question_presentation' },
        },
      },
    } as any);

    const { container } = render(
      <OfficialQuestionsSection questions={questions} lessonId="A00" />,
    );

    await waitFor(() => expect(container.querySelectorAll('.question-block')).toHaveLength(1));
    expect(screen.getByText(/1 questão foi omitida da prática/i)).toBeVisible();
    expect(screen.queryByText(/tentativa indisponível/i)).not.toBeInTheDocument();
  });

  it('separa texto de apoio e comando usando a apresentação estruturada', async () => {
    const questions = makeQuestions(1);
    vi.mocked(fetchNormalizedQuestionsByRefs).mockResolvedValueOnce({
      [questions[0].officialQuestionId!]: {
        id: 'A00:aula.q0001',
        primaryLessonId: 'A00',
        lessonIds: ['A00'],
        moduleIds: ['mod0'],
        originalQuestionId: 'aula.q0001',
        questionType: 'MULTIPLA_ESCOLHA',
        supportText: 'Texto-base legado.',
        prompt: 'Comando legado.',
        options: [
          { letter: 'A', label: 'A', text: 'Alternativa A' },
          { letter: 'B', label: 'B', text: 'Alternativa B' },
        ],
        correctAnswer: 'A',
        presentation: {
          schemaVersion: '1.0.0',
          supportBlocks: [{ type: 'paragraph', text: 'Texto de apoio estruturado.' }],
          command: 'Comando separado.',
          mediaKind: 'none',
          displayMode: 'text_only',
          media: [],
          contextStatus: 'not_required',
          formattingStatus: 'not_required',
          provenance: { kind: 'source_backed_question_presentation' },
        },
      },
    } as any);

    render(<OfficialQuestionsSection questions={questions} lessonId="A00" />);
    expect(await screen.findByText('Texto de apoio estruturado.')).toBeVisible();
    expect(screen.getByText('Comando separado.')).toBeVisible();
    expect(screen.getByText('Texto de apoio')).toBeVisible();
  });

  it('não repete no comando as alternativas projetadas como opções', async () => {
    const questions = makeQuestions(1);
    questions[0].prompt = 'Assinale a forma correta:\na) Alternativa A\nb) Alternativa B';
    questions[0].questionPresentation = {
      status: 'ready',
      stem: 'Assinale a forma correta:',
      options: [
        { label: 'A', text: 'Alternativa A' },
        { label: 'B', text: 'Alternativa B' },
      ],
      answer: 'A',
      sourceField: 'questionPayload.prompt+options',
      sourcePayloadPreserved: true,
    };

    render(<OfficialQuestionsSection questions={questions} lessonId="A00" />);

    expect(await screen.findByText('Assinale a forma correta:')).toBeVisible();
    expect(screen.queryByText(/Assinale a forma correta:\s*a\)/i)).not.toBeInTheDocument();
    expect(screen.getByText('Alternativa A')).toBeVisible();
    expect(screen.getByText('Alternativa B')).toBeVisible();
  });
});
