# PBL Product Hardening

## Escopo

Este documento descreve como o PBL é formado na fábrica, publicado e executado no produto, além do contrato do runtime após o hardening de UX, fluxo e engajamento. O hardening do runtime não reescreveu payload oficial, gabarito, artefato canônico, decisão editorial ou View Model v4.2.

## Fontes de verdade

- Autoria e projeções PBL da fábrica: `Notebook LM/02_Portugues/Aula Processada/PBL/`.
- Projeção runtime de casos, competências, transfer sets e caminhos diagnósticos: `public/knowledge/pbl/`.
- Apresentação publicada de questões: shards normalizados em `public/knowledge/official-question-parts/`.
- Fallback de apresentação: `officialQuestions` das views em `public/knowledge/pedagogical/views/`.
- Gabarito: payload oficial publicado. A UI apenas o adapta para os formatos `Certo/Errado`, `correct/incorrect`, `letter_X`, `option_X` ou letra simples.

O seletor de transferência ignora uma referência quando não existe apresentação publicada. Todas as 190 competências possuem ao menos uma questão real utilizável para transferência.

O contrato global de origem, transformação e publicação está em `docs/PROJECT_DATA_LINEAGE.md`. Este documento detalha a composição pedagógica e a execução do PBL no produto.

## Como o PBL é formado

O PBL não é gerado apenas a partir das questões. A questão fornece o objeto concreto de prática, mas a sessão depende da combinação entre currículo, semântica pedagógica, relações entre questões e competências, auditorias causal e de transferência e estado do aluno.

### Entradas e responsabilidades

| Grupo de dados | Origem ou autoridade | Papel na formação do PBL |
| --- | --- | --- |
| Unidades e Learning Objectives | canonical em `Notebook LM/02_Portugues/Integracao_Pedagogica/v2/canonical/` | definem as 190 competências, sua identidade curricular e a unidade a que pertencem |
| Conceitos, regras, procedimentos, pré-requisitos, contrastes, traps e misconceptions | canonical | fornecem o conteúdo semântico usado em diagnóstico e intervenção |
| Questões oficiais e gabaritos | `corpus_apostila/questions.jsonl` e `answers.jsonl`, canonical e banco oficial publicado | fornecem enunciado, alternativas, resposta oficial e situações reais de aplicação |
| Questões autorais PBL | `pbl_authored_questions.jsonl` | completam lacunas de prática que não possuem questão oficial adequada, sem substituir o banco oficial |
| Apresentação e comentário da questão | store normalizado publicado; fallback das Views | fornecem ao runtime o texto learner-facing e, quando existente, a resolução usada no exemplo trabalhado da intervenção |
| Vínculos questão–competência | `question_competency_links.jsonl` | declaram a competência principal ou secundária, os papéis permitidos e os escores de adequação de cada questão |
| Pedagogia da questão | `question_pedagogy.jsonl` | registra regra decisiva, estratégia de solução, análise dos distratores e referências pedagógicas |
| Mapeamentos causais de distratores | `pbl_causal_distractor_mappings.jsonl` | autorizam quais erros podem sustentar hipótese causal e quais servem somente como feedback local |
| Auditorias de transferência | `pbl_transfer_audits.jsonl` | determinam quais pares de transferência podem produzir evidência válida de aprendizagem |
| Casos, caminhos, conjuntos e revisões | `pbl_cases.jsonl`, `pbl_diagnostic_paths.jsonl`, `pbl_transfer_sets.jsonl` e `pbl_cumulative_review_sessions.jsonl` | organizam a sequência executável da sessão |
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
└─ question_pedagogy
   └─ regra decisiva, estratégia, distratores e referências pedagógicas
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
└─ pbl_cumulative_review_sessions
                    │
                    ▼ publicação controlada JSONL → JSON
public/knowledge/pbl/
                    │
                    ▼
PBLRepository
├─ carrega estruturas PBL
├─ resolve apresentações das questões
└─ cruza links, pedagogia e banco publicado
                    │
                    ▼
PBLEngine + seletores + resolvedores
                    │
                    ▼
caso → tentativa + confiança → hipótese/sondagem
→ intervenção → nova aplicação → transferência
→ reflexão → transfer_confirmed, retention_confirmed ou needs_review
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
question_competency_links.json
question_pedagogy_index.json
```

`pbl_content_gap_report.json` e `pbl_semantic_coverage_report.json` são relatórios de cobertura e auditoria; não substituem os datasets executáveis.

No manifest publicado de 2026-08-26, esse conjunto representa 190 competências, 190 casos, 190 caminhos diagnósticos, 190 transfer sets, 13 sessões cumulativas, 4.945 vínculos/pedagogias de questão e 81 questões autorais PBL. O hardening registra 619 questões com revisão causal, das quais 380 foram autorizadas para diagnóstico, além de 1.418 registros de auditoria de transferência, com 1.344 pares auditados e 74 não verificados. Essas contagens são um snapshot; o manifest e o auditor do HEAD são sempre a referência numérica vigente.

### Efeito dos comentários regenerados

Os comentários pedagógicos publicados participam do PBL, mas em uma fronteira específica. `PBLRepository.getQuestionPresentation()` recupera o comentário normalizado, e `InterventionPlanner` o usa como `workedExample.resolution` durante a intervenção. Se não houver comentário utilizável, o runtime aplica um fallback explícito com o gabarito oficial e uma justificativa genérica.

Atualizar um comentário pode melhorar a explicação mostrada ao aluno, mas não altera automaticamente:

- a competência associada à questão;
- os papéis de âncora, diagnóstico, transferência ou validação;
- a regra decisiva e a estratégia registradas em `question_pedagogy`;
- a misconception ou o mecanismo causal;
- o caminho diagnóstico;
- a classificação ou a validade da transferência.

Essas dimensões só mudam por seus próprios artefatos de autoria, revisão, auditoria e publicação.

## Fluxo de aprendizagem

```text
caso inicial
→ resposta + confiança explícita
→ feedback diagnóstico
→ sondagem, quando a causa ainda for incerta
→ intervenção
→ nova aplicação em questão diferente
→ transferência em questões oficiais reais
→ reflexão do aluno
→ resumo e revisão programada
```

O gabarito bruto não é mostrado antes da intervenção. A nova aplicação não repete a questão âncora. A sessão não entra em ciclo infinito: dificuldade persistente é registrada como `needs_review`.

## Critérios de evidência de aprendizagem

O runtime não chama desempenho imediato de domínio duradouro. Quando os itens de transferência satisfazem simultaneamente os critérios do conjunto, o resultado é:

- a taxa mínima de acerto do respectivo transfer set;
- a quantidade exigida de acertos consecutivos.

- `transfer_confirmed`, em uma sessão de aquisição ou diagnóstico: evidência de reaplicação imediata;
- `retention_confirmed`, somente em uma sessão de revisão posterior: evidência de recuperação após intervalo;
- `needs_review`, quando a evidência é insuficiente ou o aluno solicita revisão na reflexão.

`mastered` permanece apenas como valor legado de hidratação e é normalizado para `transfer_confirmed`; não é produzido por sessões novas. Esgotar até quatro tentativas de transferência sem satisfazer o critério produz `needs_review`. Finalizar a prática, acumular XP, marcar recall ou ler uma unidade não equivale automaticamente a domínio.

## Sessão e persistência

- Sessão recomendada ou diagnóstica: uma competência, orçamento de até 12 minutos de tempo ativo.
- Revisão cumulativa: até duas competências, orçamento de até 18 minutos de tempo ativo.
- Sair exige escolher entre pausar, encerrar ou continuar estudando.
- Sessões pausadas podem ser retomadas pelo Dashboard.
- Tempos são medidos por tentativa, sem soma cumulativa duplicada.
- Atingir o orçamento encerra com segurança e registra `needs_review`; o tempo, por si só, nunca confirma aprendizagem.
- LocalStorage é a persistência imediata; Firestore é sincronizado em paralelo para usuários autenticados.

## Novidade da evidência e prevenção de respostas mecânicas

O produto mantém um ledger compacto de encontros com questões por usuário, finalidade e sessão. Ao selecionar nova aplicação ou transferência, o motor evita questões vistas recentemente — inclusive itens com identificadores diferentes, mas enunciado equivalente — e prefere itens auditados ainda não expostos.

Quando não existe alternativa fresca, o fallback recente é permitido apenas para manter a sessão operável, é marcado como `unverified` para fins de evidência e aparece de forma transparente na interface. Assim, uma resposta potencialmente contaminada por memória do item não pode, sozinha, sustentar confirmação de transferência ou retenção.

## Caderno de Erros e revisão

Entradas PBL usam o contrato de `CadernoErroItem`:

- `origin: "pbl"`;
- `questionId` e `moduleRef`;
- resposta selecionada e resposta oficial apresentadas em formato legível;
- `sourceRefs` com questão e sessão;
- `nextReviewAt` derivado do modelo de mastery;
- deduplicação por origem e questão.

O resumo da sessão oferece acesso direto ao Caderno e à Revisão Diária.

## Integridade de gabaritos

O runtime continua fail-closed: nenhum caso sem apresentação ou gabarito interpretável pode ser graduado, e o produto nunca infere nem inventa resposta. No baseline publicado atual, a auditoria encontra 190 casos graduáveis e nenhum caso bloqueado. Isso descreve o deployment vigente e não autoriza mutação de payload oficial ou reabertura de decisão editorial protegida.

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
- disponibilidade de transferência real nas 190 competências.
