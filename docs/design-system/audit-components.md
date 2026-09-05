# Auditoria de componentes — SuVeCA

Data: 2026-09-05. Auditoria estática de componentes no worktree atual, HEAD `1cbf855`, incluindo alterações locais preexistentes. Nenhum React, dado pedagógico ou arquivo Figma foi alterado por esta auditoria. `../AGENTS.md` foi consultado. Este documento não declara validação de runtime, contraste medido ou aprovação de gates.

## Cobertura

Inventário: **117 arquivos TSX de implementação** sob `src/components`, excluídos `*.test.tsx`: raiz 30; `pbl` 8; `pedagogical` 2; `pedagogical/blocks` 6; `pedagogical/macro` 1; `pedagogical/sections` 12; `study-visuals` 19; `ui` 39. A contagem é de arquivos, não de exports ou componentes montados. Inventário, imports, props, usos e estados foram cruzados; famílias compartilhadas e principais componentes interativos tiveram leitura aprofundada.

## Conclusão

A base mais coerente para o mini DS é a gramática semântica de `study-visuals`, somada aos controles CSS compartilhados e ao comportamento responsivo dos shells. Há primitives React de nome genérico que não são usadas: ter um arquivo `PageHeader` não prova que seus estilos representem o frontend ativo. Criar biblioteca visual em Figma antes de qualquer consolidação de React.

### Padrões deliberados a preservar

- **Gramática pedagógica:** dez tons explicitamente documentados em `src/components/study-visuals/studyVisualTokens.ts:8`: regra teal, procedimento sky, contraste slate/bilateral, exemplo emerald, pegadinha amber, exceção purple, mnemônico yellow, conceito slate/teal, questão indigo, SuVeCA teal. Os cinco papéis sintáticos têm cores próprias em `:167`.
- **Composição pedagógica tipada:** `SemanticBlockRenderer.tsx:394` despacha tipos diferentes. Conceito, regra, procedimento, contraste, exemplo, mnemônico, questão e recall não devem virar um card genérico com troca de cor. Os layouts comunicam relações distintas.
- **Conteúdo selecionável e fluido:** `StudySurface.tsx:23`, `StudyCallout.tsx:49` e famílias pedagógicas usam `select-text`, títulos que crescem, conteúdos opcionais e padding responsivo.
- **Progresso e retomada:** `ContinueLearningCard.tsx:25`, `WeeklyGoalCard.tsx:50` e `DailyReviewDashboard.tsx:460` usam superfícies suaves, ações explícitas e progresso; no Figma, instanciar o mesmo Progress e Action.
- **Cor + outro sinal:** alternativas corrigidas de `QuestionBlock.tsx:142` combinam borda, superfície, check/X; seleção usa `aria-pressed` em `:160`; status indisponível em `:187` e feedback ao leitor em `:198`.
- **Tentativa antes da solução:** `QuestionBlock.tsx:49`, `:83`, `:196` separa seleção, confirmação e correção. Preservar na biblioteca de estados e no protótipo.
- **Modais e navegação responsiva:** `ModalShell.tsx:39` é tela cheia no mobile e diálogo centralizado no desktop; header e corpo rolável separados, safe area e botão fechar 44 px. `Navbar.tsx:406`/`:511` troca navegação desktop por navegação inferior móvel.
- **Comportamento de teclado reutilizável:** `useModalFocus.ts` implementa foco inicial, Escape, contenção de Tab e restauração de foco; usado por Search, Tutor, Caderno, Navbar, ModuleViewer, Simulado e Questões.
- **Tabelas móveis:** `ResponsiveTable.tsx:60` preserva região rolável focável desktop e projeta registros como `dl` mobile em `:72`; `ResponsiveStudyTable.tsx:75` oferece seleção tabela/cards. Não reduzir conteúdo para fazê-lo caber.

### Legado / inconsistências observadas

| Achado | Evidência | Implicação no DS |
| --- | --- | --- |
| PageHeader, EmptyState e SegmentedControl sem uso externo encontrado em `src` | Busca dos nomes; `ui/PageHeader.tsx:17`, `EmptyState.tsx:17`, `SegmentedControl.tsx:24` | São propostas locais ou legado, não padrão ativo confirmado. |
| Button e Input existem como CSS, sem primitive React dedicado | `src/index.css:322`, `:347`, `:367`, `:396` | Formalizar componentes Figma em cima do contrato visual ativo, não dos muitos botões inline. |
| Mesma ação selecionada varia teal/indigo e resposta binária ganha cor de acerto/erro antes de corrigir | `ui/QuestionBlock.tsx:150`; `pbl/PBLProblemCard.tsx:63`, `:95` | Separar seleção neutra/brand de resultado success/error. Indigo continua sendo semântica de avaliação, não segunda marca global. |
| Callouts têm matrizes cromáticas conflitantes | `ui/PedagogicalCallout.tsx:33` usa azul para limite; `studyVisualTokens.ts:100` usa purple para exceção/limite | Mapear limite de regra para exception. Se limite metodológico precisa de distinção, documentar essa semântica explicitamente. |
| Mnemônico amarelo em uma família e amber/orange na outra | `study-visuals/MnemonicCard.tsx:26`; `ui/MnemonicCard.tsx:34` | Variante estática e interativa podem coexistir sob uma semântica yellow, com API visual compartilhada. `ui/MnemonicCard` não teve uso externo localizado. |
| Procedimento sky e roteiro legado teal | `study-visuals/ProcedureStepper.tsx:195`; `ui/ResolutionStepper.tsx:21` | Um padrão procedure com estados de conclusão; preservar variantes de composição. `ui/ResolutionStepper` não teve uso externo localizado. |
| Múltiplos renderizadores de tabela | `ResponsiveTable.tsx`, `ResponsiveStudyTable.tsx`, `CanonicalTable.tsx`, `SemanticBlockRenderer.tsx:71`, `:211` | Unificar linguagem visual; manter adapters de dados e AST. Não implica fundir contratos. |
| Hover visual em superfície não clicável | `GoldenRuleCard.tsx:44`, `WorkedExampleCard.tsx:52`, `BankTrapCard.tsx:32` | Reservar mudança de elevação/borda interativa a controles; documentação pode manter borda semântica estável. |
| Radius de ação varia 8, 10, 12, 16 px; touch sizing depende do local | `index.css:327`, `:353`, `:373`, `:388`; `WeeklyGoalCard.tsx:78`; `PriorityReviewCard.tsx:68` | Definir famílias e densidades explícitas, target 44 px ou maior como default Figma. |
| Tipos pedagógicos repetem chip, ícone, separador, header, shadow inline | `GoldenRuleCard.tsx:47`, `WorkedExampleCard.tsx:55`, `BankTrapCard.tsx:35` | Criar subcomponentes de header/chip/body para reduzir divergência sem apagar pedagogia. |
| Modais compartilham foco mas não uma composição visual única | `SearchModal.tsx:116`, `ProfessorSuvecaModal.tsx:136`, `OfficialQuestionsExplorer.tsx:337`, `ui/ModalShell.tsx:46` | Dialog/Drawer em Figma com slots e variantes de tamanho; posteriormente React pode reaproveitar shell. |

### Oportunidades de melhoria com evidência

1. **A11y de campos PBL:** `PBLConfidenceSelector.tsx:94` tem label separado de input em `:97`, sem `htmlFor`/`id` ou nome ARIA; desenhar Field com label obrigatório e help/error. O input também não recebe o `disabled` do componente, embora botões recebam (`:74`, `:110`).
2. **Stepper acessível:** `ProcedureStepper.tsx:192` tem botão 44 px e title, mas não declara `aria-pressed`/checked; completar estado semanticamente no handoff. No Figma, nome acessível descritivo e estado concluído explícito.
3. **Tabs:** `SegmentedControl.tsx:25` declara tablist/tab, mas sem roving tabindex, setas, controles/IDs de painéis. Como não está montado, não classificar como falha atual de usuário. O mini DS deve definir se controle troca painéis (tabs) ou filtra seleção (group/radio).
4. **Diálogo de saída PBL:** `PBLSessionView.tsx:528` marca dialog modal em confirmação inline; não aparece no inventário de uso de `useModalFocus`. Definir confirmação como Dialog verdadeiro ou aviso inline conforme comportamento. Não fingir modalidade apenas pela aparência.
5. **Feedback de copiar:** `ui/MnemonicCard.tsx:26` não espera resultado de clipboard antes de mostrar Copiado. Futuro padrão Copy deve ter pending/success/error; componente sem uso externo encontrado.
6. **Estado vazio/carregando/erro:** hoje são locais: `MonthlyLeaderboard.tsx:86`/`:92`/`:98`, `OfficialQuestionsExplorer.tsx:286`/`:326`, `DailyReviewDashboard.tsx:563`, `DecisionTreeViewer.tsx:453`. Criar feedback compacto e de página com ação contextual e textos específicos.
7. **Escala de leitura:** muitos blocos pedagógicos começam em `text-xs` móvel (12 px), inclusive enunciado em `QuestionBlock.tsx:121`. Proposta: body de leitura de 16 px, secundário 14 px e metadado 12 px; validar densidade real antes de portar para React.

## Matriz proposta para Components / Variants no Figma

As variantes abaixo são a arquitetura proposta, não promessa de que já existem todas em React. Instâncias, text properties, boolean properties e instance swaps devem reduzir explosão combinatória.

| Prioridade | Família | Variantes / propriedades | Auto Layout / uso |
| --- | --- | --- | --- |
| P0 | Action/Button | hierarchy primary/secondary/ghost/destructive; state default/hover/pressed/focus/disabled/loading; size regular/compact; leading/trailing icon booleans; label | Horizontal, gap 8, altura mínima 44, padding 12–16, hug width ou fill na ação móvel. |
| P0 | Action/Icon button | hierarchy; state; icon instance swap; accessible label anotado | 44 × 44, conteúdo central, ícone 20. |
| P0 | Form/Field | type text/search/select/textarea; state default/focus/filled/error/disabled; label/help/error text; required | Vertical label–control–help, control fill, conteúdo cresce. |
| P0 | Choice/Option | layout answer/binary/confidence; state default/hover/focus/selected/disabled/correct/incorrect; label/index/icon | Horizontal para alternativa, conteúdo fill/hug height, mínimo 48; confiança em grid 2 → 4 colunas. |
| P0 | Status/Badge | semantic concept/rule/procedure/contrast/example/trap/exception/mnemonic/question/suveca; label/icon | Horizontal hug, gap 4–6, pill. Usar texto + ícone com cor. |
| P0 | Navigation/Item | placement desktop/bottom/sidebar; state default/hover/focus/current; icon/label/count | Desktop horizontal; mobile vertical ícone/label; conteúdo legível a 320 px. |
| P0 | Surface/Panel | purpose default/reading/interactive; emphasis base/soft; tone opcional; slots header/body/footer | Vertical, hug height, fill width; 16 px mobile / 24 px desktop; não empilhar card por parágrafo. |
| P0 | Feedback/Callout | status info/success/warning/error; pedagogical rule/procedure/trap/exception/mnemonic/concept; heading/body/action | Horizontal ícone + coluna de texto, 12–16 px internos, altura por conteúdo. |
| P0 | Study/Syntax token | role su/ve/c/a/pred; emphasis soft/solid; label, description | Horizontal hug/wrap, nunca forçar ordem canônica fixa em sentenças. |
| P0 | Progress/Bar | size sm/md/lg; semantic progress/warning/success; label/percent booleans; value 0/50/100 representativo | Coluna label/value + track; barra fill e percent text property; referência `ui/ProgressBar.tsx`. |
| P0 | Study/Question | type multiple/binary; state idle/selected/reviewed/unavailable; metadata booleans; question/prompt/options/feedback slots | Coluna; metadata com wrap, opções fill; confirmação após seleção; comentário só após tentativa. |
| P1 | Navigation/Segment | selected/unselected/hover/focus/disabled; label/count | Linha scroll ou wrap conforme semântica; targets 44; padrão de teclado documentado. |
| P1 | Overlay/Dialog | placement center/fullscreen/bottom-sheet; width sm/md/lg; title/close/footer booleans | Coluna header/body/footer; scroll apenas body; mobile safe areas; overlay separado. |
| P1 | Study/Section header | title/subtitle/index/icon/badge/count | Coluna; linha superior wrap e texto fill; não prender altura. |
| P1 | Study/Rule | title, statement, optional scope/modality, applicability and boundary slots | Coluna com hierarchy; exception como instância, não pintar tudo de verde. |
| P1 | Study/Procedure step | state pending/completed/current; number/title/body/test booleans | Número 44 px + coluna fill; conector decorativo. |
| P1 | Study/Contrast | orientation columns/stacked; two content slots; decisive criterion | Duas colunas iguais desktop → pilha mobile, rótulos A/B sempre visíveis. |
| P1 | Study/Table | layout table/records; header/row/cell subcomponents; caption | Linha de células fill desktop; coluna de pares label/value mobile; permitir overflow consciente. |
| P1 | Study/Flashcard | state question/hint/answer/explanation/rated; content slots | Coluna de leitura, reveal action e confidence/rating; sem flip decorativo que esconda conteúdo. |
| P1 | Product/Metric | title/value/trend; optional chart/progress/action; state populated/empty/loading | Coluna, header wrap, value hug; distinguir experiência XP de domínio pedagógico. |
| P1 | Feedback/State | kind empty/loading/error/unavailable/offline; size inline/page; icon/title/body/action | Coluna central para página; linha para feedback local; manter altura previsível. |

## Patterns e composição de referência

- **Apostila desktop/mobile:** Navigation + conteúdo principal + retomada + metas + índice curricular; usar cards de produto em grade responsiva, sem fazer todos competirem com CTA principal.
- **Leitura de unidade:** coluna de leitura, cabeçalho/seção, regra, procedimento, tabela, questão e resumo. Sidebar vira drawer mobile; manter semantic AST e payload fonte intactos.
- **Prática PBL:** progresso da sessão → pergunta → alternativa → confiança → feedback/intervenção → transferência. Separar cor de escolha, certeza reportada e resultado.
- **Ferramenta com filtros/resultados:** Page heading, Field/Search, Segments/Filters, Result list, Empty/Error/Loading; aplicações: questões oficiais, roteiros, caderno.
- **Revisão/flashcard:** pergunta → dica opcional → revelar → comentário opcional → avaliação da recordação. Estados atuais em `FlashcardPractice.tsx:673`, `:691`, `:709`, `:747`.
- **Overlay:** busca, tutor e detalhes de questão usam Dialog com mesma mecânica de foco, mas corpos distintos. Não converter conversa ou busca em formulários genéricos.

## Mapeamento das famílias atuais

- **Navegação/shell:** Navbar, ModuleViewer, MobileFAB, PageHeader, ModalShell, SearchModal, ErrorBoundary, OnboardingTour.
- **Hábitos/progresso:** ContinueLearningCard, WeeklyGoalCard, DailyTipCard, DailyMotivationCard, DailyReviewReminder, DailyReviewDashboard, MonthlyLeaderboard, MasteryLevelCard, AchievementsProfile, StatisticsDashboard, StudyPlanner, StudyPreferences, PushNotificationSettings, PomodoroTimer, PriorityReviewCard.
- **Prática/produção:** FlashcardPractice, CadernoDeErros, OfficialQuestionsExplorer, SimuladoEngine, DuelArena, SuvecaAnalyzer, ProfessorSuvecaModal, DecisionTreeViewer, RichNoteEditor, QuestionPresentationContent.
- **PBL:** Dashboard, SessionView, ProblemCard, ConfidenceSelector, DiagnosticView, InterventionView, TransferView, SessionSummary.
- **Pedagogia estruturada:** PedagogicalUnitRenderer, CumulativeReviewRenderer, MacroCurriculum; 12 seções; InlineRichText, ContentBlockRenderer, SemanticBlockRenderer, FormulaBlock, CalloutBlock e CanonicalTable.
- **Study visuals:** StudySurface, StudyBadge, StudyCallout, StudySectionHeader, GoldenRuleCard, ProcedureStepper, ContrastBoard, WorkedExampleCard, BankTrapCard, ExceptionCard, MnemonicCard, BeforeAfterCard, ConceptTree, DecisionFlow, StructuredDiagram, ResponsiveStudyTable, SuvecaSentenceMap, SuvecaPatternExplorer, SuvecaEquationBlocks.
- **UI pedagógica/legado/guia:** MarkdownContent, QuestionBlock, QuestionCommentaryRenderer, ResponsiveTable, PedagogicalCallout, PedagogicalFlowchart, PedagogicalTreeDiagram, CanonicalRulesViewer, ConnectionMap, SuvecaConnectionViewer, GlossaryGrid, ActiveRecallChecklist, ExamTrapCard/ExamTrapsViewer, ResolutionStepper, MnemonicCard, SuvecaBrandHighlight e guias visuais dedicados de acentuação/crase/dígrafos/porquês/pontuação/que-se/estrutura/sílaba/x e método SuVeCA.

## Limites e handoff

Esta auditoria não altera React e não funde contratos pedagógicos. Legado visual é classificação de implementação, não julgamento de validade do conteúdo. Contraste final, targets computados, clipping e ordem de foco exigem inspeção runtime pelo agente responsável; CSS global já oferece foco visível (`src/index.css:41`), portanto ausência de classe focus local sozinha não é evidência de foco invisível.
