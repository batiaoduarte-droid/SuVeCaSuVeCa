# Macroentradas pedagógicas

Status atual: implementação de produto preparada, desativada e sem catálogo publicado. A ativação permanece bloqueada pelo Gate 0 da fábrica.

## Contrato

- 55 macroentradas regulares e 13 revisões A14 são contêineres de navegação sobre 115 unidades atômicas.
- `unitId`, `competencyId`, Learning Objectives, questões, recall, sessões PBL e mastery não são renomeados nem agregados.
- Leitura e visita alimentam progresso de estudo; somente evidência PBL por competência alimenta aquisição, transferência e retenção.
- Não existe score médio de macroentrada.
- Apenas uma unidade e uma página de até cinco questões são montadas por vez.
- A transição A03 afetada por conflito normativo não autoavança; o acesso direto continua permitido.
- Pré-requisitos A05→A06 e remediação A04 consultam mastery e recomendam retorno seletivo, sem herança de domínio.

## Rollout fail-closed

`VITE_MACRO_CURRICULUM_ENABLED=true` é o único opt-in. Ausente, falso, catálogo ausente ou índice vazio mantêm a navegação atômica. Desativar a flag é o rollback; nenhum dado do aluno precisa ser desmigrado.

O índice gerado não pode ser produzido de um rascunho: o build exige `publicationStatus=publishable`, `gate0.status=pass`, hash e tamanho exatos.

## Sequência de publicação

Execute somente depois de autoria, review e publicação válida dos dois overlays semânticos:

```powershell
# Fábrica: recompilar PBL e sincronizar a projeção de produto
.\.venv\Scripts\python.exe .\06_Ferramentas\compilacao\recompilar_pbl_semantic_overlays.py compile --apply
.\.venv\Scripts\python.exe .\06_Ferramentas\publicacao\publicar_overlays_produto.py --scope pbl --apply --approval-token PUBLISH_APPROVED_ONLINE_QUESTIONS_TO_PRODUCT

# Registrar o baseline 9/9 ligado aos bytes atuais
.\.venv\Scripts\python.exe .\06_Ferramentas\qa\registrar_gate0_macro_produto.py

# Compilar e publicar o catálogo operacional
.\.venv\Scripts\python.exe .\06_Ferramentas\compilacao\compilar_macroentradas_pedagogicas.py compile
.\.venv\Scripts\python.exe .\06_Ferramentas\publicacao\publicar_macroentradas_produto.py --apply --approval-token PUBLISH_APPROVED_MACRO_CURRICULUM_TO_PRODUCT
```

Depois, no produto:

```powershell
npm run build:macro-index
npm run audit:macros
npm run lint
npm test
npm run ai-studio:preflight
```

Somente após esses gates e as medições A11/A13 a flag pode ser ativada no ambiente de homologação. Publicar o catálogo não ativa a interface automaticamente.
