# Integração das melhorias do AI Studio e consolidação de arquivos

Data: 2026-09-23. Baseline: `main` em `2687969`. Implementação local autorizada;
alterações preparadas no índice Git, sem commit, push ou deployment. O ZIP fornecido foi comparado com a main,
preservando as implementações e contratos mais completos do produto.

## Decisões e implementação

| Proposta do ZIP | Decisão na main |
| --- | --- |
| Tela e persistência de bizus salvos | Integradas ao card existente: busca sem distinção de acentos, filtro por categoria, remoção, migração local e sincronização transacional por usuário. Remoções persistidas impedem ressurreição por estado remoto antigo. |
| Visualizador editorial de flashcards | Mantido o renderer editorial já integrado à prática, ao agendamento e aos recursos publicados. Um segundo visualizador duplicaria o fluxo. O áudio existente foi corrigido e centralizado. |
| Áudio bidirecional e TTS | Implementados cliente Live com microfone, transporte autenticado por ticket, PCM/WAV, reprodução e encerramento seguro. TTS compartilhado preserva o texto completo e usa voz do navegador quando necessário. |
| Backend push paralelo | Mantida a Function de notificações existente, evitando dois agendadores. Acrescentados testes de tokens, regras e lembretes. |
| Regras PBL do ZIP | Adaptadas ao contrato atual: leitura de sessões pelo dono, escrita apenas pelo servidor; cache de domínio privado. Copiar permissões de escrita de sessões do ZIP enfraqueceria a avaliação do servidor. |
| Mapeamento Gemini e auditoria | Mapeamento tipado por tarefa e capacidade, mantendo modelos padrão da main. TTS e Live passam pelo logger existente, sem copiar um segundo sistema de auditoria. |
| Modo de estudo | A preferência existente passa a controlar a navegação, com retorno ao modo completo e isolamento entre contas. |

## Contagem e preservação

A redução concentra arquivos de dados que tinham granularidade excessiva;
não elimina testes, experiências pedagógicas ou conteúdo para satisfazer a meta.
O checkout passou de 1.656 para **991 arquivos de entrega**, incluindo código,
testes e esta documentação. Dependências, builds, caches e arquivos ignorados
não pertencem a essa contagem. O limite é menor que 1.000, com oito arquivos
adicionais possíveis antes de atingir o teto.

| Grupo | Antes | Depois |
| --- | ---: | ---: |
| Fragmentos de questões das Views, incluindo exclusões | 628 | 123 |
| Fragmentos oficiais raw/normalized | 114 | 18 |
| Contextos privados do tutor | 39 | 10 |
| Recursos editoriais de revisão | 27 | 1 |
| Fragmentos de estruturas PBL | 28 | 4 |
| Artefatos do inventário de entrega | 1.214 | 562 |

Questões continuam aparecendo de cinco em cinco na interface. Seus fragmentos
físicos têm até 1 MiB, os oficiais até 4 MiB e os do tutor até 8 MiB. A leitura
inicial pode trazer mais questões do que antes; a navegação seguinte reutiliza
o fragmento. Explicações não antecipam a carga de questões. O cache mantém o
limite existente de 32 MiB. O índice de busca preexistente de 12.880.787 bytes
continua sendo o maior artefato; a contagem menor não certifica o importador
externo do AI Studio.

O script de consolidação na fábrica compara objetos completos, ordem, IDs e variantes,
verifica os hashes de entrada e guarda cópias anteriores antes de retirar
arquivos. A compactação e os novos descritores não são reautoria. Arquivos de
origem, canonical, decisões, pacotes pedagógicos e payloads oficiais preservam
seu conteúdo. `docs/PROJECT_DATA_LINEAGE.md` registra consumidores, chaves,
limites, caminhos e reversão.

## Verificação

Resultados executados nesta missão:

- `npm run ai-studio:preflight`: **PRODUCT_CHECKS_PASSED**, 18/18 etapas,
  incluindo tipos, auditorias, navegador, builds do cliente e servidor,
  smoke do servidor compilado e integridade dos artefatos antes/depois.
- Vitest final: **91 arquivos / 502 testes aprovados**, reexecutados após
  a revisão final do áudio. Inclui troca de conta durante Live e falha
  síncrona do provedor. TypeScript também passou após os ajustes. A execução
  anterior dentro do preflight tinha 501 testes; navegador e builds foram
  concluídos com o código final.
- Playwright: **64 aprovados / 8 skipped**, nas larguras de 320, 390, 768 e
  1440 px. Os skips são condições de viewport existentes. Inclui favoritos,
  navegação, preservação de tentativas, flashcards, PBL, A14 e Axe.
- `npm run test:firestore`: **33 verificações aprovadas** no emulador local,
  cobrindo visitante, proprietário e outra conta para sessões, cache,
  inscrições push e favoritos. O emulador temporário foi encerrado.
- Fábrica: **27 testes aprovados**, sintaxe dos seis scripts afetados válida
  e consolidação idempotente: `changed: 0`, 110 comparações de conjuntos.
- Comparação independente com o arquivo Git de `2687969`:
  **MAIN_BASELINE_EQUIVALENCE_PASSED**, 369 verificações e outros 287 arquivos
  idênticos byte a byte. Script e resultado preservados junto ao primeiro
  recibo da fábrica, em `verify-main-baseline.py` e
  `main-baseline-equivalence.json`.
- `git diff --check`: aprovado. Permanece o aviso de chunks grandes do Vite.

Os logs completos do preflight e dos testes ficam nos arquivos locais
ignorados `.tmp-ai-studio-preflight-final.log` e `.tmp-vitest-final.log`,
também preservados junto ao primeiro recibo da fábrica. `factory-tools-current`
nesse arquivo de auditoria contém os seis scripts de publicação/consolidação
ajustados, com manifesto SHA-256.
Serviços autenticados reais, credenciais Gemini/FCM, dispositivos de áudio
reais e implantação não são certificados pelos testes com mocks/emulador.

O preflight não publica regras nem a aplicação. A futura entrega exige os
procedimentos de `AI_STUDIO_DEPLOYMENT.md`, incluindo suporte WebSocket e
afinidade de instância para o ticket Live em ambientes com várias instâncias.

## Reversão

O baseline Git permanece em `2687969`. Preimagens e recibos ficam na fábrica:
`Notebook LM/05_Auditorias/product-consolidation-1790203698434` e
`product-consolidation-1790203958772`. Reverter código, representação e
inventário juntos. As chaves antigas de favoritos continuam preservadas;
o formato novo grava IDs com marcações de remoção e não sobrescreve o legado.
Os publicadores ajustados na fábrica devem acompanhar eventual reversão do
contrato. Nenhuma tag foi alterada.
