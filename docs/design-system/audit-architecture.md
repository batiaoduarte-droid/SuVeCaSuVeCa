# Auditoria da arquitetura frontend para o mini design system

Data: 2026-09-05. Escopo: análise estrutural somente leitura do produto; nenhum React, dado, persistência ou Figma alterado. Baseline: HEAD `1cbf855`, mais alterações locais preexistentes. Os achados refletem o worktree atual, não a fotografia de agosto em `../AGENTS.md`.

## Cobertura e limites

Inventário automatizado de todo `src`: 266 arquivos, 64 arquivos de testes, 119 TSX de produção; 117 destes estão em `components`: 30 na raiz, 39 em `ui`, 19 em `study-visuals`, 21 em `pedagogical` e 8 em `pbl`. A contagem é de arquivos, não exports ou variantes.

Leitura dirigida: entrada, configuração, App, Navbar, roteamento, shells CSS, ModuleViewer, renderers regular/cumulativo, macrocatálogo, modal e foco, feature flags, preferências e pontos de persistência. Busca estrutural nas 14 superfícies e famílias de componentes por imports, geometria, estados, landmarks, modal e grids. Leitura do mapa documental de superfícies e do contrato de linhagem. Isto não equivale a exercitar todos os estados no navegador nem a revisar todo o corpus pedagógico. Auditorias de tokens, componentes e UI/UX complementam esta análise. Nenhum gate executado nesta subauditoria documental; testes existentes foram consultados como contratos, sem declaração de PASS.

Alterações preexistentes preservadas: `docs/PROJECT_DATA_LINEAGE.md`, `src/App.tsx`, `AchievementsProfile`, `CadernoDeErros`, `FlashcardPractice` e seu teste, `MasteryLevelCard`, `ModuleViewer`, `useAchievements`, `achievements`, `masteryLevel` e teste novo de `masteryLevel`.

## Estrutura atual

- React 19 + TypeScript + Vite 6 + Tailwind 4. Motion, Lucide, Recharts, React Markdown/KaTeX e Firebase são dependências reais (`package.json`). Não há biblioteca de componentes externa declarada.
- `src/main.tsx:1`: StrictMode, CSS global e registro diferido de service worker; documento `pt-BR`, manifest e ícone em `index.html`.
- `src/App.tsx:41`: 16 imports lazy, incluindo ModuleViewer, ferramentas e os modais busca/tutor. `ErrorBoundary` por ferramenta e `Suspense` com feedback textual em `App.tsx:91` e `:577`.
- Não há React Router. `src/lib/toolLocation.ts:4` aceita 14 ferramentas na query string; `src/lib/studyLocation.ts:54` resolve módulo, macro, unidade e seção, com estados explícitos de rota inválida. App escuta popstate e sincroniza histórico (`App.tsx:192`).
- Shell do produto, orquestração de autenticação, métricas e caderno de erros concentram-se em `App.tsx` (903 linhas). Componentes extensos: ModuleViewer 1605, SimuladoEngine 1141, DuelArena 1018, StudyPreferences 986, PomodoroTimer 950 linhas. Essas contagens não são defeitos por si; indicam onde padrões repetidos podem divergir.
- Dados publicados → contratos tipados → Semantic AST → renderer → componentes visuais. As famílias `pedagogical`, `study-visuals` e `ui` convivem: preservar conteúdo e semântica ao reorganizar apresentação.

## Superfícies e padrões de composição

| URL/função | Componente / evidência | Composição relevante para Figma |
| --- | --- | --- |
| padrão, `?tool=modules` | `App.tsx:579`, `ModuleViewer.tsx:704` | Dashboard continuar/meta + dica; seletor de aula; catálogo macro/unidades; leitura aprofundada; anotações; prática e flashcards |
| `?tool=pbl` | `pbl/PBLDashboard.tsx:211` | Hero indigo, retomar sessão, fila de revisão, seleção de competências; sessão com problema, confiança, diagnóstico, intervenção, transferência, reflexão/resumo |
| `?tool=analyzer` | `App.tsx:672`, `SuvecaAnalyzer.tsx` | Editor de oração, análise, blocos Su/Ve/C/A/Pred, exemplos e modo foco |
| `?tool=simulado` | `SimuladoEngine.tsx:491` | Configurar → responder → resultado; relógio/status, alternativas, questão atual, feedback, envio ao caderno |
| `?tool=errors` | `CadernoDeErros.tsx:165` | Header, filtros, lista de erros e status, formulário modal, recuperação direcionada |
| `?tool=flashcards` | `FlashcardPractice.tsx:544` | Filtros/origem, frente/verso, autoavaliação de recordação, progresso e vazio |
| `?tool=agenda` | `DailyReviewDashboard.tsx:411` | Review diário; resumos, métricas e fila de revisão |
| `?tool=decision` | `DecisionTreeViewer.tsx:527` | Roteiros; filtros/catálogo, painel de seleção + mapa de decisão, leitura de AST |
| `?tool=planner` | `StudyPlanner.tsx:118` | Planejamento com quatro tabs, plano por aula, agenda e preferências |
| `?tool=duel` | `DuelArena.tsx:462` | Modo Desafio; configuração, rodada, alternativas e placar |
| `?tool=questions` | `OfficialQuestionsExplorer.tsx:194` | Busca + filtros recolhíveis, grid de resultados, detalhe modal, tentativa e feedback |
| `?tool=stats` | `StatisticsDashboard.tsx:329` | KPIs, gráficos e tabelas equivalentes; evolução, precisão, tópicos |
| `?tool=profile` | `AchievementsProfile.tsx:99` | Perfil, nível, cinco pilares, conquistas e ranking |
| `?tool=pomodoro` | `App.tsx:824`, `PomodoroTimer.tsx:451` | Relógio, modos, contexto de estudo, histórico; widget minimizado preserva sessão |
| tutor (modal) | `App.tsx:545`, `ProfessorSuvecaModal.tsx:134` | Conversa, carregamento, entrada de texto e contexto da aula |
| busca (modal) | `SearchModal.tsx:114` | Busca global, resultados curriculares e questões editoriais |
| onboarding (modal) | `OnboardingTour.tsx:166` | Tour com navegação entre ferramentas e instruções |

O arquivo `PRODUCT_SURFACE_MAP.md` está defasado: usa `review`, `trees`, `achievements` e `timer`; as chaves operacionais são `agenda`, `decision`, `profile`, `pomodoro`. Também descreve ModuleViewer síncrono; hoje é lazy. Não gerar links Figma a partir dessas chaves antigas.

## Navegação, shells e responsividade deliberados

`Navbar.tsx:101`: mobile tem Apostila, Analisador, PBL, Simulado e Mais. Desktop promove também Caderno, Flashcards e Review. O menu secundário agrupa Estudar, Praticar, Revisar, Acompanhar (`Navbar.tsx:131`). O tutor abre modal, não uma página real.

`Navbar.tsx:522`: navegação inferior fixa abaixo de lg, altura mínima 64px + safe area, itens de no mínimo 48px de altura. Desktop usa uma segunda linha de navegação a partir de lg (`:404`). Drawer mobile sobe da base, tem até 80vh e rolagem interna (`:561`). Popover desktop tem até 34rem, grid de duas/três colunas e suporte de teclado (`:468`).

`index.css:22`: shell app até 100rem (1600px), ferramenta até 80rem (1280px), gutter fluido. A página é proprietária da margem externa. Ferramentas com `tool-content-shell` reutilizam essa largura, sem margem duplicada (`:92`). PBL usa `w-full` próprio, em vez de tool shell (`PBLDashboard.tsx:211`): a diferença deve ser deliberada ou normalizada no Figma.

`index.css:143`: abaixo de 640px o gutter cai a 6px; headers passam a 16px de padding; tabs permitem rolagem horizontal; ações do simulado expandem a largura. A leitura remove containers decorativos e reduz margens sucessivas (`:220`), deixando conteúdo útil em 320px. Preservar essa política; não desenhar quatro cards concêntricos em mobile.

Grids frequentes: 1→2→3 colunas (catálogo/PBL/planejamento); 2→4 métricas; detalhe de Roteiros com coluna 20rem + conteúdo flexível no lg; charts e tabelas preservam largura própria. Breakpoints utilizados: sm 640, md 768, lg 1024, xl 1280, além de exceção pontual 420 em labels do ModuleViewer (`:722`).

`index.css:133` define leitura de 76ch, mas `:299` retira max-width de parágrafos/listas pedagógicos. O comentário promete leitura escaneável; a regra atual permite texto ocupar toda largura. Propor distinção explícita entre coluna de prosa e superfície larga de tabela/diagrama.

Modais não têm apenas um formato: busca/tutor/ModalShell ocupam 100dvh em mobile, dialog centrado no sm; questões usam sheet com topo arredondado; cadastro de erro permanece dialog centrado. Figma deve explicitar variantes Fullscreen, Dialog, Sheet e a política que escolhe cada uma.

## Estado e persistência que o design precisa representar

- Uso visitante + login Google e sincronização Firebase (`App.tsx:214`, `:318`); avatar/entrar, sincronizando, estados locais e erro de sync não são páginas de autenticação separadas.
- Métricas, conquistas, anotações, caderno, revisão e PBL persistem localmente e/ou sincronizam por usuário. Não alterar chaves/IDs para renomear labels.
- ModuleViewer expõe anotações `idle/loading/saving/saved/error/local` (`:480`, `:1319`) e carregamento pedagógico `idle/loading/loaded/error` (`:233`). Um componente genérico Status deve distinguir essas transições.
- Questões têm estado de conteúdo seguro/bloqueado, não apenas loading/error. Gabarito é revelado somente após tentativa (`OfficialQuestionsExplorer.tsx:418`, testes E2E específicos). Figma deve mostrar Unanswered, Selected, Correct, Incorrect e Unavailable sem expor resposta correta no estado inicial.
- PBL diferencia sessão pausada, retomada, abandono e conclusão; revisão pendente não equivale a domínio. O diálogo de saída em `PBLSessionView.tsx:528` usa `aria-modal` num bloco em fluxo; revisar a escolha entre confirmação inline e modal com foco antes de padronizar esse padrão.
- Pomodoro fica montado fora do contêiner `key={activeTab}` (`App.tsx:824`); é um padrão de atividade persistente que precisa de estados expanded/minimized/running/paused/complete.
- Modo foco de leitura/analisador remove Navbar e footer, ampliando o shell (`App.tsx:541`, `:567`); representar como variante de layout, não novo produto.

## Padrão deliberado, inconsistência e melhoria

| Classificação | Achado | Decisão sugerida para Figma |
| --- | --- | --- |
| Deliberado | Base editorial clara, teal, superfícies brancas; gramática pedagógica diferenciada | Preservar fundações e famílias semânticas, com variáveis por função |
| Deliberado | Macrocatálogo ativo por padrão, IDs de unidades permanecem estáveis (`featureFlags.ts:1`) | Referência principal deve mostrar macro/unidade atual; fallback atômico fica documentado como contingência |
| Deliberado | AST e A14 com contrato próprio | Padrões distintos para unidade regular e revisão cumulativa; não forçar todas a uma composição rígida |
| Deliberado | Navegação mobile inferior e menu agrupado; conteúdo progressivamente menos encaixotado | Variantes desktop/mobile e política explícita de nesting |
| Inconsistência | Primitivos PageHeader, EmptyState, SegmentedControl e MobileFAB existem, mas busca de imports de produção encontrou zero consumidores | DS deve partir das necessidades reais e definir componentes usados; presença em `ui` não significa padrão consolidado |
| Inconsistência | ModalShell tem apenas dois imports; muitos dialogs são implementações locais | Padronizar estrutura, dimensão, overlay, foco e scroll por variantes |
| Inconsistência | PBL indigo/âmbar tem identidade forte e largura própria; outras ferramentas herdam teal/80rem | Reservar indigo a domínio de prática/PBL e unificar geometria; não trocar a marca inteira para indigo |
| Inconsistência | Documentação de rotas/carregamento defasada | Registrar mapa operacional junto às referências |
| Inconsistência | Inter declarada no body, nenhuma carga em index; App aplica font-sans | Tratar Inter como decisão proposta, não fonte comprovadamente usada no navegador; confirmar computed font na auditoria visual |
| Oportunidade | Muitos headers, filtros, ações, feedbacks e estados duplicados em arquivos grandes | Biblioteca pequena de primitives + patterns, mapeada aos consumidores reais |
| Oportunidade | Prosa pode ocupar toda a largura | Separar ReadingColumn (~76ch) de DataSurface fluida e definir max-width em Auto Layout |
| Oportunidade | 14 ferramentas aumentam carga de descoberta | Preservar agrupamento por intenção e tornar continuidade/revisão ações visíveis; evitar expansão da navegação principal |

## Arquitetura recomendada do arquivo Figma

Foundations: core/light + semântica pedagógica; dimensões de layout e breakpoint; tipografia; espaçamento; radius; shadows; regras de foco e movimento. Não inventar dark mode: há classes dark isoladas, sem sistema de tema operacional demonstrado.

Components: Button/IconButton, Field, Select, Badge/Status, Progress, NavigationItem, SegmentedControl, Card/Surface, Accordion, Modal e QuestionOption. Variantes devem representar estados reais da aplicação e tamanhos/densidades; sem duplicar componentes por página.

Patterns: AppShell, ToolHeader, ResponsiveGrid, ReadingLayout, FilterToolbar, QuestionAttempt, SemanticStudyBlock, Empty/Loading/Error, PersistentTimer. Mapear cada padrão a pelo menos um consumidor.

Reference screens: priorizar Apostila/catálogo + unidade regular desktop/mobile, questão/prática desktop/mobile e PBL desktop/mobile. Documentar A14, modal de busca/tutor e widget Pomodoro como estados auxiliares. Canvas em 1440 e 390, checkpoints de reflow em 320 e 768; Auto Layout em todos os conjuntos com fill/hug/min-max dimensionais.

Nenhuma alteração de React necessária para preparar esse arquivo. O contrato `docs/PROJECT_DATA_LINEAGE.md` foi revisado; sem mudança de linhagem nesta auditoria.
