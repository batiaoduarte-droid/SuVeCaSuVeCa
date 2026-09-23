# Produto SuVeCa no Google AI Studio

Este repositório instala, executa, testa, valida, compila e entrega a aplicação com artefatos já publicados. Produzir, revisar, homologar ou republicar esses artefatos pertence à fábrica externa. Arquivos gerados necessários ao produto permanecem versionados.

Na migração de fronteira de 2026-09-23, os 115 Markdown de `pedagogical/units`
foram arquivados na fábrica e retirados da entrega. O inventário atual contém
351 artefatos (419.905.645 bytes). As 115 Views permanecem intactas e são a única
fonte de aprofundamento da interface. Os snapshots editoriais preservam URLs
históricas, omitidas pela projeção de runtime. Ausência da antiga pasta `units`
é esperada nesta revisão; ausência de uma View continua sendo falha. Consulte
`docs/PROJECT_DATA_LINEAGE.md` para hashes, persistência e reversão.

## Instalação e execução

Use uma versão de Node compatível com `engines` e a versão npm declarada em `packageManager`. Execute `npm ci` na raiz. `npm run dev` inicia Express com Vite em desenvolvimento. `npm run build` compila o cliente; não cria um bundle do servidor. `npm start` executa `server.ts` com `tsx`: em produção, configure `NODE_ENV=production` e mantenha as ferramentas exigidas por `tsx` e Vite. `npm run preview` mostra apenas o cliente e não substitui a API Express.

Configure `GEMINI_API_KEY` e as credenciais Firebase do servidor no ambiente para as funcionalidades autenticadas. Não versione segredos e não remova autenticação para resolver importação. O modo visitante não comprova funcionamento das APIs autenticadas.

## Verificação

- `npm run typecheck`: tipos do produto e servidor.
- `npm test`: testes autônomos do produto; recursos relativos `/knowledge` são lidos dos arquivos publicados.
- `npm run validate:knowledge`: inventário de bytes, currículo ligado às 115 Views por identidade, questões, views, índices, macros obrigatórias, PBL, todos os shards do tutor e schema dos pacotes publicados.
- `npx playwright install chromium`: provisionamento explícito do navegador da versão instalada, fora do preflight.
- `npm run ai-studio:preflight`: validação do produto, regressões de navegador e build do cliente. Não exige Git nem a fábrica.
- `npm run verify:release`: acrescenta a verificação de dependências e tipos das Functions; não publica serviços nem certifica credenciais remotas.
- `npm run eval:ai`: avaliação opcional contra uma API real, com `SUVECA_EVAL_ID_TOKEN` e `SUVECA_EVAL_BASE_URL`.

O preflight não instala dependências, não gera conteúdo e não conserta manifests. Logs são preservados no terminal. Falha ou ausência de pré-requisito encerra a execução sem declarar aprovação. Bundles e relatórios de testes ficam em diretórios ignorados.

## Firebase Functions

O subprojeto `functions` declara Node 20 para implantação. Instale com `npm --prefix functions ci` em ambiente compatível e valide com `npm run typecheck:functions`. `npm --prefix functions run deploy` executa seu `predeploy` antes da entrega. `functions/lib` permanece versionado e protegido até uma migração específica do contrato de compilação. Não confunda o build Vite com o build das Functions. O Firebase CLI precisa estar disponível para publicação; `firebase.json` não define Hosting para a aplicação Express.

## Integridade e publicação editorial

`product-artifacts.manifest.json` identifica os arquivos publicados por caminho, tamanho e SHA-256. É um contrato de entrega, não um gerador. Atualize o inventário somente como parte de uma publicação editorial autorizada, depois de homologar os novos artefatos; nunca para acomodar uma importação truncada. `.gitattributes` preserva os bytes dos artefatos com hash.

`public/knowledge`, código gerado em `src/data`, snapshots canônicos consumidos pelos auditores e evidências de publicação permanecem no produto. Agregados grandes não foram removidos. Comentários `AUTO-GENERATED` conservam o caminho histórico do produtor para manter bytes; não representam comandos disponíveis neste repositório.

A fábrica hospeda as ferramentas em `Notebook LM/06_Ferramentas/produto-editorial`, com pacote npm, compiladores e testes próprios. Ela publica artefatos homologados para o produto. O produto não importa ferramentas, schemas editoriais externos, ledger ou Python. `schemas/pbl-published-package.schema.json` é o contrato local de leitura dos pacotes, preservado a partir do schema de autoria existente. Ele não reinterpreta metadados históricos como nova homologação.

Após uma publicação editorial autorizada, a fábrica oferece `npm run release:inventory` para registrar os novos bytes e artefatos candidatos à entrega. Execute depois a validação do produto. Esse comando fica exclusivamente na fábrica e não faz parte da instalação ou importação.

## Importação no Google AI Studio

1. Importe uma revisão identificada do Git e confira `package.json` e `product-artifacts.manifest.json`.
2. Localize a raiz por `package.json`, `server.ts` e `public/knowledge`. Sem `.git`, trate o workspace como arquivo-fonte exportado; não reescreva a arquitetura por esse motivo.
3. Execute `npm ci` e provisione Chromium se for executar os testes de navegador.
4. Execute `npm run ai-studio:preflight` e conserve a saída da etapa que falhar.
5. Para arquivo ausente ou hash divergente, compare com a mesma revisão publicada e restaure a importação. Não apague testes nem regenere conteúdo.
6. Diferencie erro ambiental, dependência ausente, integridade, código e sincronização. Aprovação local não garante sincronização de um serviço externo.

### Arquivos grandes e truncagem de importação

Fato observado (2026-09-12): em uma importação no Google AI Studio, os quatro maiores artefatos versionados não apareceram no workspace importado — `official-questions.raw.json` (45,0 MB), `official-questions.normalized.json` (38,8 MB), `question_pedagogy_index.json` (28,1 MB) e `question_competency_links.json` (16,3 MB) — embora estejam presentes no Git. Todos os demais 462 artefatos protegidos (todos com menos de 10 MB) foram materializados. Não há documentação pública do importador que estabeleça um limite por arquivo; trate a omissão como **falha de importação**, nunca como arquivo obsoleto ou quebrado.

`product-artifacts.manifest.json` é autodescritivo: expõe `totalBytes` (soma esperada dos artefatos da revisão importada) e `largestArtifact` (maior arquivo esperado). Um importador pode detectar truncagem comparando esses dois números com o workspace materializado, sem gerar nada. `scripts/audit-product-artifacts.mjs` classifica cada falha por causa — `missing`, `size-mismatch` (assinatura de truncagem), `sha256-mismatch` (conteúdo alterado), `outside-root`/`symlink-outside-root` — para que nenhum agente confunda truncagem de importação com corrupção de conteúdo.

Protocolo de reparo para arquivos ausentes ou truncados na importação:

1. Não apague testes, validadores, artefatos, scripts canônicos, autenticação ou arquitetura. Ausência no workspace importado não significa dispensável no produto.
2. Relate a lista exata de arquivos ausentes com o commit de referência; um agente sincronizado com o repositório pode restaurá-los baixando os blobs dessa revisão.
3. Não recalcula hashes, não regenera shards/índices, não "normaliza" quebras de linha para fazer a auditoria passar. O inventário descreve a entrega; a importação é que deve ser restaurada.
4. Se o ambiente de importação não conseguir materializar arquivos grandes do Git, registre a limitação e execute as auditorias que não dependem dos agregados grandes; registre as demais como **não executadas por limitação do ambiente**, sem declarar aprovação parcial como aprovação.

Antes de remover qualquer arquivo, prove a ausência de consumidores em imports, URLs, manifests, testes, configurações e comandos. Para módulos mistos, separe o verificador do escritor primeiro. O modelo de autenticação e os IDs canônicos não são ajustes de ambiente.
