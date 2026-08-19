import type { CadernoErroItem, ModuleData } from '../types/suveca';

export interface PriorityRecommendation {
  module: ModuleData;
  errorCount: number;
  reason: string;
  topRules: string[];
  priorityScore: number;
}

const TOPIC_MODULE_MAP: Array<{
  keywords: string[];
  moduleId: string;
}> = [
  {
    keywords: ['fonética', 'fonema', 'letra', 'dígraf', 'encontro vocálico', 'ditongo', 'tritongo', 'hiato', 'sílaba'],
    moduleId: 'mod0',
  },
  {
    keywords: ['acentuação', 'proparoxítona', 'paroxítona', 'oxítona', 'monossílabo', 'acento diferencial'],
    moduleId: 'mod1',
  },
  {
    keywords: ['ortografia', 'porquê', 'por quê', 'por que', 'porque', 'mal', 'mau', 'hífen', 'polifonia', 'x'],
    moduleId: 'mod2',
  },
  {
    keywords: ['estrutura da palavra', 'formação', 'derivação', 'prefixo', 'sufixo', 'composição'],
    moduleId: 'mod3',
  },
  {
    keywords: ['classes de palavras', 'substantivo', 'adjetivo', 'artigo', 'numeral', 'advérbio', 'interjeição'],
    moduleId: 'mod4',
  },
  {
    keywords: ['pronome', 'colocação pronominal', 'próclise', 'ênclise', 'mésoclise', 'relativo', 'demonstrativo'],
    moduleId: 'mod5',
  },
  {
    keywords: ['verbo', 'conjugação', 'tempo', 'modo', 'voz passiva', 'voz ativa', 'particípio', 'gerúndio'],
    moduleId: 'mod6',
  },
  {
    keywords: ['termos essenciais', 'sujeito', 'predicado', 'predicativo', 'objeto direto', 'objeto indireto', 'complemento'],
    moduleId: 'mod7',
  },
  {
    keywords: ['concordância', 'concordância verbal', 'concordância nominal', 'sujeito composto', 'partícula se'],
    moduleId: 'mod8',
  },
  {
    keywords: ['regência', 'regência verbal', 'regência nominal', 'preposição', 'obedecer', 'visar', 'aspirar'],
    moduleId: 'mod9',
  },
  {
    keywords: ['crase', 'aonde', 'onde', 'àquele', 'àquela', 'vou a volto de', 'crase proibida', 'crase facultativa'],
    moduleId: 'mod10',
  },
  {
    keywords: ['pontuação', 'vírgula', 'su ↮ ve', 'vírgula proibida', 'dois pontos', 'ponto e vírgula', 'travessão'],
    moduleId: 'mod11',
  },
  {
    keywords: ['oração subordinada', 'conjunção', 'período composto', 'coordenada', 'substantiva', 'adjetiva', 'adverbial'],
    moduleId: 'mod12',
  },
  {
    keywords: ['funções do que', 'funções do se', 'partícula apassivadora', 'índice de indeterminação', 'pronome apassivador'],
    moduleId: 'mod13',
  },
  {
    keywords: ['redação oficial', 'manual da presidência', 'fecho', 'vocativo', 'concordância em pronomes de tratamento'],
    moduleId: 'mod14',
  },
];

export const getPriorityModuleRecommendation = (
  errors: CadernoErroItem[],
  modules: ModuleData[],
  readSectionIds: string[] = []
): PriorityRecommendation | null => {
  if (!modules || modules.length === 0) return null;

  const pendingErrors = errors.filter((e) => e.status !== 'dominado');
  const moduleScores = new Map<string, { score: number; relatedErrors: CadernoErroItem[] }>();

  // Initialize scores
  modules.forEach((m) => {
    moduleScores.set(m.id, { score: 0, relatedErrors: [] });
  });

  // Calculate error affinity for each module
  pendingErrors.forEach((error) => {
    const errorText = `${error.conteudo} ${error.erroCometido} ${error.regraDecisiva}`.toLowerCase();

    // Direct moduleRef match
    if (error.moduleRef && moduleScores.has(error.moduleRef)) {
      const current = moduleScores.get(error.moduleRef)!;
      current.score += 15;
      current.relatedErrors.push(error);
    }

    // Keyword topic match
    TOPIC_MODULE_MAP.forEach(({ keywords, moduleId }) => {
      const hasMatch = keywords.some((kw) => errorText.includes(kw.toLowerCase()));
      if (hasMatch && moduleScores.has(moduleId)) {
        const current = moduleScores.get(moduleId)!;
        current.score += 8;
        if (!current.relatedErrors.includes(error)) {
          current.relatedErrors.push(error);
        }
      }
    });
  });

  // Find module with the highest priority score
  let bestModuleId = '';
  let highestScore = 0;
  let bestRelatedErrors: CadernoErroItem[] = [];

  moduleScores.forEach((data, modId) => {
    if (data.score > highestScore) {
      highestScore = data.score;
      bestModuleId = modId;
      bestRelatedErrors = data.relatedErrors;
    }
  });

  // Fallback: If no errors exist or score is 0, suggest the first unread module or Module 0
  if (!bestModuleId || highestScore === 0) {
    const unreadModule = modules.find((m) => {
      const totalSections = m.sections?.length || 0;
      const readCount = readSectionIds.filter((id) => id.startsWith(`${m.id}:`)).length;
      return readCount < totalSections;
    }) || modules[0];

    return {
      module: unreadModule,
      errorCount: 0,
      reason: 'Recomendação pedagógica baseada no seu plano de estudos do Método SuVeCA.',
      topRules: [
        'Identificação imediata da ordem direta Su + Ve + C + A',
        'Vacinação contra inversões e termos intercalados',
      ],
      priorityScore: 5,
    };
  }

  const recommendedModule = modules.find((m) => m.id === bestModuleId) || modules[0];
  const uniqueRules = Array.from(
    new Set(
      bestRelatedErrors
        .map((e) => e.regraDecisiva)
        .filter((r) => r && r.trim().length > 5)
    )
  ).slice(0, 3);

  const errorCount = bestRelatedErrors.length;
  const reason = `Detectamos ${errorCount} ${
    errorCount === 1 ? 'dificuldade registrada' : 'erros frequentes registrados'
  } no seu Caderno de Erros relacionados a este conteúdo.`;

  return {
    module: recommendedModule,
    errorCount,
    reason,
    topRules: uniqueRules.length > 0 ? uniqueRules : [
      'Domínio das regras decisivas da banca examinadora',
      'Aplicação do teste mental de substituição SuVeCA',
    ],
    priorityScore: highestScore,
  };
};
