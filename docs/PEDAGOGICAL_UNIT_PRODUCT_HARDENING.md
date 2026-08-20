# Pedagogical Unit Product Hardening

## Estado

Implementação concluída sobre o diagnóstico registrado em `PEDAGOGICAL_UNIT_DEEP_LEARNING_AUDIT.md`.

O hardening atua somente no produto `SuVeCaSuVeCa`. O Semantic AST, as 115 View Models publicadas, a semântica v4.2, questões oficiais e gabaritos permaneceram inalterados.

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

O preflight inclui o contrato de roteamento das views e a suíte E2E semântica, além dos gates curriculares, PBL, TypeScript, Vitest e build.

## Operação segura

Não editar manualmente `src/data/pedagogicalViewIndex.generated.ts`. Após qualquer publicação autorizada de View Models, execute `npm run build:view-index`, revise o diff e rode `npm run ai-studio:preflight`.

Não usar CSS ou renderer para corrigir conteúdo semântico. Defeitos de semântica continuam pertencendo à fábrica `Notebook LM`; defeitos de apresentação, navegação e interação pertencem a este produto.
