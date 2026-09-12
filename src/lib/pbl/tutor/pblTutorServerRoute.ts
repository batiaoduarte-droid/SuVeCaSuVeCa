import { getEpisodeAttempt, validateQuickCheck } from './pblTutorPedagogy';
import type { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { pblTutorContextResolver } from './PBLTutorContextResolver.server';
import {
  PBL_TUTOR_SYSTEM_INSTRUCTION,
  formatTutorPrompt,
} from './pblTutorPrompt';
import type { PBLTutorTurnRequest,
  PBLTutorTurnResponse,
  PBLTutorQuestionContext,
  PBLTutorContinuityRecommendation,
} from '../../../types/pblTutor';
import type { PBLSession } from '../../../types/pbl';
import {
  normalizePBLAnswer,
  isPBLAnswerCorrect,
  isExplicitMultipleChoiceAnswer,
  type PBLAnswerMode,
} from '../answerAdapter';
import { AttemptEvaluator } from '../engine/AttemptEvaluator';

const tutorResponseSchema = {
  type: Type.OBJECT,
  properties: {
    pedagogicalText: {
      type: Type.STRING,
      description:
        'Explicação ou orientação pedagógica do Professor PBL em Markdown. Linguagem acolhedora, sem IDs técnicos.',
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
    quickCheck: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'Frase ou pergunta curta (1 linha) para checagem de compreensão imediata.' },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ['label', 'text'],
          },
          description: 'Duas opções concisas de resposta (ex.: Certo/Errado ou A/B).',
        },
        sourceRefs: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'IDs de regras ou contrastes fornecidos que sustentam a resposta.' },
        correctOption: { type: Type.STRING, description: 'Label da opção correta do micro-desafio.' },
        explanation: { type: Type.STRING, description: 'Justificativa em 1 linha.' },
      },
      description: 'Micro-desafio prático de fixação rápida para verificar compreensão imediata do critério.',
    },
    reasoningChips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 a 4 opções curtas de dúvidas ou hipóteses que o aluno pode clicar sem precisar digitar.',
    },
    metacognitiveInsight: {
      type: Type.STRING,
      description: 'Uma frase curta sobre a calibração metacognitiva do aluno.',
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

  const reasoningChips = [
    'Quais critérios preciso distinguir?',
    'Como aplicar este critério passo a passo?',
    'Mostre o contraste com outro exemplo',
    'Consultar formulação canônica da regra',
  ];

  const studentAt = request.studentAttemptContext;
  let metacognitiveInsight: string | undefined = undefined;
  if (studentAt) {
    if (AttemptEvaluator.evaluateConfidence(studentAt.isCorrect, studentAt.confidence || 'medium') === 'high_confidence_error') {
      metacognitiveInsight = 'Você declarou alta confiança e a resposta divergiu do gabarito. Vamos investigar o critério que orientou sua escolha.';
    } else if (!studentAt.isCorrect && (studentAt.confidence === 'guess' || studentAt.confidence === 'low')) {
      metacognitiveInsight = 'Você declarou dúvida. Podemos percorrer os passos e conferir onde sua hipótese diverge do critério.';
    } else if (studentAt.isCorrect && (studentAt.confidence === 'guess' || studentAt.confidence === 'low')) {
      metacognitiveInsight = 'Acerto com dúvida: vamos consolidar o critério para que a assertividade se torne intencional.';
    } else if (studentAt.isCorrect) {
      metacognitiveInsight = 'Você acertou este item. Explique o critério e verifique sua aplicação em um novo caso.';
    }
  }

  return {
    pedagogicalText: text,
    intent: 'explain_rule',
    continuityRecommendation: 'try_same',
    sourceRefs,
    reasoningChips,
    metacognitiveInsight,
    executionMetadata: {
      model: 'fallback-deterministic',
      durationMs: 0,
      fallback: true,
    },
  };
}

export async function handlePBLTutorTurn(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  let request = { ...req.body } as PBLTutorTurnRequest;

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

  // Submitted drafts and client-provided correctness cannot authorize solution exposure.
  try {
    const userId = (res.locals as any)?.userId || await resolveTokenUserId(req);
    const session = userId && userId !== 'guest' && typeof request.sessionId === 'string'
      ? await pblServerSessionRepository.getSession(request.sessionId, userId) : null;
    const episodeId = request.episodeId || session?.currentTutorEpisodeId;
    const episode = episodeId ? session?.tutorEpisodes?.[episodeId] : undefined;
    const matchesEpisode = episode && episode.questionRef === request.questionRef &&
      episode.competencyRef === request.competencyRef && episode.sessionId === session?.sessionId;
    const attempt = session && matchesEpisode ? getEpisodeAttempt(session, episode) : undefined;
    const allowedPhase = session && ['tutor', 'intervention', 'reflection', 'completed', 'reattempt'].includes(session.phase);
    const hasAttempted = Boolean(attempt && allowedPhase);
    request = {
      ...request,
      studentAttemptContext: hasAttempted && attempt ? {
        userAnswer: attempt.userAnswer,
        isCorrect: attempt.isCorrect,
        confidence: attempt.confidence,
        attemptStage: attempt.stage,
      } : undefined,
      // History belongs to this episode; a request cannot substitute a different solved item.
      history: matchesEpisode ? episode.turns.filter((turn) => turn.role === 'student' || turn.role === 'tutor')
        .map((turn) => ({ role: turn.role as 'student' | 'tutor', text: turn.content, intent: turn.intent })) : [],
    };
    context = pblTutorContextResolver.filterTutorContextForStudent(context, { hideAnswer: !hasAttempted });
  } catch {
    res.status(503).json({ error: 'Não foi possível confirmar o estado da tentativa. Sua sessão pode ser retomada.' });
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
    if (!parsed || typeof parsed.pedagogicalText !== 'string' || !parsed.pedagogicalText.trim()) {
      throw new Error('INVALID_PEDAGOGICAL_RESPONSE');
    }
    const intents = ['investigate_confusion', 'explain_rule', 'contrast_options', 'recommend_practice', 'synthesize_notebook', 'encourage_reattempt', 'direct_clarification', 'wrap_up'];
    const continuity = ['try_same', 'try_alternative', 'review_contrast', 'proceed_transfer', 'proceed_reflection'];
    const allowedRefs = new Set([
      ...(context.criteria?.rules || []).flatMap((rule) => [rule.ruleRef, rule.title]),
      ...(context.criteria?.contrasts || []).flatMap((contrast) => [contrast.contrastRef, contrast.title]),
      ...(context.criteria?.procedures || []).flatMap((procedure) => [procedure.procedureRef, procedure.title]),
    ]);
    const hasAttempted = Boolean(request.studentAttemptContext);
    const notebookDraft = hasAttempted && parsed.notebookDraft &&
      ['title', 'triggerCondition', 'decisionRule', 'contrastExample'].every((key) => typeof parsed.notebookDraft[key] === 'string' && parsed.notebookDraft[key].trim())
      ? parsed.notebookDraft : undefined;

    const durationMs = Date.now() - startTime;

    const responsePayload: PBLTutorTurnResponse = {
      pedagogicalText: String(parsed.pedagogicalText || '').trim(),
      intent: intents.includes(parsed.intent) ? parsed.intent : 'explain_rule',
      continuityRecommendation: continuity.includes(parsed.continuityRecommendation) ? parsed.continuityRecommendation : 'try_same',
      sourceRefs: Array.isArray(parsed.sourceRefs) ? parsed.sourceRefs.filter((ref: unknown) => typeof ref === 'string' && allowedRefs.has(ref)) : [],
      notebookDraft,
      quickCheck: hasAttempted ? validateQuickCheck(parsed.quickCheck, allowedRefs) : undefined,
      reasoningChips: Array.isArray(parsed.reasoningChips) ? parsed.reasoningChips.filter((chip: unknown) => typeof chip === 'string' && chip.trim()).slice(0, 4) : undefined,
      metacognitiveInsight: hasAttempted && typeof parsed.metacognitiveInsight === 'string' ? parsed.metacognitiveInsight : undefined,
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

    // 3. Validação rigorosa das tentativas e autoridade avaliativa do servidor
    if (session.attempts) {
      if (!Array.isArray(session.attempts)) {
        res.status(400).json({ error: 'Formato inválido para attempts: deve ser um array.' });
        return;
      }

      for (const attempt of session.attempts) {
        if (
          !attempt.attemptId || typeof attempt.attemptId !== 'string' || attempt.attemptId.trim().length === 0 ||
          !attempt.questionRef || typeof attempt.questionRef !== 'string' || attempt.questionRef.trim().length === 0 ||
          !attempt.userAnswer || typeof attempt.userAnswer !== 'string' || attempt.userAnswer.trim().length === 0 ||
          attempt.sessionId !== session.sessionId
        ) {
          res.status(400).json({ error: 'Tentativa inválida: vínculo de sessão ou formato de resposta incorreto.' });
          return;
        }

        if (attempt.userAnswer.length > 200) {
          res.status(400).json({ error: 'Tentativa inválida: resposta excede o limite permitido de caracteres.' });
          return;
        }

        // Conferência da existência real da questão no acervo canônico
        const qCtx = await pblTutorContextResolver.getTutorQuestionContext(attempt.questionRef);
        if (!qCtx) {
          res.status(400).json({ error: `Tentativa inválida: questão '${attempt.questionRef}' não encontrada no acervo.` });
          return;
        }

        // Validação de formato da resposta contra o contexto oficial da questão
        const rawOptions = qCtx.presentation?.options;
        const hasDefinedOptions = Array.isArray(rawOptions) && rawOptions.length > 0;
        const normalizedAnswer = normalizePBLAnswer(attempt.userAnswer);

        if (hasDefinedOptions) {
          const allowedLabels = rawOptions.map((opt) => normalizePBLAnswer(opt.label));
          if (!allowedLabels.includes(normalizedAnswer)) {
            res.status(400).json({
              error: `Resposta inválida: '${attempt.userAnswer}' não corresponde a uma opção válida da questão ${attempt.questionRef}. Opções permitidas: ${allowedLabels.join(', ')}.`,
            });
            return;
          }
        } else {
          // Formato Certo / Errado padrão quando options não são explicitadas
          if (!['C', 'E'].includes(normalizedAnswer)) {
            res.status(400).json({
              error: `Resposta inválida: '${attempt.userAnswer}' não é um julgamento válido (Certo/Errado) para a questão ${attempt.questionRef}.`,
            });
            return;
          }
        }

        // Preservação da autoridade avaliativa do servidor:
        // O servidor é a única autoridade sobre o gabarito oficial e cálculo de acerto/erro
        const officialAnswer = qCtx.presentation?.officialAnswer;
        const isUnavailable = Boolean(
          qCtx.presentation?.isUnavailable ||
          !officialAnswer ||
          officialAnswer === 'REDACTED'
        );

        if (isUnavailable) {
          // Questão sem gabarito disponível para avaliação:
          // Anula valores fornecidos pelo cliente, não permitindo fabricação de aprovação
          attempt.correctAnswer = undefined;
          attempt.isCorrect = false;
          attempt.evaluation = 'unassessed' as any;
        } else {
          // Determina o answerMode oficial a partir da questão canônica (nunca do cliente)
          const officialMode: PBLAnswerMode =
            hasDefinedOptions && rawOptions.length > 2
              ? 'multiple_choice'
              : isExplicitMultipleChoiceAnswer(officialAnswer)
                ? 'multiple_choice'
                : 'true_false';

          attempt.correctAnswer = officialAnswer;
          attempt.isCorrect = isPBLAnswerCorrect(attempt.userAnswer, officialAnswer, officialMode);
          attempt.evaluation = AttemptEvaluator.evaluateConfidence(
            attempt.isCorrect,
            attempt.confidence || 'medium'
          );
        }
      }
    }

    // 4. Salvar sessão atomicamente no servidor (transação no Firestore + ordenação)
    const saveResult = await pblServerSessionRepository.saveSession(session, authenticatedUserId);
    if (!saveResult.saved) {
      if (saveResult.reason === 'stale_snapshot') {
        res.json({ ok: true, ignored: true, reason: 'stale_snapshot' });
        return;
      }
      if (
        saveResult.reason === 'attempt_history_truncated' ||
        saveResult.reason === 'attempt_immutable_violation'
      ) {
        res.status(400).json({
          error: 'Tentativa violada: histórico de tentativas é estritamente append-only e imutável.',
        });
        return;
      }
      res.status(500).json({ error: 'Falha na persistência remota da sessão no Firestore.' });
      return;
    }

    res.json({ ok: true, sessionId: session.sessionId });
  } catch (err: any) {
    if (
      err?.code === 'attempt_history_truncated' ||
      err?.code === 'attempt_immutable_violation'
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Erro ao sincronizar sessão PBL.', details: err.message });
  }
}

export function registerAuthoritativeSession(session: any, authenticatedUserId?: string): void {
  if (session?.sessionId) {
    const effectiveUser = authenticatedUserId || session.userId;
    if (effectiveUser && effectiveUser !== 'guest') {
      pblServerSessionRepository.saveSession(session, effectiveUser).catch(() => {});
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

