import type { CadernoErroItem, QuizQuestion } from '../types/suveca';
import { EDITORIAL_DUEL_QUESTIONS } from '../data/editorialDuelQuestions.generated';

export interface WeaknessDiagnosis {
  id: string;
  topic: string;
  ruleDecisive: string;
  source: 'caderno' | 'bank_trap';
  errorCount: number;
  bank?: string;
  year?: number;
  recommendation: string;
  relatedModuleId?: string;
}

export interface ChallengeQuestion {
  id: string;
  prompt: string;
  supportText?: string;
  options: Array<{ letter: string; text: string }>;
  correctAnswer: string;
  ruleTitle: string;
  decisiveRule: string;
  mentalTest: string;
  whyCorrect: string;
  bank?: string;
  targetWeakness: string;
  originErrorId?: string;
}

export interface SyntaxMatchPair {
  id: string;
  category: 'SUJEITO' | 'VERBO' | 'COMPLEMENTO' | 'ADJUNTO' | 'PREDICATIVO' | 'CONECTOR';
  shortLabel: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'teal';
  term: string;
  testMental: string;
  contrastCaveat: string;
}

export interface ChallengeRoundSummary {
  totalQuestions: number;
  correctCount: number;
  totalTimeSeconds: number;
  xpEarned: number;
  diagnosedWeaknesses: WeaknessDiagnosis[];
  savedToNotebookCount: number;
  completedAt: string;
}

/** 3 Armadilhas canônicas padrão quando o usuário ainda não possui erros no Caderno */
export const CANONICAL_BANK_TRAPS: readonly WeaknessDiagnosis[] = [
  {
    id: 'trap_concordancia_haver_se',
    topic: 'Concordância: Verbo Haver & Partícula SE',
    ruleDecisive: 'Haver (sentido de existir) é impessoal e fica no singular. Com VTD + SE, o verbo concorda com o sujeito paciente.',
    source: 'bank_trap',
    errorCount: 1,
    bank: 'CEBRASPE / FGV',
    recommendation: 'Revisar Aula 09 (Concordância Verbal)',
    relatedModuleId: 'mod9',
  },
  {
    id: 'trap_crase_preposicoes',
    topic: 'Crase: Fusão Obrigatória vs Proibida',
    ruleDecisive: 'Crase proibida antes de palavras masculinas, verbos e pronomes de tratamento (exceto dona/senhora/senhorita).',
    source: 'bank_trap',
    errorCount: 1,
    bank: 'FGV / FCC',
    recommendation: 'Revisar Aula 10 (Regência e Crase)',
    relatedModuleId: 'mod10',
  },
  {
    id: 'trap_pontuacao_suveca',
    topic: 'Pontuação: Vírgula Proibida e Termos Deslocados',
    ruleDecisive: 'É proibido separar Sujeito do Verbo ou Verbo do seu Complemento por vírgula simples na ordem direta.',
    source: 'bank_trap',
    errorCount: 1,
    bank: 'FCC / VUNESP',
    recommendation: 'Revisar Aula 08 (Pontuação)',
    relatedModuleId: 'mod8',
  },
] as const;

/**
 * Analisa o Caderno de Erros e extrai as 3 fraquezas mais urgentes (não dominadas).
 * Se o Caderno tiver menos de 3 erros, preenche com as armadilhas canônicas das bancas.
 */
export function diagnoseWeaknesses(errors: CadernoErroItem[]): WeaknessDiagnosis[] {
  const pendingErrors = errors.filter((item) => item.status !== 'dominado');

  if (pendingErrors.length === 0) {
    return [...CANONICAL_BANK_TRAPS];
  }

  // Agrupar erros por tópico / regra
  const groupMap = new Map<string, { count: number; items: CadernoErroItem[] }>();

  pendingErrors.forEach((err) => {
    const key = (err.conteudo || 'Regra Sintática').trim();
    const current = groupMap.get(key) || { count: 0, items: [] };
    current.count += err.status === 'dia0' ? 3 : err.status === 'dia1' ? 2 : 1;
    current.items.push(err);
    groupMap.set(key, current);
  });

  const sortedGroups = Array.from(groupMap.entries()).sort((a, b) => b[1].count - a[1].count);

  const diagnoses: WeaknessDiagnosis[] = [];

  for (let i = 0; i < sortedGroups.length && diagnoses.length < 3; i++) {
    const [topic, data] = sortedGroups[i];
    const representative = data.items[0];

    diagnoses.push({
      id: `diag_${representative.id}`,
      topic,
      ruleDecisive: representative.regraDecisiva || 'Aplicar o método SuVeCA para desarmar a armadilha da banca.',
      source: 'caderno',
      errorCount: data.items.length,
      bank: representative.bank || undefined,
      year: representative.year || undefined,
      recommendation: representative.moduleRef ? `Revisar aula vinculada: ${representative.moduleRef}` : 'Revisar no Caderno de Erros',
      relatedModuleId: representative.moduleRef,
    });
  }

  // Preenche se ainda houver menos de 3 diagnósticos
  let trapIndex = 0;
  while (diagnoses.length < 3 && trapIndex < CANONICAL_BANK_TRAPS.length) {
    const candidate = CANONICAL_BANK_TRAPS[trapIndex];
    if (!diagnoses.some((d) => d.topic.toLowerCase().includes(candidate.topic.toLowerCase().slice(0, 10)))) {
      diagnoses.push(candidate);
    }
    trapIndex++;
  }

  return diagnoses.slice(0, 3);
}

/**
 * Constrói 3 questões de alto impacto para a rodada relâmpago de 45 segundos,
 * priorizando os erros do usuário ou a base editorial canônica.
 */
export function generateChallengeRound(
  errors: CadernoErroItem[],
  customQuestionsPool: QuizQuestion[] = []
): ChallengeQuestion[] {
  const diagnoses = diagnoseWeaknesses(errors);
  const challengeQuestions: ChallengeQuestion[] = [];
  const usedPromptIds = new Set<string>();

  // 1. Tentar selecionar questões que batem com as fraquezas do Caderno
  for (const diagnosis of diagnoses) {
    if (challengeQuestions.length >= 3) break;

    // Buscar em perguntas do Caderno de Erros primeiro
    const matchingError = errors.find(
      (e) => e.conteudo === diagnosis.topic && e.questionText && !usedPromptIds.has(e.questionId || e.id)
    );

    if (matchingError && matchingError.questionText) {
      const qId = matchingError.questionId || matchingError.id;
      usedPromptIds.add(qId);
      challengeQuestions.push({
        id: `cq_err_${qId}`,
        prompt: matchingError.questionText,
        options: [
          { letter: 'C', text: 'Certo' },
          { letter: 'E', text: 'Errado' },
        ],
        correctAnswer: matchingError.correctAnswer || (matchingError.selectedAnswer === 'C' ? 'E' : 'C'),
        ruleTitle: matchingError.conteudo,
        decisiveRule: matchingError.regraDecisiva,
        mentalTest: matchingError.novoExemplo || 'Reconstruir a oração na ordem Su-Ve-C-A para validar.',
        whyCorrect: matchingError.regraDecisiva,
        bank: matchingError.bank || 'Concurso Oficial',
        targetWeakness: diagnosis.topic,
        originErrorId: matchingError.id,
      });
      continue;
    }

    // Buscar no pool de questões customizadas ou dos módulos
    const matchingPool = customQuestionsPool.find(
      (q) => !usedPromptIds.has(q.id) && q.topic?.toLowerCase().includes(diagnosis.topic.toLowerCase().slice(0, 8))
    );

    if (matchingPool) {
      usedPromptIds.add(matchingPool.id);
      challengeQuestions.push({
        id: `cq_pool_${matchingPool.id}`,
        prompt: matchingPool.questionText,
        supportText: matchingPool.supportText,
        options: matchingPool.options || [
          { letter: 'C', text: 'Certo' },
          { letter: 'E', text: 'Errado' },
        ],
        correctAnswer: matchingPool.correctAnswer,
        ruleTitle: matchingPool.topic || diagnosis.topic,
        decisiveRule: matchingPool.resolution?.decisiveRule || matchingPool.commentary.slice(0, 180),
        mentalTest: matchingPool.resolution?.mentalTest || 'Aplicar o desmembramento SuVeCA.',
        whyCorrect: matchingPool.resolution?.whyCorrect || matchingPool.commentary,
        bank: matchingPool.bank || 'Banca Oficial',
        targetWeakness: diagnosis.topic,
      });
      continue;
    }
  }

  // 2. Preencher o restante com as questões da base editorial rápida (EDITORIAL_DUEL_QUESTIONS)
  let duelIdx = 0;
  while (challengeQuestions.length < 3 && duelIdx < EDITORIAL_DUEL_QUESTIONS.length) {
    const duelQ = EDITORIAL_DUEL_QUESTIONS[duelIdx];
    if (!usedPromptIds.has(duelQ.id)) {
      usedPromptIds.add(duelQ.id);
      const targetWeakness = diagnoses[challengeQuestions.length]?.topic || 'Sintaxe & Morfologia Essencial';
      challengeQuestions.push({
        id: `cq_duel_${duelQ.id}`,
        prompt: duelQ.prompt,
        options: duelQ.options.map((opt) => ({ letter: opt.id, text: opt.text })),
        correctAnswer: duelQ.correctOptionId,
        ruleTitle: 'Método SuVeCA Aplicado',
        decisiveRule: duelQ.explanation.split('\n')[0] || 'Identificar a estrutura sintática padrão.',
        mentalTest: 'Verificar se o termo exerce função de Sujeito, Complemento ou Adjunto.',
        whyCorrect: duelQ.explanation,
        bank: 'CEBRASPE / Inédita Editorial',
        targetWeakness,
      });
    }
    duelIdx++;
  }

  return challengeQuestions.slice(0, 3);
}

/**
 * Base de Pares de Conceitos do Jogo de Associação Sintática SuVeCA
 */
export const SYNTAX_MATCH_PAIRS: readonly SyntaxMatchPair[] = [
  {
    id: 'pair_adj_adnominal',
    category: 'ADJUNTO',
    shortLabel: 'A(adn)',
    color: 'purple',
    term: 'Adjunto Adnominal',
    testMental: 'Termo com valor ativo, posse ou caracterizador inerente a um substantivo.',
    contrastCaveat: 'Não confundir com Complemento Nominal (que possui valor passivo/alvo).',
  },
  {
    id: 'pair_comp_nominal',
    category: 'COMPLEMENTO',
    shortLabel: 'CN',
    color: 'amber',
    term: 'Complemento Nominal',
    testMental: 'Termo preposicionado com valor passivo/alvo de substantivo abstrato, adjetivo ou advérbio.',
    contrastCaveat: 'Ex: "A construção do prédio" (o prédio é construído = alvo/passivo = CN).',
  },
  {
    id: 'pair_obj_indireto',
    category: 'COMPLEMENTO',
    shortLabel: 'C(OI)',
    color: 'amber',
    term: 'Objeto Indireto',
    testMental: 'Completa o sentido de verbo transitivo indireto (VTI), regido por preposição obrigatória.',
    contrastCaveat: 'Liga-se a verbo; Complemento Nominal liga-se a substantivo, adjetivo ou advérbio.',
  },
  {
    id: 'pair_predicativo_sujeito',
    category: 'PREDICATIVO',
    shortLabel: 'Pred(Su)',
    color: 'rose',
    term: 'Predicativo do Sujeito',
    testMental: 'Atributo, qualidade ou estado atribuído ao sujeito (por verbo de ligação ou transitivo).',
    contrastCaveat: 'Ex: "Os alunos saíram [cansados]" (cansados qualifica os alunos no momento do verbo).',
  },
  {
    id: 'pair_particula_apassivadora',
    category: 'VERBO',
    shortLabel: 'Ve+PA',
    color: 'emerald',
    term: 'Partícula Apassivadora (SE)',
    testMental: 'VTD / VTDI + SE que admite conversão para voz passiva analítica ("Alugam-se casas" = "Casas são alugadas").',
    contrastCaveat: 'O termo posterior NÃO é objeto direto, é o SUJEITO PACIENTE (o verbo concorda com ele).',
  },
  {
    id: 'pair_indice_indeterminacao',
    category: 'SUJEITO',
    shortLabel: 'IIS',
    color: 'blue',
    term: 'Índice de Indeterminação do Sujeito',
    testMental: 'VTI / VI / VL + SE mantendo o verbo estritamente na 3ª pessoa do singular ("Precisa-se de fiscais").',
    contrastCaveat: 'Não admite conversão para passiva analítica; o termo preposicionado é Objeto Indireto.',
  },
  {
    id: 'pair_crase_proibida',
    category: 'CONECTOR',
    shortLabel: 'Crase Ø',
    color: 'teal',
    term: 'Crase Proibida',
    testMental: 'Ocorre antes de palavra masculina, verbo no infinitivo, pronome pessoal ou plural com "a" singular.',
    contrastCaveat: 'Ex: "A pé", "A partir de", "A ela", "A pessoas desconhecidas" (sem crase).',
  },
  {
    id: 'pair_haver_impessoal',
    category: 'VERBO',
    shortLabel: 'Ve(Imp)',
    color: 'emerald',
    term: 'Verbo HAVER Impessoal',
    testMental: 'No sentido de "existir" ou "tempo decorrido", fica fixo na 3ª pessoa do singular ("Houve muitos aprovados").',
    contrastCaveat: 'O termo posterior ("muitos aprovados") é OBJETO DIRETO e não sujeito.',
  },
] as const;

/**
 * Embaralha os cartões para o mini-game de associação sintática
 */
export function generateMemoryGameDeck(pairCount: number = 4): {
  terms: Array<{ id: string; pairId: string; text: string; color: string; shortLabel: string }>;
  definitions: Array<{ id: string; pairId: string; text: string; category: string }>;
} {
  const selectedPairs = [...SYNTAX_MATCH_PAIRS]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(pairCount, SYNTAX_MATCH_PAIRS.length));

  const terms = selectedPairs
    .map((p) => ({
      id: `term_${p.id}`,
      pairId: p.id,
      text: p.term,
      color: p.color,
      shortLabel: p.shortLabel,
    }))
    .sort(() => Math.random() - 0.5);

  const definitions = selectedPairs
    .map((p) => ({
      id: `def_${p.id}`,
      pairId: p.id,
      text: p.testMental,
      category: p.category,
    }))
    .sort(() => Math.random() - 0.5);

  return { terms, definitions };
}

// -----------------------------------------------------------------------------
// 4. MATRIZ 2×2 METACOGNITIVA (Confiança × Acurácia)
// -----------------------------------------------------------------------------

export type MetacognitiveQuadrantId =
  | 'q1_mastery'
  | 'q2_fragile'
  | 'q3_conscious_doubt'
  | 'q4_illusion';

export interface MetacognitiveQuadrantData {
  id: MetacognitiveQuadrantId;
  name: string;
  shortLabel: string;
  tagline: string;
  confidence: 'Alta' | 'Baixa';
  accuracy: 'Acerto' | 'Erro';
  count: number;
  percentage: number;
  color: 'emerald' | 'amber' | 'blue' | 'rose';
  riskLevel: 'baixo' | 'moderado' | 'alto' | 'critico';
  pedagogicalAdvice: string;
}

export interface MetacognitiveMatrixSummary {
  totalAnalyzed: number;
  calibrationScore: number;
  illusionRate: number;
  quadrants: Record<MetacognitiveQuadrantId, MetacognitiveQuadrantData>;
  diagnosticMessage: string;
}

/**
 * Computa a calibração metacognitiva cruzando confiança estimada com acerto real.
 * Utiliza o histórico do Caderno de Erros (onde erros com convicção viram Q4) e tentativas de questões.
 */
export function computeMetacognitiveMatrix(
  practiceAnswered: number,
  practiceCorrect: number,
  errors: CadernoErroItem[],
  observedAttempts: Array<{
    isCorrect: boolean;
    confidence: 'guess' | 'low' | 'medium' | 'high';
  }> = []
): MetacognitiveMatrixSummary {
  const totalQuestions = Math.max(practiceAnswered, errors.length > 0 ? errors.length * 2 : 10);
  const correctCount = practiceCorrect > 0 ? practiceCorrect : Math.max(0, totalQuestions - errors.length);
  const incorrectCount = Math.max(0, totalQuestions - correctCount);

  const hasObservedCalibration = observedAttempts.length > 0;
  const isHighConfidence = (confidence: 'guess' | 'low' | 'medium' | 'high') =>
    confidence === 'medium' || confidence === 'high';
  // Quando o PBL fornece confiança observada, usa-se o quadrante real. A
  // estimativa legada permanece apenas para históricos sem esse sinal.
  const observedMasteryCorrect = observedAttempts.filter(
    (attempt) => attempt.isCorrect && isHighConfidence(attempt.confidence)
  ).length;
  const observedFragileCorrect = observedAttempts.filter(
    (attempt) => attempt.isCorrect && !isHighConfidence(attempt.confidence)
  ).length;
  const observedConsciousErrors = observedAttempts.filter(
    (attempt) => !attempt.isCorrect && !isHighConfidence(attempt.confidence)
  ).length;
  const observedIllusionErrors = observedAttempts.filter(
    (attempt) => !attempt.isCorrect && isHighConfidence(attempt.confidence)
  ).length;
  const estimatedIllusionErrors = errors.filter((e) => e.status === 'dia0' || e.status === 'dia1').length;
  const illusionErrors = hasObservedCalibration ? observedIllusionErrors : estimatedIllusionErrors;
  const consciousErrors = hasObservedCalibration
    ? observedConsciousErrors
    : Math.max(0, incorrectCount - estimatedIllusionErrors);
  const masteryCorrect = hasObservedCalibration
    ? observedMasteryCorrect
    : Math.round(correctCount * 0.75);
  const fragileCorrect = hasObservedCalibration
    ? observedFragileCorrect
    : Math.max(0, correctCount - masteryCorrect);

  const total = Math.max(1, masteryCorrect + fragileCorrect + consciousErrors + illusionErrors);

  const q1: MetacognitiveQuadrantData = {
    id: 'q1_mastery',
    name: 'Acerto Confiante',
    shortLabel: 'Q1',
    tagline: 'Alta Certeza + Acerto',
    confidence: 'Alta',
    accuracy: 'Acerto',
    count: masteryCorrect,
    percentage: Math.round((masteryCorrect / total) * 100),
    color: 'emerald',
    riskLevel: 'baixo',
    pedagogicalAdvice: 'A resposta foi correta e confiante. Confirme retenção em recuperação futura antes de ampliar o espaçamento.',
  };

  const q2: MetacognitiveQuadrantData = {
    id: 'q2_fragile',
    name: 'Acerto Frágil / Chute',
    shortLabel: 'Q2',
    tagline: 'Baixa Certeza + Acerto',
    confidence: 'Baixa',
    accuracy: 'Acerto',
    count: fragileCorrect,
    percentage: Math.round((fragileCorrect / total) * 100),
    color: 'amber',
    riskLevel: 'moderado',
    pedagogicalAdvice: 'Acertou por eliminação ou intuição. Exige consolidar a Regra Decisiva para não oscilar na prova.',
  };

  const q3: MetacognitiveQuadrantData = {
    id: 'q3_conscious_doubt',
    name: 'Dúvida Consciente',
    shortLabel: 'Q3',
    tagline: 'Baixa Certeza + Erro',
    confidence: 'Baixa',
    accuracy: 'Erro',
    count: consciousErrors,
    percentage: Math.round((consciousErrors / total) * 100),
    color: 'blue',
    riskLevel: 'alto',
    pedagogicalAdvice: 'Você sabia que estava em dúvida. Zona de ouro para estudo ativo na apostila e no PBL.',
  };

  const q4: MetacognitiveQuadrantData = {
    id: 'q4_illusion',
    name: 'Erro de Alta Confiança',
    shortLabel: 'Q4',
    tagline: 'Alta Certeza + Erro',
    confidence: 'Alta',
    accuracy: 'Erro',
    count: illusionErrors,
    percentage: Math.round((illusionErrors / total) * 100),
    color: 'rose',
    riskLevel: 'critico',
    pedagogicalAdvice: 'A convicção estava desalinhada ao resultado. Investigue a regra e só atribua armadilha quando houver mapeamento específico.',
  };

  const calibrationScore = Math.round(((masteryCorrect + consciousErrors) / total) * 100);
  const illusionRate = Math.round((illusionErrors / total) * 100);

  let diagnosticMessage = 'Excelente calibração! Você reconhece com precisão o que sabe e onde estão suas dúvidas.';
  if (illusionRate > 25) {
    diagnosticMessage = 'Atenção às Armadilhas: Sua taxa de Ilusão de Competência está alta. Desconfie de regras aparentes e aplique o Teste Mental SuVeCA.';
  } else if (q2.percentage > 30) {
    diagnosticMessage = 'Muitos acertos frágeis: Você está acertando por eliminação. Fortaleça a teoria das aulas vinculadas.';
  }

  return {
    totalAnalyzed: total,
    calibrationScore,
    illusionRate,
    quadrants: {
      q1_mastery: q1,
      q2_fragile: q2,
      q3_conscious_doubt: q3,
      q4_illusion: q4,
    },
    diagnosticMessage,
  };
}

// -----------------------------------------------------------------------------
// 5. RADAR DE BANCAS & ARMADILHAS FREQUENTES
// -----------------------------------------------------------------------------

export interface ExamBoardMetrics {
  board: string;
  totalAttempts: number;
  correctCount: number;
  accuracy: number;
  errorCount: number;
}

export interface ExamBoardAnalysis {
  boards: ExamBoardMetrics[];
  dominantBoard?: string;
  mostVulnerableBoard?: string;
  topOverallTraps: Array<{ rule: string; bank: string; count: number; recommendation: string }>;
}

/**
 * Consolida o desempenho do estudante categorizado pelas principais bancas examinadoras.
 */
export function computeExamBoardStats(
  errors: CadernoErroItem[],
  practiceAnswered: number = 0,
  practiceCorrect: number = 0
): ExamBoardAnalysis {
  const canonicalBoards = ['CEBRASPE', 'FGV', 'FCC', 'VUNESP'];
  const boardCounts: Record<string, { total: number; correct: number; errors: number }> = {
    CEBRASPE: { total: 0, correct: 0, errors: 0 },
    FGV: { total: 0, correct: 0, errors: 0 },
    FCC: { total: 0, correct: 0, errors: 0 },
    VUNESP: { total: 0, correct: 0, errors: 0 },
  };

  // Contabilizar erros por banca
  errors.forEach((err) => {
    const rawBank = (err.bank || '').toUpperCase();
    const matchedBoard = canonicalBoards.find((b) => rawBank.includes(b)) || 'CEBRASPE';
    boardCounts[matchedBoard].errors += 1;
    boardCounts[matchedBoard].total += 1;
  });

  // Distribuir acertos gerais estimados entre as bancas
  const totalAssignedErrors = Object.values(boardCounts).reduce((acc, b) => acc + b.errors, 0);
  const remainingCorrect = Math.max(0, practiceCorrect);

  canonicalBoards.forEach((b, idx) => {
    const slice = Math.floor(remainingCorrect / 4) + (idx < remainingCorrect % 4 ? 1 : 0);
    boardCounts[b].correct += slice;
    boardCounts[b].total += slice;
    if (boardCounts[b].total === 0) {
      boardCounts[b].total = 5;
      boardCounts[b].correct = 4;
    }
  });

  const boardMetrics: ExamBoardMetrics[] = canonicalBoards.map((b) => {
    const data = boardCounts[b];
    const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    return {
      board: b,
      totalAttempts: data.total,
      correctCount: data.correct,
      accuracy,
      errorCount: data.errors,
    };
  });

  // Ordenar para encontrar a banca mais vulnerável (menor acurácia e mais erros)
  const sortedByVulnerability = [...boardMetrics].sort((a, b) => a.accuracy - b.accuracy);
  const mostVulnerableBoard = sortedByVulnerability[0]?.board;

  // Extrair Top Armadilhas
  const trapMap = new Map<string, { bank: string; count: number; recommendation: string }>();

  errors.forEach((err) => {
    const key = err.conteudo || 'Regra Sintática';
    const current = trapMap.get(key) || {
      bank: err.bank || 'Bancas Gerais',
      count: 0,
      recommendation: err.regraDecisiva || 'Aplicar o Método SuVeCA',
    };
    current.count += 1;
    trapMap.set(key, current);
  });

  let topTraps = Array.from(trapMap.entries())
    .map(([rule, data]) => ({ rule, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (topTraps.length === 0) {
    topTraps = CANONICAL_BANK_TRAPS.map((trap) => ({
      rule: trap.topic,
      bank: trap.bank || 'CEBRASPE / FGV',
      count: 1,
      recommendation: trap.ruleDecisive,
    }));
  }

  return {
    boards: boardMetrics,
    mostVulnerableBoard,
    topOverallTraps: topTraps,
  };
}

// -----------------------------------------------------------------------------
// 6. SIMULADO DE RECUPERAÇÃO DO CADERNO DE ERROS
// -----------------------------------------------------------------------------

/**
 * Converte erros em aberto do Caderno em um Simulado de Recuperação ativo.
 */
export function generateRecoverySimulado(
  errors: CadernoErroItem[],
  maxQuestions: number = 5
): QuizQuestion[] {
  const pendingErrors = errors.filter((e) => e.status !== 'dominado');
  const targetErrors = (pendingErrors.length > 0 ? pendingErrors : errors).slice(0, maxQuestions);

  if (targetErrors.length === 0) {
    // Fallback com questões das armadilhas canônicas
    return [
      {
        id: 'recov_trap_01',
        type: 'CERTO_ERRADO',
        topic: 'Concordância Verbal & Verbo Haver',
        questionText: 'Julgue o item: "Houveram muitos incidentes na rodovia federal durante a madrugada."',
        options: [
          { letter: 'C', text: 'Certo' },
          { letter: 'E', text: 'Errado' },
        ],
        correctAnswer: 'E',
        commentary: 'O verbo HAVER no sentido de existir é impessoal e deve permanecer no singular: "Houve muitos incidentes".',
        bank: 'CEBRASPE (2024)',
        resolution: {
          decisiveRule: 'Haver (existir/tempo) = Verbo Impessoal fixo na 3ª pessoa do singular.',
          mentalTest: 'Substituir por "Existiram". Se couber, "Houve" fica no singular.',
          whyCorrect: 'O verbo haver não admite sujeito; "muitos incidentes" funciona como objeto direto.',
        },
      },
      {
        id: 'recov_trap_02',
        type: 'CERTO_ERRADO',
        topic: 'Crase Proibida',
        questionText: 'Julgue o item: "O palestrante começou a falar de improviso, dirigindo-se à todos os presentes."',
        options: [
          { letter: 'C', text: 'Certo' },
          { letter: 'E', text: 'Errado' },
        ],
        correctAnswer: 'E',
        commentary: 'A crase é proibida antes do pronome indefinido "todos" (palavra masculina e sem artigo feminino).',
        bank: 'FGV (2024)',
        resolution: {
          decisiveRule: 'Proibida crase antes de pronomes indefinidos e palavras masculinas.',
          mentalTest: 'Trocar a palavra por um masculino plural: "dirigindo-se a todos os homens" (sem "aos").',
          whyCorrect: 'Existe apenas a preposição "a", sem fusão com artigo feminino.',
        },
      },
    ];
  }

  return targetErrors.map((err, index) => ({
    id: `recov_${err.id || index}`,
    type: 'CERTO_ERRADO' as const,
    topic: err.conteudo || 'Recuperação Sintática',
    questionText: err.questionText || `Julgue a correção gramatical da seguinte regra: ${err.regraDecisiva}`,
    options: [
      { letter: 'C', text: 'Certo' },
      { letter: 'E', text: 'Errado' },
    ],
    correctAnswer: err.correctAnswer || (err.selectedAnswer === 'C' ? 'E' : 'C'),
    commentary: err.regraDecisiva || 'Aplicação rigorosa do método SuVeCA.',
    bank: err.bank ? `${err.bank}${err.year ? ` (${err.year})` : ''}` : 'Banca Oficial',
    resolution: {
      decisiveRule: err.regraDecisiva,
      mentalTest: err.novoExemplo || 'Reordenar termos na estrutura Su-Ve-C-A.',
      whyCorrect: `Erro catalogado: ${err.erroCometido}. Correção: ${err.regraDecisiva}`,
    },
  }));
}

// -----------------------------------------------------------------------------
// 7. METAS SEMANAIS DE ESTUDO
// -----------------------------------------------------------------------------

export interface WeeklyStudyGoal {
  targetSections: number;
  targetQuestions: number;
}

export interface WeeklyGoalProgress {
  targetSections: number;
  targetQuestions: number;
  sectionsCompleted: number;
  questionsCompleted: number;
  sectionsPercentage: number;
  questionsPercentage: number;
  overallPercentage: number;
  daysLeftInWeek: number;
  isGoalMet: boolean;
}

export const DEFAULT_WEEKLY_GOAL: WeeklyStudyGoal = {
  targetSections: 8,
  targetQuestions: 15,
};

export function computeWeeklyGoalProgress(
  readSectionIdsCount: number,
  practiceAnsweredCount: number,
  goal: WeeklyStudyGoal = DEFAULT_WEEKLY_GOAL
): WeeklyGoalProgress {
  const targetSections = Math.max(1, goal.targetSections);
  const targetQuestions = Math.max(1, goal.targetQuestions);

  const sectionsCompleted = readSectionIdsCount;
  const questionsCompleted = practiceAnsweredCount;

  const sectionsPercentage = Math.min(100, Math.round((sectionsCompleted / targetSections) * 100));
  const questionsPercentage = Math.min(100, Math.round((questionsCompleted / targetQuestions) * 100));
  const overallPercentage = Math.min(100, Math.round((sectionsPercentage + questionsPercentage) / 2));

  // Dias restantes na semana (domingo = 0, sábado = 6)
  const todayDay = new Date().getDay();
  const daysLeftInWeek = todayDay === 0 ? 0 : 7 - todayDay;

  return {
    targetSections,
    targetQuestions,
    sectionsCompleted,
    questionsCompleted,
    sectionsPercentage,
    questionsPercentage,
    overallPercentage,
    daysLeftInWeek,
    isGoalMet: overallPercentage >= 100,
  };
}

// -----------------------------------------------------------------------------
// 8. MAPA DE PROGRESSO DE ESTUDO DO EDITAL
// -----------------------------------------------------------------------------

export interface ModuleStudyProgressScore {
  moduleId: string;
  moduleNum: number;
  title: string;
  theoryReadCount: number;
  theoryTotalCount: number;
  theoryProgressPct: number;
  practiceCorrectCount: number;
  practiceTotalCount: number;
  practiceAccuracyPct: number;
  practiceEvidenceWeight: number;
  pendingErrorsCount: number;
  masteredErrorsCount: number;
  studyProgressScore: number;
  status: 'pronto_para_validacao' | 'em_desenvolvimento' | 'alerta_erros' | 'inicial' | 'nao_iniciado';
}

/**
 * Resume exposição e prática genérica para orientar o estudo. Este indicador
 * não infere aquisição, transferência, retenção nem domínio; essas decisões
 * pertencem ao mastery PBL por competência.
 */
export function computeModuleStudyProgress(
  modules: Array<{ id: string; num: string | number; title: string; sections: Array<unknown> }>,
  errors: CadernoErroItem[],
  readSectionIds: string[] = [],
  practiceData: Record<string, { answered: number; correct: number }> = {}
): ModuleStudyProgressScore[] {
  return modules.map((m) => {
    const totalSections = Math.max(1, m.sections.length);
    const readCount = readSectionIds.filter((id) => id.startsWith(`${m.id}:`)).length;
    const theoryProgressPct = Math.min(100, Math.round((readCount / totalSections) * 100));

    const practice = practiceData[m.id] || { answered: 0, correct: 0 };
    const practiceTotal = practice.answered;
    const practiceCorrect = practice.correct;
    const practiceAccuracyPct = practiceTotal > 0 ? Math.round((practiceCorrect / practiceTotal) * 100) : 0;
    // Uma única resposta correta não pode valer como evidência tão forte quanto
    // uma pequena série. Cinco respostas apenas estabilizam o indicador de
    // prontidão; ainda não o transformam em mastery.
    const practiceEvidenceWeight = Math.min(1, practiceTotal / 5);

    // Erros vinculados ao módulo
    const moduleErrors = errors.filter(
      (e) => e.moduleRef === m.id || e.conteudo?.toLowerCase().includes(m.title.toLowerCase().slice(0, 8))
    );
    const pendingErrorsCount = moduleErrors.filter((e) => e.status !== 'dominado').length;
    const masteredErrorsCount = moduleErrors.filter((e) => e.status === 'dominado').length;

    // Ausência de erro registrado não é evidência positiva. O score representa
    // somente progresso/prontidão e pondera a acurácia pelo tamanho da amostra.
    const weightedPracticePct = practiceAccuracyPct * practiceEvidenceWeight;
    const score = Math.round(theoryProgressPct * 0.5 + weightedPracticePct * 0.5);

    let status: ModuleStudyProgressScore['status'] = 'nao_iniciado';
    if (pendingErrorsCount >= 2) {
      status = 'alerta_erros';
    } else if (score >= 85 && practiceTotal >= 5) {
      status = 'pronto_para_validacao';
    } else if (score >= 45) {
      status = 'em_desenvolvimento';
    } else if (score > 0 || readCount > 0) {
      status = 'inicial';
    }

    return {
      moduleId: m.id,
      moduleNum: Number(m.num) || 0,
      title: m.title,
      theoryReadCount: readCount,
      theoryTotalCount: totalSections,
      theoryProgressPct,
      practiceCorrectCount: practiceCorrect,
      practiceTotalCount: practiceTotal,
      practiceAccuracyPct,
      practiceEvidenceWeight,
      pendingErrorsCount,
      masteredErrorsCount,
      studyProgressScore: score,
      status,
    };
  });
}

// -----------------------------------------------------------------------------
// 9. ESTIMATIVA DA CURVA DE RETENÇÃO E ESTABILIDADE SM-2
// -----------------------------------------------------------------------------

export interface RetentionCurveEstimate {
  estimatedRetentionRate: number;
  stabilityScore: number;
  cardsAtRiskCount: number;
  totalCardsReviewed: number;
  projectedDecay: Array<{ dayOffset: number; label: string; retentionPct: number; optimalReviewDate: string }>;
  tacticalAdvice: string;
}

export function computeRetentionCurveEstimate(
  errors: CadernoErroItem[],
  reviewedCardsCount: number = 0,
  masteredCount: number = 0
): RetentionCurveEstimate {
  const pendingErrors = errors.filter((e) => e.status !== 'dominado');
  const dia0Count = pendingErrors.filter((e) => e.status === 'dia0').length;
  const dia1Count = pendingErrors.filter((e) => e.status === 'dia1').length;
  const dia7Count = pendingErrors.filter((e) => e.status === 'dia7').length;

  const totalTracked = Math.max(1, errors.length + reviewedCardsCount);
  const totalMastered = masteredCount + errors.filter((e) => e.status === 'dominado').length;

  // Taxa de retenção estimada
  const baseRetention = 85;
  const penalty = dia0Count * 5 + dia1Count * 3 + dia7Count * 1;
  const bonus = Math.min(15, totalMastered * 2);
  const estimatedRetentionRate = Math.min(99, Math.max(50, baseRetention - penalty + bonus));

  const stabilityScore = Math.min(100, Math.round((totalMastered / totalTracked) * 100) + 40);

  const today = new Date();
  const formatDateOffset = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const projectedDecay = [
    { dayOffset: 0, label: 'Hoje (Revisão)', retentionPct: 100, optimalReviewDate: formatDateOffset(0) },
    { dayOffset: 1, label: 'D+1 (1ª Fixação)', retentionPct: Math.round(estimatedRetentionRate * 0.95), optimalReviewDate: formatDateOffset(1) },
    { dayOffset: 7, label: 'D+7 (Intermediário)', retentionPct: Math.round(estimatedRetentionRate * 0.82), optimalReviewDate: formatDateOffset(7) },
    { dayOffset: 30, label: 'D+30 (Longo Prazo)', retentionPct: Math.round(estimatedRetentionRate * 0.70), optimalReviewDate: formatDateOffset(30) },
  ];

  let tacticalAdvice = 'Sua memória de longo prazo está com estabilidade alta. Mantenha os reviews diários.';
  if (dia0Count > 0) {
    tacticalAdvice = `Você possui ${dia0Count} regra(s) com retenção frágil (D0). Revise hoje para não esquecer.`;
  } else if (estimatedRetentionRate < 75) {
    tacticalAdvice = 'Atenção à curva de esquecimento: realize a sessão de flashcards ou simulado de recuperação.';
  }

  return {
    estimatedRetentionRate,
    stabilityScore,
    cardsAtRiskCount: dia0Count + dia1Count,
    totalCardsReviewed: totalTracked,
    projectedDecay,
    tacticalAdvice,
  };
}
