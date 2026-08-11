export interface DailyTip {
  id: string;
  category: string;
  rule: string;
  explanation: string;
  example: string;
  moduleId?: string;
}

/**
 * Banco editorial curado de regras SuVeCA. A seleção é estável por dia para
 * que a pessoa possa voltar à dica sem receber uma resposta diferente.
 */
export const DAILY_TIPS: DailyTip[] = [
  {
    id: 'haver-impessoal',
    category: 'Concordância verbal',
    rule: 'Haver, no sentido de existir, é impessoal: fica sempre no singular.',
    explanation:
      'O termo posterior não é sujeito; por isso, não leva o verbo ao plural.',
    example: 'Houve muitas dúvidas na revisão — e não “Houveram muitas dúvidas”.',
    moduleId: 'mod7',
  },
  {
    id: 'sujeito-posposto',
    category: 'SuVeCA',
    rule: 'Localize o verbo antes de procurar o sujeito, sobretudo em ordem inversa.',
    explanation:
      'Em “Chegaram os fiscais”, “os fiscais” é o sujeito posposto e determina o plural de “chegaram”.',
    example: 'Ontem chegaram os fiscais ao órgão.',
    moduleId: 'mod0',
  },
  {
    id: 'aspirar-regencia',
    category: 'Regência',
    rule: 'Aspirar, no sentido de desejar, exige a preposição “a”.',
    explanation:
      'No sentido de respirar, o verbo é transitivo direto; no sentido de almejar, é transitivo indireto.',
    example: 'A candidata aspirava a uma vaga de analista.',
    moduleId: 'mod5',
  },
  {
    id: 'mas-portanto',
    category: 'Coesão',
    rule: 'Não troque “mas” por “portanto”: oposição não é conclusão.',
    explanation:
      'Antes de substituir um conector, nomeie a relação lógica que ele cria entre as orações.',
    example: 'Estudou bastante, mas errou por desatenção.',
    moduleId: 'mod2',
  },
  {
    id: 'pronome-relativo',
    category: 'Regência',
    rule: 'A preposição do pronome relativo é exigida pelo termo que vem antes dele.',
    explanation:
      'Em “a regra de que me lembro”, lembrar-se pede “de”; a preposição não é opcional.',
    example: 'Este é o tema de que precisamos.',
    moduleId: 'mod10',
  },
  {
    id: 'crase-teste-masculino',
    category: 'Crase',
    rule: 'Use o teste do masculino: se cabe “ao”, tende a caber “à” no feminino.',
    explanation:
      'O teste verifica a fusão da preposição “a” com o artigo definido feminino.',
    example: 'Vou à repartição / vou ao escritório.',
    moduleId: 'mod10',
  },
  {
    id: 'porques',
    category: 'Ortografia',
    rule: '“Por que” pergunta; “porque” explica; “por quê” fecha a frase; “porquê” é substantivo.',
    explanation:
      'Leia a função na oração em vez de memorizar somente a posição gráfica.',
    example: 'Não entendi o porquê da mudança.',
    moduleId: 'mod3',
  },
  {
    id: 'voz-passiva',
    category: 'Sintaxe',
    rule: 'Na voz passiva, o sujeito sofre a ação; localize quem recebe o fato verbal.',
    explanation:
      'Isso evita confundir o agente da passiva com o sujeito da oração.',
    example: 'Os relatórios foram revisados pelos servidores.',
    moduleId: 'mod6',
  },
];

export const getDailyTip = (date = new Date()): DailyTip => {
  // A data local vira uma semente simples: uma dica por dia, sem depender de rede.
  const daySeed = Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() /
      86_400_000
  );
  return DAILY_TIPS[Math.abs(daySeed) % DAILY_TIPS.length];
};
