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
