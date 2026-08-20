import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PedagogicalDeepDive } from './ModuleViewer';

describe('aprofundamento pedagógico', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('não aborta uma resposta lenta ao entrar no estado de carregamento', async () => {
    let resolveFetch!: (response: Response) => void;
    let requestSignal: AbortSignal | undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal || undefined;
      return pendingResponse;
    }));

    render(
      <PedagogicalDeepDive
        section={{
          title: 'Estudo da Sílaba - Teoria',
          contentMarkdown: 'Resumo',
          contentUrl: '/knowledge/pedagogical/units/teste-resposta-lenta.md',
          estimatedMinutes: 22,
        }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /abrir unidade pedagógica completa/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando aprofundamento');
    expect(requestSignal?.aborted).toBe(false);

    await act(async () => {
      resolveFetch({
        ok: true,
        text: async () => '# Conteúdo aprofundado carregado',
      } as Response);
      await pendingResponse;
    });

    expect(await screen.findByRole('heading', { name: 'Conteúdo aprofundado carregado' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('carrega uma View Model v4.2 pelo renderer nativo', async () => {
    const view = {
      viewSchemaVersion: '4.2.0-semantic-authoring',
      source: { unitId: 'IP-A02-G01' },
      unit: {
        unitId: 'IP-A02-G01',
        lessonId: 'A02',
        title: 'Classes de Palavras',
        learningObjectives: ['Distinguir classes por critérios formais.'],
      },
      sections: {
        explanation: { groups: [{ title: 'Modelo mental', blocks: [{ type: 'paragraph', text: 'Conteúdo semântico nativo.' }] }] },
      },
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => view })));

    render(
      <PedagogicalDeepDive
        section={{
          title: 'Classes antigas',
          contentMarkdown: 'Resumo legado',
          contentUrl: '/knowledge/pedagogical/units/a02-g01.md',
          editorial: {
            integrationUnitId: 'IP-A02-G01',
            reviewVersion: 'test',
            changeType: 'expand',
            evidenceRefs: [],
          },
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /abrir unidade pedagógica completa/i }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Classes de Palavras' })).toBeVisible();
    expect(screen.getByText('Conteúdo semântico nativo.')).toBeVisible();
    expect(screen.queryByText('Resumo legado')).not.toBeInTheDocument();
  });

  it('falha fechado quando a identidade da View Model integrada diverge', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        viewSchemaVersion: '4.2.0-hardened',
        unit: { unitId: 'IP-A03-G02', lessonId: 'A03', title: 'Unidade indevida' },
        sections: { explanation: {} },
      }),
    })));

    render(
      <PedagogicalDeepDive
        section={{
          title: 'Unidade esperada',
          contentMarkdown: 'Não deve aparecer',
          contentUrl: '/knowledge/pedagogical/units/a03-g01.md',
          editorial: {
            integrationUnitId: 'IP-A03-G01',
            reviewVersion: 'test',
            changeType: 'expand',
            evidenceRefs: [],
          },
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /abrir unidade pedagógica completa/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
    expect(screen.queryByText('Não deve aparecer')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
