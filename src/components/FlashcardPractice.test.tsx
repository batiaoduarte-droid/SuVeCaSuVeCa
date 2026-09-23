import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashcardPractice } from './FlashcardPractice';
import { EDITORIAL_FLASHCARDS } from '../data/editorialFlashcards.generated';

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  onAuthStateChanged: (_auth: unknown, callback: (user: null) => void) => {
    callback(null);
    return () => undefined;
  },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

const error = {
  id: 'erro-1',
  date: '2026-08-11',
  conteudo: 'Verbo impessoal',
  erroCometido: 'Flexionei haver.',
  regraDecisiva: 'Haver existencial fica no singular.',
  novoExemplo: 'Há vagas.',
  status: 'dia0' as const,
};

describe('FlashcardPractice', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('suveca_flashcards_guest', JSON.stringify([{
      id: 'card-1',
      errorId: error.id,
      source: 'caderno',
      topic: error.conteudo,
      front: 'Por que haver fica no singular?',
      back: 'Porque é impessoal. [QUESTION:123]',
      hint: 'Pense no sentido de existir.',
      explanation: 'Não há sujeito. [PASSAGE:source:abc#1-20]',
      sourceRefs: ['PASSAGE:source:abc#1-20'],
      createdAt: '2026-08-11T00:00:00.000Z',
      correctCount: 0,
      incorrectCount: 0,
    }]));
  });

  it('mantém dica e explicação fechadas e não renderiza referências técnicas', async () => {
    const user = userEvent.setup();
    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);

    expect(screen.queryByText('Pense no sentido de existir.')).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /ver dica/i }));
    expect(screen.getByText('Pense no sentido de existir.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }));
    expect(screen.getByText('Porque é impessoal.')).toBeInTheDocument();
    expect(screen.queryByText('Não há sujeito.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ver explicação/i }));
    expect(screen.getByText('Não há sujeito.')).toBeInTheDocument();
    expect(screen.queryByText(/PASSAGE:|QUESTION:|KB:/i)).not.toBeInTheDocument();
  });

  it('filtra a base editorial pela aula quando usado dentro do módulo', async () => {
    const user = userEvent.setup();
    const moduleId = 'mod0';
    const expectedCards = EDITORIAL_FLASHCARDS.filter((card) => card.moduleId === moduleId).length;

    render(
      <FlashcardPractice
        errors={[]}
        onUpdateErrorStatus={vi.fn()}
        editorialModuleId={moduleId}
      />,
    );

    const moduleBaseButton = screen.getByRole('button', {
      name: new RegExp(`Base desta aula \\(${expectedCards}/${expectedCards}\\)`, 'i'),
    });
    expect(moduleBaseButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Base editorial \(209\/209\)/i })).not.toBeInTheDocument();

    await user.click(moduleBaseButton);
    expect(await screen.findByRole('button', { name: /mostrar resposta/i })).toBeVisible();
  });

  it('concede XP uma única vez quando a recordação é correta', async () => {
    const user = userEvent.setup();
    const onCorrectAnswer = vi.fn();
    render(
      <FlashcardPractice
        errors={[error]}
        onUpdateErrorStatus={vi.fn()}
        onCorrectAnswer={onCorrectAnswer}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /mostrar resposta/i }));
    await user.click(screen.getByRole('button', { name: /^bom$/i }));

    expect(onCorrectAnswer).toHaveBeenCalledTimes(1);
    expect(screen.getByText('+10 XP')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^bom$/i })).not.toBeInTheDocument();
  });

  it('não concede XP quando o usuário erra o flashcard', async () => {
    const user = userEvent.setup();
    const onCorrectAnswer = vi.fn();
    render(
      <FlashcardPractice
        errors={[error]}
        onUpdateErrorStatus={vi.fn()}
        onCorrectAnswer={onCorrectAnswer}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /mostrar resposta/i }));
    await user.click(screen.getByRole('button', { name: /errei/i }));

    expect(onCorrectAnswer).not.toHaveBeenCalled();
    expect(screen.queryByText(/\+10 XP/i)).not.toBeInTheDocument();
  });

  it('omite o botão de explicação quando back e explanation forem idênticos', async () => {
    const user = userEvent.setup();
    localStorage.setItem('suveca_flashcards_guest', JSON.stringify([{
      id: 'card-duplicado',
      errorId: error.id,
      source: 'caderno',
      topic: error.conteudo,
      front: 'Pergunta com explicação idêntica',
      back: 'Esta é a resposta exata.',
      explanation: 'Esta é a resposta exata.',
      createdAt: '2026-08-11T00:00:00.000Z',
      correctCount: 0,
      incorrectCount: 0,
    }]));

    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /mostrar resposta/i }));
    expect(screen.getByText('Esta é a resposta exata.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /explicação complementar/i })).not.toBeInTheDocument();
  });

  it('aplica penalidade de dica no SM-2 e exibe blocos semânticos de erro e correção', async () => {
    const user = userEvent.setup();
    localStorage.setItem('suveca_flashcards_guest', JSON.stringify([{
      id: 'card-pegadinha',
      errorId: error.id,
      source: 'caderno',
      topic: error.conteudo,
      front: 'Como evitar o erro de particípio?',
      back: 'Problema: Esquecer a elipse do verbo auxiliar. Forma Correta: Reconstruir o verbo ter ou haver.',
      hint: 'Pense na locução passiva com auxiliar oculto.',
      createdAt: '2026-08-11T00:00:00.000Z',
      correctCount: 0,
      incorrectCount: 0,
    }]));

    const onUpdateErrorStatus = vi.fn();
    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={onUpdateErrorStatus} onCorrectAnswer={vi.fn()} />);

    // Usa dica antes de responder (o que reduz a avaliação no SM-2)
    await user.click(await screen.findByRole('button', { name: /ver dica/i }));
    expect(screen.getByText('Pense na locução passiva com auxiliar oculto.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }));

    // Verifica blocos semânticos particionados
    expect(screen.getByText('Atenção ao Erro Comum')).toBeInTheDocument();
    expect(screen.getByText('Esquecer a elipse do verbo auxiliar.')).toBeInTheDocument();
    expect(screen.getByText('Forma Correta')).toBeInTheDocument();
    expect(screen.getByText('Reconstruir o verbo ter ou haver.')).toBeInTheDocument();

    // Seleciona "Difícil" (com dica, Difícil é penalizado para Errei / again no motor SM-2)
    await user.click(screen.getByRole('button', { name: /difícil/i }));

    // Verifica que o card recebeu agendamento com intervalo curto de reforço (penalizado para again)
    expect(screen.getByText(/Este cartão volta em cerca de 4 horas/i)).toBeInTheDocument();
  });

  it('renderiza os três blocos pedagógicos para o padrão O Erro / Por que ocorre / Como evitar e atualiza indicador de sessão', async () => {
    const user = userEvent.setup();
    localStorage.setItem('suveca_flashcards_guest', JSON.stringify([{
      id: 'card-haver-fazem',
      errorId: error.id,
      source: 'caderno',
      topic: 'Concordância Verbal',
      front: 'Qual erro deve ser evitado ao empregar haver e fazer?',
      back: 'O Erro: Escrever "Haviam muitas pessoas", "Fazem dez meses". Por que ocorre: No cotidiano informal, o falante transfere a concordância. Como evitar: Haver (= existir) e fazer (tempo) são estritamente impessoais: Havia muitas pessoas, Faz dez meses.',
      createdAt: '2026-08-11T00:00:00.000Z',
      correctCount: 0,
      incorrectCount: 0,
    }]));

    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);

    // Verifica indicador de sessão inicial
    expect(screen.getByText(/0 concluído\(s\) nesta sessão · 1 pendente\(s\)/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /mostrar resposta/i }));

    // Verifica os 3 blocos individualizados
    expect(screen.getByText('O Erro')).toBeInTheDocument();
    expect(screen.getByText('Escrever "Haviam muitas pessoas", "Fazem dez meses".')).toBeInTheDocument();

    expect(screen.getByText('Por que ocorre')).toBeInTheDocument();
    expect(screen.getByText('No cotidiano informal, o falante transfere a concordância.')).toBeInTheDocument();

    expect(screen.getByText('Como evitar')).toBeInTheDocument();
    expect(screen.getByText('Haver (= existir) e fazer (tempo) são estritamente impessoais: Havia muitas pessoas, Faz dez meses.')).toBeInTheDocument();

    // Avalia o card
    await user.click(screen.getByRole('button', { name: /^bom$/i }));

    // O indicador de sessão atualiza imediatamente
    expect(screen.getByText(/1 concluído\(s\) nesta sessão/i)).toBeInTheDocument();
  });
});
