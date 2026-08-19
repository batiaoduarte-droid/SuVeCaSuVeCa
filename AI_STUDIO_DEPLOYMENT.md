# Base Editorial e Implantação no Google AI Studio

O repositório **SuVeCaSuVeCa** é a aplicação web autônoma (React 19, TypeScript, Vite e Tailwind CSS) que consome os artefatos pedagógicos tratados e publicados.

---

## 1. Arquitetura e Autonomia do Repositório

O repositório GitHub é **100% autocontido** e não depende de nenhuma ferramenta ou fábrica externa para instalação, testes, auditoria ou compilação de produção:

- **Artefatos Curriculares**: `public/knowledge/pedagogical/` (115 unidades de estudo, métodos e roteiros).
- **Artefatos de Questões Oficiais**: `public/knowledge/official-questions.*.json` e `public/knowledge/official-question-parts/` (10 shards verificados).
- **Artefatos do PBL Engine**: `public/knowledge/pbl/` (2.588 Question Intelligence, 190 competências, 190 casos, 190 transfer sets, 190 trilhas diagnósticas e 13 sessões A14).
- **Gabaritos Oficiais**: `functions/src/officialQuestions.ts` e `src/data/editorialFlashcards.generated.ts`.

---

## 2. Comandos de Operação e Validação

Todo clone limpo deste repositório executa deterministicamente com os comandos padrão do `package.json`:

```bash
# 1. Instalação limpa e determinística das dependências
npm ci

# 2. Verificação estática de tipos TypeScript
npm run lint

# 3. Execução da suíte de testes unitários e de integração (Vitest)
npm test

# 4. Gateway completo de validação pré-deploy (AI Studio Preflight)
npm run ai-studio:preflight

# 5. Compilação de produção (Vite + esbuild server bundle)
npm run build

# 6. Execução do servidor local de desenvolvimento
npm run dev
```

---

## 3. O Gateway `ai-studio:preflight`

O comando `npm run ai-studio:preflight` executa a bateria completa de 8 gates de segurança:

1. **TypeScript Type Check** (`tsc --noEmit`): Valida contratos de tipagem em 100% do código.
2. **Vitest Unit & Integration** (`vitest run`): 20 suítes de testes cobrindo PBLEngine, persistência, sessões e métodos.
3. **Curriculum Integrity** (`scripts/audit-pedagogical-curriculum.mjs`): Valida 15 módulos, 115 unidades, 209 flashcards e 20 questões do simulado.
4. **Deployment Shards** (`scripts/audit-deployment-shards.mjs`): Valida integridade SHA-256 dos 10 shards de questões oficiais.
5. **Pedagogical Views** (`scripts/audit-pedagogical-views.mjs`): Valida 13.711 blocos de conteúdo e ausência de referências órfãs.
6. **PBL Runtime Integrity** (`scripts/audit-pbl-runtime.mjs`): Valida integridade referencial dos 8 datasets PBL.
7. **Playwright E2E & Axe-core** (`tests/e2e/pbl-flow-accessibility.spec.ts`): Valida fluxo interativo e acessibilidade WCAG 2.1 AA em 4 viewports (1440px, 768px, 390px, 320px).
8. **Vite Production Build** (`vite build`): Garante empacotamento com sucesso dos bundles da aplicação e do servidor.

---

## 4. Implantação Firebase

Aplicação, Firebase Functions e `firestore.rules` operam em conjunto:
- As coleções privadas de usuários preservam o Caderno de Erros (`users/{uid}/data/caderno_erros`), sessões PBL (`users/{uid}/data/pbl_sessions`) e métricas.
- O fallback para LocalStorage garante funcionamento offline e modo visitante com paridade funcional total.
