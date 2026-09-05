# Entrega Figma · SuVeCA

Mini design system v1 concluído em 2026-09-05 após consolidação das quatro auditorias. [Abrir decisões e inventário no Figma](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=38-2).

## Navegação

| Área | Link |
| --- | --- |
| Foundations: Color, Typography, Spacing, Radius, Shadows | [Foundations](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=8-2) |
| Components: páginas 02–10 | [Actions, início da biblioteca](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=8-3) |
| Patterns e checkpoints de reflow | [Patterns](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=8-12) |
| Capturas factuais do frontend | [Reference · Current](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=8-13) |
| Composições editáveis propostas | [Reference · Proposed](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=8-14) |

## Telas propostas

| Tela | Desktop 1440 | Mobile 390 |
| --- | --- | --- |
| Apostila | [Abrir](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=23-205) | [Abrir](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=23-381) |
| Leitura | [Abrir](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=24-458) | [Abrir](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=24-644) |
| PBL | [Abrir](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=25-574) | [Abrir](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=25-779) |
| Questões editoriais | [Abrir](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=26-940) | [Abrir](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=26-1150) |

São amostras de composição com conteúdo publicado, não reprodução integral das aulas. A Apostila proposta seleciona Ortografia e fonologia, enquanto a captura factual mostra o módulo introdutório. Proveniência em [reference-content.json](reference-content.json). A14 e flashcard usam também os trechos literais registrados no passo [49](figma-run/49-review-patterns.json), a partir de `public/knowledge/pedagogical/views/IP-A14-S01.json` e do primeiro item de `src/data/editorialFlashcards.generated.ts`. A questão inicial permanece sem gabarito.

## Inventário verificado

- 14 páginas; 129 variables: 44 primitivas de cor, 56 aliases semânticos e 29 dimensões.
- 12 text styles: Inter, Roboto Mono e Lora; 3 effect styles.
- 24 component sets com 146 variantes; 16 componentes independentes, sendo 15 ícones Lucide e BottomNavigation.
- 671 instâncias vinculadas, incluindo ícones aninhados.
- 8 telas propostas, 8 checkpoints adicionais em 320/768 e 16 capturas atuais.
- Patterns de shell/foco, tentativa, fluxo PBL, revisão cumulativa, flashcards, busca, resultado vazio e timer persistente.

Os masters e as composições usam Auto Layout e propriedades de texto, boolean ou troca de instância conforme a família. Instâncias de uma mesma família compartilham propriedades: altere conteúdo pelos overrides da instância. Dimensões proporcionais de progresso e colunas de comparação respondem à largura.

## Validação

A auditoria frontend cobriu 117 TSX de implementação e 72 combinações de 18 telas × 4 larguras. Não houve overflow do documento nas amostras. Foram executadas 36 verificações Axe, com falhas em 11 amostras; 9 testes existentes de interação passaram e 1 teve skip previsto. Consulte [audit-ux.md](audit-ux.md) para o alcance real.

No Figma foram conferidos aliases, scopes, WEB syntax, variantes, propriedades, vínculos das instâncias, geometria e capturas. Não há alias inválido, instância sem componente, sobreposição entre roots ou overflow horizontal nos frames verificados. Os 25 pares semânticos avaliados têm contraste entre 4,63:1 e 14,68:1. Isso não certifica acessibilidade de todas as combinações possíveis.

Evidências: [tokens](figma-run/57-token-inventory.json), [contraste](figma-run/59-contrast-qa.json), [bounds finais](figma-run/68-final-bounds.json) e [correção do chevron identificada nesses bounds](figma-run/69-expanded-chevron-bounds.json). Os arquivos `58-qa-page-*.json` registram a auditoria das 14 páginas. Capturas finais estão em [evidence](evidence/).

## Decisões e limites para implementação

Preservar teal, canvas editorial, semântica pedagógica/sintática e recuperação ativa. Consolidar controles, estados, spacing, radius e elevação. Propor Inter explicitamente: o frontend observado usa a pilha de sistema. Georgia não estava disponível no Figma; Lora foi escolhida e documentada como substituição para exemplos.

O arquivo é uma biblioteca local organizada, sem publicação global. As referências mostram conteúdo completo do recorte escolhido; navegação fixa, safe area, foco, teclado, ARIA, persistência e media queries são contratos documentados, não um protótipo funcional integral. O contorno nativo representa foco; offset CSS de 2 px permanece especificado para React. A manchete da capa usa 56 px como exceção editorial fora dos 12 estilos de produto.

Nenhum React, CSS, corpus, gabarito, persistência ou linhagem foi alterado nesta missão. Alterações locais preexistentes foram preservadas. A implementação posterior deve aplicar as decisões sem suprimir conteúdo e validar novamente os fluxos reais.

[Decisões detalhadas](decisions.md) · [Auditoria consolidada](README.md) · [IDs e estado final](figma-state.json)
