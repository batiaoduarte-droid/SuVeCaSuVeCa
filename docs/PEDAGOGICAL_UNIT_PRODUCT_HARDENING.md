# Pedagogical Unit Product Hardening

## Estado

Implementação concluída sobre o diagnóstico registrado em `PEDAGOGICAL_UNIT_DEEP_LEARNING_AUDIT.md`.

O hardening visual atua no produto `SuVeCaSuVeCa`. Uma auditoria posterior de identidade encontrou 66 unidades v4.2 cuja autoria havia associado seções de outra competência. Essas projeções foram reconciliadas na fábrica e republicadas como v4.2.1. O canonical, os payloads de questões oficiais, os gabaritos, as decisões editoriais protegidas e o PBL permaneceram inalterados.

Artefatos de rastreabilidade:

- `public/knowledge/pedagogical/identity-reconciliation.json`: 66 identidades reconciliadas;
- `public/knowledge/pedagogical/question-presentation-repair.json`: alternativas recuperadas e conflitos bloqueados;
- `Notebook LM/tools/reconcile_v4_2_identity.py`: reconciliação reproduzível a partir dos context packs canônicos;
- `Notebook LM/tools/repair_question_presentations.py`: compilação da apresentação segura sem mutar o payload oficial.

## Contrato de publicação

O aprofundamento aceita explicitamente:

- `1.0.0`, usado pelas 13 revisões cumulativas A14;
- `4.2.x`, usado pelas 102 unidades regulares.

Uma View Model integrada precisa satisfazer identidade de unidade, aula, título e seções. Falhas de HTTP, versão, identidade ou contrato são exibidas como erro; não ocorre fallback silencioso para Markdown. O fallback Markdown continua disponível apenas para conteúdo legado sem `integrationUnitId`.

O índice `src/data/pedagogicalViewIndex.generated.ts` é uma projeção determinística das 115 views. Ele reconcilia a identidade mostrada no catálogo com o título e os objetivos publicados, sem alterar `modules.generated.ts` nem os JSONs homologados.

Comandos:

```text
npm run build:view-index
npm run audit:view-index
```

O segundo comando falha se a projeção versionada divergir das views reais.

## Navegação e retomada

O estado de estudo passou a ter URL própria:

```text
/?module=mod0&unit=IP-A00-G01&section=rules
```

Parâmetros:

- `module`: aula selecionada;
- `unit`: unidade regular ou A14 aberta;
- `section`: seção interna aberta.

Deep link, refresh, Back e Forward restauram aula, unidade e seção. Abrir outra unidade cria uma entrada de histórico; navegar dentro das seções da mesma unidade atualiza a entrada corrente.

Cada aula também apresenta, antes do conteúdo editorial longo, um índice de unidades com acesso direto ao aprofundamento.

## Fluxo de aprendizagem

### Questões oficiais

O renderer suporta os dois contratos publicados: a projeção antiga e o payload protegido v4.2 (`questionPayload` + `answerPayload`). O payload original não é modificado.

O gabarito e o comentário começam ocultos. Havendo alternativas, o aluno precisa selecionar uma antes de confirmar a tentativa. Questões de certo/errado sem alternativas explícitas recebem apenas a projeção visual derivada `Certo`/`Errado`.

A auditoria das 615 ocorrências publicadas encontrou conjuntos incompletos, rótulos duplicados e alternativas incorporadas ao próprio enunciado. Vinte e uma apresentações foram recompiladas com texto já preservado na fonte. Três ocorrências com gabaritos contraditórios são exibidas como indisponíveis e nunca liberam resposta ou comentário. O gate falha se uma questão incompleta voltar a ficar interativa sem projeção comprovada.

### Fidelidade das seções

- exemplos aceitam `prompt`/`sentence`, `analysisSteps`/`analysis` e `result`/`pedagogicalTakeaway`, preservando comentário, conclusão e erro comum;
- pegadinhas aceitam os aliases canônicos de raciocínio, correção e regra corretiva;
- roteiros removem marcadores duplicados apenas na apresentação e exibem gatilho, condição de parada, verificação e falhas típicas;
- mnemônicos não expõem classificações internas como `EXAM_HEURISTIC`;
- anotações permanecem recolhidas até a ação explícita do aluno.

### Recuperação ativa

Recall agora separa tentativa, conferência e autoavaliação. Pontos-chave só aparecem depois da ação “Já respondi — conferir”, e a classificação de domínio fica bloqueada até a tentativa.

Estado local por unidade:

```text
suveca_recall_v2_<unitId>
```

São persistidos itens tentados, respostas reveladas e confiança (`none`, `partial`, `mastered`).

### A14

O roteiro de seis dimensões é navegável. Conceitos e regras extensos começam priorizados e podem ser expandidos. O protocolo remove ruído de apresentação, expõe progresso acessível, persiste marcações e termina em ação de prática.

Estado local por revisão:

```text
suveca_cumulative_protocol_v1_<unitId>
```

## Renderer, responsividade e acessibilidade

- Os formatos v4.2 de SuVeCA, pré-requisitos, classificação e questões protegidas são projetados nativamente.
- Markdown de bloco recebido por `InlineRichText` não cria elementos de bloco inválidos dentro de parágrafos.
- Tabelas com cabeçalho editorial vazio recebem o rótulo derivado `Coluna N`.
- Matrizes e tabelas mantêm tabela em desktop e cartões/controle adaptativo em mobile.
- A14 limita a densidade inicial de conceitos e regras.
- Controles interativos do aprofundamento têm alvo mínimo de 44 px.
- Landmarks de questões possuem nomes únicos, a hierarquia de headings foi corrigida e as cores SuVeCA atendem ao contraste do gate Axe.
- O viewport small mobile do Playwright é o requerido `320 × 568`.

### Refinamento transversal de experiência

O produto usa três larguras semânticas compartilhadas em vez de limites locais arbitrários:

- `app-content-shell`: navegação e superfícies gerais, com aproveitamento amplo do desktop;
- `tool-content-shell`: ferramentas que precisam de concentração sem voltar ao antigo corredor estreito;
- `reading-column`: trechos de leitura contínua que preservam um comprimento de linha confortável.

As margens são fluidas e diminuem até 320 px. Ao abrir uma unidade pedagógica completa, o sumário lateral deixa de reservar espaço e o aprofundamento ocupa a largura disponível. As seções também reduzem aninhamento e padding no mobile sem remover hierarquia ou identidade semântica.

O catálogo curricular de apresentação fica centralizado em `src/data/lessonCatalog.ts`. IDs como `A00`, `A01` e `mod0` continuam nos contratos internos, mas seletores, badges, buscas, competências e retomadas exibem nomes como “Ortografia e fonologia” e “Classes de palavras”. Não alterar os IDs persistidos ou publicados para obter essa apresentação.

Os títulos de competência passam por `src/lib/learnerFacingLabels.ts`: o prefixo redundante “Competência:” é removido e a função pedagógica aparece separadamente do assunto. Revisões cumulativas também recebem títulos limpos e intervalos traduzidos para nomes curriculares.

O esquema estruturado escolhe a representação inicial de acordo com o dado:

- decisões e sequências usam fluxo ordenado;
- hierarquias usam árvore;
- tabelas permanecem tabulares;
- conjuntos independentes usam cards;
- o texto-fonte permanece disponível como projeção alternativa.

A seleção é determinística e apenas visual; o renderer não reescreve a semântica v4.2.

O Pomodoro permanece montado ao trocar de tela. Minimizar devolve o aluno ao último conteúdo, mantém o mini-painel acessível e preserva tempo, modo e estado da sessão; expandir restaura a experiência completa.

No Planejamento, o “Ciclo de revisão” é apresentado como sequência de quatro momentos — compreender, aplicar, recuperar, corrigir e revisar — seguida de um checklist curto de encerramento. Essa projeção organiza as orientações existentes e não cria conteúdo curricular novo.

## Continuidade

Unidades regulares e A14 terminam com uma ação explícita de prática. Quando há conceitos associados, a ação usa o fluxo de prática já existente no produto; não foi criado sistema paralelo.

## Cobertura de regressão

Os testes adicionados verificam:

- versões e identidade do contrato publicado;
- índice de 115 unidades e alinhamento dos 115 mapeamentos do catálogo;
- renderização real das 102 unidades regulares, sem exceção, `[object Object]` ou IDs técnicos conhecidos;
- View Model v4.2 no `PedagogicalDeepDive` e falha fechada em identidade divergente;
- gabarito oculto até a tentativa;
- recall persistido e bloqueio de autoavaliação prematura;
- disponibilidade e identidade dos 115 JSONs via HTTP;
- deep link, refresh, Back, renderer regular e renderer A14;
- ausência de overflow em 1440 × 900, 768 × 1024, 390 × 844 e 320 × 568;
- zero violações Axe na experiência regular representativa e na A14.
- uso horizontal mínimo do shell em desktop e da unidade aprofundada em 320 px;
- ausência de overflow nas 14 experiências navegáveis, em quatro viewports;
- persistência do Pomodoro entre minimizar, estudar e expandir;
- catálogo curricular completo e apresentação não redundante das 190 competências PBL;
- classificação determinística e controles acessíveis do esquema estruturado.
- auditoria integral de 615 questões, 1.108 exemplos, 420 pegadinhas e 291 procedimentos;
- projeção segura de C/E, recuperação comprovada de alternativas e bloqueio de conflitos de fonte;
- aliases canônicos de exemplos e pegadinhas sem perda de conteúdo;
- reconciliação das 66 identidades sem referências quebradas ou tipos sem renderer.

O preflight inclui o contrato de roteamento das views e a suíte E2E semântica, além dos gates curriculares, PBL, TypeScript, Vitest e build.

## Operação segura

Não editar manualmente `src/data/pedagogicalViewIndex.generated.ts`. Após qualquer publicação autorizada de View Models, execute `npm run build:view-index`, revise o diff e rode `npm run ai-studio:preflight`.

Não usar CSS ou renderer para corrigir conteúdo semântico. Defeitos de semântica continuam pertencendo à fábrica `Notebook LM`; defeitos de apresentação, navegação e interação pertencem a este produto.
