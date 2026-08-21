import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExplanationSection } from './ExplanationSection';
import { PrerequisitesSection } from './PrerequisitesSection';

describe('completude das seções semânticas', () => {
  it('exibe o objetivo pedagógico de cada grupo de explicação', () => {
    render(<ExplanationSection groups={[{
      groupId: 'group-1',
      title: 'Grupo explicativo',
      pedagogicalGoal: 'Objetivo pedagógico preservado',
      blocks: [{ type: 'paragraph', text: 'Explicação preservada' }],
    }]} />);

    expect(screen.getByText('Objetivo pedagógico preservado')).toBeInTheDocument();
    expect(screen.getByText('Explicação preservada')).toBeInTheDocument();
  });

  it('não descarta itens de pré-requisito sem separador de dois-pontos', () => {
    render(<PrerequisitesSection blocks={[{
      type: 'list',
      ordered: false,
      items: [
        'Conceito: descrição estruturada',
        'Conhecimento essencial sem dois-pontos',
      ],
    }]} />);

    expect(screen.getByText('Conceito')).toBeInTheDocument();
    expect(screen.getByText('descrição estruturada')).toBeInTheDocument();
    expect(screen.getByText('Conhecimento essencial sem dois-pontos')).toBeInTheDocument();
  });
});
