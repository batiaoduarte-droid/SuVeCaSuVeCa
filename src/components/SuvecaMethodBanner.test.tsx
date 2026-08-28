import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModuleData } from '../types/suveca';
import { SuvecaMethodBanner } from './SuvecaMethodBanner';

const moduleData: ModuleData = {
  id: 'mod4',
  num: 4,
  title: 'Verbos I',
  subtitle: 'Tempos, modos e formas verbais',
  description: 'Estudo dos verbos.',
  sections: [],
  suvecaMethod: {
    methodId: 'suveca-analysis-map-v1',
    equation: 'Sujeito + Verbo + Complemento + Adjunto + Predicativo',
    definition: 'A SuVeCA é um mapa de análise, não um molde obrigatório.',
    authorityNote: 'O método organiza a aplicação, mas não cria regras gramaticais.',
    level: 'strong',
    label: 'Verbo como âncora',
    summary: 'O verbo organiza a predicação e o período.',
    steps: [],
    limits: [],
  },
};

describe('SuvecaMethodBanner', () => {
  it('prioriza a conexão da aula e recolhe a explicação geral', () => {
    const onOpenAnalyzer = vi.fn();
    const { container } = render(
      <SuvecaMethodBanner module={moduleData} onOpenAnalyzer={onOpenAnalyzer} />,
    );

    expect(screen.getByRole('heading', { name: 'SuVeCA nesta aula' })).toBeInTheDocument();
    expect(screen.getByText(moduleData.suvecaMethod!.summary)).toBeInTheDocument();
    expect(screen.queryByText(/Mapa de Análise do Aplicativo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Conexão SuVeCA com esta aula/i)).not.toBeInTheDocument();
    expect(container.querySelector('details')).not.toHaveAttribute('open');

    fireEvent.click(screen.getByRole('button', { name: /aplicar no analisador/i }));
    expect(onOpenAnalyzer).toHaveBeenCalledOnce();
  });

  it('apresenta o funcionamento expandido no módulo introdutório', () => {
    const { container } = render(
      <SuvecaMethodBanner module={{ ...moduleData, id: 'mod-intro' }} />,
    );

    expect(container.querySelector('details')).toHaveAttribute('open');
    expect(screen.getByText(/Limite do método:/i)).toBeInTheDocument();
  });
});
