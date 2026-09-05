# SuVeCA — auditoria consolidada e proposta de mini design system

Data: 2026-09-05. Baseline: `1cbf855` + alterações locais existentes. **Auditoria consolidada e mini design system concluído no [Figma SuVeCa](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=38-2).** Entrega: 14 páginas, 129 variables, 12 text styles, 3 effect styles, 24 famílias com 146 variantes e 16 componentes independentes. Inclui 8 telas propostas desktop/mobile, 8 checkpoints de reflow e 16 capturas atuais. Nenhum React, CSS ou conteúdo pedagógico foi alterado nesta missão.

O arquivo foi fornecido vazio pelo usuário após a primeira auditoria. Os relatórios abaixo preservam o diagnóstico daquela etapa; menções históricas a Figma ainda não identificado não representam o estado atual. [Decisões de design](decisions.md) separa fatos do frontend e propostas. [Entrega e validação](delivery.md) reúne links e limites; [figma-state.json](figma-state.json) consolida IDs e [figma-run](figma-run/) preserva as verificações incrementais.

## Quatro frentes consolidadas

| Frente | Entrega |
| --- | --- |
| Arquitetura frontend, delegada | [Rotas, shells, dados, composição e responsividade](audit-architecture.md) |
| Design system/tokens, delegada | [Cores, tipografia, dimensões, efeitos, contrastes e movimento](audit-tokens.md) |
| Componentes, delegada | [Inventário, reutilização, variantes e contratos](audit-components.md) |
| UI/UX, agente principal | [Inspeção visual, DOM/CSS, fluxos, testes e evidências](audit-ux.md) |

Inventário de 117 TSX de implementação em `src/components`, além de App/main, CSS e infraestrutura. Runtime: 72 combinações de 18 telas × 4 larguras, sem overflow do documento; 36 verificações Axe, 11 com falhas; 9 testes de interação aprovados e 1 skip previsto. Limites de cobertura estão nos relatórios: não significa todos os estados ou todas as views pedagógicas exercitados.

## Decisões consolidadas

| Tema | Padrão deliberado | Legado / inconsistência | Decisão de proposta |
| --- | --- | --- | --- |
| Identidade | Editorial claro, teal, branco, linhas suaves | PBL e ferramentas usam paletas e controles independentes | Teal como ação global; indigo como semântica de prática/questão; ouro como destaque pontual |
| Pedagogia | Cor e composição comunicam regra, procedimento, contraste, exemplo, limite etc. | Mesmo papel recebe cores diferentes em renderers antigos | Coleções semânticas de pedagogia e sintaxe separadas de feedback operacional |
| Tipografia | Sans na UI, serifada em exemplos, mono em notação | Inter declarada, mas root usa fonte do sistema; excesso de 10/11 px | Inter na UI, Roboto Mono em notação e Lora nos exemplos do Figma; famílias confirmadas. Referências atuais preservam a fonte observada |
| Cores acessíveis | Primary escuro já tem bom contraste | Metadados claros, badge teal600 e foco translúcido | Muted #526277; foco sólido #0F766E; acento textual #92400E; valores e pares na auditoria |
| Espaço | Base 4 px com meios-passos, densidade editorial | Valores locais sem papel comum | Escala curta e papéis de gap/padding; 16 px em card mobile e 24 desktop, com leitura profunda 8–12 |
| Radius | Cantos suaves | Surface14, headers12/16, controles diversos | Controles10, containers16, internos8/12, pill999, fullscreen0 |
| Sombras | Elevação discreta | Muitas escalas e hover em conteúdo estático | Surface, Popover, Dialog; foco separado de sombra |
| Componentes | StudySurface/Badge e famílias pedagógicas são base ativa | Alguns primitives genéricos não têm consumidores | Criar biblioteca a partir de necessidades e usos reais; documentar componentes novos como proposta |
| Estados | Resposta só após tentativa; modos de leitura e timer persistente | Seleção às vezes usa verde/vermelho antes da avaliação | Separar Selected de Correct/Incorrect, estado de confiança e conteúdo indisponível |
| Responsividade | Navbar inferior, Mais agrupado, estudo com menos invólucros | Gutter uniforme não serve para overview e leitura | Dois padrões de densidade; preservar 320 px e composições semânticas largas |
| Acessibilidade | Foco/teclado já possuem infraestrutura | Contraste, ARIA e scroll focável apresentam falhas atuais | Incluir contratos no DS e manter débitos React explícitos para a etapa posterior |

### Tipografia proposta final

UI **Inter**; notação **Roboto Mono**; exemplos **Lora**. Georgia não estava disponível no ambiente Figma, e Lora foi escolhida e documentada explicitamente como alternativa serifada. Inter é proposta de implementação futura: o runtime auditado usa a pilha de sistema e não carrega fontes web. As capturas atuais permanecem evidência desse runtime.

| Text style | Tamanho/linha px | Peso |
| --- | --- | --- |
| Display/Desktop | 32/40 | 700 |
| Heading/Page | 24/32 | 700 |
| Heading/Section | 20/28 | 700 |
| Heading/Card | 16/24 | 600 |
| Body/Reading | 16/26 | 400 |
| Body/Reading Dense | 15/25 | 400 |
| Body/Default | 14/22 | 400 |
| Label/Control | 14/20 | 600 |
| Label/Meta | 12/16 | 600 |
| Caption | 12/18 | 400 |
| Mono/Syntax | 14/20 | 700 |
| Quote/Example | 16/26 | 400 |

Esta consolidação resolve a diferença entre propostas das subauditorias: leitura padrão 16/26 e variante densa 15/25, sem reduzir metadados funcionais abaixo de 12 px. 12 estilos, com pesos reais confirmados antes da criação.

## Arquitetura do Figma

A estrutura de páginas abaixo já foi criada no arquivo fornecido. A tabela descreve a finalidade de cada página; não equivale à conclusão de todo o conteúdo ou à aprovação do QA final. A coleção é local ao arquivo e não foi publicada como biblioteca compartilhada.

| Página / grupo | Conteúdo |
| --- | --- |
| 00 · Overview & Decisions | Identidade, escopo, origem dos padrões, deliberado/legado/proposta, guia de uso e mapa código→Figma |
| 01 · Foundations | Swatches semânticos, Typography, Spacing, Radius, Shadows, grids, contraste, foco e movimento |
| 02–10 · Components | Páginas de famílias relacionadas: Actions, Forms & Choice, Status & Progress, Navigation, Surfaces, Overlays, Study Syntax, Study Content, Study Practice |
| 11 · Patterns | Shells, leitura, filtros/resultados, tentativa/feedback, revisão, estados vazios/carregando/erro e timer persistente |
| 12 · Reference · Current | Evidências desktop/mobile da aplicação atual, com data, URL e viewport |
| 13 · Reference · Proposed | Telas editáveis normalizadas, montadas com instâncias, diferenciadas das capturas factuais |

### Variables e styles

- **SuVeCA · Primitives**, modo Value: cores brutas necessárias, ocultas dos pickers de uso final (`scopes=[]`). Dimensões ficam em coleção própria.
- **SuVeCA · Color**, modo Light: aliases para `surface/*`, `text/*`, `border/*`, `action/*`, `feedback/*`, `pedagogy/*` e `syntax/*`. As tabelas de valores estão em [audit-tokens.md](audit-tokens.md). Inclui `pedagogy/concept` e `pedagogy/suveca` para preservar os dez tons ativos.
- **SuVeCA · Dimensions**, modo Value: space 0/2/4/6/8/10/12/16/20/24/32/40/48/64; radius 0/4/8/10/12/16/999; targets44/48; ícones16/20/24; máximos de shell1600 e tool1280. Scopes por papel de gap, radius e dimensão.
- **Text Styles**: os 12 estilos acima. **Effect Styles**: Elevation/Surface, Elevation/Popover, Elevation/Dialog, com valores exatos da auditoria de tokens.
- Separar `feedback/success` de `syntax/verb`, mesmo se houver alias à mesma cor. Exemplo correto não significa verbo; exceção não é falha operacional.
- WEB syntax com `var(...)` para CSS existente. Tokens novos usam nomes propostos documentados como ainda não implementados; um alias Figma não implica a existência desse token no React.
- Light é o tema v1. Não existe evidência de um sistema Dark operacional que justifique inventar modos incompletos.

### Escopo de componentes e variantes

Prioridade de construção: átomos → componentes pedagógicos → padrões → referências. As matrizes completas e consumidores estão em [audit-components.md](audit-components.md). Não criar produto cartesiano de todas as propriedades: separar famílias e usar propriedades de texto, boolean e troca de instância.

| Família | Escopo mínimo |
| --- | --- |
| Actions | Button: Primary/Secondary/Ghost/Destructive × Default/Hover/Pressed/Focus/Disabled/Loading, 24 variantes; IconButton separado com ícone substituível e alvo44 |
| Forms & Choice | Field/Text e Field/Search com Default/Focus/Filled/Error/Disabled; Select/Textarea como componentes relacionados; Option com Default/Hover/Focus/Selected/Disabled/Correct/Incorrect, com label/index editáveis |
| Status & Progress | Badge semântico (10 tons), status operacional separado, Progress em 0/50/100 com rótulo editável |
| Navigation | Item Desktop/Bottom/Sidebar × Default/Hover/Focus/Current (12); Segment e Accordion com estados próprios |
| Surfaces | Panel com corpo/header/footer e densidade; Callout operacional; FeedbackState Empty/Loading/Error/Unavailable/Offline |
| Overlays | Dialog Center/Fullscreen/BottomSheet; header/footer e close opcionais; body rolável e safe area |
| Study Syntax | Su/Ve/C/A/Pred × Soft/Solid (10); ordem real da oração e rótulos preservados |
| Study Content | SectionHeader, Rule, ProcedureStep, Contrast, Table/Records; família não reduzida a troca de cor |
| Study Practice | Question Idle/Selected/Reviewed/Unavailable; Flashcard Question/Hint/Answer/Explanation/Rated; metadados e comentário em slots |

Action compacta pode reduzir padding e largura, mas não a área interativa padrão. Feedback pedagógico correto/incorreto exige símbolo e texto, além de cor. A matriz acima é especificação de proposta, não estados já todos presentes no frontend.

### Auto Layout e padrões

- Containers relacionados em Auto Layout; texto cresce verticalmente, largura Fill; badges Hug; ações Hug desktop/Fill quando empilhadas no mobile. Alturas mínimas, não alturas rígidas de texto.
- Grid desktop proposto: 1440, 12 colunas, gutter24, margem32; mobile overview:390, 4 colunas, gutter12, margem16. A geometria atual tem gutter fluido e margem mobile6; essas novas margens são proposta, não extração.
- ReadingLayout mobile: sem cards concêntricos, inset8–12 e uso de largura. Desktop: prosa limitada aproximadamente a 65–76 caracteres; dados/diagramas podem usar a largura do shell. Figma usa largura em px a calibrar com a fonte real, não converte `ch` para px sem medir.
- Navegação muda em1024, conforme código; grids de cards1→2→3; ações quebram em linhas; título e filtros não podem sobrepor.
- Modal com header/footer estáveis e body rolável; foco inicial, Escape, contenção e retorno documentados. Figma não implementa ARIA de React.
- Padrões: AppShell desktop/mobile/foco; ContinueLearning + Overview; ReadingLayout; FilterResults; QuestionAttempt; PBLSession; FlashcardReview; FeedbackStates; PersistentTimer.
- Movimento:150/220/300ms, ease-out, sem deslocamento decorativo com redução de movimento. Acessibilidade não depende de protótipo animado.

### Reference screens e fidelidade de conteúdo

Pares desktop1440/mobile390: Apostila/visão geral, unidade regular, PBL e questões editoriais (8 telas propostas principais). A14, Flashcards, busca/overlay e Pomodoro minimizado entram como estados/padrões auxiliares. Evidências atuais já incluem Apostila, Analisador, PBL, Questões, unidade regular, A14, Perfil e Flashcards nas duas larguras.

Checkpoints320 e768 foram construídos e verificados nas quatro telas, sem overflow horizontal. Referências de leitura usam conteúdo real publicado com proveniência em [reference-content.json](reference-content.json); não há gabarito ou comentário da questão no estado inicial. Capturas atuais e telas editáveis propostas ocupam páginas distintas.

A referência proposta da Apostila seleciona Ortografia e fonologia, enquanto a captura atual mostra o módulo introdutório. Essa escolha usa títulos publicados e organiza continuidade e catálogo; não é uma réplica do mesmo estado. O total de 3.485 questões corresponde ao array normalizado local auditado, não ao universo canônico histórico ou a questões únicas de outras coleções. Contadores de progresso zero representam o visitante observado. Conteúdo curto de referência não representa uma unidade pedagógica completa nem autoriza eliminar partes do conteúdo ao implementar.

## Estado de execução

| Etapa | Estado |
| --- | --- |
| Inventário e quatro auditorias frontend | Concluídos com limites documentados |
| Inspeção runtime e evidências | Concluídas |
| Decisões e arquitetura visual proposta | Consolidadas neste documento |
| Identificar arquivo Figma | Concluído; arquivo SuVeCa fornecido vazio |
| Ler pages/variables/styles/components e bibliotecas | Leitura inicial concluída; biblioteca local construída a partir da auditoria |
| Criar foundations e famílias de componentes | Concluído; aliases, scopes, estilos, propriedades e variantes verificados |
| Construir patterns e referências propostas | Concluído; 8 telas e 8 checkpoints com instâncias vinculadas |
| Importar referências atuais | Capturas desktop/mobile inseridas; fills de imagem verificados |
| Validar IDs, aliases, scopes, variantes, bindings e screenshots Figma | Concluído; limites e evidências em delivery.md e figma-run |
| Alterar React | Não realizado nesta missão; design system e decisões entregues primeiro |

A etapa Figma está concluída. Os resultados de runtime acima medem o frontend atual; não validam automaticamente as telas propostas. O Figma documenta contratos de contraste, foco, teclado e estados, mas não corrige ARIA, gestão de foco ou outras falhas de acessibilidade do React. A implementação posterior deve preservar conteúdo completo, persistência e contratos pedagógicos e validar os fluxos novamente.

Contrato `docs/PROJECT_DATA_LINEAGE.md` revisado; sem mudança de linhagem. Alterações locais preexistentes foram preservadas. Nenhum push, deploy ou publicação de biblioteca foi realizado.
