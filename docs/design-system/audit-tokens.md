# Auditoria de tokens e linguagem visual — 2026-09-05

Escopo: leitura do frontend local, sem alterações React/CSS/Figma. Baseline Git `1cbf855`, com alterações locais preexistentes preservadas. `../AGENTS.md` lido, em particular a gramática pedagógica e proteção de conteúdo. Não houve alteração de linhagem.

## Método e limites

Inventário estático de 120 arquivos `.tsx`/`.css` de `src`, excluindo testes, mais leitura dos tokens TypeScript de estudo, HTML, pacote e tema Tailwind instalado. As contagens abaixo são ocorrências textuais em fonte, não quantidade de elementos renderizados nem medição de uso por aluno. Foram lidas as definições centrais e comparadas suas aplicações nas famílias de navegação, dashboard, estudo, questões, PBL, estatísticas e preferências. Contrastes calculados pela luminância relativa sRGB; não são um resultado Axe de todas as telas.

Há um CSS global (`src/index.css`) e Tailwind 4 com tema padrão, sem tema customizado de fonte/radius/shadows/breakpoints. Há uma segunda camada semântica deliberada em `src/components/study-visuals/studyVisualTokens.ts`. Não existe um sistema único consumido por todas as famílias.

## O que constitui identidade deliberada

- Editorial claro: canvas levemente verde `#F6F7F3`, branco, slate e teal escuro. Tokens em `src/index.css:3`; shell em `src/App.tsx:539`.
- Ação principal teal `#115E59`, hover `#134E4A`, contraste de branco sobre primary 7,58:1. Acento dourado acompanha revisão/recompensa; não deve virar outra ação primária.
- Conhecimento possui gramática própria: regra teal; procedimento sky; comparação bilateral; exemplo correto emerald; incorreto rose; armadilha amber; exceção purple; mnemônico yellow; conceito slate/teal; questão indigo. Fonte deliberada: `studyVisualTokens.ts:34`, em concordância com `../AGENTS.md`.
- Sujeito azul, verbo verde, complemento âmbar, adjunto roxo, predicativo rosa. Cor é acompanhada por abreviação/nome. Preserve a função e a ordem real do conteúdo: SuVeCA não é uma ordem sintática obrigatória.
- Tipografia sem serifa para interface, serifada para trechos/frases exemplificadoras e monoespaçada para fórmulas, siglas, números e diagramas. Exemplos em `BeforeAfterCard.tsx:47`, `SuvecaBrandHighlight.tsx:8`, `SemanticBlockRenderer.tsx:699`.
- Cards de pouca elevação, cantos suaves, contorno fino. Superfícies de estudo geralmente 12–16 px de raio. Não converter cada parágrafo em card.
- Layout responsivo que remove invólucros decorativos em estudo profundo no celular, com tabelas/diagramas roláveis. `src/index.css:223` e seguintes.

## Cores existentes

| Token CSS | Valor | Papel |
| --- | --- | --- |
| background | #F6F7F3 | Canvas |
| surface | #FFFFFF | Cards e formulários |
| surface-muted | #F0F4F1 | Superfície secundária |
| text | #1F2937 | Texto padrão |
| text-strong | #132A2A | Títulos/ênfase |
| text-muted | #64748B | Texto secundário legado |
| border | #DCE5E1 | Separador/superfície |
| primary | #115E59 | Ação primária |
| primary-hover | #134E4A | Hover |
| primary-soft | #E7F4F1 | Seleção/suporte |
| accent / accent-soft | #B7791F / #FFF7E6 | Ouro editorial |
| success / success-soft | #15803D / #ECFDF3 | Sucesso |
| danger / danger-soft | #B42318 / #FFF1F0 | Erro |
| warning / warning-soft | #A16207 / #FFF8E1 | Aviso |

As utilidades dominam: 414 `border-slate-200`, 274 `text-slate-900`, 217 `text-slate-600`, 200 `text-slate-700`, 184 `text-slate-500`, 182 `text-teal-700`. Os tokens CSS são usados muito menos e estão concentrados no shell. Usar apenas a paleta `:root` para descrever toda a UI seria incompleto.

`studyVisualTokens.ts:34` define dez tons de conhecimento; `:167` define cinco categorias SuVeCA. Esses tokens guardam strings Tailwind, inclusive transparências. As cores Tailwind atuais são OKLCH no tema instalado; HEX de uma tabela Tailwind antiga não é uma extração exata do frontend atual.

### Contrastes e inconsistências

| Par sRGB | Razão | Interpretação |
| --- | --- | --- |
| #FFFFFF em #115E59 | 7,58 | Manter ação primária |
| #64748B em #FFFFFF | 4,76 | Adequado para texto pequeno neste fundo |
| #64748B em #F0F4F1 | 4,29 | Abaixo de 4,5 para texto normal |
| #64748B em #F6F7F3 | 4,42 | Abaixo de 4,5 para texto normal |
| #526277 em #F0F4F1 | 5,61 | Alternativa já existente no override CSS |
| #526277 em #F6F7F3 | 5,79 | Alternativa coerente |
| #B7791F em #FFF7E6 | 3,42 | Reservar ouro para decoração/gráfico, não texto pequeno |
| #92400E em #FFF7E6 | 6,65 | Foreground dourado proposto |
| #DCE5E1 em #FFFFFF | 1,29 | Bom separador decorativo; não suficiente sozinho para identificar controles |
| #0F766E em #FFFFFF | 5,47 | Anel de foco sólido proposto |

O focus global de `index.css:42` usa teal a 55%: composto sobre branco resulta `#7BB4AF` e 2,34:1. `.focus-ring` a 30% resulta `#B7D6D4` e 1,55:1. O input usa borda primary e halo 15%; a borda escura ajuda, mas os diferentes mecanismos de foco devem ser consolidados. Não presumir conformidade total a partir do comentário do CSS.

Em `index.css:109`, `.text-emerald-600`, `.text-pink-600`, `.text-slate-500` são redefinidas globalmente em HEX. É uma correção deliberada de contraste aplicada por mecanismo frágil: o nome da utility deixa de corresponder ao tema. `bg-emerald-600.text-white` e `bg-amber-500.text-white` mudam apenas combinações específicas.

As classes `.suveca-sujeito` etc. de `index.css:471` não possuem consumidores literais em `src`. São referência histórica, não a principal paleta ativa. `SuvecaBrandHighlight.tsx:9` usa blue/emerald/amber/purple/pink; `SUVECA_BLOCK_COLORS` usa blue/emerald/amber/purple/rose. Consolidar Pred em rosa com foreground acessível, mantendo rótulo textual. A classe de correção âmbar está limitada a `.suveca-highlight-wrapper`; badges isolados podem escapar dela.

## Tipografia

`index.css:32` declara Inter com fallback, body 15 px e entrelinha 1,6. Porém não há import, `@font-face` ou fonte empacotada identificada, e `App.tsx:539` aplica `font-sans` cuja pilha Tailwind é sistema (`-apple-system`, BlinkMacSystemFont, Segoe UI, Roboto...). Assim **Inter não está garantida nem é a fonte efetiva de referência para toda a aplicação**. No Windows a pilha tende a Segoe UI. Registrar no Figma uma fonte nomeada exige declarar a decisão; Inter pode ser proposta explícita de padronização e futuramente carregada no React.

Contagens: `text-xs` 1.070; `text-sm` 430; `text-[10px]` 217; `text-[11px]` 176; `text-base` 124; `text-lg` 59; `text-2xl` 41; `text-xl` 38; `text-3xl` 16; `text-[9px]` 6. Há compressão excessiva de rótulos e muitos pesos 700/800/900 com uppercase. Nem todo texto minúsculo é necessário à densidade pedagógica.

Markdown: h1 24/31,2 peso 750; h2 20/27 peso 700; h3 16,8/implícito; h4 15,2/implícito (`index.css:508`). Parágrafos 1,7; leitura mobile 15/24,75 (`:277`). Fonte sem serifa de 15/24–26 é coerente com a identidade de leitura.

### Estilos Figma propostos

Escolha explícita proposta: Inter para UI e leitura comum. A referência factual deve informar que o código hoje usa fallback de sistema. Preservar estilo serifado auxiliar (Georgia, ou fonte disponível equivalente documentada) para citações e exemplos, e mono auxiliar (Roboto Mono ou equivalente documentado) para sigla/formulação, sem usar mono para IDs internos na UI.

| Nome | Tamanho/linha | Peso | Uso |
| --- | --- | --- | --- |
| Display/Desktop | 32/40 | 700 | Hero pontual |
| Heading/Page | 24/32 | 700 | Título de página, inclusive mobile |
| Heading/Section | 20/28 | 700 | Seção |
| Heading/Card | 16/24 | 600 | Card ou grupo |
| Body/Reading | 15/25 | 400 | Texto pedagógico; pode ser 16/26 em área editorial ampla |
| Body/Default | 14/22 | 400 | Descrição e formulários |
| Label/Control | 14/20 | 600 | Botão, opção, tab |
| Label/Meta | 12/16 | 600 | Badge e metadado |
| Caption | 12/18 | 400 | Ajuda e nota |
| Mono/Syntax | 14/20 | 700 | Su/Ve/C/A/Pred e expressão |
| Quote/Example | 16/26 | 400 | Exemplo em serifada |

Rótulos funcionais abaixo de 12 px deixam de ser padrão. Peso 900 fica reservado a composição de marca, sem virar peso universal de conteúdo.

## Espaçamento, raio e sombras

Padrão existente: base Tailwind 4 px com meios-passos (2/6/10/14 px). Ocorrências frequentes: gap8 (378), gap12 (256), padding16 (228), gap6 (151), padding12 (149), padding20 (136), padding24 (128), padding14 (95). A densidade de estudo justifica meios-passos; não há razão para arredondar tudo em 8 px.

Propor variáveis numéricas: `space/0=0`, `1=4`, `2=8`, `3=12`, `4=16`, `5=20`, `6=24`, `8=32`, `10=40`, `12=48`, `16=64`; auxiliares `half=2`, `1-5=6`, `2-5=10`. Nomes orientados a uso: `gap/inline=8`, `gap/stack=12`, `gap/section=24`, `padding/control-x=16`, `padding/card=24` desktop/16 mobile. O padding14 hoje recorrente pode ser normalizado a 12/16 conforme densidade; não precisa de papel semântico próprio.

Raio atual: rounded-xl=12 (494 ocorrências), lg=8 (261), 2xl=16 (252), full (164), md=6 (86), rounded=4 (47); CSS surface=14, surface-muted=12, page-header=16, botão/input=10. `PageHeader.tsx:18` usa rounded-xl=12 em vez da classe CSS `.page-header`=16. Propor `radius/xs=4`, `sm=8`, `control=10`, `md=12`, `surface=16`, `pill=999`; 14 vira legado. Modal móvel ocupa viewport e tem raio 0; não é inconsistência.

Sombras atuais: 2xs 187, xs 180, sm 63, md 18, 2xl 8, xl 7, lg 6. `index.css:77` surface possui combinação 0/1/3/0 preto 4% + 0/1/2/-1 preto 2%, enquanto Tailwind shadow-sm sobe a 10%. Propor apenas três effect styles: `Elevation/Surface` mantém a combinação CSS; `Elevation/Popover` 0/4/6/-1 10% + 0/2/4/-2 10%; `Elevation/Dialog` 0/20/25/-5 10% + 0/8/10/-6 10%. Sem sombra para invólucro de cada parágrafo. `Focus` é estado de contorno, não nível de elevação.

## Grid, breakpoints e responsividade

- Tema local: sm640, md768, lg1024, xl1280, 2xl1536 (`node_modules/tailwindcss/theme.css:327`). Uso textual: sm807, md47, lg59, xl15; casos específicos min360/420/480 em controles.
- `app-content-max` 1600 px; `tool-content-max`1280 px. Outer gutter clamp8/2vw/32; mobile até639 usa6 px; surface padding12–24. A borda mínima é uma escolha explícita para preservar largura útil de estudo em320.
- Shells têm width100%, max-width e min-width0. Grid predominante 1→2→3 colunas em cards; dashboard usa 12 colunas localmente. Navegação desktop/móvel muda em1024; telas de exemplo devem considerar isso, não apenas sm640.
- `.reading-column` declara76ch mas não tem consumidor literal localizado. `index.css:300` permite parágrafos de seção com max-width none. Portanto apresentar coluna de leitura controlada no Figma é melhoria, não réplica exata.
- Figma: frame1440 com 12 colunas, gutter24 e margem32 (grid proposto); frame390 com4 colunas, gutter12 e margem16 para visão geral (proposta). Para leitura profunda no celular, variante full-bleed com padding interno8–12 e sem cards aninhados preserva intenção vigente. Manter testes de referência320/390/768/1440.
- Modal `ModalShell.tsx:44`: full-height100dvh/raio0 no celular; desktop max-height90vh, raio16; safe-area. Tabs roláveis, comparação empilhada, tabelas/diagramas com scroll preservando significado são padrões deliberados.

## Estados e movimento

CSS central: microinteração150ms; entrada de questão220ms, tab260ms, módulo300ms, deslocamento10px; entradas centrais respeitam reduced motion (`index.css:438`). ProgressBar usa700ms (`ProgressBar.tsx:55`); utilities isoladas usam150–300ms; loaders spin e ícones pulse existem. Pacote Motion está instalado, mas busca de imports/chamadas em componentes não encontrou uso atual. `animate-in`/`fade-in`/`zoom-in` aparecem em JSX sem definição no CSS global ou tema padrão: não presumir que executam só porque a classe está presente.

Propor `duration/fast=150`, `normal=220`, `slow=300`, easing ease-out; reduzir movimento elimina deslocamento/escala decorativos e mantém feedback textual de carregamento. Padronizar estados Default/Hover/Pressed/Focus/Disabled/Loading nos botões; Default/Hover/Focus/Filled/Error/Disabled nos inputs; Default/Selected/Correct/Incorrect/Disabled nas respostas. Cor nunca é o único portador de estado: texto/ícone/borda/seleção acompanham.

## Arquitetura recomendada de variáveis no Figma

Coleção `Primitives`: famílias reais necessárias, não a paleta Tailwind inteira; spacing/radius/sizing. Coleção `Semantic`: aliases com papéis `surface`, `text`, `border`, `action`, `feedback`, `pedagogy`, `syntax`. Modo Light inicialmente; não inventar Dark sem auditoria e variantes suficientes. Estilos tipográficos e efeitos separados de color variables.

Conjunto semântico mínimo proposto (valores normalizados, não promessa de extração literal de todas as utilities):

| Papel | Valor |
| --- | --- |
| surface/canvas, default, subtle | #F6F7F3, #FFFFFF, #F0F4F1 |
| text/primary, strong, muted, inverse | #1F2937, #132A2A, #526277, #FFFFFF |
| border/subtle, control, focus | #DCE5E1, #64748B, #0F766E |
| action/primary/default, hover, pressed, subtle | #115E59, #134E4A, #042F2E, #E7F4F1 |
| action/disabled/background | #526B68 |
| feedback/success/text, surface | #15803D, #ECFDF3 |
| feedback/error/text, surface | #B42318, #FFF1F0 |
| feedback/warning/text, surface | #A16207, #FFF8E1 |
| accent/text, surface, decorative | #92400E, #FFF7E6, #B7791F |
| pedagogy/rule/text, surface | #115E59, #E7F4F1 |
| pedagogy/procedure/text, surface | #0369A1, #F0F9FF |
| pedagogy/contrast/text, surface | #334155, #F8FAFC |
| pedagogy/example/text, surface | #047857, #ECFDF5 |
| pedagogy/trap/text, surface | #92400E, #FFFBEB |
| pedagogy/exception/text, surface | #6B21A8, #FAF5FF |
| pedagogy/mnemonic/text, surface | #854D0E, #FEFCE8 |
| pedagogy/question/text, surface | #3730A3, #EEF2FF |
| syntax/subject/text, surface | #1E40AF, #DBEAFE |
| syntax/verb/text, surface | #065F46, #D1FAE5 |
| syntax/complement/text, surface | #92400E, #FEF3C7 |
| syntax/adjunct/text, surface | #6B21A8, #F3E8FF |
| syntax/predicative/text, surface | #9D174D, #FCE7F3 |

Aliases de pedagogia e feedback permanecem separados mesmo quando compartilham valor. Um exemplo correto e a função sintática verbo não são o mesmo conceito. Documentar o papel com rótulo e amostra. Vincular propriedades das instâncias a variáveis; evitar uma prancha de retângulos não consumidos por componentes.

## Decisões a mostrar antes de qualquer alteração React

1. Preservado: identidade clara/teal, gramática de conhecimento e SuVeCA, densidade com espaço útil, paradigmas de navegação e leitura.
2. Consolidado: paletas concorrentes, raio14/12/16 de superfícies, foco, aliases de cor, foregrounds acessíveis, papéis de texto e três níveis de elevação.
3. Proposto: fonte UI carregada explicitamente, labels funcionais≥12, estados componentes completos, leitura com largura controlada, margin mobile de visão geral separada da leitura profunda.
4. Legado registrado: Inter não efetiva, utilidades redefinidas por seletor, classes SuVeCA CSS não usadas, reading-column sem consumidor, fragmentação de Pred pink/rose e animações auxiliares sem origem definida.
5. Não transformar nova arquitetura em alegação de que o React já está atualizado. Identificar reference screens como estado atual observado e screens normalizadas como proposta.
