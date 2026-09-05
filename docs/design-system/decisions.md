# Decisões do mini design system SuVeCA

Data: 2026-09-05. Destino: [Figma SuVeCa](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=38-2). Design system concluído; [entrega e validação](delivery.md). A proposta visual deriva das quatro auditorias em [README.md](README.md); não altera a implementação React nem o conteúdo publicado.

## Deliberado — preservar

- Identidade editorial clara: canvas #F6F7F3, branco, teal #115E59, contornos suaves e elevação discreta.
- Gramática pedagógica com dez tons e cinco papéis SuVeCA. Cor acompanha rótulos; a ordem visual deve respeitar a oração real. Feedback operacional, pedagogia e sintaxe mantêm nomes semânticos independentes.
- Navegação inferior no mobile, menu Mais agrupado, modos de foco, continuidade de estudo e Pomodoro persistente.
- Leitura com poucos invólucros no celular; tabelas e diagramas mantêm relações semânticas. A14 continua sendo revisão cumulativa com contrato próprio.
- Gabarito apenas após tentativa. Seleção, confiança, correção e conteúdo indisponível são estados distintos.

## Legado ou inconsistência — consolidar

| Achado atual | Decisão no Figma |
| --- | --- |
| Inter declarada, mas a pilha de sistema prevalece no runtime; nenhuma fonte web observada | Inter explicitamente proposta para a UI. Roboto Mono para notação e Lora para exemplos. Georgia estava indisponível no Figma; a substituição por Lora está documentada |
| Metadados de 10/11 px e pares de baixo contraste | Papéis funcionais a partir de 12 px; muted #526277, foco sólido #0F766E e acento textual #92400E |
| Cores, controles e largura próprios no PBL | Indigo permanece como acento de prática; teal e componentes comuns organizam as ações globais |
| Radius, shadows e controles variam entre famílias | Escala de dimensões e três estilos de elevação; variantes de estado e densidade com propriedades editáveis |
| Primitives genéricos existentes sem consumidores e overlays implementados localmente | Biblioteca baseada em usos reais e padrões de composição; nomes novos são arquitetura proposta, não componentes React já adotados |

## Oportunidade — proposta explícita

Organizar variáveis em Primitives, Color e Dimensions, com aliases por função e modo Light. Vincular cores e dimensões aos componentes; usar Auto Layout, texto editável, instâncias e variantes para compor telas. Não há evidência suficiente de um tema escuro operacional para acrescentá-lo à primeira versão.

Priorizar retomada e catálogo na visão geral mobile. Separar a coluna de prosa da superfície de dados no desktop e separar a densidade de visão geral da leitura profunda no celular. Margens de 32 px no desktop e 16 px no overview mobile são propostas; o shell atual usa gutter fluido e chega a 6 px no mobile. O breakpoint de navegação de 1024 px é preservado como referência do código. Referências em 390/1440 e checkpoints em 320/768 foram verificados no Figma, sem overflow horizontal. Auto Layout no Figma não implementa media queries no React; a implementação precisará de sua própria validação.

## Conteúdo e limites

[Reference · Current](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=8-13) contém capturas factuais. [Reference · Proposed](https://www.figma.com/design/TlfDzny2Ozpg7lJ6NEXMvj/SuVeCa?node-id=8-14) é a composição normalizada. A proposta de Apostila usa o módulo real Ortografia e fonologia, diferente do módulo selecionado na captura atual. [reference-content.json](reference-content.json) registra essa diferença e a proveniência de títulos, textos, métricas e questão. Os trechos de leitura são amostras; não substituem a unidade completa. Exemplos de estados nos componentes são demonstrativos e não estabelecem respostas oficiais.

O Figma é a referência da arquitetura visual proposta. O frontend continua sendo a evidência do comportamento atual, e os artefatos publicados continuam sendo a fonte do conteúdo. A validação de tokens não constitui certificação de acessibilidade: as falhas de contraste, ARIA e rolagem focável observadas na auditoria React permanecem para a etapa de implementação. Nenhuma alteração de linhagem, persistência, corpus, gabarito ou contrato pedagógico decorre desta entrega.
