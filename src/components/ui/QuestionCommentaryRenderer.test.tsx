import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionCommentaryRenderer } from './QuestionCommentaryRenderer';

describe('QuestionCommentaryRenderer', () => {
  it('renders layered commentary with Layer 1 open by default', () => {
    const sample = `## Comentário regenerado

**Gabarito:** Letra B

### Camada 1 — Resolução da questão

**[O COMANDO]**
A questão cobra acentuação gráfica de proparoxítonas.

**[ANÁLISE DAS ALTERNATIVAS]**
- **A) Incorreta.** *Café* é oxítona.
- **B) Correta.** *Lâmpada* é proparoxítona e todas são acentuadas.

**[CONCLUSÃO]**
Portanto, o gabarito é a **letra B**.

### Camada 2 — Expansão pedagógica

**[REGRA GERAL: PROPAROXÍTONAS]**
Todas as palavras proparoxítonas da língua portuguesa são obrigatoriamente grafadas com acento gráfico.

## Controle editorial
- Preservação semântica: INTEGRAL
`;

    render(<QuestionCommentaryRenderer commentary={sample} />);

    // Layer 1 is visible
    expect(screen.getByText('Resolução da Questão')).toBeInTheDocument();
    expect(screen.getByText(/A questão cobra acentuação/)).toBeInTheDocument();
    expect(screen.getByText('Lâmpada')).toBeInTheDocument();
    expect(screen.getByText(/é proparoxítona e todas são acentuadas/)).toBeInTheDocument();

    // Layer 2 header is visible but content is collapsed
    expect(screen.getByText('Aprofundamento & Expansão Pedagógica')).toBeInTheDocument();
    expect(screen.queryByText(/Todas as palavras proparoxítonas da língua portuguesa são obrigatoriamente grafadas/)).not.toBeInTheDocument();

    // Editorial control is NOT in the document
    expect(screen.queryByText(/Controle editorial/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Preservação semântica/)).not.toBeInTheDocument();
  });

  it('expands Layer 2 when clicking the expansion toggle', () => {
    const sample = `### Camada 1 — Resolução da questão
Resolução direta.

### Camada 2 — Expansão pedagógica
Conteúdo de aprofundamento detalhado.`;

    render(<QuestionCommentaryRenderer commentary={sample} />);

    const toggleButton = screen.getByRole('button', { name: /Aprofundamento & Expansão Pedagógica/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Conteúdo de aprofundamento detalhado.')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Conteúdo de aprofundamento detalhado.')).not.toBeInTheDocument();
  });

  it('gracefully renders legacy non-layered commentary in single card', () => {
    const legacyText = 'Comentário legado direto do especialista sem divisão de camadas.';
    render(<QuestionCommentaryRenderer commentary={legacyText} correctAnswerLabel="Certo" />);

    expect(screen.getByText(legacyText)).toBeInTheDocument();
    expect(screen.getByText(/Gabarito: Certo/)).toBeInTheDocument();
    expect(screen.queryByText('Aprofundamento & Expansão Pedagógica')).not.toBeInTheDocument();
  });

  it('renders fallback message for empty commentary', () => {
    render(<QuestionCommentaryRenderer commentary="" />);
    expect(screen.getByText(/Comentário explicativo não disponível/)).toBeInTheDocument();
  });

  it('renders markdown tables and lists properly', () => {
    const sampleWithTable = `### Camada 1 — Resolução da questão

| Regra | Exemplo |
| --- | --- |
| Oxítona | Pará |
| Paroxítona | Fácil |
`;

    render(<QuestionCommentaryRenderer commentary={sampleWithTable} />);
    expect(screen.getAllByText('Oxítona').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fácil').length).toBeGreaterThan(0);
  });
});
