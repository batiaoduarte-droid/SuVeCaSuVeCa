export interface MasteryLevelDefinition {
  level: number;
  title: string;
  minXp: number;
  maxXp: number | null;
  badge: string;
  iconName: string;
  description: string;
  unlockedBenefit: string;
}

export const MASTERY_LEVELS: MasteryLevelDefinition[] = [
  {
    level: 1,
    title: 'Aprendiz da Morfossintaxe',
    minXp: 0,
    maxXp: 299,
    badge: 'Aprendiz',
    iconName: 'Sparkles',
    description: 'Iniciando o reconhecimento das classes de palavras e núcleos da oração.',
    unlockedBenefit: 'Acesso completo ao método SuVeCA e Caderno de Erros.',
  },
  {
    level: 2,
    title: 'Desbravador do SuVeCA',
    minXp: 300,
    maxXp: 799,
    badge: 'Desbravador',
    iconName: 'Compass',
    description: 'Identificação rápida do Sujeito, Verbo e Complementos sem inversões traiçoeiras.',
    unlockedBenefit: 'Desbloqueio de filtros avançados e modo imersivo.',
  },
  {
    level: 3,
    title: 'Analista de Transitividade & Regência',
    minXp: 800,
    maxXp: 1499,
    badge: 'Analista',
    iconName: 'SearchCheck',
    description: 'Prática consistente de verbos transitivos diretos, indiretos, pronominais e termos preposicionados.',
    unlockedBenefit: 'Treino intensivo de questões de bancas com gabarito comentado.',
  },
  {
    level: 4,
    title: 'Estrategista de Pontuação & Crase',
    minXp: 1500,
    maxXp: 2499,
    badge: 'Estrategista',
    iconName: 'Shield',
    description: 'Aplicação cirúrgica de vírgula proibida, termos deslocados e fusão da crase.',
    unlockedBenefit: 'Acesso às estatísticas completas de tempo por questão.',
  },
  {
    level: 5,
    title: 'Caçador de Pegadinhas das Bancas',
    minXp: 2500,
    maxXp: 3999,
    badge: 'Caçador',
    iconName: 'Crosshair',
    description: 'Imunidade contra armadilhas de Cebraspe, FCC, FGV e Vunesp.',
    unlockedBenefit: 'Destravamento do simulado de alta densidade.',
  },
  {
    level: 6,
    title: 'Veterano SuVeCA',
    minXp: 4000,
    maxXp: null,
    badge: 'Veterano',
    iconName: 'Crown',
    description: 'Maior faixa de experiência de estudo no produto; não equivale a domínio curricular.',
    unlockedBenefit: 'Faixa máxima de experiência e presença no topo do ranking.',
  },
];

export interface DomainBreakdownItem {
  category: string;
  xp: number;
  count: number;
  unit: string;
  fill: string;
}

export interface MasteryCalculationInput {
  practiceCorrectCount?: number;
  simuladoCorrectCount?: number;
  flashcardCorrectCount?: number;
  readSectionsCount?: number;
  visitedModulesCount?: number;
  notesCount?: number;
  masteredErrorsCount?: number;
  reviewingErrorsCount?: number;
  unlockedBadgesCount?: number;
  activeStudyStreak?: number;
  bestStreak?: number;
}

export interface MasteryProgressResult {
  totalXp: number;
  currentLevel: MasteryLevelDefinition;
  nextLevel: MasteryLevelDefinition | null;
  progressPercentInLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  breakdown: DomainBreakdownItem[];
  missions: RecommendedMission[];
}

export interface RecommendedMission {
  id: string;
  title: string;
  rewardXp: number;
  completed: boolean;
  actionText: string;
}

export const FLASHCARD_CORRECT_XP = 10;

export const calculateMasteryProgress = (input: MasteryCalculationInput): MasteryProgressResult => {
  const practiceCorrect = input.practiceCorrectCount || 0;
  const simuladoCorrect = input.simuladoCorrectCount || 0;
  const totalCorrectQuestions = practiceCorrect + simuladoCorrect;
  const flashcardCorrect = input.flashcardCorrectCount || 0;

  const readSections = input.readSectionsCount || 0;
  const visitedModules = input.visitedModulesCount || 0;

  const notesCount = input.notesCount || 0;

  const masteredErrors = input.masteredErrorsCount || 0;
  const reviewingErrors = input.reviewingErrorsCount || 0;

  const badgesCount = input.unlockedBadgesCount || 0;
  const studyStreak = input.activeStudyStreak || 0;
  const bestStreak = input.bestStreak || 0;

  // Pontuações de atividade; XP não é evidência de domínio.
  const questionsXp = practiceCorrect * 15 + simuladoCorrect * 20;
  const flashcardsXp = flashcardCorrect * FLASHCARD_CORRECT_XP;
  const lessonsXp = readSections * 10 + visitedModules * 30;
  const notesXp = notesCount * 25;
  const errorVaccinesXp = masteredErrors * 35 + reviewingErrors * 10;
  const badgesAndStreakXp = badgesCount * 75 + studyStreak * 20 + bestStreak * 10;

  const totalXp = questionsXp + flashcardsXp + lessonsXp + notesXp + errorVaccinesXp + badgesAndStreakXp;

  // Encontrar Nível Atual
  let currentLevel = MASTERY_LEVELS[0];
  for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= MASTERY_LEVELS[i].minXp) {
      currentLevel = MASTERY_LEVELS[i];
      break;
    }
  }

  const nextLevelIndex = MASTERY_LEVELS.findIndex((l) => l.level === currentLevel.level) + 1;
  const nextLevel = nextLevelIndex < MASTERY_LEVELS.length ? MASTERY_LEVELS[nextLevelIndex] : null;

  let progressPercentInLevel = 100;
  let xpInCurrentLevel = totalXp - currentLevel.minXp;
  let xpNeededForNextLevel = 0;

  if (nextLevel && currentLevel.maxXp !== null) {
    const levelSpan = nextLevel.minXp - currentLevel.minXp;
    xpNeededForNextLevel = Math.max(0, nextLevel.minXp - totalXp);
    progressPercentInLevel = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / levelSpan) * 100)));
  }

  // Distribuição de XP por tipo de atividade.
  const breakdown: DomainBreakdownItem[] = [
    {
      category: 'Questões',
      xp: questionsXp,
      count: totalCorrectQuestions,
      unit: 'acertos',
      fill: '#0d9488', // teal-600
    },
    {
      category: 'Flashcards',
      xp: flashcardsXp,
      count: flashcardCorrect,
      unit: 'acertos',
      fill: '#4f46e5', // indigo-600
    },
    {
      category: 'Aulas',
      xp: lessonsXp,
      count: readSections,
      unit: 'seções lidas',
      fill: '#059669', // emerald-600
    },
    {
      category: 'Notas de Aula',
      xp: notesXp,
      count: notesCount,
      unit: 'anotações',
      fill: '#0284c7', // sky-600
    },
    {
      category: 'Vacinas de Erro',
      xp: errorVaccinesXp,
      count: masteredErrors,
      unit: 'consolidadas',
      fill: '#d97706', // amber-600
    },
    {
      category: 'Badges & Sequência',
      xp: badgesAndStreakXp,
      count: badgesCount + studyStreak,
      unit: 'conquistas',
      fill: '#7c3aed', // violet-600
    },
  ];

  // Missões Recomendadas para Ganho Rápido de XP
  const missions: RecommendedMission[] = [
    {
      id: 'mission_questions',
      title: 'Responder 10 questões nos módulos ou simulado',
      rewardXp: 150,
      completed: totalCorrectQuestions >= 10,
      actionText: 'Resolver questões',
    },
    {
      id: 'mission_read',
      title: 'Concluir leitura de 5 seções da apostila',
      rewardXp: 50,
      completed: readSections >= 5,
      actionText: 'Abrir apostila',
    },
    {
      id: 'mission_flashcards',
      title: 'Acertar 10 flashcards em revisões ativas',
      rewardXp: 100,
      completed: flashcardCorrect >= 10,
      actionText: 'Revisar flashcards',
    },
    {
      id: 'mission_note',
      title: 'Registrar anotação de aula com Regra de Ouro',
      rewardXp: 25,
      completed: notesCount >= 1,
      actionText: 'Fazer anotação',
    },
    {
      id: 'mission_errors',
      title: 'Consolidar e vacinar 1 regra no Caderno de Erros',
      rewardXp: 35,
      completed: masteredErrors >= 1,
      actionText: 'Revisar erros',
    },
    {
      id: 'mission_streak',
      title: 'Manter sequência de 3 dias seguidos de estudo',
      rewardXp: 60,
      completed: studyStreak >= 3,
      actionText: 'Estudar hoje',
    },
  ];

  return {
    totalXp,
    currentLevel,
    nextLevel,
    progressPercentInLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    breakdown,
    missions,
  };
};
