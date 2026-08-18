import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from './MarkdownContent';

describe('MarkdownContent pedagógico', () => {
  it('estrutura tabelas, mapas, matemática e questões sem perder o texto', () => {
    render(<MarkdownContent pedagogical content={`# Unidade

## Quadro comparativo

| Conceito | Critério | Exemplo |
| --- | --- | --- |
| Hiato | Vogais em sílabas distintas | sa-ú-de |

## Mapa de Relações

\`\`\`text
PALAVRA
  │
  └──▼ SÍLABA
\`\`\`

## Exemplos comentados

### Questão 01: Hiato (FGV 2024)

- **Enunciado:** Assinale a palavra com hiato.
A) pai
B) saúde
C) mau
- **Resolução e Justificativa:** Em $saúde$, as vogais ficam separadas.
- **Gabarito:** **B**.
`} />);

    expect(screen.getByRole('navigation', { name: /sumário desta unidade/i })).toBeInTheDocument();
    expect(screen.getByText(/deslize para comparar/i)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /versão linear do mapa/i })).toHaveTextContent('PALAVRA');
    const question = screen.getByRole('heading', { name: /questão 01/i }).closest('article')!;
    expect(within(question).getByText('FGV')).toBeInTheDocument();
    expect(within(question).getByText('2024')).toBeInTheDocument();
    expect(within(question).getAllByText('saúde').length).toBeGreaterThan(0);
    expect(document.querySelector('.katex')).toBeInTheDocument();
  });

  it('expande uma subseção pelo sumário', async () => {
    const user = userEvent.setup();
    render(<MarkdownContent pedagogical content={`# Unidade

## Primeira

Conteúdo inicial.

## Segunda

Conteúdo posterior.
`} />);

    const secondDetails = screen.getByText('Conteúdo posterior.').closest('details');
    expect(secondDetails).not.toHaveAttribute('open');
    await user.click(screen.getByRole('button', { name: /segunda/i }));
    expect(secondDetails).toHaveAttribute('open');
  });
});
