# SuVeCa — implementação local do enxugamento

Data: 2026-09-23. Baseline: `5e8a28c`. Status: gates de release e medições finais aprovados. Entrega local; sem publicação externa.

## Escopo e autoridade

O trabalho incorpora a retirada v3 e os flashcards presentes no baseline. Não houve reautoria, mudança de gabaritos, IDs curriculares, regras pedagógicas, chaves persistidas, Firebase ou bibliotecas. Os componentes/utilitários dos flashcards permanecem iguais ao baseline. A avaliação sobre futuros contratos SuVeCa/For You é um plano separado, sem implementação semântica.

A fábrica continua responsável por conhecimento, autoria e publicação; o produto continua autônomo. `PROJECT_DATA_LINEAGE.md` e `AI_STUDIO_DEPLOYMENT.md` foram atualizados para os novos caminhos, contratos, consumidores e gates. As partes históricas desses documentos não descrevem o formato atual de entrega.

## Entregas por etapa

| Etapa | Mudança implementada | Evidência e efeito | Unidade de reversão |
|---|---|---|---|
| 0 — baseline | Checkout isolado de 5e8a28c, inventário de bytes/SHA-256 e arquivo dos dados anteriores; cinco medições frias/revisita por cenário | Base inclui a migração v3 e o redesign de flashcards; nenhum conteúdo reconstruído de uma revisão anterior | Baseline Git e arquivo da fábrica |
| 1 — interface | Conteúdo monta na primeira abertura e permanece montado; deep links e expandir todas; questões oficiais dentro de seção própria; React separado de Recharts | Testes de estado, deep links, A14 e DOM; home não solicita chunk de gráficos; Estatísticas renderiza gráficos | Renderers, componente de montagem e configuração Vite |
| 2 — redundância | Quatro agregados retirados; entradas preservadas na fábrica; runtime/auditores exigem fragments/manifests; publicadores não recriam agregados no produto | 125.070.476 bytes retirados; equivalência com fragmentos, ordem e hashes verificados; overlay ativo preservado | Agregados, consumidores, auditores, manifests e produtores juntos |
| 3 — questões | Contrato de entrega v1 separado da versão semântica; 102 Views regulares com corpo separado de páginas de até cinco ocorrências elegíveis; A14 inalterada semanticamente | 115 Views reconstruídas iguais ao baseline, incluindo 2.952 ocorrências; paginação preserva tentativas; cancelamento descarta resposta obsoleta | Views, páginas, loaders, tipos e auditores juntos |
| 4 — PBL | Inicialização com quatro arquivos de catálogo; índices por questão/competência; estruturas em partes e 190 pacotes individuais; getters assíncronos, preparação antes da retomada | Painel sem runtime-parts nem pacotes autorais; mesma seleção nos testes determinísticos; falha não escolhe outro candidato; retry do mesmo fragmento | Repositório, consumidores, manifests, partes e publicador PBL |
| 5 — catálogo/busca/JSON | Catálogo leve para navegação; módulo/busca sob demanda; índice textual do servidor; projeção optativa de prática sem raw; JSON de entrega compacto | Busca testada contra normalização/pontuação/desempate anteriores sem banco raw disponível; API completa preservada por padrão; canonical e hashes de origem intactos | Índices, projeções, contratos e consumidores compatíveis |
| 6 — produção/cache | Tutor em server-data; servidor Node compilado; pacote com allowlist e gzip/Brotli; cache de dados por bytes; assets com hash e shell versionado | Instalação isolada só com dependências de execução; APIs, 401, arquivos privados, compressão, gráficos, atualização e shell offline verificados | Servidor, caminhos privados, publicador, empacotador e SW juntos |

A versão de entrega é 1. As versões semânticas das Views e os identificadores curriculares usados na persistência não foram normalizados ou alterados.

## Integridade dos dados

A comparação externa lê os arquivos arquivados do baseline e recompõe os artefatos atuais. Não se limita a confiar em hashes produzidos pelo novo publicador.

- 115 Views equivalentes em profundidade, incluindo A14 e 2.952 ocorrências regulares de questões, com ordem e duplicações preservadas.
- Agregados oficiais raw/normalized equivalentes aos fragmentos na mesma ordem.
- Links e pedagogias PBL equivalentes aos fragmentos, com a mesma ordem de chaves.
- Casos, transferências, diagnósticos, questões autorais e pacotes PBL equivalentes.
- 39 fragmentos privados do tutor equivalentes após compactação; auditoria cobre 4.945 contextos.
- 1.214 artefatos de entrega inventariados, somando 280.337.503 bytes.
- Os quatro agregados têm recibo com bytes e SHA-256 no arquivo da fábrica. Os quatro backups locais totalizam 38.894.149 bytes e ficam fora de public; esse volume não faz parte da economia do checkout versionado.

A nova publicação usa tamanho, SHA-256 e identidade nos fragmentos, compartilhamento de requisições PBL e nova tentativa após erro. O cache compartilhado limita a retenção a 32 MiB de bytes serializados; isso não é um teto de heap JavaScript. Componentes ativos conservam suas referências e estado ao ocorrer uma remoção do cache. Páginas já visitadas permanecem montadas enquanto a seção existe.

## Tamanho e desempenho

A medição do checkout considera arquivos versionados e novos arquivos candidatos ao Git, excluindo .git, node_modules, builds, pacote, relatórios temporários e backups ignorados. Não mede o histórico Git nem o download inicial.

A referência de 272,3 MB era uma projeção de retirada e compactação. A implementação também publica índices e metadados para carregar seletivamente e preservar a busca: o índice textual de questões, sozinho, tem 12.880.787 bytes. A tabela final registra o resultado líquido, sem somar a mesma economia duas vezes.

| Universo | Antes | Depois | Diferença |
|---|---:|---:|---:|
| Checkout candidato ao Git | 426,68 MB | aproximadamente 287,35 MB | −139,33 MB (−32,7%) |
| Quatro agregados retirados | 125,07 MB | 0 | −125,07 MB |
| Artefatos do inventário atual | — | 280,34 MB / 1.214 arquivos | inclui dados públicos e privados |
| Backups locais ignorados, fora do checkout acima | 38,89 MB em public | arquivados na fábrica | sem impacto adicional no Git |

A serialização compacta do baseline público remanescente, excluindo os agregados retirados e o catálogo macro vinculado por hash, representa 29,19 MB brutos. Novas projeções, índices, descritores, código e documentação consomem aproximadamente 14,93 MB. O ganho líquido de 139,33 MB já considera ambos: não somar os 29,19 MB novamente. Os valores exatos e o universo de arquivos estão em size-summary.json.

Medianas de cinco execuções, carga fria; MB decimais. Bytes transferidos incluem o overhead reportado pelo navegador:

| Cenário | Transferido antes → depois | Decodificado antes → depois | Requisições antes → depois | LCP antes → depois | Tempo em tarefas longas antes → depois |
|---|---:|---:|---:|---:|---:|
| Home | 1,018 → 0,813 MB | 4,454 → 3,541 MB | 50 → 53 | 4.616 → 3.596 ms | 1.098 → 611 ms |
| Painel PBL | 5,662 → 0,798 MB | 50,344 → 4,078 MB | 66 → 45 | 2.072 → 1.656 ms | 1.792 → 315 ms |
| A13-G01, explicação | 1,992 → 0,873 MB | 14,020 → 3,733 MB | 53 → 55 | 2.044 → 1.584 ms | 2.087 → 1.166 ms |

O payload codificado/comprimido frio foi, respectivamente: home 1.002.719 → 796.644 bytes; PBL 5.641.734 → 784.477 bytes; A13 1.976.086 → 856.038 bytes. Home e A13 fazem algumas requisições adicionais por causa da separação de módulos/dependências; os bytes e o trabalho antecipado caíram. PBL reduziu o tráfego frio em 85,9%.

Na revisita, as medianas de transferência/LCP foram: home 15.000 → 15.900 bytes e 2.568 → 1.972 ms; PBL 19.800 → 13.500 bytes e 712 → 692 ms; A13 15.900 → 16.200 bytes e 1.540 → 712 ms. A API Resource Timing pode informar zero para tamanhos de recursos servidos pelo cache; por isso não se interpreta tamanho decodificado zero na revisita como ausência de execução JavaScript.

A contagem de nós da explicação A13 caiu de 3.722 para 2.077. A home ainda carrega dependências preservadas pelo escopo do plano; a redução não implica que toda lentidão restante tenha sido eliminada.

Condições do navegador: Chromium, viewport 390×844, CPU 4×, 4 Mbps de download/1 Mbps de upload, latência de 150 ms, service worker bloqueado, build de produção servido pelo mesmo Vite preview. Cinco execuções frias e cinco revisitas por rota. Tempos são evidência comparativa local; ausência de carga antecipada e equivalência são critérios determinísticos. Os cenários não exercitam serviços autenticados remotos. A validação do servidor compilado e do pacote ocorre separadamente.

## Validações executadas

- `npm run verify:release`: **RELEASE_CHECKS_PASSED**. Inclui preflight completo, inventário antes/depois, TypeScript, auditorias, cliente, servidor, smoke e tipos/dependências das Functions.
- Vitest: **87 arquivos, 483 testes aprovados**.
- Navegador do release: **60 aprovados, 8 skipped**, em 320, 390, 768 e 1440 px. Os skips são condições de viewport já declaradas nas suítes; não são falhas promovidas a PASS.
- A suíte inclui flashcards, deep links, resposta oculta até tentativa, PBL legado explícito e padrão, retomada, A14, seletividade e Axe nas experiências previstas pelos testes.
- Oito testes focados de entrega seletiva passaram nas quatro larguras.
- `validate:knowledge` passou e todas as suas auditorias foram repetidas dentro do release.
- Fábrica: **27 testes aprovados**, sintaxe de 42 arquivos Python das áreas afetadas e verificação sintática dos novos publicadores JS.
- Comparação direta com baseline: **BASELINE_EQUIVALENCE_PASSED**.
- Pacote instalado fora do repositório: **PRODUCTION_SMOKE_PASSED**, sem node_modules ancestral do produto e com instalação `--omit=dev`.
- Navegador no pacote: **PRODUCTION_BROWSER_PASSED**. Home sem gráficos; Estatísticas com gráficos; assets reutilizados após troca de versão do SW; cache de shell substituído; armazenamento local preservado; shell abre offline; nenhum HTTP local 4xx/5xx no cenário.
- Falhas testadas: 404, JSON inválido, tamanho/hash divergente, retry, cancelamento ignorado pelo transporte e descarte da resposta obsoleta. O cache também foi pressionado além de 32 MiB, sem invalidar dados retidos por um consumidor.
- `git diff --check` sem erros. Novos JSON privados recebem `-text` em .gitattributes para preservar seus hashes nos checkouts.

Limites: serviços autenticados reais, credenciais remotas, sincronização e deployment não foram certificados. Permanecem avisos de chunks maiores que 500 kB, incluindo Firebase e flashcards mantidos no escopo original. O checkout isolado compartilha node_modules por junction, que causa avisos de allowlist de fontes KaTeX no servidor de desenvolvimento; o pacote compilado independente passou sem falhas HTTP locais. Não foi feita alteração permanente de configuração para acomodar essa peculiaridade.

## Execução e publicação futura

No produto:

```text
npm ci
npm run verify:release
npm run build:production
npm run start:production
npm run package:production
```

O pacote novo fica em release/suveca-*. Transfira seu conteúdo completo, instale dependências com npm install --omit=dev e execute npm start. Configure credenciais pelo ambiente. O pacote contém dist, server-dist, server-data, package.json, start.cjs e inventário; não inclui testes, ferramentas, docs ou backups. Brotli/gzip são cópias de transporte geradas apenas no pacote, não conteúdo adicional versionado. O tamanho físico com cópias comprimidas e node_modules é um universo diferente do checkout.

Na fábrica, entradas agregadas ficam em `06_Ferramentas/produto-editorial/inputs/deployment-aggregates`. Modelos completos para reconstrução ficam em `inputs/product-delivery`. Após autoria/publicação autorizada, reconstruir os shards afetados, executar publish:delivery, atualizar índices afetados, registrar release:inventory e validar o produto. Publicadores não podem atribuir homologação a novas propostas sem revisão editorial.

## Evidências e reversão

Diretório da fábrica: `05_Auditorias/product-slimming-implementation-2026-09-23`.

- baseline-browser.json / final-browser.json: execuções individuais e recursos solicitados;
- browser-summary.json / size-summary.json: agregação e tamanho;
- verify-release.out.log / verify-release.err.log: todos os gates;
- baseline-equivalence.json e compare-delivery.mjs: comparação independente;
- isolated-smoke.log, production-browser.json e package-install.*.log: pacote autônomo;
- factory-final-tests.log, finalizer.log e inventory-final.log: produtores;
- integration-receipt.json: arquivos integrados, hashes anteriores e posteriores.

Arquivo recuperável: `90_Historico/2026-09-23-product-slimming`, com baseline-manifest.json, dados anteriores, recibo dos quatro agregados, backups locais e cópias dos produtores alterados. Código anterior está na revisão 5e8a28c. Não houve commit, push, merge, mudança de tags ou publicação externa nesta missão.

Para reverter, preservar primeiro quaisquer mudanças posteriores e restaurar o conjunto completo da entrega: código, dados, manifests, paths e publicadores. Restaurar somente um manifest deixa o consumidor incompatível. A lista do recibo distingue arquivos anteriores de arquivos criados; não usar limpeza recursiva cega. IDs e chaves de persistência permanecem compatíveis, dispensando reversão do progresso do aluno. Se for necessária uma reversão por etapa, respeitar as dependências indicadas na tabela: contratos/consumidores/dados de uma etapa são indivisíveis.

