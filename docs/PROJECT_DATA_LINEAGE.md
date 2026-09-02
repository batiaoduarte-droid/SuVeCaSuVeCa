# Projeto SuVeCa — linhagem, transformação, publicação e uso dos dados

Status: **contrato operacional vivo**
Escopo: `Notebook LM/` (fábrica) e `SuVeCaSuVeCa/` (produto)
Última verificação factual: **2026-08-29**

## 1. Finalidade

Este documento responde, para cada grupo de dados:

1. de onde o dado vem;
2. qual camada possui autoridade sobre ele;
3. como ele é adquirido e transformado;
4. quais artefatos intermediários e finais são produzidos;
5. o que efetivamente atravessa a fronteira entre fábrica e produto;
6. qual componente consome o artefato publicado;
7. onde o estado criado pelo aluno é persistido;
8. quais auditores e testes validam o fluxo;
9. o que deve ser atualizado quando a origem, o schema ou o consumidor mudar.

Ele é a porta de entrada para qualquer missão que altere dados, compiladores, publicação ou consumidores. Relatórios em `Notebook LM/05_Auditorias/` registram execuções específicas, mas não substituem este contrato.

## 2. Regra obrigatória de manutenção

Uma alteração deve atualizar este documento na mesma missão quando modificar qualquer um destes elementos:

- origem ou autoridade de um dataset;
- formato ou schema;
- compilador, curador ou publicador;
- caminho de artefato intermediário ou publicado;
- índice, manifest ou hash derivado;
- componente consumidor;
- chave ou coleção de persistência;
- auditor, gate ou comando de reconstrução;
- política de imutabilidade, proveniência ou fallback.

Se a alteração não modificar a linhagem, o relatório final da missão deve declarar: `DATA_LINEAGE.md revisado; sem mudança de linhagem`.

## 3. Vocabulário das camadas

| Camada | Função | Pode ser fonte de verdade? |
| --- | --- | --- |
| Aquisição | Guarda PDFs, capturas, HTML, transcrições e respostas brutas. | Sim, para provar o que foi adquirido; não para consumo direto do produto. |
| Corpus processado | Normaliza a fonte por aula, preservando texto, questões, respostas e proveniência. | Sim, para payload extraído e conteúdo da apostila. |
| Canonical | Organiza conhecimento, identidades, relações, evidências e semântica homologada. | Sim, para fatos pedagógicos e editoriais consolidados. |
| Projeção/autoria | Acrescenta organização didática, apresentações e overlays derivados sem substituir a fonte. | Sim, somente para a projeção que declara produzir. |
| View compilada | Monta o modelo learner-facing de cada unidade. | Sim, para organização pedagógica operacional da unidade. |
| Deployment | Contém somente artefatos necessários ao produto autônomo. | Sim, para o que a versão publicada do produto efetivamente carrega. |
| Runtime | Renderiza os artefatos e registra ações do aluno. | Não corrige conteúdo; é autoridade apenas sobre estado do usuário. |
| Auditoria | Registra evidência, decisões, hashes e resultados de gates. | Não; prova ou reprova outra camada. |

## 4. Fluxo global

```text
FONTES EXTERNAS E BRUTAS
apostilas + grifos + videoaulas + questões capturadas
                       ↓
Notebook LM/01_Extracao
                       ↓ aquisição/normalização
Notebook LM/02_Portugues/Aula Processada/Aula XX
  ├─ corpus_apostila
  ├─ Video_Aulas
  └─ Integracao_Pedagogica local
                       ↓ consolidação
Notebook LM/02_Portugues/Integracao_Pedagogica/v2/canonical
                       ↓ autoria, projeções e compilação
Notebook LM/04_Views_Compiladas/v4.2
Notebook LM/02_Portugues/Aula Processada/PBL
Notebook LM/02_Portugues/Aula Processada/Mapas Estruturados
                       ↓ publicação controlada
SuVeCaSuVeCa/public/knowledge
SuVeCaSuVeCa/src/data/*.generated.ts
                       ↓ contratos e renderers
React / Semantic AST / PBLRepository / loaders
                       ↓
estado do aluno em LocalStorage e Firebase
```

## 5. Catálogo rápido por grupo de dados

| Grupo | Autoridade principal | Artefato final da fábrica | Artefato publicado | Consumidor principal |
| --- | --- | --- | --- | --- |
| Apostilas e conteúdo de aula | corpus por aula + canonical | canonical + Views v4.2 | `public/knowledge/pedagogical/views/` | `PedagogicalUnitRenderer` e seções semânticas |
| Questões oficiais de apostila | origem documental histórica nas apostilas; fonte operacional em `corpus_apostila/questions.jsonl` e `answers.jsonl` | cópia fiel em `official_questions.jsonl`; apresentação e pedagogia em coleções derivadas | `official-questions.raw/normalized` + shards + ocorrências nas Views | loaders de questões, unidades, simulado e PBL |
| Apresentação de questões | `question_presentations.jsonl` e overlays auditáveis | apresentação canonical/overlays | `question-presentation-repair.json`, projeções e normalized | renderer de questões oficiais |
| Roteiros de resolução | procedimentos canônicos e seções `resolution` | Views + projeção de procedimentos | `decision-procedures.json` | `DecisionTreeViewer` |
| Mapas estruturados | `sourceText` + AST semanticamente regenerado | `structured_map_presentations.jsonl` | `structured-map-presentations.json` | `StructuredDiagram` na Apostila e em Roteiros |
| Flashcards editoriais | candidatos por aula + canonical | `flashcard_candidates.jsonl` | `editorialFlashcards.generated.ts` | `FlashcardPractice` e revisão diária |
| Flashcards pessoais | erros e solicitações do usuário | não passa pela fábrica | estado runtime | `FlashcardPractice`, LocalStorage e Firebase |
| PBL | canonical, banco de questões, LOs e overlays PBL | JSONL em `Aula Processada/PBL` | JSON em `public/knowledge/pbl/` | `PBLRepository` e fluxo PBL |
| Macrogrupos | catálogo curricular compilado | `macro-catalog.v1.json` | catálogo público + índice gerado | percurso, filtros e navegação |
| Conexões SuVeCA | unidades, conteúdo e curadoria metodológica | conexões validadas por aula | `suveca-method.json` e dados gerados | cards de conexão e metodologia |
| RAG/Professor IA | canonical e chunks de projeção de IA | `rag_chunks.jsonl` | contexto selecionado pelo servidor | rotas autenticadas `/api/gemini/*` |
| Revisões A14 | revisões cumulativas derivadas | Views A14 v1 | Views A14 publicadas | `CumulativeReviewRenderer` |
| Estado do aluno | eventos do frontend | não pertence à fábrica | LocalStorage/Firebase | métricas, recall, PBL, flashcards, agenda e notas |

## 6. Apostilas e conteúdo pedagógico

### Origem

- arquivos completos e versões grifadas adquiridos em `Notebook LM/01_Extracao/`;
- material processado por aula em `Notebook LM/02_Portugues/Aula Processada/Aula XX — .../`;
- videoaulas e transcrições em `Video_Aulas/` e nas áreas de aquisição correspondentes;
- o grifo é evidência de curadoria, não autorização para eliminar conteúdo não grifado.

### Processamento

1. aquisição e preservação da fonte;
2. conversão para corpus por aula;
3. separação de conteúdo, questões, respostas, tabelas e proveniência;
4. geração da integração pedagógica local;
5. consolidação global pelo compilador `Notebook LM/06_Ferramentas/compilacao/integracao_pedagogica_v2.py`;
6. autoria e enriquecimento semântico;
7. compilação das Views em `Notebook LM/04_Views_Compiladas/v4.2/`;
8. publicação controlada das Views necessárias ao produto.

#### Aquisição multimodal de videoaulas

```text
MP4 preservado em 01_Extracao + transcrição Markdown com timestamps
→ processar_videoaulas_gemini.py
→ Gemini Interaction (agentic/low por padrão, thinking high)
→ resposta validada por JSON Schema e contrato Markdown
→ Knowledge_Bases_Gemini/*.md + *.manifest.json
→ consolidação temática posterior
→ integração pedagógica/canonical
```

O manifesto da KB é a prova operacional da chamada: hashes das duas entradas e do
prompt, modelo, modo de processamento, resolução, projeto/chave por fingerprint,
ID e estado da Interaction, tokens por categoria, tempos e limpeza dos recursos
remotos. Interações em background interrompidas permanecem retomáveis pelo mesmo
ID e projeto, sem novo upload. A Files API e a Interaction são intermediários da
fábrica; não são publicados no produto.

As cotas Gemini são tratadas no escopo de projeto. No inventário atual, cada chave
foi declarada como pertencente a um projeto individual; se essa premissa mudar, o
runner deve ser executado com `--keys-share-project`. O Batch API não participa da
aquisição multimodal, porque esta usa Interactions agentic com vídeo.

### Artefatos

- corpus local: `Aula XX/corpus_apostila/`;
- integração local: `Aula XX/Integracao_Pedagogica/`;
- canonical global: `Notebook LM/02_Portugues/Integracao_Pedagogica/v2/canonical/`;
- View operacional: `Notebook LM/04_Views_Compiladas/v4.2/IP-Axx-Gyy.json`;
- View publicada: `SuVeCaSuVeCa/public/knowledge/pedagogical/views/IP-Axx-Gyy.json`.

### Uso no produto

```text
View publicada
→ índice src/data/pedagogicalViewIndex.generated.ts
→ PedagogicalUnitRenderer
→ componente da seção
→ SemanticBlockRenderer
→ renderer específico do tipo semântico
```

### Validação

- auditoria canonical com `integracao_pedagogica_v2.py audit --require-publishable`;
- `npm run audit:pedagogical`;
- `npm run audit:view-index`;
- testes DOM e Playwright;
- `npm run ai-studio:preflight`.

### Ao alterar

Atualizar a fonte responsável, recompilar a projeção afetada, revisar o diff da View, reconstruir o índice e atualizar manifests/hashes. Não corrigir conteúdo pedagógico por CSS ou pelo renderer.

## 7. Canonical pedagógico

### Origem e função

O canonical consolida as unidades regulares, objetivos, conceitos, relações, regras, procedimentos, contrastes, exemplos, limites, misconceptions, evidências, questões e decisões editoriais.

Diretório:

`Notebook LM/02_Portugues/Integracao_Pedagogica/v2/canonical/`

Coleções operacionais atualmente presentes:

```text
units, learning_objectives, prerequisites,
concepts, concept_relations, explanation_blocks,
rules, procedures, contrasts, examples, exam_traps,
misconceptions, limits_exceptions, tables,
connection_maps, retrieval_summaries,
evidence, evidence_links,
editorial_cases, editorial_decisions,
official_questions, question_blocks,
question_presentations, question_pedagogy,
cumulative_review_units
```

### Autoridade

- fatos normativos e editoriais: canonical e corpus que os sustenta;
- payload de questão: fonte extraída protegida;
- organização learner-facing: View, não canonical;
- um relatório não pode substituir uma coleção canonical.

### Ao alterar

Mudanças semânticas exigem evidência, preservação de IDs e auditoria. Não regenerar todo o canonical para resolver um defeito localizado de apresentação.

## 8. Questões oficiais

### Universo de apostila: origem documental e fonte operacional

Para as 2.588 questões de apostila, não confundir a origem histórica do documento com a entrada do compilador:

- **origem documental histórica:** a apostila da qual o corpus foi extraído;
- **fonte operacional da questão:** `Notebook LM/02_Portugues/Aula Processada/Aula XX/corpus_apostila/questions.jsonl`;
- **fonte operacional do gabarito e comentário:** `Notebook LM/02_Portugues/Aula Processada/Aula XX/corpus_apostila/answers.jsonl`;
- **representação canonical:** `Notebook LM/02_Portugues/Integracao_Pedagogica/v2/canonical/official_questions.jsonl`, que deve conservar cópia exata dos payloads operacionais sob a política `payload_must_match_corpus_apostila_exactly`.

Os arquivos `study_guide.md` e demais Markdown do corpus são projeções pedagógicas derivadas. Eles não alimentam a compilação das questões, não são fonte alternativa do enunciado ou do gabarito e não devem ser usados para reparar payloads.

A auditoria de 2026-08-29 reconciliou as 2.588 questões desse universo e encontrou:

- 0 ausentes no canonical;
- 0 divergências de `questionPayload`;
- 0 divergências de `answerPayload`.

Evidência: `Notebook LM/05_Auditorias/questoes/QUESTION_VIEW_ERROR_INVENTORY_2026-08-29.md`.

### Universo de captura online

Questões capturadas online constituem um canal separado. Seus payloads locais preservados em `SuVeCaSuVeCa/public/knowledge/official-questions.raw.json` e `Notebook LM/02_Portugues/Integracao_Pedagogica/question_bank_v1/normalized/question_source_occurrences.jsonl` podem gerar overlays por `compilar_overlays_questoes.py`. Esse canal não redefine a fonte operacional das 2.588 questões de apostila.

### Separação obrigatória

```text
OFFICIAL QUESTION
payload original e gabarito protegidos
        ↓
QUESTION PRESENTATION
segmentação, limpeza visual e recuperação auditável
        ↓
QUESTION PEDAGOGY
competência, feedback, causalidade, PBL e transferência
```

### Processamento

- `integracao_pedagogica_v2.py` lê `questions.jsonl` e `answers.jsonl` e cria a representação canonical inicial;
- `question_bank_pipeline.py` reconcilia os JSONL do corpus, canonical e banco operacional;
- `compilar_overlays_questoes.py` produz overlays online;
- `recuperar_apresentacoes_questoes_apostila.py` recupera somente apresentação visual/contextual comprovada no PDF canônico, usando texto nativo, geometria de sublinhado e mídia embutida; não altera questão nem resposta;
- `publicar_overlays_questoes.py` integra overlays autorizados;
- `build-pedagogical-curriculum.mjs` projeta raw, normalized, índices e ocorrências editoriais;
- `build-deployment-shards.mjs` divide raw/normalized para deployment.

Fluxo das questões de apostila:

```text
apostila (origem documental histórica)
→ corpus_apostila/questions.jsonl + answers.jsonl (fontes operacionais)
→ canonical/official_questions.jsonl (cópia fiel)
→ PDF canônico vinculado por document_id/page_id (evidência auxiliar de tipografia/mídia)
→ question_presentations.jsonl + question_presentations.apostila-recovered.jsonl (projeções corrigíveis)
→ View e banco publicado
→ renderer learner-facing
```

Não inserir Markdown nem OCR especulativo entre os JSONL e `question_presentations`. A recuperação nativa do PDF é permitida exclusivamente na apresentação, quando `document_id`, `page_id`, hash do PDF, página, método e ocorrência recuperada são registrados. Se a informação não existir no payload nem no PDF canônico vinculado, o caso deve falhar de forma explícita e retornar ao fluxo de aquisição do corpus.

### Artefatos publicados

```text
SuVeCaSuVeCa/public/knowledge/official-questions.raw.json
SuVeCaSuVeCa/public/knowledge/official-questions.normalized.json
SuVeCaSuVeCa/public/knowledge/official-questions.manifest.json
SuVeCaSuVeCa/public/knowledge/official-question-parts/
SuVeCaSuVeCa/public/knowledge/official-question-index.json
SuVeCaSuVeCa/public/knowledge/official-question-presentation-fallbacks.json
SuVeCaSuVeCa/public/knowledge/question-assets/
```

Questões também podem aparecer dentro das Views publicadas. Ocorrência em View e ID único são métricas diferentes.

### Uso

- unidades pedagógicas;
- simulado;
- PBL;
- rotas server-side de consulta;
- índices e shards carregados sob demanda.

### Validação

- igualdade de payload entre `corpus_apostila` e `official_questions.jsonl`;
- integridade da junção `question_id` entre `questions.jsonl` e `answers.jsonl`;
- `audit-question-presentations.mjs`;
- `audit-deployment-shards.mjs`;
- `audit-pedagogical-curriculum.mjs`;
- auditoria PBL quando houver vínculos pedagógicos.

### Overlays de comentários pedagógicos regenerados (Extensos v2 integrais + Comuns v1)

- **Finalidade:** Fornecer comentários explicativos ricos em Markdown estruturados proporcionalmente:
  - **Comentários Extensos (`extended` e `very_extended`):** arquitetura em duas camadas (Camada 1: resolução autossuficiente e Camada 2: aprofundamento e expansão pedagógica).
  - **Comentários Comuns (`common`):** arquitetura em camada única direta (`### Resolução`, justificativa individual de alternativas e regra essencial opcional concisa), preservando integralmente o comentário legado para auditoria e rollback.
- **Universo factual alvo:**
  - 867 questões extensas protegidas (apostila: >79 palavras `extended`, >133 `very_extended`; plataforma online: >401 palavras `extended`, >614 `very_extended`).
  - 2.618 questões comuns (3.485 comentadas totais - 867 extensas protegidas = 2.618 comuns).
- **Prompts editoriais mandatórios:**
  - Extensos: `Notebook LM/07_Prompts/questoes/PROMPT_REGENERACAO_PEDAGOGICA_COMENTARIOS_QUESTOES.md` (seções 1–43).
  - Comuns: `Notebook LM/07_Prompts/questoes/PROMPT_REGENERACAO_PEDAGOGICA_COMENTARIOS_COMUNS.md` (seções 1–39).
- **Árvore de autoria e evidência na fábrica:**
  - Extensos publicáveis: `Notebook LM/03_Autoria_Semantica/question_commentaries/v2/question_commentary_regenerations.jsonl` e `Notebook LM/05_Auditorias/questoes/commentary_regeneration/v2/` (867/867 alvos aprovados com `status: ready`, 0 pendências).
  - A rodada extensa v1 determinística não homologada permanece somente para auditoria e rollback em `Notebook LM/05_Auditorias/questoes/commentary_regeneration/v1_failed_deterministic/`; ela não pode ser republicada.
  - Comuns: `Notebook LM/03_Autoria_Semantica/question_commentaries/common/v1/question_commentary_regenerations.common.jsonl` e `Notebook LM/05_Auditorias/questoes/commentary_regeneration/common/v1/` (`manifest.json`, `target_inventory.jsonl`, `context_packs/`, `responses/`, `validated/`, `failures.jsonl`, `human_review_queue.jsonl`, `manual_review_resolutions.jsonl`, `audit_report.json`, `publication_report.json`).
  - Alertas do agente não são apagados para forçar publicação. Uma resolução manual só libera o comentário quando referencia fonte verificável, confirma gabarito e alternativas, declara os controles semânticos obrigatórios e corresponde ao SHA-256 exato do texto learner-facing. Qualquer alteração posterior invalida automaticamente a aprovação.
- **Compiladores e validadores:**
  - `Notebook LM/06_Ferramentas/compilacao/validate_commentary_responses_v2.py`
  - `Notebook LM/06_Ferramentas/compilacao/materialize_common_commentary_packs.py`
  - `Notebook LM/06_Ferramentas/compilacao/generate_common_commentary_regenerations.py`
  - `Notebook LM/06_Ferramentas/compilacao/validate_common_commentary_responses.py`
  - `Notebook LM/06_Ferramentas/compilacao/apply_common_commentary_overlays.py`
  - `SuVeCaSuVeCa/scripts/apply-commentary-overlays.mjs`
- **Artefato publicado no produto:**
  - `SuVeCaSuVeCa/public/knowledge/editorial-question-commentary-overlays.json` (overlay consolidado contendo os 867 registros extensos v2 publicáveis + 2.618 registros comuns aprovados, totalizando 3.485 overlays ativos em 2026-09-01, com 0 pendências).
- **Integração no banco de deployment:**
  - Aplicado sobre `SuVeCaSuVeCa/public/knowledge/official-questions.normalized.json` com merge por `questionId`, validação de SHA-256 do comentário anterior, gravação de `commentaryFormat: "markdown"` e `commentaryOrigin: "pedagogical_regeneration"`, preservando o comentário legado no campo `legacyCommentary`.
  - Reconstrução de shards via `scripts/build-deployment-shards.mjs`.
- **Renderização learner-facing:**
  - `src/components/ui/QuestionCommentaryRenderer.tsx` com renderização GFM, suporte a camada única (comum) e dupla camada (extenso), remoção do bloco de controle editorial, proteção contra HTML script e fallback para texto simples em comentários legados.
  - Consumido por `OfficialQuestionsExplorer.tsx`, `QuestionBlock.tsx`, `SimuladoEngine.tsx`.
- **Testes e validação:**
  - Fábrica: `Notebook LM/09_Testes/test_commentary_regeneration.py` e `Notebook LM/09_Testes/test_common_commentary_regeneration.py`.
  - Produto: `src/components/ui/QuestionCommentaryRenderer.test.tsx`, `npm run lint`, `npm test`, `npm run audit:pedagogical`, `npm run audit:pbl`, `npm run build`.

## 9. Apresentação de questões

### Origem

`Notebook LM/02_Portugues/Integracao_Pedagogica/v2/canonical/question_presentations.jsonl`

Para questões de apostila, o texto e o gabarito dessa coleção derivam exclusivamente do payload estruturado de `corpus_apostila/questions.jsonl` e `answers.jsonl`, reconciliado em `official_questions.jsonl`. Quando a extração textual perdeu tipografia ou mídia essencial, `recuperar_apresentacoes_questoes_apostila.py` pode acrescentar uma projeção source-backed obtida do PDF canônico vinculado. Essa projeção preserva o payload, registra SHA-256/página/método e usa spans nativos, vetores de sublinhado ou imagem embutida; Markdown e OCR não são fontes alternativas da questão.

### Função

Separar sem mutar o payload oficial:

- texto de apoio;
- fonte editorial;
- comando;
- alternativas;
- mídia e marcação tipográfica;
- estado `ready`, recuperado ou bloqueado.

### Projeções do produto

```text
public/knowledge/pedagogical/question-presentation-repair.json
public/knowledge/pedagogical/question-support-projection.json
public/knowledge/pedagogical/inline-option-projection.json
public/knowledge/pedagogical/views/*.json
public/knowledge/official-question-presentation-fallbacks.json
public/knowledge/question-assets/*
```

O fallback publicado não é uma segunda base de questões: contém apenas apresentações derivadas para referências presentes nas Views que não pertencem ao store normalizado principal. `officialQuestionsLoader` o consulta sob demanda somente quando a resolução por índice/shard falha.

### Ao alterar

Atualizar a apresentação derivada, não o payload. Auditar duplicação de alternativas, rodapés vazando, separação entre texto de apoio, fonte e comando, e conflitos de destaque. Toda recuperação deve estar vinculada ao mesmo `question_id` e possuir proveniência source-backed. Imagem original pode satisfazer uma dependência visual quando a própria questão depende de charge/tirinha; na ausência de texto, tipografia ou mídia comprovável, publicar estado bloqueado explícito em vez de inventar marcação.

O gate preventivo deve validar a cadeia completa `JSONL → question presentation → View`, incluindo:

1. schema e atomicidade de cada registro de `questions.jsonl` e `answers.jsonl`;
2. correspondência única por `question_id`;
3. igualdade do payload protegido no canonical;
4. decomposição sem perda ou duplicação em `question_presentations`;
5. ausência de alternativa incorporada ao comando quando as opções já existem separadamente;
6. ausência de rodapé editorial nos campos learner-facing;
7. coerência entre estado de destaque, evidência tipográfica e disponibilidade da tentativa;
8. correspondência da apresentação publicada com a View e o renderer.
9. existência e hash de toda mídia declarada, além de sua cópia para `public/knowledge/question-assets/`;
10. permanência fail-closed dos resíduos cujo PDF/HTML local realmente não contém a informação solicitada.

## 10. Roteiros de resolução

### Origem

Os roteiros não são uma base independente inventada pelo frontend. Eles derivam de:

- `procedures.jsonl` no canonical;
- blocos e procedimentos das seções `resolution` das Views;
- candidatos históricos em `Aula XX/Integracao_Pedagogica/suveca/decision_tree_candidates.jsonl`;
- mapas estruturados associados por `presentationId`.

### Conversão e publicação

```text
procedimentos + Views + mapas estruturados
→ SuVeCaSuVeCa/scripts/project-decision-procedures.mjs
→ public/knowledge/pedagogical/decision-procedures.json
→ DecisionTreeViewer
```

Comando:

```powershell
npm run build:decision-procedures
```

### Uso

`DecisionTreeViewer.tsx` carrega o catálogo, aplica filtros e encaminha estruturas visuais ao mesmo `StructuredDiagram` usado pela Apostila.

### Ao alterar

Atualizar primeiro o procedimento ou mapa na fábrica, depois reprojetar. Não corrigir um Roteiro somente no JSON publicado se a mesma estrutura também existe na View da Apostila.

## 11. Mapas estruturados

### Origem

Cada apresentação preserva:

- `sourceText`: texto/diagrama original;
- identidade e ocorrências nas Views e nos Roteiros;
- AST semântico em schema `2.1.0`;
- `structuredText` derivado da estrutura;
- proveniência da classificação.

### Fonte operacional

```text
Notebook LM/05_Auditorias/semantica/structured-maps-v2-regeneration/maps/*.json
```

### Integração

```text
mapas individuais validados
→ integrate_structured_maps_v2.py
→ Notebook LM/02_Portugues/Aula Processada/Mapas Estruturados/structured_map_presentations.jsonl
→ SuVeCaSuVeCa/public/knowledge/pedagogical/structured-map-presentations.json
```

### Uso compartilhado

```text
Apostila → SemanticBlockRenderer → StructuredDiagram
Roteiros → DecisionTreeViewer → StructuredDiagram
```

### Tipos

`sequence`, `decision_flow`, `branches`, `comparison`, `taxonomy` e `relations`.

O frontend escolhe a apresentação pelo tipo e pelo AST. Não deve reconstruir topologia por regex aplicada ao ASCII.

### Validação

- schema `structured_map_batch.schema.json`;
- `validate_structured_map_v2.py`;
- testes de topologia da fábrica;
- auditorias pedagógicas do produto;
- testes do `StructuredDiagram` e Playwright desktop/mobile.

### Ao alterar

Alterar o mapa individual, validar, integrar e reprojetar as superfícies consumidoras. Preservar `sourceText`, identidade e os mapas fora do escopo. Atualizar o relatório de regeneração quando a topologia homologada mudar.

## 12. Flashcards

### 12.1 Flashcards editoriais

#### Origem

`Aula XX/Integracao_Pedagogica/suveca/flashcard_candidates.jsonl`

Os candidatos são extraídos da integração pedagógica por `gerar_integracao_pedagogica.py` e reconciliados com unidades e conteúdo editorial.

#### Publicação

`build-pedagogical-curriculum.mjs` seleciona e projeta os cards para:

`SuVeCaSuVeCa/src/data/editorialFlashcards.generated.ts`

#### Uso

- `FlashcardPractice`;
- revisão diária;
- dica/recuperação vinculada ao currículo.

### 12.2 Flashcards pessoais e de erros

São dados do usuário, não conteúdo canonical. Podem ser produzidos a partir do Caderno de Erros pela rota autenticada:

`/api/gemini/generate-error-flashcards`

Persistência:

```text
LocalStorage: suveca_flashcards_<buildId>_<user|guest>
Firebase: users/<uid>/data/flashcards_caderno_<buildId>
Compatibilidade legada: users/<uid>/data/flashcards_caderno
```

### Ao alterar

Não misturar cards editoriais gerados no build com cards pessoais. Mudanças de chave persistida exigem migração ou fallback explícito.

## 13. PBL

Detalhamento operacional, composição pedagógica e mapa completo de formação até o runtime: `docs/PBL_PRODUCT_HARDENING.md`.

### Origem

O PBL combina:

- Learning Objectives e unidades do canonical;
- questões oficiais e questões autorais autorizadas;
- vínculos questão–competência;
- pedagogia de questão;
- casos, caminhos diagnósticos e transfer sets;
- overlays causais e auditorias de transferência.

### Fonte operacional da fábrica

`Notebook LM/02_Portugues/Aula Processada/PBL/`

Principais coleções JSONL:

```text
pbl_cases
pbl_competency_map
pbl_cumulative_review_sessions
pbl_diagnostic_paths
pbl_transfer_sets
question_competency_links
question_pedagogy
pbl_authored_questions
pbl_causal_distractor_mappings
pbl_transfer_audits
```

### Conversão e publicação

- consolidação e compilação por ferramentas em `Notebook LM/06_Ferramentas/compilacao/`;
- hardening semântico causal/transferência em `curar_pbl_causal_transferencia.py`;
- publicação por `publicar_overlays_produto.py` ou reconstrução controlada equivalente;
- produto recebe projeções JSON, não os JSONL editoriais completos.

### Artefatos runtime

Diretório:

`SuVeCaSuVeCa/public/knowledge/pbl/`

O núcleo carregado pelo `PBLRepository` inclui casos, mapa de competências, revisões cumulativas, caminhos, transfer sets, links e pedagogia. Relatórios de lacuna e cobertura são evidência de deployment, não substitutos desses datasets.

### Consumo e persistência

```text
public/knowledge/pbl
→ PBLRepository
→ sessão PBL
→ diagnóstico/intervenção/transferência/reflexão
```

Persistência:

```text
LocalStorage: suveca_pbl_session_<sessionId>
LocalStorage: suveca_pbl_mastery_<userId>
Firebase: users/<uid>/pblSessions/<sessionId>
Firebase: users/<uid>/pblMastery/<competencyId>
```

### Validação

`npm run audit:pbl` e gate PBL do preflight.

### Ao alterar

Manter IDs de competência, proveniência da questão e política fail-closed. Recompilar apenas coleções afetadas e nunca substituir datasets completos por fallback do frontend.

## 14. Macrogrupos e percurso curricular

### Origem

`Notebook LM/04_Views_Compiladas/v4.2/curriculum/macro-catalog.v1.json`

### Publicação

`Notebook LM/06_Ferramentas/publicacao/publicar_macroentradas_produto.py`

O produto mantém o catálogo publicado e o índice gerado em:

```text
SuVeCaSuVeCa/public/knowledge/pedagogical/curriculum/
SuVeCaSuVeCa/src/data/pedagogicalMacroCatalog.generated.ts
```

### Uso

- percurso de estudo;
- agrupamento learner-facing;
- filtros e navegação;
- associação entre unidade, aula e macroentrada.

### Ao alterar

Atualizar catálogo e manifest da fábrica, publicar, reconstruir o índice e executar auditoria de macros. Não alterar IDs persistidos apenas para mudar rótulos.

## 15. Conexões SuVeCA

### Origem

Derivam do conteúdo da unidade e da aplicação metodológica SuVeCA. Artefatos locais ficam em:

`Aula XX/Integracao_Pedagogica/suveca/connections/`

O pipeline `processar_conexoes_suveca_gemini.py` produz/valida conexões, e `finalizar_conexoes_suveca_editorial.py` consolida decisões editoriais.

### Publicação e uso

O produto consome projeções como:

- `public/knowledge/pedagogical/suveca-method.json`;
- `src/data/suvecaMethod.generated.ts`;
- campos de conexão das Views.

Esses dados alimentam cards de conexão com a aula e metodologia. Não devem ser confundidos com os mapas estruturados do conteúdo.

## 16. RAG e Professor IA

### Origem

Chunks de recuperação derivam do canonical e das projeções de IA por aula, por exemplo:

`Aula XX/Integracao_Pedagogica/v2/projections/ai/rag_chunks.jsonl`

### Uso

O servidor seleciona contexto autorizado para rotas autenticadas `/api/gemini/*`. O frontend não deve carregar o canonical completo nem enviar segredos.

### Segurança

- `GEMINI_API_KEY` permanece server-side;
- Firebase Admin valida o usuário;
- ausência de autenticação ou Admin falha de forma fechada;
- RAG apoia a resposta, mas não altera a fonte pedagógica durante o runtime.

## 17. Revisões cumulativas A14

### Origem

As 13 revisões A14 são derivadas das unidades regulares e de `cumulative_review_units.jsonl`. Possuem schema próprio e não devem ser forçadas ao contrato das 102 unidades regulares.

### Publicação e uso

- Views A14 em `04_Views_Compiladas/v4.2/`;
- Views A14 publicadas em `public/knowledge/pedagogical/views/`;
- renderização por `CumulativeReviewRenderer`.

Persistência local do protocolo:

`suveca_cumulative_protocol_v1_<unitId>`

## 18. Estado do aluno

Estado runtime nunca deve ser confundido com conteúdo editorial.

| Estado | LocalStorage/Firebase principal | Responsável |
| --- | --- | --- |
| Recall da unidade | `suveca_recall_v2_<unitId>` | `RecallSection` |
| PBL | `suveca_pbl_session_*`, `suveca_pbl_mastery_*` e coleções PBL do usuário | `PBLSessionRepository` |
| Flashcards | `suveca_flashcards_*` e documentos `flashcards_caderno*` | `FlashcardPractice` |
| Métricas | chave versionada pelo build e `learning_metrics_<buildId>` | `useLearningMetrics` |
| Notas | chave por módulo e `users/<uid>/module_notes/` | `ModuleViewer` |
| Simulado pausado | `suveca_simulado_pausado_*` e `simulado_em_andamento` | `SimuladoEngine` |
| Agenda/revisão | chaves versionadas e documentos de agenda | `DailyReviewDashboard` |
| Preferências | `suveca_study_prefs_*` e `study_preferences` | `StudyPreferences` |

Mudanças nessas chaves exigem compatibilidade, migração explícita ou leitura legada documentada.

## 19. Artefatos gerados e manifests

Não editar manualmente arquivos gerados quando existe compilador responsável.

Exemplos:

```text
src/data/pedagogicalViewIndex.generated.ts
src/data/pedagogicalMacroCatalog.generated.ts
src/data/editorialFlashcards.generated.ts
src/data/modules.generated.ts
src/data/pedagogicalKnowledge*.generated.ts
src/data/suvecaMethod.generated.ts
public/knowledge/official-question-parts/*
```

Manifests registram versão, universo, bytes e hashes. Quando um artefato publicado muda, seu manifest e os índices dependentes também devem ser reconstruídos.

## 20. Matriz de decisão: onde corrigir

| Problema observado | Camada correta |
| --- | --- |
| Texto ou gabarito não corresponde à fonte | aquisição/corpus, com preservação da fonte e decisão editorial |
| Apresentação mistura apoio, comando e alternativas | `question_presentations`/projeção de apresentação |
| Regra ou explicação está pedagogicamente errada | canonical/autoria semântica com evidência |
| Conteúdo correto está na unidade errada | identidade/compilação da View |
| AST do mapa tem ramos errados | mapa individual/curadoria semântica |
| Card correto está visualmente quebrado | renderer/CSS após confirmar AST correto |
| Roteiro não reflete o procedimento | procedimento/View/projeção de Roteiros |
| PBL diagnostica competência errada | links, pedagogia ou caminho PBL |
| Artefato existe na fábrica e não no produto | publicação/deployment |
| Progresso some após build | persistência/migração de chave |

## 21. Procedimento obrigatório para mudanças

### Antes de editar

1. identificar o grupo neste documento;
2. confirmar a autoridade e a fronteira de publicação;
3. localizar compilador, consumidor e auditor;
4. registrar o estado Git do produto;
5. preservar alterações preexistentes.

### Durante a mudança

1. corrigir a camada responsável;
2. preservar IDs e proveniência;
3. evitar regeneração global para problema local;
4. atualizar artefatos derivados pelo compilador responsável;
5. atualizar esta documentação quando a linhagem mudar.

### Depois da mudança

1. auditar a fonte e o artefato publicado;
2. revisar o diff entre fábrica e produto;
3. reconstruir índices/manifests pertinentes;
4. executar gates proporcionais;
5. declarar universos e contagens;
6. informar se `DATA_LINEAGE.md` mudou ou foi revisado sem mudança.

## 22. Comandos de validação

### Fábrica

```powershell
Set-Location "C:\Users\origi\OneDrive\Desktop\Códigos\portugues\Notebook LM"
.\.venv\Scripts\python.exe -m unittest discover -s .\09_Testes -p "test_*.py"
.\.venv\Scripts\python.exe .\06_Ferramentas\compilacao\integracao_pedagogica_v2.py audit --require-publishable
.\.venv\Scripts\python.exe .\06_Ferramentas\gemini\processar_conexoes_suveca_gemini.py --somente-auditoria
```

### Produto

```powershell
Set-Location "C:\Users\origi\OneDrive\Desktop\Códigos\portugues\SuVeCaSuVeCa"
npm run lint
npm test
npm run audit:pedagogical
npm run audit:pbl
npm run audit:view-index
npm run test:e2e
npm run build
npm run ai-studio:preflight
```

## 23. Limites deste documento

- Contagens mudam com builds; a fonte numérica vigente são os manifests e auditores executados.
- Caminhos históricos podem continuar em ledgers antigos e não devem ser reescritos.
- Este documento descreve Português e o produto atual; Lógica possui pipeline próprio e deve ganhar seção específica antes de cruzar a fronteira de publicação.
- Nenhum conteúdo bruto, canonical completo, prompt, ledger ou intermediário deve ser copiado para o produto apenas para facilitar depuração.
