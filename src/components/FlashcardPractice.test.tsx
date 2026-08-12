import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashcardPractice } from './FlashcardPractice';

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
});
