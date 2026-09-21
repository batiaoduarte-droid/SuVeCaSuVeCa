# Correção do Professor PBL — 2026-09-21

Escopo: produto, autenticação local, persistência da sessão, transporte do contexto, prompt e auditoria. Base Git: `7bd10a1`, branch `fix/ai-studio-improvements-hardening`, com alterações locais preexistentes preservadas. Nenhum commit, push ou publicação realizado.

## Incidente e causa observada

A conversa Antigravity `05e32337-c957-4792-8607-0b33c2314699` relatou respostas gramaticais incorretas na questão `OQ-A00-aula00.q0002`. As chamadas de 18/09 que afirmaram X com /ks/ em “sintaxe”, calcularam sete fonemas e recusaram explicação direta estavam identificadas como `guest`. A reconstrução do prompt da contagem incorreta e da recusa coincidiu com os hashes auditados: eram prompts pré-tentativa, sem comentário resolutivo e sem tentativa confirmada. O comentário correto já existia no shard publicado.

Classificação: `PERSISTENCE`, `PBL`, `TYPE CONTRACT` e autenticação de runtime; não era necessária regeneração do corpus ou das questões.

## Correções

- A identidade local usa o mesmo resolver no middleware e nas rotas PBL. A conta pessoal mantém seu ID; token local só é aceito em desenvolvimento/teste. Token ausente ou inválido não fabrica identidade; Firebase Admin indisponível falha fechado. As rotas de IA mantêm rate limit e exigem autenticação.
- Contas locais sincronizam em memória do servidor e conservam persistência no navegador, sem exigir credenciais Firestore. Não há migração automática de dados entre perfis. Reinício do servidor é seguido por nova sincronização antes do tutor.
- O frontend aguarda confirmação da sincronização. `expectedAttemptId` apenas confere consistência; a autorização continua vindo da tentativa persistida. Divergência produz 409 em vez de uma conversa silenciosamente rebaixada para pré-tentativa. `reasoning`, confiança e histórico são recuperados da sessão confirmada.
- Comentários publicados e análises derivadas não são apresentados como declarações infalíveis da banca. O prompt exige evidência, decomposição de alternativas e reconsideração de objeções, sem alegar consultas externas. `presentation.commentary` não é promovido a autoridade oficial e é removido antes da tentativa.
- A auditoria captura prompts completos, versão, hashes, confirmação da tentativa e resposta, com redação de credenciais. Testes automatizados não escrevem na trilha operacional. Erros de parsing são registrados.
- No timeout de 30 segundos, a espera do SDK é abortada. Após tentativa confirmada, uma explicação direta pode recorrer ao gabarito e comentário publicados. A interrupção local não garante cancelamento do processamento no provedor.
- Playwright desativa chamadas reais do tutor. A expectativa do Caderno de Erros acompanha a identidade ativa, em vez de pressupor `guest`.

## Evidências de validação

- `npm run ai-studio:preflight`: `PRODUCT_CHECKS_PASSED`. Executou TypeScript, 80 arquivos/440 testes, auditorias, navegador e build. Artefatos publicados: 466, 429.720.375 bytes, íntegros antes e depois.
- Navegador: 39 aprovados, 1 aprovado na repetição e 8 pulados nas configurações previstas. A repetição ocorreu em Roteiros desktop após um timeout; não foi atribuída ao Professor PBL. Build conservou o aviso de chunks grandes.
- Após os últimos ajustes de fallback, validação do raciocínio e aborto HTTP: TypeScript aprovado; suíte focalizada de 105 testes aprovada e, após acrescentar o teste de timeout, 18 testes de segurança/integração local aprovados. O novo teste de timeout não estava na contagem de 440 do preflight.
- Verificação HTTP com o servidor real: sincronização da conta local pessoal 200; gabarito D e comentário disponíveis à própria conta; outra conta e leitura pública receberam `REDACTED`; turno anônimo 401; turno autorizado 200 com tutor determinístico.
- Chamada real de avaliação: log `Notebook LM/05_Auditorias/ia/chamadas/2026-09-21/1370d92036dd439c84e005a0ccb2738f.json`. Captura v2, modo runtime, tentativa confirmada, versão `2026-09-21-evidence-and-attempt`, prompt com 14.003 caracteres e SHA-256 conferido. Incluiu gabarito, comentário publicado e raciocínio do aluno. O provedor excedeu 30 segundos e acionou fallback: **não houve resposta real bem-sucedida para homologar a correção gramatical do modelo**.

Logs locais da missão: `../scratch/pbl-preflight-final-2026-09-21.log`, `../scratch/pbl-http-verification-2026-09-21.json` e `../scratch/pbl-live-replay-2026-09-21.json`. Esses registros permanecem fora dos artefatos de deployment.

`PROJECT_DATA_LINEAGE.md` atualizado na mesma missão. Canonical, Views, payloads oficiais, decisões editoriais, IDs, índices e manifests não foram alterados. O resultado certifica os contratos de software e a integridade dos dados; a qualidade de respostas futuras de IA exige avaliação pedagógica própria.
