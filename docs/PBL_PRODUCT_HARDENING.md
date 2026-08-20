# PBL Product Hardening

## Escopo

Este documento descreve o contrato do runtime PBL após o hardening de UX, fluxo e engajamento. A alteração é exclusiva da camada de produto: nenhum payload oficial, gabarito, artefato canônico, decisão editorial ou View Model v4.2 foi reescrito.

## Fontes de verdade

- Casos, competências, transfer sets e caminhos diagnósticos: `public/knowledge/pbl/`.
- Apresentação publicada de questões: shards normalizados em `public/knowledge/official-question-parts/`.
- Fallback de apresentação: `officialQuestions` das views em `public/knowledge/pedagogical/views/`.
- Gabarito: payload oficial publicado. A UI apenas o adapta para os formatos `Certo/Errado`, `correct/incorrect`, `letter_X`, `option_X` ou letra simples.

O seletor de transferência ignora uma referência quando não existe apresentação publicada. Todas as 190 competências possuem ao menos uma questão real utilizável para transferência.

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

## Critério de domínio

Uma competência só recebe o resultado `mastered` quando os itens de transferência satisfazem simultaneamente:

- a taxa mínima de acerto do respectivo transfer set;
- a quantidade exigida de acertos consecutivos.

Esgotar até três itens sem satisfazer o critério produz `needs_review`. Finalizar a prática não é sinônimo automático de domínio.

## Sessão e persistência

- Sessão recomendada ou diagnóstica: uma competência, estimativa de 3–5 minutos.
- Revisão cumulativa: até duas competências, estimativa de 6–10 minutos.
- Sair exige escolher entre pausar, encerrar ou continuar estudando.
- Sessões pausadas podem ser retomadas pelo Dashboard.
- Tempos são medidos por tentativa, sem soma cumulativa duplicada.
- LocalStorage é a persistência imediata; Firestore é sincronizado em paralelo para usuários autenticados.

## Caderno de Erros e revisão

Entradas PBL usam o contrato de `CadernoErroItem`:

- `origin: "pbl"`;
- `questionId` e `moduleRef`;
- resposta selecionada e resposta oficial apresentadas em formato legível;
- `sourceRefs` com questão e sessão;
- `nextReviewAt` derivado do modelo de mastery;
- deduplicação por origem e questão.

O resumo da sessão oferece acesso direto ao Caderno e à Revisão Diária.

## Exceção protegida

`PBL-CASE-A04-G02-01` possui payload oficial sem gabarito publicável. O produto não infere nem inventa uma resposta: a competência fica desabilitada para início direto até que a fonte editorial protegida seja resolvida com autorização apropriada.

## Gates de manutenção

Executar:

```bash
npm run audit:pbl
npm test -- src/lib/pbl
npm run test:e2e -- tests/e2e/pbl-flow-accessibility.spec.ts
npm run ai-studio:preflight
```

O auditor PBL verifica, além da integridade referencial:

- renderização dos gabaritos dos 189 casos graduáveis;
- bloqueio explícito do caso sem gabarito;
- disponibilidade de transferência real nas 190 competências.
