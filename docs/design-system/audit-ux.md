# Auditoria UI/UX em execução

Data: 2026-09-05. Baseline: HEAD `1cbf855` mais alterações locais preexistentes. Esta é a quarta frente, consolidada pelo agente principal; arquitetura, tokens e componentes foram delegados separadamente. Nenhum React/CSS foi modificado.

## Evidência e cobertura

- Aplicação local real via `npm run dev`, em contexto visitante isolado, sem acionar login, notificações ou serviços de IA.
- 14 ferramentas endereçáveis e 4 unidades representativas, nas larguras 320, 390, 768 e 1440: **72 amostras**, zero erros `pageerror`, zero falhas de navegação coletadas e zero overflow horizontal no documento.
- Axe em 1440 e 390: **36 análises**, 25 sem violações reportadas e **11 com violações**. Não constitui certificação de acessibilidade: foram estados iniciais e amostras de leitura, não todas as sessões, overlays, foco, hover ou dados autenticados.
- 16 capturas de viewport atuais em [evidence](evidence/). Deep links de unidades rolam até a seção; essas capturas mostram a posição de leitura, não necessariamente o topo da página. Screenshots são evidência do estado atual, não telas normalizadas do futuro DS.
- [runtime-audit.json](evidence/runtime-audit.json) contém rotas, larguras, headings, CSS computado, alvos pequenos e exemplos de nós Axe. As listas de alvos e nós são truncadas por amostra; não interpretar seus comprimentos como totais de violações.
- Script de captura: `scratch/design-system-runtime-audit.mjs`. Não faz parte do produto.
- Testes existentes selecionados: `npx playwright test tests/e2e/layout-accessibility.spec.ts --project=desktop-1440 --project=mobile-390 --grep 'questão editorial mantém|menu Mais|atalho de busca|alvos principais|reflow equivalente' --reporter=line --output=scratch/design-system-e2e`: **9 passed, 1 skipped**, 25,4 s. O skip é reflow exclusivo de desktop. Foram confirmados navegação principal com alvos de 44 px, teclado/Escape/restauração na busca e menu Mais, ocultação do gabarito até a tentativa e reflow desktop.
- Chrome DevTools MCP confirmou em `?tool=profile` a pilha de sistema no root/main, zero fontes web em `document.fonts` e nos recursos de rede, e o badge de 10 px com fundo teal600. A inspeção desse contexto não encontrou mensagens console warn/error. Isto não identifica a fonte física usada em cada glifo nem prova ausência de warnings em todas as rotas.
- Não foi executado preflight integral: esta missão é auditoria/design, sem modificação de implementação. Não reutilizamos os resultados históricos de agosto como resultado atual.

## Problemas reproduzidos

| Superfície | Resultado | Consequência para o design system |
| --- | --- | --- |
| Revisão diária, 1440/390 | `color-contrast`: legenda de 10 px, #90A1B9 sobre #FAFBFD, 2,54:1 | Metadados com papel tipográfico mínimo de 12 px e foreground semântico escuro |
| Planejamento, 1440/390 | `color-contrast`: legenda de 10 px, #90A1B9 sobre branco, 2,63:1 | Reutilizar Label/Meta; não usar neutral400 para conteúdo funcional |
| Perfil, 1440/390 | `color-contrast`: badge de 10 px branco sobre #009689, 3,66:1 | Badge sólido com foreground/background verificados; teal600 não é substituto do primary escuro |
| IP-A00-G01, 1440/390 | `aria-prohibited-attr`, `aria-required-parent` | Documentar semântica de ícones decorativos e listas de diagramas; visual por si só não resolve ARIA |
| IP-A00-G06, 1440/390 | `aria-prohibited-attr` em span com aria-label e sem papel válido | Contrato de nome acessível no componente SemanticNode |
| IP-A00-G01 e IP-A10-G06, 390 | `scrollable-region-focusable` | Tabelas/diagramas com rolagem interna precisam de acesso por teclado e instrução contextual |
| Diversas ferramentas | Alvos menores que 44 px fora da navegação principal | Padronizar alvo confortável; não confundir esta recomendação/contrato local com uma reprovação automática WCAG de todo alvo menor |

Exemplos de altura medida em 390: Continuar aula 42 px; Ajustar meta 36 px; Outra dica 35 px; presets Pomodoro 26 px; tabs Planejamento 36 px; atalhos do Perfil 26 px. A navegação principal passa no gate existente, mas isso não prova cobertura de todos os controles.

A amostra A14 síntese passou no Axe atual. A falha histórica em Ve/Pred não foi reproduzida nessa amostra; os riscos de cor identificados por cálculo estático são descritos separadamente em [audit-tokens.md](audit-tokens.md).

## Julgamento visual e de experiência

1. **Identidade deliberada:** canvas claro esverdeado, teal escuro, contorno fino, sombras leves, ícones de traço e cores de categorias. A referência da Apostila confirma a linguagem editorial, com ação Continuar aula facilmente reconhecível.
2. **Hierarquia a melhorar:** no mobile a meta semanal e a dica diária ocupam quase toda a primeira tela após a retomada; o percurso de estudo fica abaixo. Propor visão geral compacta, com continuidade e acesso ao catálogo antes de conteúdo complementar. Não remover a pedagogia para ganhar espaço.
3. **PBL deliberado com autonomia excessiva:** hero indigo e ouro comunica uma experiência de prática, mas controles roxos e largura própria formam um segundo sistema. Preservar indigo como acento de domínio; padronizar controles e estrutura com o produto.
4. **Leitura:** o mobile já reduz invólucros e mantém prosa utilizável; preservar. Desktop A14 tem linhas muito longas e blocos densos. Separar coluna de prosa (aproximadamente 65–76 caracteres) de tabelas/diagramas largos; não alterar texto de origem nem reescrever conteúdo para encaixar.
5. **Orientação duplicada:** alguns estados apresentam título de accordion, cabeçalho de seção e subtítulo com função repetida. Compor uma hierarquia única; o padrão da seção precisa admitir rótulo resumido e conteúdo expandido sem três headers equivalentes.
6. **Feedback e confiança:** representar pergunta sem resposta, seleção, confirmação, correção e comentário como estados distintos. Confiança do aluno e resultado real não compartilham a mesma codificação. Manter gabarito oculto, inclusive nas referências e protótipos.
7. **Descoberta:** preservar grupos Estudar, Praticar, Revisar e Acompanhar, e Mais mobile/desktop. O mapa tem 14 ferramentas; uma nova barra cheia de atalhos agravaria a densidade.
8. **Consistência acessível:** fornecer foco sólido, estados textuais, nomes de ícone, erro junto ao campo, ordem de leitura e alvo de 44–48 px. O Figma documenta o contrato; ARIA, foco e teclado dependem de implementação posterior.

## Limites pendentes

Não foram percorridas todas as 115 views, todos os conteúdos condicionais, jornadas autenticadas, estados de rede falha/offline nem o ciclo PBL completo. Os contratos desses estados foram inspecionados no código e estão na matriz de componentes. A cobertura é integral de inventário de frontend e ampla de superfícies, com runtime representativo; não é exaustiva de combinações de estado.

O arquivo Figma não foi identificado na conversa ou no repositório. Até receber seu link, não é possível inspecionar a fonte visual de destino, comparar bibliotecas ou construir objetos Figma verificáveis.
