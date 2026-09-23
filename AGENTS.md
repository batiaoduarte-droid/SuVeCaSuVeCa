# Contrato do produto SuVeCa

Este Git contém a aplicação e os artefatos homologados que ela consome. Permanece aqui o necessário para instalar, executar, testar, validar, compilar e entregar o produto. Produção, transformação, revisão, homologação e republicação editorial pertencem à fábrica externa.

Desde a migração de 2026-09-23, as 115 unidades usam exclusivamente Views JSON e `editorial.integrationUnitId`, inclusive A14. `public/knowledge/pedagogical/units` foi aposentada e arquivada na fábrica; não a restaure como reparo de importação. URLs `contentUrl` nos snapshots preservados são históricas. O inventário atual tem 351 artefatos; consulte a seção de retirada v3 em `docs/PROJECT_DATA_LINEAGE.md`. Falhas de View devem preservar o erro explícito e a opção de tentar novamente.

Leia `AI_STUDIO_DEPLOYMENT.md` e `docs/PROJECT_DATA_LINEAGE.md` antes de alterar contratos. Preserve alterações preexistentes. Nunca remova arquivo por nome, tamanho ou sufixo `generated`; comprove consumidores em imports, URLs, manifests, testes e scripts. Se um módulo misturar escrita editorial e validação, separe as responsabilidades antes de retirar o escritor.

Não regenere `public/knowledge`, índices, IDs ou hashes para corrigir importação. Ausência de `.git` pode indicar um arquivo-fonte exportado; não implica código quebrado. Não modifique autenticação ou arquitetura como tentativa genérica de resolver sincronização. Relate comando, diretório e erro observado.

Instale com `npm ci`. `npm run validate:knowledge` verifica os artefatos sem alterá-los. `npm run ai-studio:preflight` verifica o produto e o build do cliente; requer dependências e Chromium já instalados. O comando não certifica sincronização externa ou serviços autenticados. `npm run build` compila o cliente; `npm start` usa `tsx server.ts` e requer as ferramentas documentadas. Functions têm instalação e compilação próprias.

`product-artifacts.manifest.json` só muda em uma publicação editorial autorizada ou migração revisada de fronteira. Erro de integridade não autoriza recalcular hashes. Testes do produto devem usar somente fixtures locais e artefatos publicados, nunca fontes externas opcionais ou gabaritos inventados.

Arquivos grandes podem não materializar na importação do AI Studio (fato observado com os quatro agregados de 16–45 MB). Isso é falha de importação, não arquivo dispensável. O inventário expõe `totalBytes` e `largestArtifact`; a auditoria classifica as causas (`missing`, `size-mismatch`, `sha256-mismatch`). Ao encontrar arquivos ausentes ou truncados: relate a lista com o commit de referência, restaure baixando os blobs dessa revisão, não apague testes ou validadores, não regenere conteúdo e declare verificação incompleta como incompleta — nunca como aprovada.
