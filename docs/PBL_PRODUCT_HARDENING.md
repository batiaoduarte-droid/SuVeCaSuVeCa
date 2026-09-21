# PBL Product Hardening

## Escopo

Este documento descreve como o PBL é formado na fábrica, publicado e executado no produto, além do contrato do runtime após o hardening de UX, fluxo, inteligência pedagógica conversacional e engajamento. O hardening do runtime não reescreveu payload oficial, gabarito, artefato canônico, decisão editorial ou View Model v4.2.

## Fontes de verdade

- Autoria e projeções PBL da fábrica: `Notebook LM/02_Portugues/Aula Processada/PBL/`.
- Projeção runtime de casos, competências, transfer sets e caminhos diagnósticos: `public/knowledge/pbl/`.
- Apresentação publicada de questões: shards normalizados em `public/knowledge/official-question-parts/`.
- Fallback de apresentação: `officialQuestions` das views em `public/knowledge/pedagogical/views/`.
- Contexto normativo e pedagógico do tutor: shards em `public/knowledge/pbl/tutor/` indexados por `pbl_tutor_manifest.json`.
- Gabarito: payload oficial publicado. A UI apenas o adapta para os formatos `Certo/Errado`, `correct/incorrect`, `letter_X`, `option_X` ou letra simples.

O seletor de transferência ignora uma referência quando não existe apresentação publicada. Todas as 190 competências possuem ao menos uma questão real utilizável para transferência.

O contrato global de origem, transformação e publicação está em `docs/PROJECT_DATA_LINEAGE.md`. Este documento detalha a composição pedagógica, os contratos de API, a segurança avaliativa e a execução do PBL no produto.

## Como o PBL é formado

O PBL não é gerado apenas a partir das questões. A questão fornece o objeto concreto de prática, mas a sessão depende da combinação entre currículo, semântica pedagógica, relações entre questões e competências, auditorias causal e de transferência e estado do aluno.

### Entradas e responsabilidades

| Grupo de dados | Origem ou autoridade | Papel na formação do PBL |
| --- | --- | --- |
| Unidades e Learning Objectives | canonical em `Notebook LM/02_Portugues/Integracao_Pedagogica/v2/canonical/` | definem as 190 competências, sua identidade curricular e a unidade a que pertencem |
| Conceitos, regras, procedimentos, pré-requisitos, contrastes, traps e misconceptions | canonical | fornecem o conteúdo semântico usado em diagnóstico, intervenção e mediação do tutor |
| Questões oficiais e gabaritos | `corpus_apostila/questions.jsonl` e `answers.jsonl`, canonical e banco oficial publicado | fornecem enunciado, alternativas, resposta oficial e situações reais de aplicação |
| Questões autorais PBL | `pbl_authored_questions.jsonl` | completam lacunas de prática que não possuem questão oficial adequada, sem substituir o banco oficial |
| Apresentação e comentário da questão | store normalizado publicado; fallback das Views | fornecem ao runtime o texto learner-facing e, quando existente, a resolução usada no exemplo trabalhado da intervenção |
| Vínculos questão–competência | `question_competency_links.jsonl` | declaram a competência principal ou secundária, os papéis permitidos e os escores de adequação de cada questão |
| Pedagogia da questão | `question_pedagogy.jsonl` | registra regra decisiva, estratégia de solução, análise dos distratores e referências pedagógicas |
| Mapeamentos causais de distratores | `pbl_causal_distractor_mappings.jsonl` | autorizam quais erros podem sustentar hipótese causal e quais servem somente como feedback local |
| Auditorias de transferência | `pbl_transfer_audits.jsonl` | determinam quais pares de transferência podem produzir evidência válida de aprendizagem |
| Casos, caminhos, conjuntos e revisões | `pbl_cases.jsonl`, `pbl_diagnostic_paths.jsonl`, `pbl_transfer_sets.jsonl` e `pbl_cumulative_review_sessions.jsonl` | organizam a sequência executável da sessão |
| Contexto estruturado do Tutor | `pbl_tutor_manifest.json` e shards em `tutor/` | fornecem regras, contrastes, tabelas, limites normativos e refutações objetivas ao motor de IA |
| Estado do aluno | tentativas, confiança, histórico recente, mastery e revisões persistidas | decide a rota em tempo de execução; não altera a autoria dos datasets PBL |

### Mapa de formação, publicação e execução

```text
FONTES PEDAGÓGICAS
canonical
├─ unidades + Learning Objectives + pré-requisitos
├─ conceitos + regras + procedimentos + contrastes
└─ traps + misconceptions

BANCO DE PRÁTICA
├─ questões oficiais + gabaritos protegidos
├─ apresentações + comentários
└─ questões autorais PBL autorizadas
                    │
                    ▼
AUTORIA E VINCULAÇÃO SEMÂNTICA
├─ question_competency_links
│  └─ qual competência a questão mede e em quais papéis pode atuar
├─ question_pedagogy
│  └─ regra decisiva, estratégia, distratores e referências pedagógicas
└─ pbl_tutor_context (regras canônicas, contrastes, limites e refutações)
                    │
                    ▼
HARDENING SEMÂNTICO
├─ pbl_causal_distractor_mappings
│  └─ diagnóstico causal autorizado ou feedback_only
└─ pbl_transfer_audits
   └─ transferência audited ou unverified
                    │
                    ▼
ESTRUTURAS EXECUTÁVEIS DA FÁBRICA
├─ pbl_competency_map
├─ pbl_cases
├─ pbl_diagnostic_paths
├─ pbl_transfer_sets
├─ pbl_tutor_manifest + shards
└─ pbl_cumulative_review_sessions
                    │
                    ▼ publicação controlada JSONL → JSON / Shards
public/knowledge/pbl/
                    │
                    ▼
PBLRepository + PBLTutorContextResolver
├─ carrega estruturas PBL e valida integridade (SHA-256 e bytes)
├─ resolve apresentações das questões (oficiais e autorais)
└─ aplica filtro sanitizador anti-vazamento de gabarito pré-tentativa
                    │
                    ▼
PBLEngine + Seletores + Servidor (/api/pbl/tutor/turn e /api/pbl/session/sync)
                    │
                    ▼
caso → tentativa + confiança → hipótese/sondagem
→ intervenção socrática adaptativa (Professor PBL / Gemini 3.1 Flash-Lite)
→ nova aplicação isomórfica → transferência adaptativa
→ reflexão com Active Recall (>= 6 palavras)
→ transfer_confirmed, retention_confirmed ou needs_review
```

### Transformações da fábrica até o produto

1. O canonical e os bancos de questões fornecem identidade curricular, conteúdo pedagógico, payload oficial e apresentações.
2. A autoria PBL cria os vínculos e a pedagogia de cada questão e consolida as estruturas por competência.
3. O hardening causal limita `diagnosticCandidateRefs` a questões semanticamente autorizadas. Uma resposta errada isolada é hipótese; uma misconception ou um mecanismo estável exige confirmação por sondagem independente.
4. A auditoria de transferência classifica cada item. Somente transferência `audited` pode sustentar crédito de transferência ou retenção; itens `unverified` podem manter a prática operável, mas não comprovam domínio.
5. `Notebook LM/06_Ferramentas/publicacao/publicar_overlays_produto.py` projeta os JSONL autorizados da fábrica para os JSON consumidos pelo produto e integra os overlays causal e de transferência.
6. `PBLRepository` carrega os artefatos publicados e resolve a apresentação de cada questão primeiro no banco PBL autoral, depois no store normalizado e, por último, no fallback das Views.
7. `PBLEngine`, `QuestionPoolSelector`, `DiagnosticResolver`, `InterventionPlanner`, `TransferSelector`, `NextActionPolicy` e `MasteryUpdater` executam a sessão com base nesses dados e no estado do aluno.

### Artefatos publicados carregados pelo runtime

O diretório `public/knowledge/pbl/` contém atualmente:

```text
pbl_authored_questions.json
pbl_cases.json
pbl_competency_map.json
pbl_cumulative_review_sessions.json
pbl_diagnostic_paths.json
pbl_manifest.json
pbl_transfer_sets.json
pbl_runtime_manifest.json
runtime-parts/question-competency-links.part-*.json
runtime-parts/question-pedagogy.part-*.json
tutor/pbl_tutor_manifest.json
tutor/tutor-context.part-*.json
```

`pbl_content_gap_report.json` e `pbl_semantic_coverage_report.json` são relatórios de cobertura e auditoria; não substituem os datasets executáveis.

Os arquivos monolíticos `question_competency_links.json` e `question_pedagogy_index.json` permanecem como agregados de publicação e reconciliação. O frontend carrega a projeção shardada, com arquivos de no máximo 2 MiB, e valida bytes, SHA-256, fronteiras de IDs, duplicidades e totais antes de liberar o repositório. Assim, ambientes gerenciados que omitam arquivos grandes não tornam os dois agregados uma dependência operacional.

`PBLRepository.init()` opera em modo fail-closed: shard ausente, truncado, alterado ou com contagem divergente bloqueia a inicialização com erro explícito. O runtime não sintetiza vínculos nem pedagogia a partir dos casos, porque isso perderia papéis, atribuições atômicas e revisões semânticas.

Após uma publicação PBL autorizada, execute `npm run build:pbl-shards` e `npm run audit:pbl`. Os shards e o manifesto são artefatos versionados do produto.

No manifest publicado de 2026-08-26, esse conjunto representa 190 competências, 190 casos, 190 caminhos diagnósticos, 190 transfer sets, 13 sessões cumulativas, 4.945 vínculos/pedagogias de questão e 81 questões autorais PBL. O hardening registra 619 questões com revisão causal, das quais 380 foram autorizadas para diagnóstico, além de 1.418 registros de auditoria de transferência, com 1.344 pares auditados e 74 não verificados. Essas contagens são um snapshot; o manifest e o auditor do HEAD são sempre a referência numérica vigente.

---

## Fluxo de aprendizagem e condução pelo tutor

### Modos de Condução da Sessão

- **`conductionMode: 'tutor'` (Padrão do produto)**: a intervenção pós-erro ou pós-dúvida é conduzida conversacionalmente pelo **Professor PBL** (`PBLAdaptiveInterventionView`), integrando o microestudo estruturado ao diálogo socrático inteligente.
- **`conductionMode: 'legacy'` (Modo Clássico)**: intervenção estruturada tradicional baseada em cartões determinísticos sucessivos de diagnóstico e microestudo, preservada para compatibilidade retroativa e testes comparativos.

### Ciclo de Aprendizagem Completo

```text
caso inicial (âncora)
├─ [opcional] dúvida pré-tentativa com o Professor PBL (modo pista/ajuda socrática prévia com gabarito censurado)
↓
resposta + nível de confiança (Chute | Baixo | Médio | Alto) + hipótese/autoexplicação opcional
↓
avaliação da tentativa (AttemptEvaluator)
├─ se acerto forte (alta confiança): avança direto para transferência adaptativa
└─ se erro ou acerto frágil (dúvida):
    ├─ sondagem independente (DiagnosticResolver), quando a causa for incerta
    ├─ ramificação de pré-requisito (branch_to_prerequisite), se houver déficit basal
    └─ intervenção adaptativa com Professor PBL (PBLAdaptiveInterventionView)
        - microestudo normativo (regras, condições, exceções, contrastes, tabelas, limites de regra)
        - diálogo socrático inteligente (Gemini 3.1 Flash-Lite)
        - metacognitive insight (calibração metacognitiva em 1 frase)
        - reasoning chips (3 a 4 atalhos rápidos para dúvidas frequentes)
        - quickCheck (micro-desafio de fixação em 1 linha com justificativa)
        - geração de ficha estruturada para o Caderno de Erros (notebookDraft)
        - compensação de latência da IA no cronômetro da sessão
        ↓
    nova aplicação isomórfica (Reattempt) em questão oficial diferente
        ↓
bateria de transferência adaptativa (5 tipos: isomórfica, próxima, caso-limite, distante, invertida)
        ↓
decisão reflexiva com Active Recall (exigência mínima de 6 palavras formuladas pelo aluno)
        ↓
resumo de evidências e agendamento de revisão espaçada
```

O gabarito oficial e a resolução do item **nunca são exibidos antes da submissão da tentativa**. A nova aplicação nunca repete a questão âncora. Dificuldade persistente após intervenção e tentativas de transferência é catalogada com segurança como `needs_review`, impedindo ciclos infinitos ou frustração punitiva.

---

## Arquitetura de Execução do Professor PBL

### 1. Endpoints do Servidor

A mediação inteligente do PBL é operada por quatro rotas no backend Express (`server.ts` e `src/lib/pbl/tutor/pblTutorServerRoute.ts`):

1. **`POST /api/pbl/tutor/turn`**:
   - Processa cada turno de conversa entre o aluno e o tutor.
   - Requer autenticação do usuário e aplica limitação de taxa (`limitAiRequests`, teto de 20 req/min).
   - Resolve o contexto da questão via `PBLTutorContextResolver.server`.
   - Consulta o estado autoritativo da sessão no `PBLServerSessionRepository`.
   - Executa sanitização estrita anti-vazamento de gabaritos via `filterTutorContextForStudent`.
   - Aciona o modelo `gemini-3.1-flash-lite` com rotação de chaves (`geminiKeyManager`), `thinkingLevel: 'low'`, schema estrito JSON e timeout de 30 segundos.
   - Em caso de indisponibilidade, timeout ou resposta inválida da IA, aciona imediatamente o **fallback determinístico**, preservando a continuidade pedagógica.
2. **`GET /api/pbl/tutor/context/:questionRef`**:
   - Retorna o contexto pedagógico completo da questão (regras canônicas, procedimentos, contrastes, tabelas e variantes).
   - Se o usuário for anônimo ou se não houver tentativa oficial registrada para a questão na sessão ativa, os campos `officialAnswer`, `officialCommentary`, `solutionStrategy`, `decisivePoint`, `commonMistake` e as refutações das alternativas são censurados como `REDACTED`.
3. **`GET /api/pbl/tutor/manifest`**:
   - Entrega os metadados dos shards do tutor e correções de auditoria gramatical.
4. **`POST /api/pbl/session/sync`**:
   - Sincronização atômica da sessão entre o cliente e o Firestore.
   - **Autoridade avaliativa absoluta do servidor**: ignora respostas autoavaliadas pelo cliente, consulta o banco oficial e reavalia a correção e o quadrante de confiança no backend.
   - Exige que o `userId` do corpo coincida com o token Firebase verificado.
   - Bloqueia mutações no histórico de tentativas (*append-only* estrito e imutável).

### 2. Compensação de Latência de IA

Para proteger o orçamento de tempo ativo da sessão (12 min em sessões guiadas e 18 min em cumulativas):
- Cada resposta do tutor registra o tempo de processamento da IA em `turn.executionMetadata.durationMs`.
- O motor executa `deductPBLSessionWaitTime`, subtraindo esse período do tempo decorrido do aluno.
- O aluno não perde tempo de estudo enquanto aguarda o processamento do modelo.

### 3. Diretrizes Comportamentais do Prompt (`PBL_TUTOR_SYSTEM_INSTRUCTION`)

O modelo é regido por diretrizes pedagógicas inegociáveis:
- **Diálogo Construtivo e Acolhedor**: atitude investigativa, empática e focada na descoberta do critério correto.
- **Proibição de Imputar Falhas Pessoais**: proibido atribuir erros a *"pressa"*, *"leitura descuidada"*, *"falta de atenção"* ou *"vício de interpretação"*. Todo erro é considerado uma hipótese pedagógica compreensível.
- **Separação Tripartite**: distinção clara entre a *hipótese do aluno*, o *gabarito oficial normativo* e a *explicação didática derivada*.
- **Benchmark Gramatical Canônico**: precisão técnica em tópicos sensíveis (ex.: *"porem"* como infinitivo pessoal do verbo pôr vs *"puserem"* como futuro do subjuntivo).
- **Sem IDs Técnicos**: proibição de vazar códigos crus (ex.: `RULE-IP-A00-G01-001`).
- **Andaime Metacognitivo Calibrado**:
  - *Erro com Alta Confiança*: investigação da armadilha do distrator e distinção contrastiva.
  - *Erro com Baixa Confiança*: instrução algorítmica direta passo a passo.
  - *Acerto Frágil*: validação afirmativa e convite para explicitar o critério.
- **QuickChecks Válidos**: desafios de fixação em 1 linha ancorados em `sourceRefs` legítimos, sem adiantar o gabarito de itens futuros e sem bloquear o avanço do motor.

---

## Critérios de evidência de aprendizagem

O runtime não chama desempenho imediato de domínio duradouro. Quando os itens de transferência satisfazem simultaneamente os critérios do conjunto, o resultado é:

- a taxa mínima de acerto do respectivo transfer set;
- a quantidade exigida de acertos consecutivos.
- `transfer_confirmed`, em uma sessão de aquisição ou diagnóstico: evidência de reaplicação imediata;
- `retention_confirmed`, somente em uma sessão de revisão posterior após intervalo $\ge 20$ horas sem assistência prévia;
- `needs_review`, quando a evidência é insuficiente, o teto de 4 tentativas foi esgotado ou o aluno solicita revisão na reflexão.

`mastered` permanece apenas como valor legado de hidratação e é normalizado para `transfer_confirmed`; não é produzido por sessões novas. Esgotar até quatro tentativas de transferência sem satisfazer o critério produz `needs_review`. Finalizar a prática, acumular XP, marcar recall ou ler uma unidade não equivale automaticamente a domínio.

---

## Sessão, persistência e segurança

- Sessão recomendada ou diagnóstica: uma competência, orçamento de até 12 minutos de tempo ativo.
- Revisão cumulativa: até duas competências, orçamento de até 18 minutos de tempo ativo.
- Sair exige escolher entre pausar, encerrar ou continuar estudando.
- Sessões pausadas podem ser retomadas pelo Dashboard.
- Tempos são medidos por tentativa, sem soma cumulativa duplicada.
- Atingir o orçamento encerra com segurança e registra `needs_review`; o tempo, por si só, nunca confirma aprendizagem.
- LocalStorage é a persistência imediata; Firestore é sincronizado em paralelo para usuários autenticados via `/api/pbl/session/sync`.
- Histórico de tentativas *append-only* e imutável no banco de dados remoto.

---

## Novidade da evidência e prevenção de respostas mecânicas

O produto mantém um ledger compacto de encontros com questões por usuário, finalidade e sessão (`questionEncounterLedger`). Ao selecionar nova aplicação ou transferência, o motor evita questões vistas recentemente — inclusive itens com identificadores diferentes, mas enunciado equivalente — e prefere itens auditados ainda não expostos.

Quando não existe alternativa fresca, o fallback recente é permitido apenas para manter a sessão operável, é marcado como `unverified` para fins de evidência e aparece de forma transparente na interface. Assim, uma resposta potencialmente contaminada por memória do item não pode, sozinha, sustentar confirmação de transferência ou retenção.

---

## Decisão Reflexiva com Active Recall

Na fase de reflexão, o aluno é desafiado a converter a prática em procedimento mental de longo prazo:
1. **Active Recall Obrigatório**:
   - Resposta aberta à provocação: *“Na próxima questão, primeiro vou…”*.
   - É exigido um mínimo de **6 palavras** autorrelatadas para habilitar a opção de fechamento *"Manter minha regra"*.
2. **Comparação com Orientação Publicada**:
   - O aluno visualiza o critério publicado em linguagem natural para confronto imediato.
3. **Opções de Fechamento**:
   - `own_rule` (Manter minha regra): valida a formulação autônoma do aluno (se satisfeita a exigência de 6 palavras).
   - `suggested_rule` (Adotar a orientação): adota a orientação oficial, sendo marcado como decisão assistida no histórico.
   - `needs_review` (Ainda preciso revisar): registra a necessidade de nova oportunidade de aprendizagem.

---

## Caderno de Erros e revisão

Entradas PBL usam o contrato de `CadernoErroItem`:

- `origin: "pbl"`;
- `questionId` e `moduleRef`;
- resposta selecionada e resposta oficial apresentadas em formato legível;
- `sourceRefs` com questão e sessão;
- `nextReviewAt` derivado do modelo de mastery;
- deduplicação por origem e questão.

O resumo da sessão oferece acesso direto ao Caderno e à Revisão Diária.

---

## Integridade de gabaritos

O runtime continua fail-closed: nenhum caso sem apresentação ou gabarito interpretável pode ser graduado, e o produto nunca infere nem inventa resposta. No baseline publicado atual, a auditoria encontra 190 casos graduáveis e nenhum caso bloqueado. Isso descreve o deployment vigente e não autoriza mutação de payload oficial ou reabertura de decisão editorial protegida.

---

## Gates de manutenção

Executar:

```bash
npm run audit:pbl
npm test -- src/lib/pbl
npm run test:e2e -- tests/e2e/pbl-flow-accessibility.spec.ts
npm run ai-studio:preflight
```

O auditor PBL verifica, além da integridade referencial:

- renderização dos gabaritos dos 190 casos graduáveis;
- bloqueio fail-closed de qualquer caso que volte a não possuir apresentação ou gabarito interpretável;
- disponibilidade de transferência real nas 190 competências;
- integridade e correspondência dos shards do tutor e do motor.
