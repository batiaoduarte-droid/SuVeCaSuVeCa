# Deploy no AI Studio

Os arquivos canônicos monolíticos continuam sendo a fonte editorial local. Para evitar que o importador do AI Studio omita arquivos grandes, o repositório também contém uma projeção de implantação determinística:

- `public/knowledge/official-questions.manifest.json` e `official-question-parts/`: 372 questões oficiais, brutas e normalizadas, em 23 pares de partes verificadas por SHA-256;
- `public/knowledge/semantic-profiles-v3.manifest.json` e `semantic-profile-parts/`: os bytes integrais dos perfis semânticos v3 em 7 partes;
- `src/data/knowledge-index/`: o índice de recuperação canônica dividido em 4 módulos TypeScript.

O servidor usa os JSONs monolíticos quando estão disponíveis e recorre automaticamente às partes verificadas quando o ambiente de implantação os omite. Nenhum enunciado, alternativa, gabarito, solução ou metadado oficial é reescrito durante o particionamento.

## Verificação

```bash
npm run kb:shard:audit
npm test
npm run build
```

O `prebuild` interrompe o build se a contagem, a ordem dos IDs, o tamanho ou o hash de qualquer parte divergir da fonte canônica. Em execução, `GET /api/knowledge/health` informa se o corpus foi carregado de `monolithic` ou `sharded` e deve reportar `372` em todos os totais.

Para recriar as partes somente após uma mudança canônica deliberada:

```bash
npm run kb:shard
npm run kb:shard:audit
```
