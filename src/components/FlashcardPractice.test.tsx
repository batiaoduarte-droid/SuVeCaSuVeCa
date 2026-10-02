import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashcardPractice } from './FlashcardPractice';
import { EDITORIAL_FLASHCARDS } from '../data/editorialFlashcards.generated';
import { readStoredFlashcards, readCardEvents } from '../lib/flashcardStore';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { DailyReviewDashboard } from './DailyReviewDashboard';
vi.mock('../lib/authenticatedFetch', () => ({ authenticatedFetch: vi.fn() }));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  isLocalAuthActive: () => true,
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
  it('encerra a revisão do último cartão devido sem duplicar XP', async () => {
    const user = userEvent.setup(), onCorrectAnswer = vi.fn();
    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} onCorrectAnswer={onCorrectAnswer} />);
    await user.click(await screen.findByRole('button', { name: /mostrar resposta/i }));
    await user.click(screen.getByRole('button', { name: /^bom$/i }));
    await user.click(screen.getByRole('button', { name: 'Concluir revisão' }));
    expect(screen.getByText(/Revisão concluída: 1 avaliação/)).toBeVisible();
    expect(screen.getByRole('heading', { name: /Nenhum card do Caderno está devido/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /mostrar resposta/i })).not.toBeInTheDocument();
    expect(onCorrectAnswer).toHaveBeenCalledOnce();
  });

  it('permite continuar quando resta outro cartão devido', async () => {
    const saved = JSON.parse(localStorage.getItem('suveca_flashcards_guest')!);
    localStorage.setItem('suveca_flashcards_guest', JSON.stringify([...saved, { ...saved[0], id: 'card-2', front: 'Outra pergunta' }]));
    const user = userEvent.setup();
    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: /mostrar resposta/i }));
    await user.click(screen.getByRole('button', { name: /^bom$/i }));
    await user.click(screen.getByRole('button', { name: /^Próximo$/i }));
    expect(screen.getByRole('button', { name: /mostrar resposta/i })).toBeVisible();
    expect(screen.queryByText(/Revisão concluída/)).not.toBeInTheDocument();
  });
  it('limita a unidade aberta e permite incluir a aula inteira', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<FlashcardPractice errors={[]} onUpdateErrorStatus={vi.fn()} editorialModuleId="mod0" editorialUnitId="IP-A00-G05" />);
    const count = EDITORIAL_FLASHCARDS.filter(card => card.sourceRefs.some(ref => ref === 'EDITORIAL:IP-A00-G05')).length;
    expect(screen.getByRole('button', { name: `Base desta unidade (${count}/${count})` })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Incluir todas as unidades/ }));
    const whole = EDITORIAL_FLASHCARDS.filter(card => card.moduleId === 'mod0').length;
    expect(screen.getByRole('button', { name: `Base desta aula (${whole}/${whole})` })).toBeInTheDocument();
  });
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('gera, revisa, reabre e encontra o card agendado na biblioteca, sem voltar a pendente', async () => {
    localStorage.clear();
    vi.mocked(authenticatedFetch).mockResolvedValue(new Response(JSON.stringify({ flashcards: [{ front: 'Pergunta gerada?', back: 'Resposta gerada.', explanation: 'Explicação.' }] }), { status: 200 }));
    const user = userEvent.setup();
    const first = render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Gerar IA' }));
    await user.click(await screen.findByRole('button', { name: 'Mostrar resposta' }));
    await user.click(screen.getByRole('button', { name: 'Bom' }));
    first.unmount();
    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Meu Caderno (0/1)' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Gerar cards pendentes/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Biblioteca e histórico' }));
    expect(screen.getByText('Pergunta gerada?')).toBeVisible();
    expect(screen.getByText(/Próxima revisão:/)).toBeVisible();
    expect(readCardEvents().filter(e => e.kind === 'review')).toHaveLength(1);
  });

  it('revisão diária usa os mesmos cards sem regravar os snapshots legados', async () => {
    const original = localStorage.getItem('suveca_flashcards_guest');
    const user = userEvent.setup();
    const first = render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Mostrar resposta' }));
    await user.click(screen.getByRole('button', { name: 'Bom' }));
    first.unmount();
    render(<DailyReviewDashboard errors={[error]} onOpenErrors={vi.fn()} />);
    expect(readStoredFlashcards().find(c => c.id === 'card-1')?.correctCount).toBe(1);
    expect(localStorage.getItem('suveca_flashcards_guest')).toBe(original);
  });

  it.each([
    ['2026-10-01T00:30:00.000Z', '1/10'],
    ['2026-09-30T02:30:00.000Z', '0/10'],
  ])('conta a revisão %s pelo dia local, sem trocar a data à meia-noite UTC', (lastReviewedAt, expected) => {
    vi.stubEnv('TZ', 'America/Sao_Paulo');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-30T21:45:00-03:00'));
    try {
      const [saved] = JSON.parse(localStorage.getItem('suveca_flashcards_guest')!);
      localStorage.setItem('suveca_flashcards_guest', JSON.stringify([{ ...saved, lastReviewedAt, correctCount: 1 }]));
      render(<DailyReviewDashboard errors={[error]} onOpenErrors={vi.fn()} />);
      expect(screen.getByText('cards revisados').parentElement).toHaveTextContent(expected);
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });

  it('preserva card órfão, permite vincular e mantém a consulta fora do agendamento', async () => {
    const user = userEvent.setup(), onCorrectAnswer = vi.fn();
    render(<FlashcardPractice errors={[{ ...error, id: 'new-origin' }]} onUpdateErrorStatus={vi.fn()} onCorrectAnswer={onCorrectAnswer} />);
    await user.click(screen.getByRole('button', { name: 'Biblioteca e histórico' }));
    expect(screen.getByText(/registro de origem não está/)).toBeVisible();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Vincular ao Caderno' }), 'new-origin');
    await user.click(screen.getByRole('button', { name: 'Estudar livremente' }));
    await user.click(screen.getByRole('button', { name: 'Mostrar resposta' }));
    expect(screen.queryByRole('button', { name: 'Bom' })).not.toBeInTheDocument();
    expect(onCorrectAnswer).not.toHaveBeenCalled();
    expect(readStoredFlashcards().find(c => c.id === 'card-1')).toMatchObject({ errorId: 'new-origin', correctCount: 0 });
    expect(readStoredFlashcards().find(c => c.id === 'card-1')?.nextReviewAt).toBeUndefined();
  });

  it('substituir cancela sem chamar IA e preserva o histórico quando confirmado', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Substituir' }));
    expect(authenticatedFetch).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    vi.mocked(authenticatedFetch).mockResolvedValue(new Response(JSON.stringify({ flashcards: [{ front: 'Nova pergunta?', back: 'Nova resposta.' }] }), { status: 200 }));
    await user.click(screen.getByRole('button', { name: 'Substituir' }));
    await screen.findByText(/1 novo\(s\) card/);
    const saved = readStoredFlashcards().filter(c => c.source === 'caderno');
    expect(saved).toHaveLength(2);
    expect(saved.find(c => c.id === 'card-1')?.archived).toBe(true);
    confirm.mockRestore();
  });

  it.each([true, false])('substituir preserva o card repetido e seu agendamento (com novo card: %s)', async (includeNewCard) => {
    const [original] = JSON.parse(localStorage.getItem('suveca_flashcards_guest')!);
    const retained = {
      ...original, back: 'Porque é impessoal.', correctCount: 3,
      lastReviewedAt: '2026-09-29T10:00:00.000Z', nextReviewAt: '2099-10-01T10:00:00.000Z',
    };
    localStorage.setItem('suveca_flashcards_guest', JSON.stringify([
      retained,
      { ...original, id: 'card-2', front: 'Pergunta anterior removida?', back: 'Resposta anterior.' },
    ]));
    const responseCards = [
      { front: retained.front, back: retained.back },
      ...(includeNewCard ? [{ front: 'Nova pergunta?', back: 'Nova resposta.' }] : []),
    ];
    vi.mocked(authenticatedFetch).mockResolvedValue(new Response(JSON.stringify({ flashcards: responseCards }), { status: 200 }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    try {
      const user = userEvent.setup();
      render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'Substituir' }));
      await screen.findByText(new RegExp(`${includeNewCard ? 1 : 0} novo\\(s\\) card`));
      const cards = readStoredFlashcards().filter(card => card.source === 'caderno');
      expect(cards.filter(card => !card.archived)).toHaveLength(includeNewCard ? 2 : 1);
      expect(cards.find(card => card.id === retained.id)).toMatchObject({
        front: retained.front, back: retained.back, correctCount: 3,
        lastReviewedAt: retained.lastReviewedAt, nextReviewAt: retained.nextReviewAt,
      });
      expect(cards.find(card => card.id === retained.id)?.archived).not.toBe(true);
      expect(cards.find(card => card.id === 'card-2')?.archived).toBe(true);
      expect(readCardEvents().filter(event => event.kind === 'snapshot' && event.card?.front === retained.front)).toHaveLength(1);
    } finally {
      confirm.mockRestore();
    }
  });

  it('falha de escrita local impede XP e informa que o salvamento não foi concluído', async () => {
    const user = userEvent.setup(), onCorrectAnswer = vi.fn();
    render(<FlashcardPractice errors={[error]} onUpdateErrorStatus={vi.fn()} onCorrectAnswer={onCorrectAnswer} />);
    await user.click(screen.getByRole('button', { name: 'Mostrar resposta' }));
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Armazenamento cheio'); });
    await user.click(screen.getByRole('button', { name: 'Bom' }));
    expect(onCorrectAnswer).not.toHaveBeenCalled();
    expect(screen.getByText('Armazenamento cheio')).toBeVisible();
    write.mockRestore();
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
