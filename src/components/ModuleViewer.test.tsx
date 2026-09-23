import fs from 'node:fs';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PedagogicalDeepDive } from './ModuleViewer';
import { MODULES_DATA } from '../data/modulesData';
import type { ModuleSection } from '../types/suveca';

const section = (unitId: string): ModuleSection => ({
  title: 'Unidade de estudo',
  contentMarkdown: 'Resumo que não substitui a unidade',
  editorial: { integrationUnitId: unitId, reviewVersion: 'test', changeType: 'expand', evidenceRefs: [] },
});
const view = (unitId: string, title = 'Conteúdo aprofundado carregado') => ({
  viewSchemaVersion: '4.2.0-semantic-authoring',
  source: { unitId },
  unit: { unitId, lessonId: unitId.slice(3, 6), title, learningObjectives: ['Distinguir classes por critérios formais.'] },
  sections: { explanation: { groups: [{ title: 'Modelo mental', blocks: [{ type: 'paragraph', text: 'Conteúdo semântico nativo.' }] }] } },
});
const response = (data: unknown) => ({ ok: true, text: async () => JSON.stringify(data) }) as Response;

describe('aprofundamento pedagógico', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('carrega JSON sob demanda sem abortar uma resposta lenta e reutiliza o cache ao reabrir', async () => {
    let resolveFetch!: (response: Response) => void;
    let requestSignal: AbortSignal | undefined;
    const pendingResponse = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal || undefined;
      return pendingResponse;
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<PedagogicalDeepDive section={section('IP-A00-G01')} />);
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /abrir unidade pedagógica completa/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando aprofundamento');
    expect(requestSignal?.aborted).toBe(false);
    expect(fetchMock.mock.calls[0][0]).toBe('/knowledge/pedagogical/views/IP-A00-G01.json');

    await act(async () => { resolveFetch(response(view('IP-A00-G01'))); await pendingResponse; });
    expect(await screen.findByRole('heading', { name: 'Conteúdo aprofundado carregado' })).toBeVisible();
    expect(screen.getByText('Conteúdo semântico nativo.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /fechar aprofundamento/i }));
    await userEvent.click(screen.getByRole('button', { name: /abrir unidade pedagógica completa/i }));
    expect(screen.getByRole('heading', { name: 'Conteúdo aprofundado carregado' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['rede', 'HTTP', 'JSON', 'identidade'])('permite tentar novamente após falha de %s, sem buscar Markdown', async (failure) => {
    const unitId = `IP-A03-G0${['rede', 'HTTP', 'JSON', 'identidade'].indexOf(failure) + 1}`;
    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      if (failure === 'rede') throw new TypeError('Failed to fetch');
      if (failure === 'HTTP') return { ok: false, status: 503 };
      if (failure === 'JSON') return { ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } };
      return response(view('IP-A02-G01', 'Unidade indevida'));
    }).mockResolvedValue(response(view(unitId, 'Unidade recuperada')));
    vi.stubGlobal('fetch', fetchMock);
    render(<PedagogicalDeepDive section={section(unitId)} isOpen collapsible={false} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
    expect(screen.queryByText('Unidade indevida')).not.toBeInTheDocument();
    expect(screen.queryByText('Resumo que não substitui a unidade')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Unidade recuperada' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([url]) => url === `/knowledge/pedagogical/views/${unitId}.json`)).toBe(true);
  });

  it('cancela ao trocar de unidade e ignora uma resposta antiga que chega depois', async () => {
    let resolveOld!: (value: Response) => void;
    let oldSignal: AbortSignal | undefined;
    const oldResponse = new Promise<Response>((resolve) => { resolveOld = resolve; });
    vi.stubGlobal('fetch', vi.fn((_url, init) => {
      if (String(_url).includes('IP-A05-G01')) { oldSignal = init.signal; return oldResponse; }
      return Promise.resolve(response(view('IP-A05-G02', 'Unidade atual')));
    }));
    const rendered = render(<PedagogicalDeepDive section={section('IP-A05-G01')} isOpen />);
    rendered.rerender(<PedagogicalDeepDive section={section('IP-A05-G02')} isOpen />);
    expect(oldSignal?.aborted).toBe(true);
    expect(await screen.findByRole('heading', { name: 'Unidade atual' })).toBeVisible();
    await act(async () => { resolveOld(response(view('IP-A05-G01', 'Unidade antiga'))); await oldResponse; });
    expect(screen.queryByText('Unidade antiga')).not.toBeInTheDocument();
    rendered.rerender(<PedagogicalDeepDive section={section('IP-A05-G03')} isOpen />);
    expect(screen.queryByText('Unidade atual')).not.toBeInTheDocument();
    await screen.findByRole('alert'); // Another unit's response remains fail-closed.
  });

  it('aborta ao fechar e busca novamente quando uma carga incompleta é reaberta', async () => {
    let signal: AbortSignal | undefined;
    const fetchMock = vi.fn().mockImplementationOnce((_url, init) => {
      signal = init.signal;
      return new Promise(() => {});
    }).mockResolvedValue(response(view('IP-A06-G01')));
    vi.stubGlobal('fetch', fetchMock);
    render(<PedagogicalDeepDive section={section('IP-A06-G01')} />);
    await userEvent.click(screen.getByRole('button', { name: /abrir unidade/i }));
    await userEvent.click(screen.getByRole('button', { name: /fechar aprofundamento/i }));
    expect(signal?.aborted).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /abrir unidade/i }));
    expect(await screen.findByRole('heading', { name: 'Conteúdo aprofundado carregado' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('abre a A14 real pelo ID publicado, sem depender de URL Markdown', async () => {
    const cumulative = MODULES_DATA.find((module) => module.id === 'mod14')!.sections[0];
    expect(cumulative.contentUrl).toBeUndefined();
    const published = JSON.parse(fs.readFileSync('public/knowledge/pedagogical/views/IP-A14-S01.json', 'utf8'));
    const fetchMock = vi.fn().mockResolvedValue(response(published));
    vi.stubGlobal('fetch', fetchMock);
    const rendered = render(<PedagogicalDeepDive section={cumulative} isOpen />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Ortografia' })).toBeVisible();
    expect(rendered.container.querySelector('.cumulative-review-view')).not.toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe('/knowledge/pedagogical/views/IP-A14-S01.json');
  });

  it('mantém o progresso separado ao alternar revisões A14 já em cache', async () => {
    const cumulative = MODULES_DATA.find((module) => module.id === 'mod14')!.sections;
    localStorage.setItem('suveca_cumulative_protocol_v1_IP-A14-S03', '{"0":true}');
    localStorage.setItem('suveca_cumulative_protocol_v1_IP-A14-S02', '{}');
    const fetchMock = vi.fn(async (url: string) => response(JSON.parse(fs.readFileSync(`public${url}`, 'utf8'))));
    vi.stubGlobal('fetch', fetchMock);
    const rendered = render(<PedagogicalDeepDive section={cumulative[2]} isOpen activeSectionId="protocol" />);
    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    rendered.rerender(<PedagogicalDeepDive section={cumulative[1]} isOpen activeSectionId="protocol" />);
    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    rendered.rerender(<PedagogicalDeepDive section={cumulative[2]} isOpen activeSectionId="protocol" />);
    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(localStorage.getItem('suveca_cumulative_protocol_v1_IP-A14-S03')).toBe('{"0":true}');
    expect(localStorage.getItem('suveca_cumulative_protocol_v1_IP-A14-S02')).toBe('{}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
