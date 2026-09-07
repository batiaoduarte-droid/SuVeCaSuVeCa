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
  PBLTutorContinuityRecommendation,
} from '../../../types/pblTutor';
import type { PBLSession } from '../../../types/pbl';

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
    context = await pblTutorContextResolver.getTutorQuestionContext(
      request.questionRef,
      request.competencyRef
    );
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar contexto pedagógico.', details: err.message });
    return;
  }

  if (!context) {
    res.status(404).json({ error: `Contexto pedagógico não encontrado para a questão ${request.questionRef}.` });
    return;
  }

  if (
    context.presentation?.isUnavailable ||
    !context.presentation?.prompt ||
    !context.presentation?.officialAnswer
  ) {
    const stage = request.studentAttemptContext?.attemptStage;
    let continuityRecommendation: PBLTutorContinuityRecommendation = 'try_alternative';
    if (request.allowedContinuityActions && request.allowedContinuityActions.length > 0) {
      continuityRecommendation = request.allowedContinuityActions[0];
    } else if (stage === 'transfer') {
      continuityRecommendation = 'proceed_reflection';
    } else if (stage === 'reattempt') {
      continuityRecommendation = 'proceed_transfer';
    } else {
      continuityRecommendation = 'try_alternative';
    }

    res.json({
      pedagogicalText:
        'O tutor não possui todos os dados necessários para orientar esta questão no momento. Para manter a fluidez do seu percurso de estudo, você pode avançar para a próxima questão prática disponível.',
      intent: 'recommend_practice',
      continuityRecommendation,
      sourceRefs: context.criteria?.rules?.map((r) => r.title) || [],
      executionMetadata: {
        model: 'unavailable-safeguard',
        durationMs: Date.now() - startTime,
        fallback: true,
      },
    });
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

import { pblServerSessionRepository } from '../server/PBLServerSessionRepository';

async function resolveTokenUserId(req: Request): Promise<string | undefined> {
  const authorization = (typeof req.header === 'function' ? req.header("authorization") : (req.headers as any)?.authorization) || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token || typeof process === 'undefined' || !process.versions?.node) return undefined;
  try {
    const { getApps } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const apps = getApps();
    if (apps.length > 0) {
      const decoded = await getAuth(apps[0]).verifyIdToken(token, true);
      return decoded.uid;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

// Handler para sincronização de sessões entre cliente e servidor
export async function handlePBLSessionSync(req: Request, res: Response): Promise<void> {
  try {
    const session = req.body as PBLSession;
    if (!session || !session.sessionId || typeof session.sessionId !== 'string') {
      res.status(400).json({ error: 'Sessão inválida: sessionId obrigatório.' });
      return;
    }

    // 1. Identidade verificada obrigatória (fail-closed)
    let authenticatedUserId: string | undefined = (res.locals as any)?.userId;
    if (!authenticatedUserId) {
      authenticatedUserId = await resolveTokenUserId(req);
    }

    if (!authenticatedUserId || authenticatedUserId === 'guest') {
      res.status(401).json({ error: 'Autenticação obrigatória para sincronizar sessão no servidor.' });
      return;
    }

    // 2. Conferência de propriedade: userId declarado no corpo deve coincidir com o token
    if (session.userId && session.userId !== authenticatedUserId) {
      res.status(403).json({ error: 'Acesso negado: a sessão não pertence ao usuário autenticado.' });
      return;
    }

    // 3. Validação estrutural e contratual das tentativas
    if (session.attempts) {
      if (!Array.isArray(session.attempts)) {
        res.status(400).json({ error: 'Formato inválido para attempts: deve ser um array.' });
        return;
      }

      for (const attempt of session.attempts) {
        if (!attempt.attemptId || typeof attempt.attemptId !== 'string' ||
            !attempt.questionRef || typeof attempt.questionRef !== 'string' ||
            !attempt.userAnswer || typeof attempt.userAnswer !== 'string' ||
            attempt.userAnswer.trim().length === 0 ||
            attempt.sessionId !== session.sessionId) {
          res.status(400).json({ error: 'Tentativa inválida: vínculo de sessão ou formato de resposta incorreto.' });
          return;
        }
      }
    }

    // 4. Salvar sessão permitindo estados com ou sem tentativa (ex.: ajuda prévia na fase tutor)
    pblServerSessionRepository.saveSession(session, authenticatedUserId);
    res.json({ ok: true, sessionId: session.sessionId });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao sincronizar sessão PBL.', details: err.message });
  }
}

export function registerAuthoritativeSession(session: any, authenticatedUserId?: string): void {
  if (session?.sessionId) {
    const effectiveUser = authenticatedUserId || session.userId;
    if (effectiveUser && effectiveUser !== 'guest') {
      pblServerSessionRepository.saveSession(session, effectiveUser);
    }
  }
}

export function clearAuthoritativeSessions(): void {
  pblServerSessionRepository.clear();
}

export async function handlePBLTutorContext(req: Request, res: Response): Promise<void> {
  try {
    const questionRef = req.params?.questionRef;
    const competencyRef = typeof req.query?.competencyRef === 'string' ? req.query.competencyRef : undefined;
    const context = await pblTutorContextResolver.getTutorQuestionContext(questionRef, competencyRef);
    if (!context) {
      res.status(404).json({ error: `Questão ${questionRef} não encontrada no acervo do tutor.` });
      return;
    }

    // 1. Identificar autenticação do usuário
    let authenticatedUserId: string | undefined = (res.locals as any)?.userId;
    if (!authenticatedUserId) {
      authenticatedUserId = await resolveTokenUserId(req);
    }

    // Se a consulta for pública ou não autenticada, retorna estritamente a projeção sem resolução (fail-closed)
    if (!authenticatedUserId || authenticatedUserId === 'guest') {
      const publicContext = pblTutorContextResolver.filterTutorContextForStudent(context, {
        hideAnswer: true,
      });
      res.json(publicContext);
      return;
    }

    // 2. Identificar sessionId
    const sessionId = (typeof req.headers?.['x-pbl-session-id'] === 'string' ? req.headers['x-pbl-session-id'] : null)
      || (typeof req.query?.sessionId === 'string' ? req.query.sessionId : null);

    let authoritativeSession: any = null;
    if (sessionId) {
      authoritativeSession = await pblServerSessionRepository.getSession(sessionId, authenticatedUserId);
    }

    // Fallback defensivo em ambiente de desenvolvimento/teste: somente aceita se pertencer ao mesmo usuário autenticado
    if (!authoritativeSession) {
      const { pblSessionManager } = await import('../session/PBLSessionManager');
      const current = pblSessionManager.getCurrentSession();
      if (current && current.userId === authenticatedUserId && (!sessionId || current.sessionId === sessionId)) {
        authoritativeSession = current;
      }
    }

    // 3. Vincular a autorização à tentativa na questão solicitada ou no episódio ativo
    const genuineAttempt = authoritativeSession?.attempts?.find(
      (a: any) =>
        a.questionRef === questionRef &&
        a.sessionId === authoritativeSession.sessionId &&
        Boolean(a.userAnswer && String(a.userAnswer).trim().length > 0)
    );
    const hasRealAttempt = Boolean(genuineAttempt);

    // 4. Verificação da etapa autorizada no motor para desmascarar a resolução
    const authoritativePhase = authoritativeSession?.phase;
    const authorizedPostAttemptPhases = [
      'tutor',
      'intervention',
      'reflection',
      'summary',
      'completed',
      'reattempt',
    ];

    const isAuthorizedPostAttempt = hasRealAttempt && Boolean(
      authoritativePhase && authorizedPostAttemptPhases.includes(authoritativePhase)
    );

    const safeContext = pblTutorContextResolver.filterTutorContextForStudent(context, {
      hideAnswer: !isAuthorizedPostAttempt,
    });
    res.json(safeContext);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao consultar questão do tutor.', details: err.message });
  }
}

