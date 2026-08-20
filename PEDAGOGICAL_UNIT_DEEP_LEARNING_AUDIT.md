# Parecer da Missão

Resultado: **REPROVADO**

## 1. Parecer executivo

A experiência é carregável, navegável por teclado e não apresentou falhas HTTP nem overflow horizontal global nas 460 visitas realizadas. Esses resultados, porém, não homologam o fluxo de aprofundamento.

O bloqueador é sistêmico: **nenhuma das 102 unidades regulares usa, no produto real, o View Model v4.2 nem o `PedagogicalUnitRenderer`/Semantic AST anunciado pelo produto**. O carregador aceita exclusivamente `viewSchemaVersion === "1.0.0"`, enquanto as 102 views regulares publicadas usam `4.2.0-hardened` ou `4.2.0-semantic-authoring`. Após obter o JSON com HTTP 200, o runtime o rejeita silenciosamente e carrega o Markdown legado. Somente as 13 revisões A14, que ainda declaram `1.0.0`, chegam ao renderer cumulativo.

Isso é P0 porque invalida a representação de aprofundamento que deveria preservar tipos, relações, limites, contrastes, procedimentos e questões oficiais da v4.2. A projeção legada observada também:

- perde duas seções em 11 unidades;
- inverte a progressão esperada em 15 unidades, deixando a conexão SuVeCA depois da síntese de recuperação;
- expõe gabaritos e justificativas antes de qualquer tentativa;
- transforma a recuperação ativa predominantemente em autodeclarações de domínio;
- não oferece URL de unidade, deep link, histórico ou restauração da unidade aberta;
- apresenta divergência de título entre o aprofundamento legado e o View Model apontado em 93 das 102 unidades regulares.

Portanto, não é seguro resolver apenas o filtro de versão: antes de ativar as views v4.2, é necessário reconciliar os 93 mapeamentos divergentes e criar um teste de ponta a ponta que prove qual unidade e qual renderer foram realmente abertos.

A semântica v4.2 não foi reavaliada nem alterada nesta missão.

## 2. Baseline e cobertura realizada

### 2.1 Baseline Git

- Repositório: `C:\Users\origi\OneDrive\Desktop\Códigos\portugues\SuVeCaSuVeCa`
- Branch: `main`
- Commit auditado: `d1a3b023ae32179a13fb16166dfa8a17576eb996` (`d1a3b02`, `feat(pbl): harden learning flow and engagement`)
- `origin/main`: no mesmo commit no início da missão.
- Estado inicial: limpo (`## main...origin/main`).
- Nenhum commit, push, reset, stash, tag, alteração de código, CSS, corpus, View Model ou artefato pedagógico foi realizado.

### 2.2 Universo publicado

Foram inventariados diretamente `modules.generated.ts`, o manifest, as views e os arquivos consumidos pelo runtime:

| Aula | Unidades |
|---|---:|
| A00 | 7 |
| A01 | 5 |
| A02 | 5 |
| A03 | 8 |
| A04 | 9 |
| A05 | 12 |
| A06 | 8 |
| A07 | 10 |
| A08 | 6 |
| A09 | 8 |
| A10 | 7 |
| A11 | 3 |
| A12 | 7 |
| A13 | 7 |
| A14 | 13 |
| **Total** | **115** |

O inventário fechou em 115 IDs únicos e acessíveis ao aluno: 102 unidades regulares e 13 revisões cumulativas A14.

### 2.3 Cobertura de browser

O fluxo real foi percorrido pela interface:

`aula → seção → Abrir unidade pedagógica completa → aprofundamento → expandir seções → fechar/sair`

| Viewport | Unidades percorridas | Regular via AST nativo | Regular via fallback | A14 cumulativa | Overflow global | Falhas HTTP |
|---|---:|---:|---:|---:|---:|---:|
| 1440 × 900 | 115 | 0 | 102 | 13 | 0 | 0 |
| 768 × 1024 | 115 | 0 | 102 | 13 | 0 | 0 |
| 390 × 844 | 115 | 0 | 102 | 13 | 0 | 0 |
| 320 × 568 | 115 | 0 | 102 | 13 | 0 | 0 |
| **Total** | **460 visitas** | **0** | **408** | **52** | **0** | **0** |

Além disso:

- Axe foi executado com todas as seções expandidas nas 115 unidades em desktop;
- teclado e foco do disclosure principal foram exercitados nos quatro viewports;
- back, refresh, URL e persistência foram reproduzidos;
- 314 tabelas renderizadas, distribuídas por 98 unidades, foram inspecionadas;
- DOM, console e respostas de rede foram coletados;
- todas as 115 views foram auditadas estaticamente, sem amostragem.

### 2.4 Contratos e tipos inventariados

As 102 views regulares possuem no artefato as 11 seções históricas: `suveca`, `prerequisites`, `explanation`, `rules`, `resolution`, `contrasts`, `examples`, `mnemonics`, `traps`, `glossary` e `recall`.

As 13 A14 possuem contrato próprio com seis dimensões: `suveca`, `conceptMap`, `prioritizedRules`, `structuredSynthesis`, `recoveryExamples` e `activeReviewProtocol`.

Tipos de bloco encontrados no corpus publicado: `bullet_list`, `concept_explanation`, `concept_definition`, `minimal_pair`, `classification`, `rule_boundary`, `formula`, `table`, `rule`, `procedure`, `contrast`, `worked_example`, `mnemonic`, `exam_trap`, `recall_prompt`, `comparison_matrix`, `heading`, `paragraph` e `list`.

## 3. Achados P0/P1

### F-01 — P0 — as 102 unidades regulares rejeitam a View Model v4.2

- **Camada:** TYPE_CONTRACT / RENDERER
- **Escopo:** SYSTEMIC
- **Unidades afetadas:** 102/102 regulares, A00–A13
- **Viewports:** todos
- **Comportamento observado:** o browser solicita `/knowledge/pedagogical/views/{id}.json` e recebe HTTP 200; o runtime rejeita a versão 4.2 e solicita em seguida o Markdown de `section.contentUrl`. Em nenhuma visita apareceu `.pedagogical-unit-view`; todas apareceram como `.pedagogical-document` legado.
- **Impacto:** o aluno não recebe a experiência Semantic AST v4.2 homologada. Tipos semânticos, questões oficiais estruturadas e os componentes de seção nativos não são o que o produto real apresenta.
- **Reprodução:** abrir qualquer unidade regular; observar duas respostas 200, JSON e Markdown; inspecionar o DOM. Repetir com qualquer ID A00–A13.
- **Evidência:** `src/components/ModuleViewer.tsx:146-179` e, em especial, a condição `data.viewSchemaVersion === '1.0.0'` em `:155`. Distribuição real: 8 views `4.2.0-hardened`, 94 `4.2.0-semantic-authoring` e 13 A14 `1.0.0`.
- **Causa provável:** contrato de versão do loader não foi atualizado junto com a publicação v4.2. A auditoria de artefatos aceita corretamente `startsWith('4.2')`, mas o runtime não.
- **Teste que deveria detectar:** a suíte `semantic-views-v42.spec.ts`. Ela não detecta porque não abre um CTA e só afirma visibilidade se `.pedagogical-unit-view` já estiver visível; zero renderizações também passa.

### F-02 — P1 — 93 mapeamentos regular → View Model têm títulos divergentes

- **Camada:** COMPILER / VIEW_MODEL
- **Escopo:** SYSTEMIC
- **Unidades afetadas:** 93/102 regulares. Os únicos nove pares com o mesmo título são `IP-A00-G01`, `IP-A02-G01`, `IP-A02-G02`, `IP-A06-G02`, `IP-A08-G02`, `IP-A09-G01`, `IP-A10-G06`, `IP-A11-G01` e `IP-A13-G07`.
- **Viewports:** todos
- **Comportamento observado:** o H1 do aprofundamento legado realmente aberto foi comparado com `view.unit.title` do JSON indicado por `section.editorial.integrationUnitId`. Noventa e três pares não descrevem o mesmo agrupamento. Exemplo: `IP-A00-G02` abre “Estudo da Sílaba - Teoria”, mas a view apontada se intitula “Encontros Vocálicos e Consonantais”; `IP-A01-G01` abre “Classes Variáveis e Invariáveis”, mas a view se intitula “Substantivos - Flexão de Gênero, Número e Grau”.
- **Impacto:** o fallback atual mascara a divergência porque usa o `contentUrl` legado, que mantém o contexto visual da seção. Liberar as views 4.2 apenas alterando a condição de versão pode passar a abrir conteúdo diferente do CTA em 91,2% das unidades regulares.
- **Reprodução:** para cada seção, comparar o H1 renderizado pelo Markdown com o campo `unit.title` de `/views/{integrationUnitId}.json`.
- **Evidência:** comparação exaustiva dos 102 pares; 93 mismatches e 9 matches.
- **Causa provável:** IDs `Gxx` foram reutilizados após uma resegmentação semântica não alinhada à segmentação da apostila legada.
- **Teste que deveria detectar:** um teste de contrato `section → integrationUnitId → título/objetivo esperado`. Não existe. Curiosamente, os nove IDs regulares declarados em `REPRESENTATIVE_UNITS` na suíte E2E são exatamente os nove títulos alinhados, mas o array não é usado por teste algum.

### F-03 — P1 — a projeção legada perde e reordena funções pedagógicas

- **Camada:** COMPILER / UI
- **Escopo:** REPEATED
- **Unidades afetadas:** 11 unidades renderizam só nove seções: `IP-A05-G02`, `IP-A05-G03`, `IP-A05-G04`, `IP-A05-G06`, `IP-A05-G07`, `IP-A05-G09`, `IP-A05-G10`, `IP-A05-G11`, `IP-A07-G10`, `IP-A10-G06` e `IP-A10-G07`. Nelas faltam “Regras decisivas” e “Contrastes que a prova explora”. Quinze unidades deixam “Conexão com o método SuVeCA” depois da síntese final: `IP-A00-G01`–`G06`, `IP-A01-G05`, `IP-A04-G05`–`G08`, `IP-A12-G01`, `G02`, `G07` e `IP-A13-G07`.
- **Viewports:** todos
- **Comportamento observado:** as 102 views JSON têm as 11 seções, mas o fallback mostra 11 em 91 unidades e 9 em 11. Em 15, a primeira etapa do modelo aparece por último.
- **Impacto:** parte dos alunos perde regras/contrastes ou percorre recuperação antes de receber a orientação metodológica, quebrando a progressão “modelo mental → decisão → aplicação → recuperação”.
- **Reprodução:** abrir uma unidade listada, usar “Expandir todas” e contar/ordenar os `<details>`.
- **Evidência:** DOM das 102 unidades em quatro viewports, confrontado com os JSONs.
- **Causa provável:** diferença entre o compilador Markdown legado e o contrato v4.2, somada à ordem física de alguns arquivos Markdown.

### F-04 — P1 — respostas oficiais aparecem antes da tentativa

- **Camada:** UI / UX
- **Escopo:** SYSTEMIC
- **Unidades afetadas:** 48 unidades legadas contêm 472 linhas de gabarito expostas; a estrutura nativa abrange 615 ocorrências de questões em 85 views.
- **Viewports:** todos
- **Comportamento observado:** no fallback, enunciado, resolução e `Gabarito:` são conteúdo Markdown contínuo, visível assim que a seção é aberta. Mesmo o componente estruturado `QuestionBlock` inicializa `showAnswer` com `true`, destaca a alternativa correta e mostra gabarito/comentário antes de qualquer escolha.
- **Impacto:** elimina tentativa sem consulta, introduz viés retrospectivo e transforma “aplicar” em releitura de solução. A página ensina conteúdo, mas não mede nem treina recuperação/aplicação de forma válida.
- **Reprodução:** abrir `IP-A00-G03`, expandir a área com questões e observar enunciado, justificativa e gabarito simultâneos. No código, verificar `QuestionBlock.tsx:28` e `:97-165`.
- **Evidência:** 405 linhas `Enunciado:` e 472 linhas `Gabarito:` no corpus Markdown publicado; estado inicial do componente nativo.
- **Causa provável:** componente de questão concebido como bloco de consulta, não como sequência tentativa → compromisso → feedback.

### F-05 — P1 — “recall” é predominantemente autodeclaração efêmera

- **Camada:** UX
- **Escopo:** SYSTEMIC
- **Unidades afetadas:** 101 unidades regulares recebem checklist; `IP-A05-G07` não gera checklist. Em 89 dos 101 checklists não há sequer um item interrogativo.
- **Viewports:** todos
- **Comportamento observado:** o parser converte listas da síntese em botões e contabiliza itens como “dominados” ao clique. Foram identificados 790 itens de lista; somente 12 unidades contêm algum item com `?`. Exemplos recorrentes são “Sabe que...”, “Domínio conceitual...” e “Identifica...”. O estado vive apenas em `useState`.
- **Impacto:** clicar confirma domínio sem exigir evocação, resposta, critério de correção ou feedback. Fechar, trocar a unidade ou atualizar a página elimina o progresso.
- **Reprodução:** abrir a síntese, marcar itens, fechar/reabrir ou atualizar; o contador volta a zero.
- **Evidência:** `MarkdownContent.tsx:267-275`, `ActiveRecallChecklist.tsx` e comportamento nos quatro viewports.
- **Causa provável:** listas de objetivos/síntese foram promovidas a checklist sem contrato explícito de prompt de recuperação.

### F-06 — P1 — a unidade não tem endereço, histórico nem restauração própria

- **Camada:** NAVIGATION
- **Escopo:** SYSTEMIC
- **Unidades afetadas:** 115/115
- **Viewports:** todos
- **Comportamento observado:** selecionar uma aula ou abrir a unidade não muda `http://127.0.0.1:3000/` nem aumenta `history.length`. Refresh preserva no máximo a aula via `suveca_last_module_guest`, mas fecha o aprofundamento e perde seção, scroll, recall e protocolo. Back não fecha a unidade nem retorna à aula; atua sobre a página anterior ao aplicativo. Não há deep link de unidade.
- **Impacto:** o aluno não consegue compartilhar, retomar ou recuperar o ponto de estudo; em páginas longas, refresh/back produz perda relevante de contexto e progresso.
- **Reprodução:** selecionar A02, abrir o primeiro CTA, observar URL inalterada; atualizar e observar zero disclosures de aprofundamento abertos.
- **Evidência:** reprodução real e ausência de router/`pushState`/`popstate` em `App.tsx`; apenas o módulo é salvo em localStorage.
- **Causa provável:** aprofundamento implementado como estado local de disclosure dentro da página monolítica da aula.

### F-07 — P1 — o CTA central é tardio e as páginas impõem fadiga excessiva

- **Camada:** UX / RESPONSIVE
- **Escopo:** SYSTEMIC
- **Unidades afetadas:** 115/115; intensidade varia por aula e posição da unidade
- **Viewports:** todos, agravado em 390 e 320 px
- **Comportamento observado:** o CTA é inserido depois de todo o `contentMarkdown` resumido da seção. O primeiro CTA aparece, em mediana, a 2,3 telas em desktop/tablet, 3,7 telas em 390 px e 6,3 telas em 320 px; no pior módulo, o primeiro chega a 6,8 telas em 320 px. O último CTA de A05 chega a 35,9 telas em 320 px. Com uma unidade expandida, a página completa tem mediana de 19.572 px em desktop, 47.375 px em 390 e 66.248 px em 320; máximo de 129.475 px em 320 (`IP-A10-G07`).
- **Impacto:** baixa descobribilidade do aprofundamento, forte custo de orientação e risco de abandono. O sumário interno ajuda após a abertura, mas não resolve a chegada nem o retorno à posição anterior.
- **Reprodução:** abrir uma aula, medir `getBoundingClientRect().top` de cada CTA e a altura do documento após expandir a unidade.
- **Evidência:** varredura separada de posição dos CTAs e as 460 medições de layout.
- **Causa provável:** aula, conteúdo editorial e unidade completa compartilham uma única página vertical, sem índice persistente ou rota de detalhe.

### F-08 — P1 — A14 apresenta volume e “progresso” sem continuidade real

- **Camada:** UX / RESPONSIVE
- **Escopo:** REPEATED
- **Unidades afetadas:** 13/13 A14; maior impacto em `IP-A14-S04` e `IP-A14-S05`
- **Viewports:** todos, agravado em 320 px
- **Comportamento observado:** A14 tem renderer próprio e seis disclosures, mas o roteiro superior é texto estático, não navegação. O protocolo usa os mesmos quatro itens em todas as revisões, todos iniciando com o ruído literal `. `. A barra não tem semântica de `progress`; o checklist vive só em `useState` e não leva a exercício, revisão agendada ou próxima ação. `S04` agrega 80 conceitos, 71 regras, 22 blocos e 4.821 palavras; expandida em 320 px, a página mediu 31.312 px. `S05` agrega 88 conceitos e 17 regras.
- **Impacto:** o aluno vê volume e contador, mas não dispõe de retomada, priorização adaptativa ou fechamento operacional. Em mobile, a revisão se torna uma longa coleção de chips/cards.
- **Reprodução:** abrir qualquer A14, marcar o protocolo, fechar/reabrir ou atualizar; o progresso volta a `0/4`. Em `S04`, expandir as seis dimensões.
- **Evidência:** `CumulativeReviewRenderer.tsx:18-38`, `:63-74` e `:190-236`, além do inventário dos 13 JSONs.
- **Causa provável:** progresso modelado apenas como estado visual da sessão e A14 compilada com agregação pouco limitada por densidade.

## 4. Fluxo “Abrir unidade pedagógica completa”

### O que funciona

- O botão tem nome compreensível, `aria-expanded`, `aria-controls` e alvo mínimo de 52 px.
- Enter abriu a unidade nos quatro viewports; o foco permaneceu no disclosure e o próximo Tab chegou a “Expandir todas”.
- As 115 unidades abriram conteúdo e não houve resposta de rede com erro.
- O H1 legado corresponde ao título da seção/arquivo legado atualmente aberto.
- Fechar aprofundamento é compreensível e retorna ao conteúdo da aula.

### O que não funciona adequadamente

- O CTA aparece tarde porque fica depois do conteúdo editorial da seção.
- A unidade não é uma rota: URL, histórico e deep link não representam o estado.
- Refresh encerra o aprofundamento e perde o ponto exato.
- O CTA abre o Markdown coerente com a seção, mas o `integrationUnitId` aponta para uma view semanticamente intitulada de outro modo em 93 casos.
- Não existe confirmação de conclusão nem próxima ação ao final do aprofundamento.

Parecer do fluxo: **funcional como disclosure local, inadequado como experiência retomável de estudo profundo**.

## 5. Experiência das seções pedagógicas

| Função | Experiência observada |
|---|---|
| Pré-requisitos | Presentes e escaneáveis na maior parte das unidades; não há verificação de domínio nem retorno orientado quando faltam. |
| Explicações | Conteúdo extenso e geralmente hierarquizado, mas servido pelo parser Markdown; a progressão depende da ordem física do arquivo. |
| Regras | Visualmente destacadas quando o parser as reconhece; ausentes como seção em 11 fallbacks apesar de existirem nas views. |
| Procedimentos | Há roteiros utilizáveis, porém sem estado de execução, exemplo passo a passo obrigatório ou oportunidade de praticar antes da solução. |
| Contrastes | Tabelas e blocos preservam oposição em muitos casos; a seção inteira desaparece em 11 unidades legadas. |
| Exemplos | Abundantes; respostas/justificativas próximas favorecem consulta, mas não tentativa. |
| Mnemônicos | Identidade visual reconhecível; controles de visualização pequenos em várias unidades. |
| Pegadinhas | Destaque visual adequado e não foi observado overflow; ainda predominantemente leitura. |
| Glossário | Utilizável e pesquisável quando reconhecido pelo parser. |
| Recall | Principal fragilidade pedagógica: checklist de autodeclaração, sem resposta e sem persistência. |

O sumário e os disclosures reduzem a carga visual inicial, mas não produzem por si só progressão de aprendizagem. A experiência alcança “li/consultei” com boa densidade; alcança “sei aplicar e recuperar” de maneira inconsistente.

## 6. Semantic AST / Renderer

### Resultado real

- Renderer regular nativo: **0/102 unidades**.
- Fallback Markdown pedagógico: **102/102 unidades regulares**.
- Renderer cumulativo A14: **13/13**.
- Fallback sem conteúdo: **0**.
- HTTP 4xx/5xx: **0**.

A auditoria não encontrou `[object Object]` nem JSON bruto generalizado na tela. Contudo, isso não prova fidelidade do AST porque o AST regular não foi executado.

Problemas adicionais:

- IDs técnicos aparecem para o aluno em `IP-A00-G05`, `IP-A01-G01` e `IP-A03-G07` (`KB-*`, `PROC-*` e correlatos).
- Há 12 tabelas Markdown embutidas em strings semânticas de oito views; são risco latente a validar somente depois que o renderer nativo estiver de fato acessível.
- O console registra chave React duplicada em `IP-A13-G06` e DOM inválido/hydration em `IP-A14-S01` (`ol`/`hr` dentro de `p`) e `IP-A14-S09` (`ul` dentro de `p`).
- Oito unidades geram warnings KaTeX de métricas de caracteres: `IP-A00-G01`, `IP-A00-G03`, `IP-A05-G07`, `IP-A05-G08`, `IP-A05-G10`, `IP-A09-G01`, `IP-A11-G02` e `IP-A12-G03`.

Classificação desses problemas adicionais: **P2, RENDERER, LOCAL/REPEATED**. A causa provável do DOM inválido é passar Markdown de bloco por `InlineRichText` dentro de contêiner inline/parágrafo.

## 7. Responsividade

### Pontos positivos

- Zero overflow horizontal global nas 460 visitas.
- As 314 tabelas permaneceram contidas; wrappers de rolagem impediram alargamento do documento.
- Títulos quebraram linha sem truncar e o CTA principal permaneceu utilizável.
- O bottom navigation não impediu a abertura por teclado ou clique.

### Fricções

- A experiência em 320 px é tecnicamente navegável, mas não é confortável para uma unidade inteira: mediana de 66.248 px de documento e máximo de 129.475 px após a expansão.
- Controles “Cards”, “Árvore” e “Texto” mediram aproximadamente 34 × 22 px em mobile; “Copiar”, 40 × 28 px. Ao menos um alvo menor que 44 px apareceu em 109/115 unidades em 1440/768/390 e 110/115 em 320.
- Em 320 px, alguns botões do sumário ficam com cerca de 40 px de largura e grande altura devido à grade estreita, aumentando a fragmentação visual.
- A14 S04/S05 apresenta dezenas de conceitos como chips e regras como cartões contínuos, sem redução de densidade específica para mobile.

Classificação: **P2, RESPONSIVE/ACCESSIBILITY, REPEATED**. Não houve quebra estrutural, mas a viabilidade de estudo prolongado em 320 px é baixa.

## 8. Acessibilidade

### Axe — 115 unidades expandidas em desktop

| Regra | Impacto Axe | Unidades | Nós |
|---|---|---:|---:|
| `color-contrast` | serious | 14 | 14 |
| `heading-order` | moderate | 115 | 122 |
| `landmark-unique` | moderate | 41 | 48 |
| `empty-table-header` | minor | 1 | 3 |

Contraste insuficiente ocorre:

- em `IP-A00-G01`, no rótulo branco de 12 px sobre `bg-emerald-600` (“+1 Fonema (Aumento)”), razão 3,65:1;
- nas 13 A14, em rótulo branco de 10 px sobre `bg-emerald-600` (“VE”), também 3,65:1.

As 115 unidades apresentam salto de heading detectado pelo Axe, tipicamente H1 → H4 no callout de objetivo antes do H2 do roteiro. Quarenta e uma páginas repetem landmarks sem nome único. `IP-A00-G01` possui três cabeçalhos de tabela vazios.

### Avaliação manual

- CTA e disclosures principais operam por teclado.
- O foco permanece previsível no botão após abrir; o próximo Tab alcança “Expandir todas”.
- Não foi observado significado crítico dependente apenas de cor, embora verde/vermelho seja usado junto a ícones e texto.
- O roteiro de A14 não é interativo, e a barra visual de protocolo não expõe papel/valor de progresso.
- Alvos menores que 44 px são recorrentes em controles auxiliares.

Classificação: contraste **P2 ACCESSIBILITY REPEATED**; hierarquia/landmarks/alvos **P2 ACCESSIBILITY SYSTEMIC**.

## 9. Profundidade pedagógica e carga cognitiva

Os arquivos regulares têm mediana aproximada de **5.750 palavras** (cerca de 29 minutos de leitura a 200 palavras/minuto); o maior, `IP-A10-G06`, contém aproximadamente **15.175 palavras**. O tempo mostrado no CTA acompanha aproximadamente a leitura linear, mas não reserva margem clara para tentativa, produção, comparação, correção e recall.

Há bons elementos para construção de modelo mental: objetivos, pré-requisitos, explicações, regras, procedimentos, contrastes, exemplos, mnemônicos, pegadinhas e glossário. Sumário e disclosures ajudam a localizar tópicos.

Entretanto, a profundidade ativa é limitada por quatro mecanismos sistêmicos:

1. gabarito inicialmente exposto;
2. recall convertido em autodeclaração;
3. estado de estudo não persistido;
4. ausência de transição obrigatória para aplicação/transferência ao final.

Conclusão pedagógica: a página é uma **referência extensa e bem compartimentada**, mas não sustenta de modo consistente o percurso “entendi → diferenciei → apliquei → reconheci armadilha → recuperei”.

## 10. Engagement, continuidade e saída

- **Sensação de progresso:** existe somente em checklists locais de recall/A14 e desaparece ao remontar o componente.
- **Tamanho percebido:** alto; o CTA tardio e a página monolítica ampliam a sensação de distância.
- **Orientação durante página longa:** sumário interno funciona, mas não é sticky; A14 sequer torna o roteiro clicável.
- **Conclusão:** não há estado conclusivo confiável, resumo do que foi efetivamente praticado ou evidência de domínio.
- **Próxima ação:** não há sequência consistente para questões, PBL, caderno de erros ou revisão.
- **Saída:** fechar o disclosure é claro; back/deep link/refresh não preservam a unidade.
- **Risco de abandono:** alto em small mobile e nas unidades/A14 mais densas.

Não é necessária gamificação para resolver esses pontos; são problemas de orientação, compromisso de resposta, persistência e transição pedagógica.

## 11. A14 — auditoria separada

As 13 revisões A14 foram corretamente tratadas pelo contrato cumulativo, sem exigir as 11 seções regulares.

### Pontos positivos

- Todas as 13 carregam a view JSON e usam `CumulativeReviewRenderer`.
- Seis dimensões aparecem em todas.
- Conceitos, regras, síntese e exemplos permanecem agrupados.
- Há indicação visual `0/4` e disclosures nativos.
- Não houve overflow horizontal nem erro de rede.

### Problemas

- roteiro não navegável;
- protocolo idêntico nas 13 e com prefixo literal `. `;
- progresso não persistido e barra sem semântica acessível;
- nenhum próximo passo verificável;
- contraste serious em todas as 13;
- DOM inválido em S01 e S09;
- forte variação de densidade: S04 tem 80 conceitos/71 regras; S05, 88 conceitos/17 regras;
- em 320 px, S04 chega a 31.312 px com tudo expandido.

Parecer A14: **utilizável como compilação de consulta, insuficiente como sessão cumulativa recuperável e retomável**.

## 12. Lacunas dos testes

### Gates executados

- `npm run ai-studio:preflight`: **8/8 PASS** em 44,15 s.
- TypeScript: PASS.
- Vitest completo: PASS dentro do preflight.
- Auditorias curriculares/deployment/views/PBL: PASS.
- Playwright PBL/acessibilidade do preflight: PASS.
- Build Vite: PASS.
- `npx vitest run src/components/ModuleViewer.test.tsx src/components/pedagogical/PedagogicalUnitRenderer.test.tsx`: **2 arquivos, 4 testes, PASS**.
- `npx playwright test tests/e2e/semantic-views-v42.spec.ts`: **9 passed, 3 skipped**.

### Por que os gates verdes não detectam os P0/P1

| Lacuna | Evidência |
|---|---|
| O E2E “carrega a visualização pedagógica nativa v4.2” não abre unidade | Executa `openApp`, procura `.pedagogical-unit-view` e só faz assertion dentro de `if (await pedagogicalView.isVisible())`. Se zero views renderizam, passa. |
| `REPRESENTATIVE_UNITS` é código morto | Dez casos são declarados, mas nenhum teste os percorre. Os nove regulares correspondem exatamente aos únicos nove títulos alinhados. |
| Axe do E2E escaneia a tela inicial | Não abre nem expande unidade; por isso passa com zero serious enquanto a auditoria real encontrou 14 unidades com contraste serious. |
| Teste de overflow não abre matrizes/tabelas de unidades | Mede apenas a página inicial. O nome afirma “matrizes e tabelas adaptativas”, mas elas não são exercitadas. |
| Teste unitário do renderer usa versão artificial | O fixture declara `viewSchemaVersion: '1.0.0'`, embora 102 views regulares reais sejam 4.2. |
| Teste de `PedagogicalDeepDive` cobre somente Markdown sem `integrationUnitId` | Não exerce JSON → validação de versão → renderer → fallback. |
| Auditoria de views e runtime discordam | `audit-pedagogical-views.mjs` aceita `startsWith('4.2') || === '1.0.0'`; `ModuleViewer.tsx` aceita apenas `1.0.0`. |
| Não existe teste de correspondência de unidade | Nenhum gate compara seção/CTA, `integrationUnitId`, título, objetivo e view efetivamente renderizada. |
| Não existe gate pedagógico de exposição | Nenhum teste verifica que o aluno tente antes de ver gabarito, nem que recall exija evocação. |
| Small mobile configurado difere da missão | O projeto `mobile-320` usa 320 × 800, não 320 × 568. |

Os gates atuais demonstram integridade estrutural e ausência de regressões conhecidas; eles não demonstram experiência pedagógica real.

## 13. Priorização recomendada para futura missão de hardening

1. **Bloquear promoção até reconciliar o contrato de integração.** Produzir uma matriz assinada `section → contentUrl → integrationUnitId → título → objetivos` para os 102 casos; resolver os 93 divergentes antes de liberar a versão 4.2.
2. **Criar E2E obrigatório de renderer real.** Abrir pelo menos uma unidade de cada aula, exigir o ID/título esperado, exigir `.pedagogical-unit-view`, falhar em fallback inesperado e verificar os 19 tipos reais quando presentes. Em auditoria de deployment, validar os 102 casos estaticamente.
3. **Corrigir o fluxo de questão.** Estado inicial sem gabarito, compromisso de resposta antes do feedback e preservação imutável do payload oficial.
4. **Redesenhar recall sem alterar a semântica v4.2.** Separar objetivo declarativo de prompt de evocação; permitir revelar critério/resposta e persistir o resultado.
5. **Introduzir rota/deep link e restauração de posição.** Preservar aula, unidade, seção aberta e progresso local/autenticado; definir comportamento de back/refresh.
6. **Reorganizar a entrada.** Tornar o aprofundamento descobrível no cabeçalho/resumo da seção e fornecer índice de unidades da aula, especialmente em mobile.
7. **Hardening A14.** Tornar roteiro navegável, limitar/segmentar densidade, remover ruído `. `, fornecer progresso acessível e persistido e uma próxima ação.
8. **Fechar acessibilidade e console.** Corrigir contraste, headings, landmarks, cabeçalhos vazios, alvos pequenos, DOM inválido, chave duplicada e warnings KaTeX; executar Axe depois de abrir/expandir cada unidade.
9. **Adicionar gate de experiência.** Medir exposição de gabarito, presença de tentativa, persistência de recall, ausência de IDs técnicos e conclusão/saída; não usar PASS condicional.

## 14. Evidências e reprodutibilidade

Artefatos temporários de auditoria, mantidos fora do repositório:

- `C:\Users\origi\AppData\Local\Temp\suveca-ped-unit-audit-Gch2eR\full-results.json`
- `C:\Users\origi\AppData\Local\Temp\suveca-ped-unit-audit-Gch2eR\summary.json`
- screenshots representativas no mesmo diretório:
  - `desktop-1440-IP-A01-G02.png`
  - `desktop-1440-IP-A01-G02-table.png`
  - `desktop-1440-IP-A14-S01.png`
  - `mobile-390-IP-A02-G01.png`
  - `mobile-390-IP-A02-G01-table.png`
  - `small-mobile-320-IP-A01-G02.png`
  - `small-mobile-320-IP-A01-G02-table.png`
  - `small-mobile-320-IP-A14-S10.png`

Esses arquivos sustentam a contagem de 460 visitas, o renderer observado, alturas, respostas, logs, Axe, tabelas, targets e screenshots. Não são artefatos do produto e não foram adicionados ao Git.

## 15. Integridade read-only

Esta missão observou, navegou, mediu, reproduziu, classificou e priorizou. Não corrigiu o produto. O único arquivo criado no repositório é este relatório solicitado; nenhum arquivo versionado preexistente foi modificado.
