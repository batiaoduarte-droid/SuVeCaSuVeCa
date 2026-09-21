# Guia Pedagógico e Operacional do PBL SuVeCA

## 1. Finalidade e estado deste documento

Este guia descreve o comportamento implementado do fluxo **Aprender por Problemas (PBL)** da SuVeCA atualizado em setembro de 2026. Ele serve de referência comum para produto, pedagogia, curadoria de questões, inteligência artificial, desenvolvimento e homologação. Alterações ainda não publicadas devem ser homologadas pelos gates antes de serem chamadas de baseline publicado.

O PBL não é uma simples lista de exercícios. Cada sessão parte de uma competência curricular atômica, observa a resposta e a confiança declarada do aluno, diagnostica a causa cognitiva do erro ou da dúvida, realiza intervenção adaptativa — mediada de forma conversacional pelo **Professor PBL** ou por cartões conceituais determinísticos —, exige aplicação em novos contextos (isomorfismo e transferência adaptativa) e culmina em uma decisão reflexiva com *Active Recall* para a próxima questão.

## 2. Estado atual do produto

| Indicador | Estado atual |
| --- | ---: |
| Unidades pedagógicas cobertas | 102 de 102 (100%) |
| Competências curriculares atômicas | 190 de 190 (100%) |
| Casos-âncora PBL | 190 |
| Conjuntos de transferência adaptativa | 190 |
| Caminhos diagnósticos estruturados | 190 |
| Sessões cumulativas espirais | 13 |
| Questões oficiais no banco | 4.864 |
| Questões autorais PBL autorizadas | 81 |
| Banco total utilizável pelo PBL | 4.945 |
| Competências prontas para prática | 190 |
| Competências limitadas ou bloqueadas | 0 |
| Média de questões distintas por competência | 42,29 |
| Força da cobertura | 155 robustas, 27 adequadas e 8 mínimas |
| Lacunas impeditivas | 0 |

As 81 questões autorais foram criadas especificamente para recompor duas famílias com lacuna real de itens oficiais: `IP-A04-G03` e `IP-A04-G08`. Elas são identificadas pelo prefixo `PBLQ`, metadado `sourceKind: authored_pbl` e rótulo explícito de questão autoral na interface; nunca são apresentadas como itens oficiais de bancas.

Famílias com rotação mais estreita possuem cobertura completa para uma sessão sem bloqueios:
- verbos irregulares (`IP-A04-G06`): quatro questões distintas;
- falsos amigos e conjugação difícil (`IP-A04-G07`): quatro;
- complementos e objetos pleonásticos (`IP-A05-G03`): três;
- regência e pronomes pessoais (`IP-A10-G04`): quatro.

Esses casos constituem pontos de ampliação de rotação pela fábrica editorial, não impedimentos de produto.

## 3. Princípios pedagógicos e editoriais

### 3.1 Competência antes da questão

Toda questão usada em uma sessão PBL precisa possuir atribuição semântica explicitamente homologada para a competência exata. Pertencer à mesma aula, tópico geral ou unidade não autoriza seu uso.

A atribuição atômica estabelece:
- **Relação**: primária ou secundária;
- **Alinhamento**: direto ou de apoio;
- **Papéis permitidos**: âncora (`anchor`), diagnóstico (`diagnostic`), transferência (`transfer`) ou validação (`validation`);
- **Evidências e método de revisão**: revisão editorial, taxonomia de origem ou tópico canônico revisado.

Apenas atribuições aprovadas integram o runtime. Ausência, pendência ou bloqueio operam em modo fechado (*fail-closed*).

### 3.2 Evidência de transferência e retenção

Acertar o caso-âncora inicial não basta para certificar domínio. O aluno precisa demonstrar capacidade de reaplicar a competência em itens com variação de banca examinadora, formulação de comando, complexidade sintática, contexto de ocorrência e polaridade.

Cada conjunto de transferência estabelece sua nota mínima de corte (geralmente $\ge 75\%$) e sequência de acertos consecutivos exigida (tipicamente 2 acertos). O teto operacional é de 4 tentativas de transferência.
- Em sessão de aquisição ou diagnóstico, o sucesso produz `transfer_confirmed`: comprovação de reaplicação imediata, não de retenção de longo prazo.
- O resultado `retention_confirmed` exige sessão de revisão posterior, após intervalo mínimo de consolidação ($\ge 20$ horas) sem apoio de intervenção.
- Não atingir o critério produz `needs_review`, direcionando a competência para recuperação futura sem penalização punitiva.

### 3.3 Gabarito e integridade editorial protegidos

- O gabarito oficial é proveniente exclusivamente do payload publicado. O runtime apenas converte representações técnicas para `Certo`, `Errado` ou a letra correspondente da alternativa.
- O produto **nunca deduz, calcula nem inventa** gabaritos inexistentes.
- Questões sem apresentação publicada íntegra ou sem resposta interpretável são bloqueadas pelo seletor.
- O backend atua como autoridade avaliativa final: o cliente não tem prerrogativa para declarar acerto ou erro.

### 3.4 Linguagem orientada ao aluno

Identificadores internos como `RULE-...`, `PROC-...`, `CONTRAST-...`, `WARN-...` e `MISC-...` são chaves de controle editorial. A interface resolve essas referências contra as visões pedagógicas das unidades e apresenta título, enunciado, contraste e método em linguagem natural, clara e acolhedora. Códigos técnicos nunca são exibidos ao aluno como substitutos de conteúdo pedagógico.

---

## 4. Modos de Condução da Sessão

O motor `PBLEngine` oferece suporte nativo a dois modos de condução da experiência:

1. **Modo Tutor Contextual (`conductionMode: 'tutor'`) — Padrão do Produto**:
   A mediação socrática é conduzida pelo **Professor PBL** (apoiado pelo modelo Gemini 3.1 Flash-Lite), operando de forma conversacional e adaptativa. Integra diagnóstico cognitivo, microestudo normativo, checagem rápida (*QuickCheck*), chips de raciocínio, auxílio na formulação do Caderno de Erros e continuidade guiada.
2. **Modo Clássico Determinístico (`conductionMode: 'legacy'`)**:
   Condução tradicional por telas sequenciais estáticas: cartão do problema $\to$ cartão de feedback diagnóstico $\to$ cartão de microestudo $\to$ nova aplicação. É mantido para compatibilidade retroativa e ambientes offline restritos.

---

## 5. Percurso do Usuário no Modo Tutor (Fluxo Atual)

```text
Dashboard PBL (Seleção de Competência ou Retomada)
    ↓
Caso Inicial (Caso-Âncora Oficial)
    ├─ [Opcional] "Tirar dúvida com Professor PBL" (Ajuda socrática prévia com gabarito protegido)
    ↓
Resposta + Confiança (Chute | Baixa | Média | Alta) + Raciocínio / Autoexplicação
    ↓
Avaliação de Tentativa & Matriz de Confiança
    ├─ Acerto Forte (Alta Confiança) ──────────────────────────┐
    │                                                          ↓
    ├─ Acerto Frágil (Chute/Baixa) ou Erro                    Transferência Adaptativa
    │    ↓                                                    (Variações cognitivas oficiais)
    │  Sondagem Causal (se causa ambígua)                      │
    │    ↓                                                     ↓
    │  Intervenção Adaptativa com Professor PBL               Decisão Reflexiva
    │  (Microestudo + Chat Socrático + QuickCheck)            (Active Recall >= 6 palavras)
    │    ↓                                                     │
    │  Nova Aplicação Isomórfica (Reattempt)                   ↓
    └───────────────────────────────────────────────────────── Resumo & Revisão Espaçada
```

### 5.1 Dashboard e entrada na sessão

O Dashboard exibe as competências curriculares, o progresso em cada aula e recomenda práticas adaptadas.
- **Sessão recomendada/diagnóstica**: foca uma competência prioritária, com orçamento adaptativo de até **12 minutos de tempo ativo**.
- **Revisão cumulativa espiral**: combina até duas competências integradas, com orçamento de até **18 minutos de tempo ativo**.
- **Pausa e retomada**: sessões podem ser pausadas a qualquer momento. O estado completo é preservado atomicamente no LocalStorage e sincronizado no Firestore para usuários autenticados.
- **Prevenção de contaminação recente**: o ledger `questionEncounterLedger` registra as questões vistas recentemente em qualquer área do sistema, impedindo que o aluno receba itens recentemente decorados como se fossem desafios novos.

### 5.2 Caso inicial e apoio sob demanda pré-tentativa

O caso-âncora apresenta um item oficial representativo da competência.
- O aluno escolhe sua resposta e declara obrigatoriamente seu nível de confiança:
  - **Chute** (`guess`, ~20%)
  - **Pouco seguro** (`low`, ~40%)
  - **Médio** (`medium`, ~70%)
  - **Muito seguro** (`high`, ~90%)
- Pode redigir voluntariamente sua hipótese ou abrir o modal de autoexplicação socrática.
- **Apoio pré-tentativa com o Professor PBL**: Se o aluno tiver dúvidas antes de marcar sua opção, pode acionar o botão *"Tirar dúvida com Professor PBL"*. O motor inicia um episódio no qual a resposta oficial, a estratégia completa e as análises das alternativas permanecem **estritamente mascaradas** (`filterTutorContextForStudent`). O tutor orienta o método de análise sem entregar o gabarito.

### 5.3 Avaliação de tentativa e diagnóstico cognitivo

O motor `AttemptEvaluator` classifica a tentativa no quadrante de calibração metacognitiva:
- `strong_correct` (Acerto Forte): Correto com confiança alta.
- `fragile_correct` (Acerto Frágil): Correto com confiança baixa ou chute.
- `high_confidence_error` (Erro Iludido): Incorreto com confiança alta (`high`). Requer investigação do critério que induziu à falsa certeza.
- `error` (Erro Consciente): Incorreto com confiança baixa, chute ou média. Requer reforço procedimental passo a passo.

Quando o padrão de resposta coincide com distratores mapeados, o `DiagnosticResolver` identifica a hipótese causal correspondente:
- **Deslize** (`slip`): erro acidental em procedimento dominado.
- **Hipótese causal de erro** (`mapped_error_hypothesis`): atrator de banca identificado.
- **Padrão causal confirmado** (`confirmed_error_pattern`): armadilha sistemática.
- **Concepção equivocada** (`mapped_misconception`): regra concorrente aplicada incorretamente.
- **Déficit de pré-requisito** (`prerequisite_deficit`): falta de conceito basal anterior.

Se a causa for incerta, o motor aciona uma **questão de sondagem independente** (`request_probe`) antes de revelar a intervenção. Se houver déficit de pré-requisito comprovado, o motor ramifica temporariamente para a competência anterior necessária (`branch_to_prerequisite`).

### 5.4 Intervenção Adaptativa (`PBLAdaptiveInterventionView`)

Na fase `tutor`, a tela unifica o microestudo estruturado com a conversação socrática inteligente:

1. **Painel de Microestudo Estruturado**:
   - **Regra e condições normativas**: formulação canônica clara, condições de incidência e exceções catalogadas.
   - **Fronteiras e limites da regra (`ruleBoundaries`)**: demarcação de escopo, não aplicabilidade e armadilhas de banca.
   - **Contraste decisivo**: confronto explícito entre Polo A (construção canônica) $\times$ Polo B (atrator de prova) e o critério que os distingue.
   - **Tabelas e matrizes normativas**: visualização tabular comparativa de apoio.
   - **Estratégia de resolução guiada (Worked Example)**: exibida passo a passo **apenas após** a submissão de uma tentativa.
2. **Chat Conversacional com o Professor PBL**:
   - Diálogo focado na dúvida expressa pelo aluno.
   - **Metacognitive Insight**: diagnóstico acolhedor da relação entre a confiança declarada e a correção da resposta.
   - **Reasoning Chips**: 3 a 4 perguntas frequentes clicáveis para agilizar a manifestação de hipóteses.
   - **QuickCheck**: micro-desafio prático de 1 linha com opções concisas e justificativa normativa para validação imediata da compreensão.
   - **Síntese para o Caderno de Erros (`notebookDraft`)**: geração assistida de ficha contendo gatilho contextual, regra de decisão e exemplo de contraste.
3. **Escalonamento de Níveis de Ajuda**:
   - `none` (autônomo), `hint` (dica socrática), `diagnostic` (explicação conceitual), `partial` (procedimento orientado) e `full` (resolução detalhada).
   - O uso de ajuda substancial (`partial` ou `full`) fica registrado na tentativa subsequente e impede que ela seja considerada recuperação independente sem auxílio.
4. **Compensação de Latência de IA**:
   - O tempo de processamento e resposta do Gemini é automaticamente descontado do cronômetro da sessão (`deductPBLSessionWaitTime`), garantindo que o limite de tempo ativo do aluno não seja penalizado pela latência de rede ou da IA.

### 5.5 Ações de Continuidade do Episódio

Ao concluir o diálogo com o tutor, o aluno e o sistema dispõem de 4 caminhos:
- `try_same`: tentar responder novamente ao mesmo item (com registro do nível de assistência mobilizado).
- `try_alternative`: avançar para uma nova questão isomórfica sem repetir o caso inicial.
- `proceed_transfer`: prosseguir diretamente para a bateria de transferência.
- `proceed_reflection`: encerrar o ciclo prático e consolidar reflexão (marcando `needs_review` caso não haja confirmação autônoma).

### 5.6 Nova Aplicação Isomórfica (Reattempt)

Quando o aluno conclui a intervenção após um erro, ele é direcionado para a fase de **Nova Aplicação**.
- O motor seleciona uma questão nova do acervo, rigorosamente alinhada à mesma competência e com complexidade equivalente.
- O caso inicial nunca é reapresentado nesta fase, evitando memorização superficial do gabarito.
- Se o aluno acertar de forma desassistida, o sistema avança para o conjunto de transferência adaptativa.

### 5.7 Transferência Adaptativa

O conjunto de transferência submete a competência a testes sob diferentes dimensões de variação:
1. **Isomórfica (`isomorphic`)**: mesma estrutura lógica, vocabulário diferente.
2. **Próxima (`near_transfer`)**: ligeira alteração sintática ou contextual.
3. **Caso-limite (`boundary_case`)**: testa as fronteiras e exceções da regra.
4. **Distante (`far_transfer`)**: variação de banca organizadora ou texto complexo.
5. **Invertida (`inverted_transfer`)**: comando em polaridade contrária (identificar a incorreta).

Para certificar `transfer_confirmed`, o aluno deve atingir a taxa mínima de acerto e a quantidade de acertos consecutivos estipulada pelo transfer set. Se esgotar 4 tentativas sem cumprir o critério, a competência é encaminhada para `needs_review`.

### 5.8 Decisão Reflexiva com Active Recall

A etapa de reflexão converte a experiência prática em memória procedimental de longo prazo:
1. **Evidência do Ciclo**: exibe o saldo objetivo (ex.: *"2 de 2 itens de transferência corretos"*).
2. **Desafio de Recuperação Ativa (Active Recall)**:
   - O aluno responde à provocação: *“Na próxima questão, primeiro vou…”*.
   - **Exigência mínima de 6 palavras**: para desbloquear a confirmação autônoma, o aluno deve formular sua própria regra mental com suas palavras, sem recorrer à cópia passiva.
3. **Comparação com a Orientação Oficial Publicada**:
   - O aluno clica em *"Comparar com a orientação"* e visualiza o critério publicado em linguagem natural.
4. **Fechamento Metacognitivo**:
   - **Manter minha regra (`own_rule`)**: consolida sua formulação própria recuperada ativamente.
   - **Adotar a orientação (`suggested_rule`)**: adota a regra canônica oficial, ficando registrada como decisão assistida.
   - **Ainda preciso revisar (`needs_review`)**: encaminha conscientemente o tópico para o plano de revisão.

A conclusão da reflexão atualiza o modelo de mastery:
- Transfere misconceptions resolvidas de `activeMisconceptions` para `resolvedMisconceptions`.
- Registra a decisão reflexiva e define a data da próxima revisão espaçada.

### 5.9 Resumo da Sessão e Continuidade

O resumo consolida os resultados por competência:
- Taxa de acerto inicial, pós-intervenção e de transferência.
- Misconceptions identificadas e superadas.
- Resultado final (`transfer_confirmed`, `retention_confirmed` ou `needs_review`).
- Tempo ativo real despendido (com latência de IA descontada).
- Links diretos para:
  - **Caderno de Erros**: consultar as fichas técnicas salvas.
  - **Revisão Diária**: agendamento no algoritmo de repetição espaçada.
  - **Painel PBL**: iniciar novo tópico ou retomar sessões pausadas.

---

## 6. Diretrizes Pedagógicas e Postura do Professor PBL

O Professor PBL segue instruções de sistema estritas (`PBL_TUTOR_SYSTEM_INSTRUCTION`):

1. **Diálogo Construtivo e Acolhedor**: foco na investigação das hipóteses e dúvidas do aluno; jamais adotar tom punitivo, irônico ou arrogante.
2. **Proibição Terminante de Atribuir Falhas Pessoais**:
   - É expressamente proibido sugerir que o aluno errou por *"falta de atenção"*, *"leitura descuidada"*, *"pressa"*, *"falha de interpretação básica"* ou *"vício"*.
   - Todo erro é tratado com seriedade como hipótese pedagógica plausível ou conflito entre regras concorrentes.
3. **Separação Tripartite**:
   - **Raciocínio do Aluno**: a lógica que conduziu a escolha.
   - **Gabarito Oficial**: o critério normativo da banca examinadora.
   - **Explicação Didática Derivada**: os materiais e métodos de apoio pedagógico.
4. **Rigor Normativo Canônico (Benchmark Gramatical)**:
   - Exemplo inegociável (*porém / porem*): o tutor deve sempre distinguir com exatidão que *porem* é forma de infinitivo pessoal do verbo *pôr* (ex.: *"para eles porem o livro na estante"*), enquanto o futuro do subjuntivo é *puserem* (ex.: *"quando eles puserem tudo em ordem"*). Erros conceituais não são tolerados.
5. **Ancoragem Exclusiva no Contexto Fornecido**:
   - Mobilizar apenas as regras, procedimentos, exceções e contrastes fornecidos no contexto da questão.
   - Proibição de exibir identificadores técnicos brutos ao aluno (ex.: dizer *"a regra do hífen intervocálico"*, nunca *"RULE-IP-A00-G05-001"*).
6. **Andaime Metacognitivo Dinâmico**:
   - *Erro com Alta Confiança*: demonstrar a armadilha do distrator e o contraste entre as opções.
   - *Erro com Baixa Confiança*: oferecer algoritmo procedimental passo a passo claro.
   - *Acerto Frágil (com dúvida)*: reforçar afirmativamente o critério para tornar o acerto intencional.
7. **Resiliência e Fallback Determinístico**:
   - Se o provedor Gemini estiver indisponível, exceder 30 segundos de timeout ou gerar formato inválido, o motor ativa instantaneamente um **fallback determinístico**, preservando a integridade da sessão do aluno sem mensagens técnicas de erro.

---

## 7. Persistência, Segurança e Autoridade do Servidor

A arquitetura do PBL no SuVeCA segue o princípio de autoridade restrita e modo fechado (*fail-closed*):

### 7.1 Autoridade Avaliativa Exclusiva do Servidor (`/api/pbl/session/sync`)
- O cliente envia as tentativas registradas, mas **o servidor não confia no resultado de acerto/erro declarado pelo navegador**.
- O servidor consulta a questão canônica no acervo oficial, normaliza as respostas e calcula autoritativamente se a tentativa foi correta ou incorreta, além de reclassificar o quadrante de confiança.
- Respostas para questões que não existam ou que não correspondam às opções válidas são rejeitadas com código `400`.

### 7.2 Histórico Append-Only Imutável
- O histórico de tentativas de uma sessão é estritamente incremental (*append-only*).
- Tentativas de truncamento, alteração de respostas anteriores ou exclusão de histórico são bloqueadas com erro de integridade violada (`attempt_immutable_violation`).

### 7.3 Proteção contra Vazamento de Gabaritos (`filterTutorContextForStudent`)
- Os endpoints de contexto (`/api/pbl/tutor/context/:questionRef`) e turnos (`/api/pbl/tutor/turn`) aplicam sanitização rigorosa.
- Se o usuário não tiver uma tentativa legítima salva no servidor para a questão em análise, a resposta oficial, o comentário da banca, a estratégia detalhada e a refutação das opções são **censurados (`REDACTED`)**.
- Nem mesmo requisições manuais ou forjadas conseguem extrair a resolução antes de o aluno registrar sua tentativa no servidor.

### 7.4 Critério de Retenção de Longo Prazo
- O status `retention_confirmed` só é concedido se:
  1. A sessão estiver no modo de revisão (`review` ou `cumulative`).
  2. A tentativa for na fase inicial.
  3. O intervalo desde a última prática da competência for de pelo menos **20 horas** ($\ge 72.000.000\text{ ms}$).
  4. A resposta for correta e sem assistência prévia.

---

## 8. Exemplo Completo: Fonética e Fonologia

Considere a competência `COMP-A00-G01-01` (*Dígrafos, Encontros Consonantais e Valores Fonéticos*):

1. **Entrada**: Aluno inicia a sessão recomendada de Fonética. O cronômetro inicia com limite de 12 minutos.
2. **Caso-Âncora**: Recebe a questão oficial `OQ-A00-aula00.q0068`, sobre a classificação de sequências como dígrafos em *qualidade*, *perspectiva*, *essas*, *conjunto* e *chamada*.
3. **Tentativa**: O aluno marca **Certo** com confiança **Muito seguro** (`high`).
4. **Avaliação**: O gabarito é **Errado**. O motor classifica a tentativa como `high_confidence_error` (Erro Iludido).
5. **Transição para Tutor**: Como o modo é `tutor`, a sessão entra na fase `tutor`. O motor cria o episódio `PBLTutorEpisode` vinculado à tentativa.
6. **Intervenção Adaptativa**:
   - O painel exibe a regra canônica de dígrafo consonantal/vocálico, o contraste entre dígrafo (2 letras = 1 fonema) e encontro consonantal (2 letras = 2 fonemas), e a armadilha do `qu` em *qualidade* (onde o `u` é pronunciado).
   - O Professor PBL abre o diálogo acolhendo o raciocínio e fornecendo um *metacognitive insight*: *"Você marcou com alta segurança; vamos analisar onde a banca armou a pegadinha entre som único e fonemas sucessivos."*
   - O aluno clica em um *reasoning chip*: *"Qual foi a armadilha da banca?"*.
   - O tutor explica a pronúncia de *perspectiva* e propõe um *QuickCheck* com duas palavras curtas.
   - O aluno responde ao QuickCheck, recebe confirmação imediata e clica em *"Gerar ficha para o Caderno"*.
   - O tutor preenche a ficha estruturada com gatilho e contraste, que é salva no Caderno de Erros com agendamento de revisão.
7. **Continuidade**: O aluno seleciona *"Tentar nova questão"*. O motor executa `concludeTutorEpisode` com ação `try_alternative`.
8. **Nova Aplicação (Reattempt)**: O aluno recebe uma questão isomórfica não vista (`OQ-A00-aula00.q0003`), aplica o procedimento de escuta fonética e acerta de forma independente.
9. **Transferência**: O motor apresenta uma questão de banca diferente (`OQ-A00-aula00.q0001`) e uma questão com polaridade invertida (`OQ-A00-aula00.q0002`). O aluno acerta ambas consecutivamente. O critério de transferência é satisfeito.
10. **Reflexão**: Na tela de reflexão, o aluno digita: *"Primeiro verifico se as duas letras produzem um único som antes de classificar como dígrafo."* (15 palavras, satisfazendo o Active Recall de $\ge 6$ palavras). Compara com o critério publicado e seleciona *"Manter minha regra"*.
11. **Resumo**: A sessão registra `transfer_confirmed`, arquiva a misconception resolvida, exibe o tempo líquido (descontando os segundos de processamento da IA) e agenda a revisão de retenção para 24 horas depois.

---

## 9. Fontes de Verdade e Linhagem de Dados

```text
CANONICAL (Fábrica Editorial)
├─ 102 unidades + objetivos de aprendizagem
└─ conceitos + regras + procedimentos + contrastes + traps + misconceptions
                         │
BANCO DE QUESTÕES PUBLICADO
├─ 4.864 questões oficiais + gabaritos protegidos + comentários
└─ 81 questões autorais PBL autorizadas
                         │
                         ▼
question_competency_links + question_pedagogy
                         │
                         ▼
pbl_causal_distractor_mappings + pbl_transfer_audits
                         │
                         ▼
public/knowledge/pbl/ (Manifestos, Casos, Shards de Links e Pedagogia de 2 MiB)
                         │
                         ▼
PBLRepository (Validação fail-closed de SHA-256 e bytes de shards)
                         │
                         ▼
PBLEngine + PBLTutorContextResolver (Filtragem estrita anti-vazamento)
                         │
                         ▼
PBLAdaptiveInterventionView / PBLTutorServerRoute (Gemini 3.1 Flash-Lite)
                         │
                         ▼
Sessão adaptada ao aluno, persistida atomicamente e auditada
```

---

## 10. Gates de Homologação

Antes de publicar qualquer alteração no subsistema PBL, execute rigorosamente a cadeia de gates:

```bash
npm run lint
npm run audit:pbl
npm test -- src/lib/pbl
npm run test:e2e -- tests/e2e/pbl-flow-accessibility.spec.ts
npm run build
```

Os gates certificam:
1. **Integridade Referencial**: vínculo sem falhas entre 190 competências, 190 casos, 190 transfer sets e 190 caminhos.
2. **Atribuição Semântica**: nenhuma questão é selecionada sem atribuição autorizada.
3. **Gabaritos Interpretáveis**: 100% dos 190 casos-âncora com gabarito válido e graduável.
4. **Ausência de IDs Técnicos**: nenhum código do tipo `RULE-...` ou `MISC-...` exibido ao aluno.
5. **Segurança do Tutor**: gabaritos e worked examples estritamente censurados pré-tentativa.
6. **Active Recall**: obrigatoriedade de 6 palavras na reflexão para validação de regra própria.
7. **Acessibilidade e Layout**: conformidade WCAG AA e ausência de transbordamento horizontal de 320px a 1440px.

---

## 11. Critério de Atualização Deste Guia

Este documento deve ser mantido atualizado sempre que ocorrerem mudanças em:
- Estados, fases ou ramificações do `PBLEngine` e do `PBLSession`;
- Parâmetros do prompt, modelo ou salvaguardas do Professor PBL;
- Critérios de transferência, retenção ou modelo de mastery BKT;
- Políticas de segurança, autoridade do servidor e persistência;
- Estrutura de auditoria de questões e cobertura curricular.
