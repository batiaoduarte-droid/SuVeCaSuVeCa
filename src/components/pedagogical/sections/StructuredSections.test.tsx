import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SemanticBlockRenderer } from '../blocks/SemanticBlockRenderer';
import { GlossarySection } from './GlossarySection';
import { ResolutionSection } from './ResolutionSection';

describe('projeção pedagógica estruturada v4.2.3', () => {
  it('renderiza relações resolvidas sem expor identificadores técnicos', () => {
    render(<SemanticBlockRenderer block={{
      type: 'entity_relations',
      title: 'Conexões para aprofundar',
      relations: [{
        relation: 'Exemplificado por',
        targetRef: 'WORKED_EXAMPLE-IP-A05-G11-001',
        targetTitle: 'Questão 01: identificação de verbo impessoal',
        targetUnitId: 'IP-A05-G11',
        targetSection: 'examples',
      }],
    }} />);

    expect(screen.getByRole('link', { name: 'Questão 01: identificação de verbo impessoal' })).toHaveAttribute(
      'href',
      '/?unit=IP-A05-G11&section=examples',
    );
    expect(screen.queryByText(/WORKED_EXAMPLE-IP-/)).not.toBeInTheDocument();
  });

  it('não infere um diagrama a partir de parágrafo canônico sem intenção explícita', () => {
    render(<SemanticBlockRenderer
      block={{ type: 'paragraph', text: 'PASSO 1: analisar ├── PASSO 2: testar └── concluir' }}
      allowLegacyDiagramInference={false}
    />);

    expect(screen.getByText(/PASSO 1: analisar/)).toBeInTheDocument();
    expect(screen.queryByText('Esquema Estruturado da Unidade')).not.toBeInTheDocument();
  });

  it('mantém um único procedimento e subordina o detalhe source-backed', () => {
    render(<ResolutionSection procedures={[{
      procedureId: 'PROC-TEST-001',
      title: 'Protocolo único',
      steps: [{ order: 1, action: 'Aplicar o teste decisivo' }],
      blocks: [{ type: 'paragraph', text: 'PASSO 1: detalhe ├── conferir └── concluir' }],
      presentation: {
        status: 'source_backed',
        sourceKind: 'canonical_content_block',
        sourceEntityRefs: ['PROC-TEST-001', 'EXP-PROC-TEST-001'],
        hideGenericScaffold: true,
        renderStrategy: 'hybrid',
        diagramIntent: 'none',
      },
    }]} />);

    expect(screen.getByText('Protocolo único')).toBeInTheDocument();
    expect(screen.getByText('Aplicar o teste decisivo')).toBeInTheDocument();
    expect(screen.getByText('Detalhamento e exemplos do protocolo')).toBeInTheDocument();
    expect(screen.queryByText('Esquema Estruturado da Unidade')).not.toBeInTheDocument();
  });

  it('usa a definição curta no glossário e aponta para a explicação completa', () => {
    render(<GlossarySection items={[{
      term: 'Coesão anafórica',
      shortDefinition: 'Retoma uma informação apresentada anteriormente.',
      detailTarget: { unitId: 'IP-A14-S10', section: 'explanation', groupId: 'g-1' },
    }]} />);

    expect(screen.getByText('Retoma uma informação apresentada anteriormente.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver explicação completa/i })).toHaveAttribute('href', '#IP-A14-S10-explanation');
  });
});
