import type { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { pblTutorContextResolver } from './PBLTutorContextResolver.server';
import {
  PBL_TUTOR_SYSTEM_INSTRUCTION,
  formatTutorPrompt,
} from './pblTutorPrompt';
import type {
  PBLTutorTurnRequest,
  PBLTutorTurnResponse,
  PBLTutorQuestionContext,
} from '../../../types/pblTutor';

const tutorResponseSchema = {
  type: Type.OBJECT,
  properties: {
    pedagogicalText: {
      type: Type.STRING,
      description:
        'Explicação ou orientação pedagógica do Professor SuVeCA em Markdown. Linguagem acolhedora, sem IDs técnicos.',
    },
    intent: {
      type: Type.STRING,
      description:
        'investigate_confusion | explain_rule | contrast_options | recommend_practice | synthesize_notebook | encourage_reattempt | direct_clarification | wrap_up',
    },
    continuityRecommendation: {
      type: Type.STRING,
      description:
        'try_same | try_alternative | review_contrast | proceed_transfer | proceed_reflection',
    },
    sourceRefs: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Regras, contrastes ou tabelas normativas efetivamente mobilizadas.',
    },
    notebookDraft: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        triggerCondition: { type: Type.STRING },
        decisionRule: { type: Type.STRING },
        contrastExample: { type: Type.STRING },
      },
      description: 'Estruturação do erro para o Caderno de Erros quando pertinente ou solicitado.',
    },
  },
  required: ['pedagogicalText', 'intent', 'continuityRecommendation', 'sourceRefs'],
};

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'suveca-pbl-tutor',
      },
    },
  });
}

const withAiTimeout = async <T,>(operation: Promise<T>, timeoutMs = 30_000): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

function generateDeterministicFallback(
  request: PBLTutorTurnRequest,
  context: PBLTutorQuestionContext,
  reason: string
): PBLTutorTurnResponse {
  const selectedOpt = request.studentAttemptContext?.userAnswer;
  const optAnalysis = context.objectiveOptionAnalyses?.find(
    (o) => o.label.trim().toUpperCase() === String(selectedOpt || '').trim().toUpperCase()
  );

  const rules = context.criteria?.rules || context.pedagogy?.rules || [];
  const primaryRule = rules[0];
  const ruleStatement = primaryRule
    ? `**${primaryRule.title}**: ${primaryRule.statement}`
    : 'Consulte a regra gramatical decisiva antes de tentar novamente.';

  let text = '';
  if (optAnalysis && !optAnalysis.isCorrect) {
    text = `Vamos analisar o critério decisivo desta questão:\n\n${optAnalysis.refutation}\n\n${ruleStatement}\n\nQuer tentar responder novamente a esta questão ou prefere ver outro exemplo prático?`;
  } else if (context.officialCommentary) {
    text = `Avaliando a questão:\n\n${context.officialCommentary}\n\n${ruleStatement}\n\nComo você aplicaria este critério em uma nova questão?`;
  } else {
    text = `Critério normativo da competência:\n\n${ruleStatement}\n\nObserve as condições de aplicação e tente refazer a análise com calma.`;
  }

  const contrasts = context.criteria?.contrasts || context.pedagogy?.contrasts || [];
  const sourceRefs = [
    ...(primaryRule ? [primaryRule.title] : []),
    ...(contrasts[0] ? [contrasts[0].title] : []),
  ];

  return {
    pedagogicalText: text,
    intent: 'explain_rule',
    continuityRecommendation: 'try_same',
    sourceRefs,
    executionMetadata: {
      model: 'fallback-deterministic',
      durationMs: 0,
      fallback: true,
    },
  };
}

export async function handlePBLTutorTurn(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const request = req.body as PBLTutorTurnRequest;

  if (!request || !request.questionRef) {
    res.status(400).json({ error: 'questionRef é obrigatório.' });
    return;
  }

  let context: PBLTutorQuestionContext | null = null;
  try {
    context = await pblTutorContextResolver.getTutorQuestionContext(request.questionRef);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar contexto pedagógico.', details: err.message });
    return;
  }

  if (!context) {
    res.status(404).json({ error: `Contexto pedagógico não encontrado para a questão ${request.questionRef}.` });
    return;
  }

  const tutorEnabled = process.env.PBL_TUTOR_ENABLED !== 'false' && Boolean(process.env.GEMINI_API_KEY);
  const targetModel = process.env.PBL_TUTOR_MODEL || 'gemini-3.1-flash-lite';
  const thinkingLevel = (process.env.PBL_TUTOR_THINKING_LEVEL || 'low') as any;

  if (!tutorEnabled) {
    const fallbackResponse = generateDeterministicFallback(request, context, 'Tutor IA desativado temporariamente.');
    res.json(fallbackResponse);
    return;
  }

  try {
    const ai = getGenAIClient();
    const prompt = formatTutorPrompt(request, context);

    const config: any = {
      systemInstruction: PBL_TUTOR_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: tutorResponseSchema,
      thinkingConfig: {
        thinkingLevel,
      },
    };

    const aiResponse = await withAiTimeout(
      ai.models.generateContent({
        model: targetModel,
        contents: prompt,
        config,
      }),
      30_000
    );

    const rawText = aiResponse.text || '{}';
    const parsed = JSON.parse(rawText);

    const durationMs = Date.now() - startTime;

    const responsePayload: PBLTutorTurnResponse = {
      pedagogicalText: String(parsed.pedagogicalText || '').trim(),
      intent: parsed.intent || 'explain_rule',
      continuityRecommendation: parsed.continuityRecommendation || 'try_same',
      sourceRefs: Array.isArray(parsed.sourceRefs) ? parsed.sourceRefs : [],
      notebookDraft: parsed.notebookDraft || undefined,
      executionMetadata: {
        model: targetModel,
        durationMs,
        fallback: false,
      },
    };

    res.json(responsePayload);
  } catch (error: any) {
    console.error('[PBLTutor] Falha na chamada Gemini, ativando fallback construtivo:', error.message);
    const durationMs = Date.now() - startTime;
    const fallbackResponse = generateDeterministicFallback(
      request,
      context,
      error.message === 'AI_TIMEOUT' ? 'Tempo de resposta excedido.' : 'Instabilidade temporária na IA.'
    );
    fallbackResponse.executionMetadata.durationMs = durationMs;
    res.json(fallbackResponse);
  }
}

export async function handlePBLTutorManifest(_req: Request, res: Response): Promise<void> {
  try {
    const manifest = await pblTutorContextResolver.getManifest();
    res.json(manifest);
  } catch (err: any) {
    res.status(500).json({ error: 'Não foi possível carregar o manifest do tutor PBL.', details: err.message });
  }
}

export async function handlePBLTutorContext(req: Request, res: Response): Promise<void> {
  try {
    const questionRef = req.params.questionRef;
    const context = await pblTutorContextResolver.getTutorQuestionContext(questionRef);
    if (!context) {
      res.status(404).json({ error: `Questão ${questionRef} não encontrada no acervo do tutor.` });
      return;
    }
    res.json(context);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao consultar questão do tutor.', details: err.message });
  }
}
