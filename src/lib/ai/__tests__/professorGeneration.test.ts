import { afterEach, expect, it, vi } from 'vitest';
import type { GoogleGenAI } from '@google/genai';
import { generateProfessorResponse } from '../professorGeneration.server';
import { createAiDeadline } from '../aiRequest';
import { isProfessorModel, PROFESSOR_MODELS } from '../../geminiTaskMapping';

afterEach(() => vi.useRealTimers());
it('routes the managed agent to Interactions and consumes only the final JSON', async () => {
  const create = vi.fn().mockResolvedValue({ id: 'i1', status: 'completed', output_text: '{"answer":"ok"}', steps: ['private reasoning'] });
  const generateContent = vi.fn();
  const client = { interactions: { create }, models: { generateContent } } as unknown as GoogleGenAI;
  const response = await generateProfessorResponse(client, { model: 'antigravity-preview-09-2026', contents: 'Pergunta', config: { responseSchema: { type: 'OBJECT' } } });
  expect(response.text).toBe('{"answer":"ok"}');
  expect(generateContent).not.toHaveBeenCalled();
  expect(create.mock.calls[0][0]).toMatchObject({ agent: 'antigravity-preview-09-2026', agent_config: { model: 'gemini-3.8-flash' }, background: true, tools: [] });
});
it('cancels the accepted remote agent when the deadline expires', async () => {
  vi.useFakeTimers();
  const cancel = vi.fn().mockResolvedValue({ status: 'cancelled' });
  const get = vi.fn().mockImplementation(() => new Promise(() => {}));
  const client = { interactions: { create: vi.fn().mockResolvedValue({ id: 'i1', status: 'in_progress' }), get, cancel } } as unknown as GoogleGenAI;
  const deadline = createAiDeadline(2000);
  const result = generateProfessorResponse(client, { model: 'antigravity-preview-09-2026', contents: 'Pergunta', config: { abortSignal: deadline.signal } }).catch(error => error);
  await vi.advanceTimersByTimeAsync(2000);
  expect((await result).noRetry).toBe(true);
  expect(cancel).toHaveBeenCalledWith('i1', undefined, expect.objectContaining({ timeout: 5000 }));
  deadline.dispose();
});
it('keeps Flash-lite on generateContent and limits selectable providers', async () => {
  const generateContent = vi.fn().mockResolvedValue({ text: '{}' });
  const client = { models: { generateContent } } as unknown as GoogleGenAI;
  await generateProfessorResponse(client, { model: 'gemini-3.5-flash-lite', contents: 'Pergunta' });
  expect(generateContent).toHaveBeenCalledOnce();
  expect(PROFESSOR_MODELS).toHaveLength(3);
  expect(isProfessorModel('unexpected-provider')).toBe(false);
});
