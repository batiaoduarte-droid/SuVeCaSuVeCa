import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuestionPresentationContent } from './QuestionPresentationContent';

describe('QuestionPresentationContent', () => {
  it('renderiza texto estruturado e fonte em card separado do comando', () => {
    render(
      <QuestionPresentationContent
        presentation={{
          schemaVersion: '1.0.0',
          supportBlocks: [
            { type: 'paragraph', text: 'Parágrafo principal do texto.' },
            { type: 'source', text: 'Autor. Obra, 2024.' },
          ],
          command: 'Julgue a afirmação.',
          mediaKind: 'none',
          displayMode: 'text_only',
          media: [],
        }}
        supportText="Fallback que não deve aparecer."
        prompt="Comando legado."
      />,
    );

    expect(screen.getByText('Texto de apoio')).toBeVisible();
    expect(screen.getByText('Parágrafo principal do texto.')).toBeVisible();
    expect(screen.getByText('Autor. Obra, 2024.')).toBeVisible();
    expect(screen.getByText('Julgue a afirmação.')).toBeVisible();
    expect(screen.queryByText('Fallback que não deve aparecer.')).not.toBeInTheDocument();
  });

  it('renderiza a mídia visual original antes do comando', () => {
    render(
      <QuestionPresentationContent
        presentation={{
          schemaVersion: '1.0.0',
          supportBlocks: [],
          command: 'Observe a charge e assinale.',
          formattingStatus: 'source_backed',
          mediaKind: 'visual_essential',
          displayMode: 'text_and_image',
          media: [{
            mediaRef: 'QMED-CHARGE',
            url: '/knowledge/question-assets/charge.png',
            role: 'visual_source',
            altText: 'Charge original necessária para responder à questão.',
          }],
        }}
        prompt="Comando legado."
      />,
    );

    expect(screen.getByText('Fonte visual')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Charge original necessária para responder à questão.' }))
      .toHaveAttribute('src', '/knowledge/question-assets/charge.png');
    expect(screen.getByText('Observe a charge e assinale.')).toBeVisible();
  });
});
