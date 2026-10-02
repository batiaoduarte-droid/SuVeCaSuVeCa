# SuVeCa

Aplicação de estudo de Língua Portuguesa com aulas, questões, revisões, flashcards e aprendizagem por problemas (PBL). React e Vite compõem o cliente; Express fornece APIs e áudio ao vivo; Firebase fornece autenticação, persistência e Functions.

O produto consome artefatos pedagógicos publicados. Autoria, revisão e publicação editorial pertencem à fábrica externa `Notebook LM`; a instalação e os testes do produto usam os arquivos entregues neste repositório.

## Instalação e desenvolvimento

Na raiz do repositório, use Node `>=20.19.0 <25` e npm `>=10 <12`; a versão de referência do npm está em [package.json](package.json).

```powershell
npm ci
npm run dev
```

O servidor abre em `http://localhost:3000` por padrão, com Express e Vite no mesmo processo. `PORT` permite escolher outra porta. `npm run preview` serve somente o cliente e não substitui as APIs.

Configure os segredos no ambiente do servidor ou em `.env.local`, nunca no código ou no Git. O servidor carrega `.env.local` antes de `.env`, preservando variáveis já definidas no processo. IA exige `GEMINI_API_KEY`; as rotas autenticadas de produção exigem Firebase Admin configurado com credenciais válidas. A configuração pública do Firebase está em [firebase-applet-config.json](firebase-applet-config.json). Executar como visitante não valida serviços autenticados.

## Verificação

```powershell
# Instalar o navegador da versão Playwright definida pelo lockfile
npx playwright install chromium

# Verificações isoladas
npm run typecheck
npm test
npm run validate:knowledge

# Produto: auditorias, testes, navegador, builds e smoke do servidor
npm run ai-studio:preflight

# Functions têm dependências e build próprios; implantação usa Node 20
npm --prefix functions ci
npm run verify:release
```

O [preflight executável](scripts/ai-studio-preflight.mjs) define as etapas vigentes. `verify:release` acrescenta verificações das Functions. Esses comandos não fazem deployment e não certificam credenciais ou sincronização remota. Não declare aprovação quando uma etapa falhar ou não puder ser executada.

## Produção

```powershell
npm run build:production
npm run start:production
```

`npm run package:production` gera uma pasta nova em `release/`, contendo cliente, servidor e contextos privados do tutor. Para entregar, transfira a pasta inteira, configure os segredos no servidor, execute `npm install --omit=dev` e `npm start` dentro dela. `server-data/` contém dados privados e não deve ser servido estaticamente.

O áudio ao vivo obtém um ticket autenticado em `POST /api/gemini/live-ticket` e usa o WebSocket `/api/gemini/live`. O proxy deve aceitar upgrade WebSocket e preservar Host/Origin; múltiplas instâncias precisam de afinidade entre a emissão e o consumo do ticket.

Functions são publicadas separadamente com `npm --prefix functions run deploy`, quando houver autorização para publicar e Firebase CLI configurado. O [firebase.json](firebase.json) não configura Hosting para a aplicação Express.

## Integridade e limites de alteração

- Preserve IDs, gabaritos, payloads oficiais e semântica homologada. O renderer apresenta os dados; não corrige conteúdo pedagógico.
- `public/knowledge/`, `server-data/`, dados gerados e [product-artifacts.manifest.json](product-artifacts.manifest.json) pertencem à entrega e continuam no Git.
- Falha de tamanho ou SHA-256 exige comparar os arquivos com a revisão de origem. Não recalcule hashes, regenere conteúdo ou retire testes para acomodar uma importação incompleta.
- Publicação editorial e atualização do inventário exigem uma missão autorizada na fábrica. Nunca exponha segredos ou desative autenticação para contornar falhas de ambiente.
- Sessões PBL remotas são escritas pelo servidor. Mudanças de persistência exigem compatibilidade ou migração explícita.
- A árvore de entrega deve conter menos de 1.000 arquivos. `npm run audit:artifacts` verifica esse limite e a integridade dos artefatos.

## Documentação local

Por decisão do responsável pelo projeto, este README é o único documento versionado. O acervo detalhado permanece no disco do workspace: `docs/README.md` dentro do produto é o portal local; `docs/PROJECT_DATA_LINEAGE.md` é o contrato local de linhagem; `../docs/README.md` apresenta a fábrica, os projetos e as auditorias.

Esses documentos, os arquivos locais de instrução `AGENTS.md` e os relatórios não acompanham clones ou exportações do produto. A documentação local não entra na contagem da entrega. Mudanças de contratos, publicação e persistência devem continuar sendo registradas no contrato de linhagem do workspace. O histórico de Git mantém as versões anteriormente publicadas dos documentos.
