import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfessorSuvecaModal } from './ProfessorSuvecaModal';
import { professorTimeoutMs } from '../lib/geminiTaskMapping';

vi.mock('../lib/authenticatedFetch', () => ({
  authenticatedFetch: (input: string, init?: RequestInit) => fetch(input, init),
}));

describe('ProfessorSuvecaModal', () => {
  it('sends the selected agent and shows its generation status while waiting', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Modelo de resposta' }), 'antigravity-preview-09-2026');
    await user.type(screen.getByRole('textbox', { name: /dúvida/i }), 'Explique a regra');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Antigravity (Agente 3.8 Flash) está gerando a resposta');
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).model).toBe('antigravity-preview-09-2026');
    unmount();
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        answerMarkdown: '**Objeto direto** completa o verbo.\n\n| Teste | Resultado |\n|---|---|\n| o quê? | objeto |\n\n[PASSAGE:source:abc#1-20]',
        sourceRefs: ['PASSAGE:source:abc#1-20'],
      }),
    })));
  });

  it('renderiza Markdown e nunca mostra os identificadores internos', async () => {
    const user = userEvent.setup();
    render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} initialContext="Sintaxe" />);

    await user.type(screen.getByRole('textbox', { name: /dúvida/i }), 'O que é objeto direto?');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText('Objeto direto')).toHaveProperty('tagName', 'STRONG');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Esta resposta ajudou?')).toBeInTheDocument();
    expect(screen.queryByText(/PASSAGE:|QUESTION:|KB:/i)).not.toBeInTheDocument();
  });

  it('envia os últimos turnos na pergunta de continuação', async () => {
    const user = userEvent.setup();
    render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: /dúvida/i });

    await user.type(input, 'Explique o objeto direto');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    await screen.findByText('Objeto direto');
    await user.type(input, 'E como diferencio do indireto?');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    const request = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(request.history).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'user', text: 'Explique o objeto direto' }),
      expect.objectContaining({ role: 'assistant', text: expect.stringContaining('Objeto direto') }),
    ]));
  });

  it('preserva a pergunta e reenvia o mesmo pedido sem duplicar mensagens ou incluir o erro no histórico', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Professor temporariamente indisponível.', code: 'AI_UNAVAILABLE' }) } as Response);
    render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} initialContext="Sintaxe" />);
    await user.type(screen.getByRole('textbox', { name: /dúvida/i }), 'Minha pergunta preservada');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    expect(await screen.findByText('Professor temporariamente indisponível.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText('Objeto direto');
    expect(screen.getAllByText('Minha pergunta preservada')).toHaveLength(1);
    expect(screen.queryByText('Professor temporariamente indisponível.')).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(vi.mocked(fetch).mock.calls[1][1]?.body);
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('limita a espera total, aborta a chamada e oferece nova tentativa', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /dúvida/i }), { target: { value: 'Pergunta com timeout' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    await act(async () => { await vi.advanceTimersByTimeAsync(professorTimeoutMs('gemini-3.1-flash-lite') + 5000); });
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(screen.getByText(/demorou mais que o esperado/i)).toBeInTheDocument();
    expect(screen.getByText('Pergunta com timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
    expect(screen.queryByText(/formulando a explicação/i)).not.toBeInTheDocument();
  });

  it('allows retrying a preserved question with another selected model', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Indisponível' }) } as Response);
    render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox', { name: /dúvida/i }), 'Pergunta preservada');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    await screen.findByRole('button', { name: 'Tentar novamente' });
    await user.selectOptions(screen.getByRole('combobox'), 'gemini-3.5-flash-lite');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText('Objeto direto');
    const request = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(request).toMatchObject({ model: 'gemini-3.5-flash-lite', question: 'Pergunta preservada' });
    expect(screen.getAllByText('Pergunta preservada')).toHaveLength(1);
  });

  it('descarta resposta atrasada após reiniciar a conversa', async () => {
    const user = userEvent.setup();
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox', { name: /dúvida/i }), 'Pergunta antiga');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    await user.click(screen.getByRole('button', { name: /reiniciar conversa/i }));
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => resolve({ ok: true, json: async () => ({ answerMarkdown: 'Resposta antiga' }) } as Response));
    expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument();
    expect(screen.queryByText('Pergunta antiga')).not.toBeInTheDocument();
  });

  it('cancela ao fechar e permite retomar a pergunta ao reabrir', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    const close = vi.fn();
    const { rerender } = render(<ProfessorSuvecaModal isOpen onClose={close} />);
    await user.type(screen.getByRole('textbox', { name: /dúvida/i }), 'Pergunta interrompida');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    rerender(<ProfessorSuvecaModal isOpen={false} onClose={close} />);
    await act(async () => {});
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    rerender(<ProfessorSuvecaModal isOpen onClose={close} />);
    expect(screen.getByText('Pergunta interrompida')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText('Objeto direto');
    expect(screen.getAllByText('Pergunta interrompida')).toHaveLength(1);
  });

  it('preserva o pedido interrompido quando App desmonta e remonta o modal', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    const first = render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /reiniciar conversa/i }));
    await user.type(screen.getByRole('textbox', { name: /dúvida/i }), 'Pedido antes de desmontar');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    first.unmount();
    await act(async () => {});
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    render(<ProfessorSuvecaModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText('Pedido antes de desmontar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText('Objeto direto');
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(vi.mocked(fetch).mock.calls[1][1]?.body);
    expect(screen.getAllByText('Pedido antes de desmontar')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /reiniciar conversa/i }));
  });
});
