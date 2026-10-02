import type { GoogleGenAI, GenerateContentParameters } from '@google/genai';
import { waitForAiRetry, withAiSignal } from './aiRequest';

/** Adaptation of KaraokeBR's Interactions adapter. No local tools/files are exposed. */
export async function generateProfessorResponse(client: GoogleGenAI, request: GenerateContentParameters) {
  if (request.model !== 'antigravity-preview-09-2026') return client.models.generateContent(request);
  const signal = request.config?.abortSignal;
  const run = <T>(operation: () => Promise<T>) => signal ? withAiSignal(operation, signal) : operation();
  const options = { signal, timeout: 180_000, maxRetries: 0 };
  let interactionId: string | undefined;
  let completed = false;
  try {
    let result = await run(() => client.interactions.create({
      agent: 'antigravity-preview-09-2026',
      agent_config: { type: 'antigravity', model: 'gemini-3.8-flash' },
      environment: 'remote', background: true,
      tools: [],
      input: `${String(request.config?.systemInstruction || '')}\n\n${String(request.contents)}\n\nRetorne somente um objeto JSON válido, sem cercas Markdown, seguindo este schema:\n${JSON.stringify(request.config?.responseSchema || (request.config as any)?.responseJsonSchema)}\nUse apenas o contexto fornecido. Não consulte fontes externas.`,
    }, options));
    interactionId = result.id;
    while (result.status === 'in_progress') {
      if (!interactionId) throw new Error('ANTIGRAVITY_MISSING_ID');
      await waitForAiRetry(1500, signal);
      result = await run(() => client.interactions.get(interactionId!, undefined, options));
    }
    if (result.status !== 'completed' || !result.output_text?.trim()) {
      throw new Error('ANTIGRAVITY_INCOMPLETE_RESPONSE');
    }
    completed = true;
    // Only the final answer is consumed; agent reasoning/steps are not chat content.
    return { text: result.output_text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''),
      usageMetadata: result.usage, modelVersion: 'antigravity-preview-09-2026' };
  } catch (error) {
    throw error;
  } finally {
    if (interactionId && !completed) {
      // Independent short cancellation request, since the generation signal may be aborted.
      void client.interactions.cancel(interactionId, undefined, { timeout: 5000, maxRetries: 0 })
        .catch(() => console.warn('[Professor] Não foi possível confirmar o cancelamento remoto do agente.'));
    }
  }
}
