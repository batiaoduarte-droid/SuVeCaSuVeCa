import { afterEach, describe, expect, it, vi } from 'vitest';

describe('officialQuestionsLoader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('busca somente o shard que contém as referências solicitadas', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('official-questions.manifest.json')) {
        return {
          ok: true,
          json: async () => ({
            shards: [
              {
                questionIds: ['A00:aula.q0001'],
                normalized: { file: 'parts/part-a.json' },
              },
              {
                questionIds: ['A00:aula.q0002'],
                normalized: { file: 'parts/part-b.json' },
              },
            ],
          }),
        } as Response;
      }
      if (url.endsWith('parts/part-a.json')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: async () => JSON.stringify([{
            id: 'A00:aula.q0001',
            originalQuestionId: 'OQ-A00-aula.q0001',
            prompt: 'Questão seletiva',
          }]),
        } as Response;
      }
      throw new Error(`Shard inesperado: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchNormalizedQuestionsByRefs } = await import('./officialQuestionsLoader');
    const result = await fetchNormalizedQuestionsByRefs(
      ['OQ-A00-aula.q0001'],
      'A00',
    );

    expect(result['OQ-A00-aula.q0001']?.prompt).toBe('Questão seletiva');
    expect(result['A00:aula.q0001']).toBe(result['OQ-A00-aula.q0001']);
    expect(result['aula.q0001']).toBe(result['OQ-A00-aula.q0001']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/knowledge/parts/part-b.json',
      expect.anything(),
    );
  });

  it('reutiliza um shard resolvido mesmo quando as páginas usam AbortSignal', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('official-questions.manifest.json')) {
        return {
          ok: true,
          json: async () => ({
            shards: [{
              questionIds: ['A00:aula.q0001', 'A00:aula.q0002'],
              normalized: { file: 'parts/part-shared.json' },
            }],
          }),
        } as Response;
      }
      if (url.endsWith('parts/part-shared.json')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: async () => JSON.stringify([
            { id: 'A00:aula.q0001', originalQuestionId: 'OQ-A00-aula.q0001', prompt: 'Primeira' },
            { id: 'A00:aula.q0002', originalQuestionId: 'OQ-A00-aula.q0002', prompt: 'Segunda' },
          ]),
        } as Response;
      }
      throw new Error(`Recurso inesperado: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchNormalizedQuestionsByRefs } = await import('./officialQuestionsLoader');
    await fetchNormalizedQuestionsByRefs(
      ['OQ-A00-aula.q0001'],
      'A00',
      new AbortController().signal,
    );
    const second = await fetchNormalizedQuestionsByRefs(
      ['OQ-A00-aula.q0002'],
      'A00',
      new AbortController().signal,
    );

    expect(second['OQ-A00-aula.q0002']?.prompt).toBe('Segunda');
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('part-shared.json'))).toHaveLength(1);
  });
});
