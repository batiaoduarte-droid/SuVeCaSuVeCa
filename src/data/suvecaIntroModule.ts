import type { ModuleData, ModuleSection, QuizQuestion } from '../types/suveca';
import { SUVECA_METHOD } from './suvecaMethod.generated';

const INTRO_QUESTIONS: QuizQuestion[] = [
  {
    id: 'intro-q1',
    type: 'CERTO_ERRADO',
    bank: 'Conceito Fundamental SuVeCA',
    topic: 'Fundamentos da Sintaxe',
    questionText: 'O Método SuVeCA estabelece que toda oração em Língua Portuguesa deve obrigatoriamente se estruturar na ordem direta (Sujeito + Verbo + Complemento + Adjunto + Predicativo), de modo que frases em ordem inversa ou com termos elípticos são consideradas desvios da norma culta.',
    correctAnswer: 'E',
    commentary: 'ERRADO. A SuVeCA é um MAPA RELACIONAL de análise e não um molde linear ou fila obrigatória de palavras. Em concursos públicos, as bancas frequentemente utilizam frases em ordem inversa (ex: "Ontem chegaram os fiscais" — A + Ve + Su), com sujeito posposto, oculto, indeterminado ou mesmo orações sem sujeito. O papel do método é reconstruir os vínculos sintáticos preservando a disposição real do texto.',
    origin: 'authorial',
    resolution: {
      decisiveRule: 'A SuVeCA mapeia relações funcionais contextuais, nunca uma sequência superficial obrigatória de termos.',
      mentalTest: 'Pergunte-se: "A frase está errada ou apenas em ordem inversa/com termo oculto?" A inversão é perfeitamente válida na norma culta.',
      whyCorrect: 'A afirmação erra ao classificar a ordem inversa e elipses como desvios gramaticais.',
    },
  },
  {
    id: 'intro-q2',
    type: 'MULTIPLA_ESCOLHA',
    bank: 'Metodologia SuVeCA',
    topic: 'Metáfora do Trem',
    questionText: 'Na "Metáfora do Trem" adotada pelo Método SuVeCA para representar os níveis de estruturação da Língua Portuguesa, a qual elemento corresponde a "Escala da Oração"?',
    options: [
      { letter: 'A', text: 'Às peças individuais dos vagões (morfologia e classes de palavras isoladas).' },
      { letter: 'B', text: 'Aos vagões montados internamente (núcleos e seus modificadores adnominais).' },
      { letter: 'C', text: 'Ao trem estruturado com o verbo atuando como motor relacional que organiza sujeito, complementos, adjuntos e predicativos.' },
      { letter: 'D', text: 'À malha ferroviária completa e à rota dos trilhos (coesão textual e progressão discursiva).' },
      { letter: 'E', text: 'Exclusivamente às conexões mecânicas de engate entre vagões (conjunções coordenativas).' },
    ],
    correctAnswer: 'C',
    commentary: 'CORRETA A ALTERNATIVA C. Na Metáfora do Trem do SuVeCA: 1) Palavras = peças; 2) Sintagmas = vagões; 3) Oração = o trem montado com o verbo como motor relacional; 4) Período composto = múltiplos trens acoplados por conectores; 5) Texto/Discurso = a malha ferroviária integrada.',
    origin: 'authorial',
    resolution: {
      decisiveRule: 'O verbo é a locomotiva/motor relacional que ancora e organiza os termos essenciais, integrantes e acessórios da oração.',
      whyCorrect: 'A alternativa C descreve com precisão a 3ª escala da metáfora.',
    },
  },
  {
    id: 'intro-q3',
    type: 'CERTO_ERRADO',
    bank: 'Protocolo Decisório',
    topic: 'Algoritmo de Resolução',
    questionText: 'No algoritmo de 8 passos do Método SuVeCA (OR → VE → SU → C → A → PRED → MAPA → PROVA), a primeira etapa obrigatória ao analisar um período para fins de pontuação ou concordância é delimitar as orações e localizar os núcleos verbais antes de tentar classificar qualquer termo isolado.',
    correctAnswer: 'C',
    commentary: 'CERTO. O primeiro passo inegociável é delimitar as orações (OR) e encontrar o núcleo verbal (VE). Tentar classificar termos como "sujeito" ou "objeto" sem antes delimitar a oração e o verbo que a rege é a causa número um de erros em bancas como FGV e CEBRASPE (por exemplo, confundir o sujeito de uma oração subordinada com o complemento da oração principal).',
    origin: 'authorial',
    resolution: {
      decisiveRule: 'Delimite as orações e o verbo antes de atribuir função sintática a qualquer sintagma.',
      mentalTest: 'Quantos verbos há no período? Cada verbo comanda sua própria oração e seu próprio mapa SuVeCA.',
      whyCorrect: 'A sequência procedimental correta começa invariavelmente pela delimitação das fronteiras oracionais.',
    },
  },
  {
    id: 'intro-q4',
    type: 'MULTIPLA_ESCOLHA',
    bank: 'Código Visual SuVeCA',
    topic: 'Identificação por Cores',
    questionText: 'Considere a frase: "Ontem à noite, os auditores entregaram os pareceres técnicos ao colegiado." De acordo com o código de cores e blocos do aplicativo, quais etiquetas e cores identificam corretamente os termos "os auditores" e "os pareceres técnicos"?',
    options: [
      { letter: 'A', text: 'Verde (Ve - Verbo) e Amarelo (C - Complemento).' },
      { letter: 'B', text: 'Azul (Su - Sujeito) e Amarelo (C - Objeto Direto).' },
      { letter: 'C', text: 'Roxo (A - Adjunto) e Rosa (Pred - Predicativo).' },
      { letter: 'D', text: 'Azul (Su - Sujeito) e Roxo (A - Adjunto Adnominal).' },
      { letter: 'E', text: 'Ciano (Aposto) e Verde (Ve - Verbo Transitivo).' },
    ],
    correctAnswer: 'B',
    commentary: 'CORRETA A ALTERNATIVA B. No código do aplicativo: "os auditores" = Sujeito Determinado Simples (🔵 Azul / Su); "entregaram" = Verbo VTDI (🟢 Verde / Ve); "os pareceres técnicos" = Objeto Direto (🟡 Amarelo / C); "ao colegiado" = Objeto Indireto (🟡 Amarelo / C); "Ontem à noite" = Adjunto Adverbial de Tempo Deslocado (🟣 Roxo / A).',
    origin: 'authorial',
    resolution: {
      decisiveRule: 'Sujeito é sempre sinalizado em Azul (Su) e Complementos Verbais/Nominais em Amarelo (C).',
      whyCorrect: 'A correspondência de "os auditores" (Sujeito / Azul) e "os pareceres técnicos" (Objeto Direto / Amarelo) está impecável.',
    },
  },
  {
    id: 'intro-q5',
    type: 'CERTO_ERRADO',
    bank: 'Princípio de Não-Intrusão',
    topic: 'Hierarquia das Camadas',
    questionText: 'Em matérias puramente fonético-ortográficas (como regras de acentuação gráfica, divisão silábica e emprego do hífen na Aula 00), o Método SuVeCA deve ser aplicado como critério determinante para justificar a presença de acentos e hífens.',
    correctAnswer: 'E',
    commentary: 'ERRADO. Pelo Princípio de Não-Intrusão e pela hierarquia de 7 camadas da língua, regras fonológicas e ortográficas pertencem à camada 1 (Forma e Ortografia) e possuem regras determinantes próprias (posição da sílaba tônica, encontros vocálicos, prefixação com hífen). A SuVeCA atua apenas como suporte contextual (por exemplo, na distinção de porquês ou em pronomes enclíticos), mas nunca substitui a regra fonológica específica.',
    origin: 'authorial',
    resolution: {
      decisiveRule: 'A SuVeCA não é uma teoria universal e não substitui as regras decisivas próprias de cada camada linguística.',
      mentalTest: 'A dúvida é sobre som/letra (fonética/ortografia) ou sobre relações entre termos (sintaxe)? Não force sintaxe em fonologia.',
      whyCorrect: 'A acentuação e o hífen são decididos por critérios fonológicos e morfológicos, e não pela análise SuVeCA.',
    },
  },
];

const INTRO_SECTIONS: ModuleSection[] = [
  {
    title: '1. O que é o Método SuVeCA (e o que NÃO é)',
    summary: 'Compreenda a equação funcional do método, a distinção entre mapa relacional e ordem linear, e por que o SuVeCA é a bússola essencial para provas de alto nível.',
    estimatedMinutes: 5,
    searchTerms: ['equação suveca', 'mapa relacional', 'ordem direta', 'ordem inversa', 'fundamentos sintaxe'],
    contentMarkdown: `### Bem-vindo ao Método SuVeCA

O **SuVeCA** é o sistema de orientação cognitiva e tática do curso de Língua Portuguesa para concursos públicos. Ele foi concebido para resolver a maior dor do concurseiro: **identificar com precisão cirúrgica a função de cada termo na oração, desarmando as armadilhas sintáticas das bancas examinadoras (CEBRASPE, FGV, FCC, Vunesp).**

---

### A Equação Fundamental

$$\\mathbf{SuVeCA} = \\mathbf{Su}\\text{jeito} + \\mathbf{Ve}\\text{rbo} + \\mathbf{C}\\text{omplemento} + \\mathbf{A}\\text{djunto} + \\mathbf{Pred}\\text{icativo}$$

Na nomenclatura didática da plataforma, expandimos a sigla para englobar os cinco grandes papéis da oração: **Su–Ve–C–A–Pred**, além de seus conectores, apostos e vocativos.

---

### O Princípio Central: Mapa Relacional vs. Molde Linear

> [!IMPORTANT]
> **A SuVeCA é um mapa de relações, NUNCA uma fila linear obrigatória de palavras.**

Um erro comum é imaginar que toda frase em português deva vir na ordem "sujeito primeiro, verbo no meio e complementos no fim". Na prática das bancas de concurso:
* As frases vêm frequentemente em **ordem inversa** (*"Ontem chegaram os auditores"*);
* Termos circunstanciais aparecem **intercalados** (*"O diretor, após muitas reuniões, autorizou o edital"*);
* O sujeito pode ser **posposto**, **oculto/desinencial**, **indeterminado** ou simplesmente **inexistente** (orações impessoais com *haver* ou *fazer*).

A missão do SuVeCA é **preservar a frase na ordem exata em que o examinador a escreveu** e, paralelamente, **reconstruir os fios invisíveis de dependência e concordância** que ligam cada palavra ao seu núcleo.`,
    highlightBox: {
      title: 'Regra de Ouro do Método',
      text: 'Nunca tente forçar a frase a mudar de ordem para entendê-la. Mantenha os blocos no lugar em que aparecem e mapeie quem manda em quem (concordância) e quem completa quem (regência).',
      type: 'rule',
    },
    keyTable: {
      headers: ['Aspecto', 'O que o SuVeCA É', 'O que o SuVeCA NÃO É'],
      rows: [
        ['Natureza', 'Um protocolo mental de análise sintático-funcional', 'Uma nova gramática inventada ou teoria isolada'],
        ['Disposição', 'Um mapa flexível que aceita inversões e omissões', 'Uma fila engessada de palavras na ordem direta'],
        ['Aplicação', 'Focado em desarmar pegadinhas de concordância, regência e pontuação', 'Um substituto cego para regras de acentuação ou interpretação pura'],
        ['Objetivo', 'Garantir 100% de precisão nos testes mentais de prova', 'Decorar regras sem entender os vínculos entre os termos'],
      ],
    },
  },
  {
    title: '2. A Metáfora do Trem e as 5 Escalas da Língua',
    summary: 'Visualize o funcionamento da língua através da analogia do trem: das palavras isoladas (peças) até a malha ferroviária completa do texto e discurso.',
    estimatedMinutes: 4,
    searchTerms: ['metáfora do trem', 'escalas da língua', 'sintagma', 'período composto', 'discurso'],
    contentMarkdown: `### Como a Língua se Organiza: As 5 Escalas

Para dominar a Língua Portuguesa sem se perder em detalhes isolados, o Método SuVeCA organiza o estudo em **5 escalas progressivas de representação visual**, utilizando a **Metáfora do Trem**:

\`\`\`text
METÁFORA DO TREM: AS 5 ESCALAS DA LÍNGUA
1. Palavras (Peças dos vagões)
       ↓
2. Sintagmas (Vagões organizados)
       ↓
3. Oração (Estrutura SuVeCA com motor verbal)
       ↓
4. Período Composto (Trens acoplados por conectores)
       ↓
5. Texto e Discurso (Malha ferroviária completa)
\`\`\`

---

### As 5 Escalas Detalhadas

1. **Escala 1: Palavras — As Peças dos Vagões (Morfologia)**
   * Cada palavra possui uma classe morfológica (substantivo, adjetivo, pronome, verbo, preposição).
   * *A morfologia define a natureza da peça, mas não o lugar onde ela será instalada.*
2. **Escala 2: Sintagmas — Os Vagões Estruturados (Sintaxe de Grupo)**
   * As palavras se agrupam em torno de um núcleo (ex: Sintagma Nominal = determinante + núcleo + modificador).
   * *Exemplo:* *"Os novos auditores concursados"* é um único vagão cujo núcleo é o substantivo *"auditores"*.
3. **Escala 3: Oração — O Trem Estruturado (O Mapa SuVeCA)**
   * **O Verbo é a Locomotiva (Motor Relacional):** Ele traciona a oração, determina quantos complementos são necessários e comanda quem deve concordar com ele.
   * Sujeito, Complementos, Adjuntos e Predicativos ocupam posições funcionais ao redor do motor verbal.
4. **Escala 4: Período Composto — Múltiplos Trens Acoplados (Sintaxe do Período)**
   * Cada oração possui sua própria locomotiva (verbo) e seu próprio mapa SuVeCA.
   * Conjunções e pronomes relativos atuam como os **engates** que conectam uma oração à outra (coordenação ou subordinação).
5. **Escala 5: Texto e Discurso — A Malha Ferroviária Completa (Coesão e Sentido)**
   * Os trens circulam por rotas integradas: referenciação, pronomes anafóricos, paralelismo, coerência e argumentação conectam os períodos do início ao fim do texto.`,
    highlightBox: {
      title: 'Atenção aos Detalhes',
      text: 'Morfologia responde: "O que a palavra é isoladamente?". Sintaxe responde: "O que o grupo de palavras faz na oração?". Não confunda classe com função!',
      type: 'tip',
    },
  },
  {
    title: '3. O Código Visual dos Blocos e Cores do App',
    summary: 'Aprenda o sistema cromático tático utilizado nos visualizadores, flashcards e no Analisador Tático por IA da plataforma.',
    estimatedMinutes: 4,
    searchTerms: ['código de cores', 'blocos sintáticos', 'tokens visuais', 'suveca visual'],
    contentMarkdown: `### O Código Cromático Tático

No aplicativo, cada função sintática é mapeada com uma **cor e etiqueta padronizadas**, permitindo identificar instantaneamente a anatomia de qualquer período:

\`\`\`text
CÓDIGO CROMÁTICO TÁTICO E DESMEMBRAMENTO VISUAL
Su (Azul) | Ve (Verde) | C (Amarelo) | A (Roxo) | Pred (Rosa) | Con (Teal) | Ap/Voc (Ciano)
\`\`\``,
    highlightBox: {
      title: 'Experimente no Analisador',
      text: 'Você pode colar qualquer frase de prova na aba "Analisador" do menu superior para vê-la desmembrada exatamente com essas cores!',
      type: 'tip',
    },
  },
  {
    title: '4. O Algoritmo Decisório de 8 Passos em Provas',
    summary: 'O protocolo mental determinístico em 8 etapas para resolver qualquer questão de sintaxe, pontuação, crase ou concordância sem hesitar.',
    estimatedMinutes: 5,
    searchTerms: ['algoritmo 8 passos', 'protocolo decisório', 'resolução de questões', 'método de prova'],
    contentMarkdown: `### O Protocolo Inegociável de Prova

Diante de uma questão difícil de concurso, não tente resolver por "intuição" ou "ouvido". Execute friamente o **Algoritmo dos 8 Passos SuVeCA**:

\`\`\`mermaid
flowchart TD
    OR["1. OR — Delimite as Orações"] --> VE["2. VE — Encontre o Núcleo Verbal"]
    VE --> SU["3. SU — Resolva o Sujeito"]
    SU --> C["4. C — Complete a Valência (Objetos/CN)"]
    C --> A["5. A — Separe os Adjuntos e Deslocamentos"]
    A --> PRED["6. PRED — Teste os Predicativos"]
    PRED --> MAPA["7. MAPA — Reconstrua o Padrão Relacional"]
    MAPA --> PROVA["8. PROVA — Aplique o Teste Específico da Banca"]
\`\`\`

---

### Detalhamento dos 8 Passos

1. **Passo 1: \`OR\` (Delimitação Oracional)**
   * Conte os verbos e locuções verbais. Cada verbo demarca uma oração. Localize conectores (*que, se, embora, quando, e, mas*).
2. **Passo 2: \`VE\` (Âncora Verbal)**
   * Identifique predicação, transitividade contextual e voz verbal (ativa, passiva sintética com *se*, passiva analítica).
3. **Passo 3: \`SU\` (Resolução do Sujeito)**
   * Pergunte ao verbo: *Quem executa/sofre a ação ou com quem o verbo concorda?*
   * Verifique se o sujeito é determinado, composto, posposto, oculto, indeterminado (*índice de indeterminação*) ou inexistente (*verbo impessoal*).
4. **Passo 4: \`C\` (Complementação de Valência)**
   * Identifique os complementos exigidos pelo verbo: Objeto Direto (sem preposição), Objeto Indireto (com preposição) ou Complemento Nominal.
5. **Passo 5: \`A\` (Separação de Adjuntos)**
   * Isole circunstâncias acessórias (tempo, lugar, modo, causa). Observe se estão antecipadas ou intercaladas.
6. **Passo 6: \`PRED\` (Teste de Predicativos)**
   * Verifique se há adjetivos caracterizando o sujeito ou o objeto por intermédio da ação verbal.
7. **Passo 7: \`MAPA\` (Padrão Relacional)**
   * Registre o padrão da frase real (ex: $A + Ve + Su + C$).
8. **Passo 8: \`PROVA\` (Aplicação da Regra Decisiva da Banca)**
   * Só agora aplique a regra cobrada:
     * *É pontuação?* Proibido separar Su–Ve ou Ve–C por vírgula!
     * *É concordância?* O verbo obedece ao núcleo do Sujeito!
     * *É crase?* O termo regente exige preposição "a" e o regido aceita artigo "a"?
     * *É colocação pronominal?* Há palavra atrativa puxando o pronome para próclise?`,
    limitsAndExceptions: [
      'Em questões de ortografia pura (hífen, acentos), o algoritmo começa apenas se houver dependência de função (ex: porquês).',
      'Não tente pular direto para o Passo 8 sem delimitar as orações no Passo 1.',
    ],
  },
  {
    title: '5. Os 5 Padrões Estruturais Típicos em Concursos',
    summary: 'Conheça os 5 esqueletos sintáticos mais recorrentes em provas de bancas como CEBRASPE, FGV e FCC e saiba como neutralizar suas pegadinhas.',
    estimatedMinutes: 4,
    searchTerms: ['padrões sintáticos', 'ordem inversa', 'oração sem sujeito', 'sujeito indeterminado', 'pegadinhas bancas'],
    contentMarkdown: `### Os 5 Padrões Estruturais de Prova

As bancas examinadoras sabem que a maioria dos candidatos estuda apenas a ordem direta. Por isso, mais de 70% das questões de sintaxe exploram os outros 4 padrões:

\`\`\`text
OS 5 PADRÕES ESTRUTURAIS DE PROVA
Padrão 1: Ordem Direta (Su + Ve + C + A)
Padrão 2: Ordem Inversa (A + Ve + Su ou C + Ve + Su)
Padrão 3: Sujeito Oculto / Desinencial ((Su) + Ve + C)
Padrão 4: Oração Sem Sujeito / Impessoal (Ve + C + A)
Padrão 5: Estrutura com Predicativo (Su + Ve + C + Pred)
\`\`\`

---

#### 1. Padrão 1: Ordem Direta ($Su + Ve + C + A$)
* **Exemplo:** *"Os auditores fiscais (Su) entregaram (Ve) o parecer (C) ontem à tarde (A)."*
* **Foco da Banca:** Inserir intercalações longas entre o sujeito e o verbo para induzir erro de concordância ou vírgula indevida.

#### 2. Padrão 2: Ordem Inversa ($A + Ve + Su$ ou $C + Ve + Su$)
* **Exemplo:** *"Aos novos candidatos (C/OI) coube (Ve) a responsabilidade pelo relatório (Su)."*
* **Foco da Banca:** Tentar fazer o candidato achar que *"Aos novos candidatos"* é o sujeito (sujeito preposicionado não existe!). O sujeito real é *"a responsabilidade"*.

#### 3. Padrão 3: Sujeito Oculto / Desinencial ($(Su) + Ve + C$)
* **Exemplo:** *"(Nós) Concluímos (Ve) toda a auditoria tributária (C) no prazo previsto (A)."*
* **Foco da Banca:** Confundir sujeito oculto identificável pela desinência com sujeito indeterminado.

#### 4. Padrão 4: Oração Sem Sujeito / Impessoal ($Ve + C + A$)
* **Exemplo:** *"Havia (Ve) muitas irregularidades graves (C/OD) no processo licitatório (A)."*
* **Foco da Banca:** Tentar flexionar o verbo no plural (*"Haviam muitas irregularidades"*). O verbo *haver* no sentido de existir é impessoal e não possui sujeito; o termo seguinte é seu **Objeto Direto**.

#### 5. Padrão 5: Estrutura com Predicativo ($Su + Ve + Pred$ ou $Su + Ve + C + Pred$)
* **Exemplo:** *"Os fiscais (Su) julgaram (Ve) o relatório (C/OD) inconsistente (Pred do Objeto)."*
* **Foco da Banca:** Confundir predicativo do objeto com adjunto adnominal, alterando o sentido e a pontuação da oração.`,
    examTraps: [
      'Pegadinha do "Haver": O termo após o verbo haver impessoal é OBJETO DIRETO, jamais sujeito! Portanto, o verbo fica obrigatoriamente no singular.',
      'Pegadinha do "Pronome Se": Em "Alugam-se casas", o termo "casas" é SUJEITO PACIENTE (voz passiva sintética), por isso o verbo vai ao plural. Em "Precisa-se de atendentes", "de atendentes" é Objeto Indireto e o sujeito é INDETERMINADO.',
    ],
    contrasts: [
      'Sujeito Oculto (determinado pela desinência) vs. Sujeito Indet. (verbo na 3ª plural sem referente ou verbo transitivo indireto + se).',
      'Adjunto Adnominal (característica intrínseca e fixa) vs. Predicativo (estado transitório atribuído pela predicação verbal).',
    ],
  },
  {
    title: '6. As 7 Camadas da Língua e o Mapa das 15 Aulas',
    summary: 'Entenda como o SuVeCA se conecta a cada uma das 15 aulas da plataforma, desde a Fonética até a Interpretação de Textos.',
    estimatedMinutes: 4,
    searchTerms: ['camadas linguísticas', 'guia das 15 aulas', 'mapa curricular', 'taxonomia de conexões'],
    contentMarkdown: `### Como Navegar pelas 15 Aulas da Plataforma

O currículo do aplicativo é composto por **15 Módulos Canônicos (A00 a A14)**. Para cada aula, o SuVeCA assume um papel didático específico, classificado em 4 níveis de conexão:

\`\`\`text
7 CAMADAS DA LÍNGUA E MAPA DAS 15 AULAS
Camada 1: Forma e Ortografia (A00) ──────────────── OUTSIDE_SUVECA_CORE (Camada Própria)
Camada 2: Classes e Morfologia (A01, A02, A03) ──── SUVECA_STRONG / CENTRAL (Ponte Morfossintática)
Camada 3: Verbos e Sintaxe da Oração (A04 a A06) ── DIRECT_SUVECA_CORE (Método Central)
Camada 4: Relações Entre Orações (A07) ──────────── DIRECT_SUVECA_CORE (Uma SuVeCA por Oração)
Camada 5: Pontuação, Concordância e Regência (A08 a A10) ── DIRECT_SUVECA_CORE (Aplicação Decisiva)
Camada 6: Coesão e Semântica (A11, A12) ─────────── SUVECA_STRONG / SUPPORT (Relações entre Mapas)
Camada 7: Texto e Discurso (A13) ────────────────── SUVECA_SUPPORTING_CONNECTION (Da Oração ao Texto)
Revisão Geral Espiral (A14) ─────────────────────── REVIEW (Protocolo de Diagnóstico Transversal)
\`\`\`

---

### Guia Rápido por Aula

* **Aula 00 (Ortografia e Fonética):** Camada Própria. Use regras fonológicas; a SuVeCA entra pontualmente na grafia dos porquês.
* **Aulas 01 a 03 (Morfologia e Pronomes):** Conexão Forte/Central. O mapa mostra como classes morfológicas assumem funções de Su, C e A.
* **Aulas 04 e 05 (Verbos e Vozes):** Método Central. O verbo como âncora; transitividade contextual, vozes ativas/passivas e impessoalidade.
* **Aula 06 (Termos da Oração):** Método Central Absoluto. O mapa completo de Sujeito, Predicado, Objetos, Complemento Nominal, Adjuntos e Predicativos.
* **Aula 07 (Período Composto):** Método Central. Uma SuVeCA para cada oração do período.
* **Aulas 08 a 10 (Pontuação, Concordância, Regência e Crase):** Método Central Decisivo. A sintaxe que resolve 80% das questões de prova.
* **Aulas 11 a 13 (Coesão, Semântica e Interpretação):** Apoio Estrutural. A ponte que eleva a análise da oração isolada para o plano do texto e do discurso.
* **Aula 14 (Revisão Geral Cumulativa):** O SuVeCA como bússola de revisão e recuperação ativa de todo o conteúdo.`,
    highlightBox: {
      title: 'Pronto para Começar!',
      text: 'Agora que você conhece os fundamentos, o código de cores e o protocolo dos 8 passos, avance para as aulas normativas começando pela Aula 00 ou navegue direto pelo módulo que deseja dominar!',
      type: 'rule',
    },
  },
];

export const SUVECA_INTRO_MODULE: ModuleData = {
  id: 'mod-intro',
  num: '00-Intro',
  title: 'Fundamentos do Método SuVeCA',
  subtitle: 'O mapa relacional da língua portuguesa e o sistema de orientação do curso · 6 unidades fundamentais',
  description: 'Aprenda o modelo mental, a metáfora do trem, o código de cores sintáticas e o algoritmo decisório de 8 passos para gabaritar questões de concurso público.',
  estimatedMinutes: 25,
  sections: INTRO_SECTIONS,
  questions: INTRO_QUESTIONS,
  suvecaMethod: {
    methodId: SUVECA_METHOD.methodId,
    equation: SUVECA_METHOD.equation,
    definition: SUVECA_METHOD.definition,
    authorityNote: SUVECA_METHOD.authorityNote,
    level: 'central',
    label: 'Fundamentos do Método',
    summary: 'Módulo introdutório obrigatório para construir o modelo mental, o código visual de blocos e o protocolo procedimental de resolução de questões.',
    steps: [
      'Compreenda o SuVeCA como mapa relacional flexível que aceita inversões e omissões.',
      'Domine as 5 escalas da Metáfora do Trem (Morfologia → Sintagmas → Oração → Período → Texto).',
      'Memorize o código visual das cores (Azul=Sujeito, Verde=Verbo, Amarelo=Complementos, Roxo=Adjuntos, Rosa=Predicativo).',
      'Aplique o algoritmo dos 8 passos em todas as questões de prova.',
    ],
    limits: [
      'A SuVeCA não substitui regras fonológicas ou ortográficas puras (acentos, divisão silábica, hífen).',
      'O método representa vínculos funcionais e não impõe ordem direta obrigatória.',
    ],
  },
};
