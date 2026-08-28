# Guia Pedagógico e Operacional do PBL SuVeCA

## 1. Finalidade e estado deste documento

Este guia descreve o comportamento implementado do fluxo **Aprender por Problemas (PBL)** da SuVeCA em 27 de agosto de 2026. Ele serve de referência comum para produto, pedagogia, curadoria de questões, desenvolvimento e homologação. Alterações ainda não publicadas devem ser homologadas pelos gates antes de serem chamadas de baseline publicado.

O PBL não é apenas uma lista de questões. Cada sessão parte de uma competência, observa a resposta e a confiança do aluno, decide se é necessário diagnosticar ou intervir, exige aplicação em novos contextos e termina com uma decisão concreta para a próxima questão.

## 2. Estado atual do produto

| Indicador | Estado atual |
| --- | ---: |
| Unidades pedagógicas cobertas | 102 de 102 (100%) |
| Competências cobertas | 190 de 190 (100%) |
| Casos-âncora PBL | 190 |
| Conjuntos de transferência | 190 |
| Caminhos diagnósticos | 190 |
| Sessões cumulativas | 13 |
| Questões oficiais no banco | 4.864 |
| Questões autorais PBL | 81 |
| Banco total utilizável pelo PBL | 4.945 |
| Competências prontas | 190 |
| Competências limitadas ou bloqueadas | 0 |
| Média de questões distintas por competência | 42,29 |
| Força da cobertura | 155 robustas, 27 adequadas e 8 mínimas |
| Lacunas impeditivas | 0 |

As 81 questões autorais foram criadas para recompor duas famílias que tinham lacuna real: `IP-A04-G03` e `IP-A04-G08`. Elas são identificadas por prefixo `PBLQ`, `sourceKind: authored_pbl` e rótulo visível de questão autoral; nunca são apresentadas como questões oficiais.

Ainda existem quatro famílias com rotação estreita, mas todas permitem uma sessão completa:

- verbos irregulares (`IP-A04-G06`): quatro questões distintas;
- falsos amigos e conjugação difícil (`IP-A04-G07`): quatro;
- complementos e objetos pleonásticos (`IP-A05-G03`): três;
- regência e pronomes pessoais (`IP-A10-G04`): quatro.

Esses pontos são oportunidades de ampliação de rotação, não bloqueios de produto.

## 3. Princípios pedagógicos e editoriais

### 3.1 Competência antes da questão

Toda questão usada em uma sessão precisa ter uma atribuição semântica aprovada para a competência exata. Pertencer à mesma aula ou unidade não é suficiente.

Uma atribuição informa:

- se a relação é primária ou secundária;
- se o alinhamento é direto ou apenas de apoio;
- em quais papéis a questão pode aparecer: âncora, diagnóstico, transferência ou validação;
- as evidências e o método de revisão que justificam o vínculo.

Somente atribuições explicitamente aprovadas entram no runtime. Ausência, pendência ou bloqueio falham de modo fechado.

### 3.2 Evidência de transferência

Acertar o caso inicial não basta para declarar aprendizagem consolidada. O aluno precisa reaplicar a competência em questões com variação de banca, formulação, complexidade, contexto ou polaridade.

Cada conjunto define sua taxa mínima e a sequência de acertos exigida. Em geral, o fluxo busca dois acertos consecutivos e pode usar itens adicionais, com limite operacional de quatro tentativas de transferência. Em sessão de aquisição, o sucesso produz `transfer_confirmed`: evidência de reaplicação imediata, não de retenção. `retention_confirmed` só pode ser produzido por revisão posterior. Se o critério não for alcançado, o resultado é `needs_review`.

### 3.3 Gabarito e autoria protegidos

- O gabarito vem do payload publicado; a interface apenas converte formatos técnicos para `Certo`, `Errado` ou a letra da alternativa.
- O produto não deduz nem inventa gabaritos ausentes.
- Questões autorais PBL são permitidas apenas como remediação identificada e auditável.
- Questões sem apresentação publicada ou sem resposta interpretável não entram no seletor.

### 3.4 Linguagem voltada ao aluno

Identificadores como `RULE-...`, `RULF-...`, `PROC-...` e `WARN-...` são metadados internos. A interface resolve a referência contra a visão pedagógica da unidade e mostra título e formulação da regra em linguagem natural.

Na etapa final, o antigo rótulo **Regra em foco** foi substituído por **Critério para a próxima questão**. O bloco explica que se trata da orientação que o aluno poderá reaplicar em um item semelhante. Códigos internos nunca devem ser usados como texto pedagógico de fallback.

## 4. Percurso do usuário

```text
Dashboard PBL
    ↓
Escolha da competência e caso inicial
    ↓
Resposta + confiança + raciocínio opcional
    ↓
Feedback diagnóstico
    ├─ evidência suficiente → transferência
    └─ erro/causa incerta → sondagem → microestudo → nova aplicação
                                      ↓
                                transferência
                                      ↓
                  decisão reflexiva sobre o próximo uso
                                      ↓
                      resumo, revisão e próximos passos
```

### 4.1 Dashboard e entrada

O Dashboard apresenta as competências disponíveis, recomenda uma sessão e informa a cobertura. O aluno pode iniciar uma prática recomendada, filtrar o catálogo ou retomar uma sessão pausada.

A sessão recomendada normalmente trabalha uma competência e possui orçamento de até 12 minutos de tempo ativo. A revisão cumulativa pode combinar até duas competências e possui orçamento de até 18 minutos. Atingir o orçamento encerra com segurança e encaminha evidência insuficiente para revisão; duração nunca funciona como evidência de aprendizagem.

### 4.2 Caso inicial

O caso-âncora apresenta uma questão alinhada diretamente à competência. O aluno escolhe a resposta e declara seu grau de confiança. Pode também registrar o raciocínio usado.

A combinação entre correção e confiança é pedagogicamente relevante:

- acerto com confiança alta sugere domínio inicial, ainda sujeito à transferência;
- acerto com confiança baixa pode indicar conhecimento instável;
- erro com confiança alta sugere concepção equivocada consolidada;
- erro com confiança baixa sugere incerteza ou falta de procedimento.

### 4.3 Diagnóstico e sondagem

O motor associa o padrão observado a uma armadilha, uma concepção equivocada ou uma lacuna de pré-requisito. Quando a causa ainda não é segura, uma questão de sondagem discrimina hipóteses concorrentes.

O feedback não deve antecipar mecanicamente o gabarito antes de cumprir sua função diagnóstica. O erro pode ser salvo no Caderno de Erros com a questão, as respostas, a regra decisiva, a sessão de origem e a data da próxima revisão.

### 4.4 Microestudo e nova aplicação

Quando há necessidade de intervenção, a tela apresenta:

- uma explicação curta do erro;
- o critério decisivo em linguagem natural;
- passos operacionais;
- contraste entre a construção correta e o atrator de banca;
- um exemplo resolvido.

Em seguida, o aluno aplica o critério em outra questão. A nova aplicação não repete o caso-âncora.

### 4.5 Transferência

O conjunto progride de contextos próximos para variações mais exigentes. Os tipos previstos incluem transferência isomórfica, próxima, caso-limite, distante e invertida.

O motor encerra a transferência quando o critério de evidência imediata é atingido ou quando o limite de quatro tentativas demonstra que a competência deve ser revisada. Assim, finalizar a sessão, confirmar transferência imediata e demonstrar retenção posterior são resultados distintos.

Para reduzir respostas mecânicas, o seletor consulta o histórico recente de exposição e evita tanto a mesma referência quanto enunciados equivalentes sob identificadores diferentes. Prefere itens auditados e ainda não vistos. Se a rotação não oferecer item fresco, o fallback recente fica explicitamente marcado como evidência não verificada e não deve confirmar transferência ou retenção sozinho.

### 4.6 Decisão reflexiva

A reflexão transforma o desempenho em uma regra de decisão futura. A tela mostra:

1. a evidência do ciclo, por exemplo, **2 de 2 itens de transferência corretos**;
2. o **Critério para a próxima questão**, resolvido da fonte pedagógica;
3. três formas de fechamento.

As opções são:

- **Consigo explicar:** o aluno escreve com as próprias palavras uma ação verificável; são exigidas pelo menos quatro palavras;
- **Usar este critério:** o aluno confirma que a orientação sugerida representa o procedimento que pretende aplicar;
- **Ainda não sei:** a competência é encaminhada para revisão.

A escolha é intencionalmente breve. Ela não pede um resumo abstrato do conteúdo, mas uma decisão operacional para a próxima questão.

### 4.7 Resumo e continuidade

O resumo registra, por competência:

- resultado inicial, pós-intervenção e transferência;
- resultado `transfer_confirmed`, `retention_confirmed` ou `needs_review`;
- decisão reflexiva salva;
- data recomendada para a próxima revisão.

O aluno pode abrir o Caderno de Erros, ir à Revisão Diária ou voltar ao Dashboard PBL.

## 5. Exemplo completo: Fonética e Fonologia

Considere a competência `COMP-A00-G01-01`, que trata da relação entre letras e fonemas, dígrafos e valores fonéticos.

1. **Entrada:** o aluno inicia a sessão recomendada de Fonética e Fonologia.
2. **Caso-âncora:** recebe a questão `OQ-A00-aula00.q0068`, sobre a afirmação de que todas as sequências destacadas em *qualidade*, *perspectiva*, *essas*, *conjunto* e *chamada* seriam dígrafos.
3. **Hipótese:** marca **Certo** com confiança alta.
4. **Diagnóstico:** o gabarito é **Errado**. O sistema identifica a confusão entre dígrafo e encontro consonantal: `rs` em *perspectiva* não representa um único fonema, e `qu` em *qualidade* tem `u` pronunciado.
5. **Registro opcional:** o aluno salva o erro no Caderno. O registro inclui a resposta dada, a oficial, a regra decisiva e a revisão programada.
6. **Microestudo:** a intervenção explica que dígrafo exige duas letras para uma única emissão sonora e contrasta os casos de `qu` com `u` mudo ou pronunciado.
7. **Nova aplicação:** o aluno resolve outro item sem repetir a âncora e aplica o teste sonoro.
8. **Transferência:** o conjunto pode usar, entre outras, as questões `OQ-A00-aula00.q0001` e `OQ-A00-aula00.q0002`, com variação de formulação e banca. O critério deste conjunto é nota mínima de 75% e dois acertos consecutivos.
9. **Reflexão:** após dois acertos, a tela mostra a evidência e uma formulação pedagógica, não o código `RULE-...`. Um fechamento possível em **Consigo explicar** é: *Primeiro verificarei se as duas letras produzem um único som; depois classificarei o grupo.*
10. **Resumo:** a sessão registra transferência imediata se os critérios forem satisfeitos. A retenção só poderá ser confirmada em revisão posterior; se a evidência for insuficiente, a competência fica marcada para revisão, sem apagar o histórico.

## 6. Persistência, pausa e retomada

- O estado é salvo imediatamente no LocalStorage.
- Para usuários autenticados, o Firestore é sincronizado em paralelo.
- Rascunhos da decisão reflexiva são preservados durante a sessão.
- Ao sair, o aluno escolhe entre pausar, encerrar ou continuar estudando.
- Uma sessão pausada aparece no Dashboard e pode ser retomada do mesmo ponto.
- Tempos e tentativas são registrados sem duplicação cumulativa.
- Encontros recentes com questões são registrados por finalidade para evitar reutilização contaminada em nova aplicação e transferência.

## 7. Fontes de verdade

- Manifesto e totais: `public/knowledge/pbl/pbl_manifest.json`.
- Competências: `public/knowledge/pbl/pbl_competency_map.json`.
- Casos-âncora: `public/knowledge/pbl/pbl_cases.json`.
- Transferência: `public/knowledge/pbl/pbl_transfer_sets.json`.
- Diagnóstico: `public/knowledge/pbl/pbl_diagnostic_paths.json`.
- Ligações semânticas: `public/knowledge/pbl/question_competency_links.json`.
- Pedagogia da questão: `public/knowledge/pbl/question_pedagogy_index.json`.
- Questões autorais: `public/knowledge/pbl/pbl_authored_questions.json`.
- Cobertura semântica: `public/knowledge/pbl/pbl_semantic_coverage_report.json`.
- Lacunas reais: `public/knowledge/pbl/pbl_content_gap_report.json`.
- Questões oficiais publicadas: `public/knowledge/official-question-parts/`.
- Regras e apresentações pedagógicas: `public/knowledge/pedagogical/views/`.

## 8. Gates de homologação

Antes de publicar alterações no PBL, executar:

```bash
npm run lint
npm run audit:pbl
npm run audit:pedagogical
npm test -- src/lib/pbl
npm run test:e2e -- tests/e2e/pbl-flow-accessibility.spec.ts
npm run build
```

Os gates devem confirmar, no mínimo:

- integridade referencial entre as 190 competências, casos, caminhos e conjuntos;
- atribuição semântica aprovada para cada uso de questão;
- apresentação e gabarito interpretáveis;
- ausência de competências bloqueadas;
- distinção explícita entre questões oficiais e autorais;
- ausência de IDs técnicos na interface destinada ao aluno;
- funcionamento do percurso de erro, intervenção, nova aplicação, transferência, decisão reflexiva e resumo;
- acessibilidade e ausência de overflow nos tamanhos de tela homologados.

## 9. Critério de atualização deste guia

Atualizar este documento sempre que houver mudança em qualquer um destes pontos:

- estados ou ramificações da sessão;
- critério de domínio ou revisão;
- contrato da reflexão;
- política de atribuição semântica;
- quantidade ou origem das questões;
- persistência e retomada;
- integração com Caderno de Erros e Revisão Diária;
- lacunas de conteúdo ou estado de cobertura.
