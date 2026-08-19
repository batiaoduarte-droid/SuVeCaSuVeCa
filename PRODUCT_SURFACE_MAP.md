# Mapa de Superfícies do Produto: SuVeCaSuVeCa

Este documento mapeia todas as superfícies interativas, componentes, hooks de estado, estratégias de persistência e integrações da plataforma SuVeCa.

---

## Matriz Geral de Superfícies

| Identificador de Aba (`TabType`) | Nome da Superfície | Componente Principal | Modo de Carregamento | Suíte de Testes |
| :--- | :--- | :--- | :---: | :--- |
| `modules` | **Apostila & 11 Seções** | `ModuleViewer.tsx` | Síncrono / Core | `visual-regression.spec.ts`, `layout-accessibility.spec.ts` |
| `pbl` | **Aprender por Problemas (PBL)** | `PBLDashboard.tsx` | Lazy (`React.lazy`) | `pbl-flow-accessibility.spec.ts`, `PBLEngine.test.ts`, `PBLRealSessions.test.ts` |
| `questions` | **Banco de Questões Oficiais** | `OfficialQuestionsExplorer.tsx` | Lazy | `layout-accessibility.spec.ts` |
| `simulado` | **Simulado Geral Cumulativo** | `SimuladoEngine.tsx` | Lazy | `visual-regression.spec.ts`, `layout-accessibility.spec.ts` |
| `errors` | **Caderno de Erros** | `CadernoDeErros.tsx` | Lazy | `CadernoDeErros.test.ts`, `layout-accessibility.spec.ts` |
| `flashcards` | **Prática de Flashcards** | `FlashcardPractice.tsx` | Lazy | `Flashcards.test.ts`, `layout-accessibility.spec.ts` |
| `review` | **Daily Review (Revisão Espaçada)**| `DailyReviewDashboard.tsx` | Lazy | `DailyReview.test.ts` |
| `stats` | **Painel de Estatísticas** | `StatisticsDashboard.tsx` | Lazy | `Statistics.test.ts` |
| `planner` | **Plano de Estudos Personalizado** | `StudyPlanner.tsx` | Lazy | `StudyPlanner.test.ts` |
| `timer` | **Cronômetro Foco / Pomodoro** | `PomodoroTimer.tsx` | Lazy | `visual-regression.spec.ts`, `layout-accessibility.spec.ts` |
| `achievements` | **Perfil, Nível e Conquistas** | `AchievementsProfile.tsx` | Lazy | `Achievements.test.ts` |
| `analyzer` | **Analisador Sintático SuVeCA** | `SuvecaAnalyzer.tsx` | Lazy | `visual-regression.spec.ts`, `layout-accessibility.spec.ts` |
| `trees` | **Roteiros e Árvores Decisórias** | `DecisionTreeViewer.tsx` | Lazy | `visual-regression.spec.ts`, `layout-accessibility.spec.ts` |
| `duel` | **Arena de Duelo** | `DuelArena.tsx` | Lazy | `Duel.test.ts` |
| `tutor` *(Modal)* | **Professor SuVeCA (Tutor IA)** | `ProfessorSuvecaModal.tsx` | Modal / Lazy | `Tutor.test.ts` |
| `search` *(Modal)* | **Busca Global e Navegação** | `SearchModal.tsx` | Modal / Lazy | `layout-accessibility.spec.ts` |

---

## Detalhamento Técnico das Superfícies Principais

### 1. Apostila & 11 Seções Pedagógicas (`modules`)
- **Rota/Aba**: `activeTab === 'modules'`
- **Componentes-Chave**: `ModuleViewer.tsx`, `PedagogicalUnitRenderer.tsx`, `CumulativeReviewRenderer.tsx`, `StudyVisuals/`.
- **Estado & Hooks**: `selectedModuleId`, `selectedSectionId`, `useLearningMetrics.markSectionRead`.
- **Persistência**: `localStorage.getItem('suveca_last_module_{uid}')`, `localStorage.getItem('suveca_notes_{uid}')`, sincronização Firestore em `users/{uid}/notes/`.
- **Eventos**: Clique em nó de navegação, seleção de texto para anotação/destaque, avanço de seção.
- **Integrações**: Caderno de Erros (envio de termos/dúvidas da apostila), Daily Review (flashcards embutidos na seção 9).

### 2. Aprender por Problemas — PBL (`pbl`)
- **Rota/Aba**: `activeTab === 'pbl'`
- **Componentes-Chave**: `PBLDashboard.tsx`, `PBLSessionView.tsx`, `PBLProblemCard.tsx`, `PBLConfidenceSelector.tsx`, `PBLDiagnosticView.tsx`, `PBLInterventionView.tsx`, `PBLTransferView.tsx`, `PBLSessionSummary.tsx`.
- **Estado & Hooks**: `PBLSessionManager`, `usePBLSession`, `useLearningMetrics.addAttempt`, `useAchievements.recordStudyActivity`.
- **Persistência**: `PBLSessionRepository` (`suveca_pbl_sessions_{uid}` em LocalStorage e coleção Firestore `users/{uid}/data/pbl_sessions`).
- **Ciclo de Estados**: `problem` $	o$ `hypothesis` $	o$ `diagnostic` $	o$ `intervention` $	o$ `reattempt` $	o$ `transfer` $	o$ `summary`.
- **Integrações**:
  - **Caderno de Erros**: Botão no diagnóstico para cadastrar erro oficial com metadados e refutação canônica.
  - **Estatísticas**: Despacho síncrono de acertos/erros/tempo por competência.
  - **Daily Review**: Recomendação automática da próxima data de revisão baseada na maestria da competência.
  - **XP**: Bonificação de XP e avanço de streak ao concluir sessão.

### 3. Caderno de Erros (`errors`)
- **Rota/Aba**: `activeTab === 'errors'`
- **Componente**: `CadernoDeErros.tsx`
- **Estado & Hooks**: `cadernoErrors`, `setCadernoErrors`, `handleAddErrorDirect`, `handleUpdateErrorStatus`.
- **Persistência**: LocalStorage `suveca_caderno_erros_{uid}` com auto-sync em Firestore `users/{uid}/data/caderno_erros`.
- **Funcionalidades**: Filtragem por matéria, busca por texto, status (*novo*, *em revisão*, *dominado*), modo treino focado.

### 4. Simulado Geral (`simulado`)
- **Rota/Aba**: `activeTab === 'simulado'`
- **Componente**: `SimuladoEngine.tsx`
- **Estado**: Questões oficiais sorteadas com base em `public/knowledge/pedagogical/manifest.json` (20 questões cobrindo A00–A13).
- **Persistência**: Histórico de pontuação em `suveca_simulado_history_{uid}` e Firestore.
- **Integrações**: Envio automático de questões erradas para o Caderno de Erros e estatísticas de precisão global.

### 5. Daily Review (`review`)
- **Rota/Aba**: `activeTab === 'review'`
- **Componente**: `DailyReviewDashboard.tsx`
- **Algoritmo**: Repetição espaçada SM-2 / FSRS sobre os 209 flashcards editoriais e competências com revisão pendente.
- **Persistência**: `suveca_daily_review_{uid}` e Firestore.

### 6. Analisador Sintático SuVeCA (`analyzer`)
- **Rota/Aba**: `activeTab === 'analyzer'`
- **Componente**: `SuvecaAnalyzer.tsx`
- **Funcionalidade**: Desmembramento interativo de orações em Sujeito, Verbo, Complemento, Adjunto e Predicativo com validação de regras sintáticas e exportação para o tutor.

### 7. Professor SuVeCA — Tutor IA (`tutor`)
- **Modal**: `ProfessorSuvecaModal.tsx`
- **Serviço**: API `@google/genai` (Gemini 2.5) com system prompt especializado no Método SuVeCA e autoridade normativa da apostila.
- **Integração**: Geração direta de cartões com a regra explicada para o Caderno de Erros.
