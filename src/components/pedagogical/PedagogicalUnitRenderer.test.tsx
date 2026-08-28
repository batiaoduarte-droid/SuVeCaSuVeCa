import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { PedagogicalUnitRenderer } from './PedagogicalUnitRenderer';
import type { PedagogicalUnitView } from '../../types/pedagogicalView';

const sampleUnitView: PedagogicalUnitView = {
  viewSchemaVersion: '1.0.0',
  source: {
    unitId: 'IP-A00-G01',
    canonicalSchemaVersion: '2.0.0',
    buildId: 'v2-test',
    generatedAt: '2026-08-18T18:00:00Z',
  },
  unit: {
    unitId: 'IP-A00-G01',
    lessonId: 'A00',
    groupId: 'G01',
    title: 'Fonética e Fonologia Estrutural',
    variant: 'standard',
    canonicalTopicId: 'fonetica',
    learningObjectives: ['Distinguir fonemas e grafemas', 'Calcular número de letras e fonemas'],
  },
  sections: {
    suveca: {
      level: 'outside_core',
      label: 'Camada Fonética Própria',
      summary: 'Fonemas e grafemas operam na camada fonológica autônoma.',
      steps: ['Identifique o número de grafemas (L).', 'Subtraia os dígrafos (D).'],
      limits: ['A SuVeCA não altera a contagem de fonemas.'],
      decisiveTests: ['F = L - D'],
    },
    rules: {
      items: [
        {
          entityId: 'RULE-01',
          title: 'Regra do Dígrafo Consonantal',
          blocks: [
            { type: 'paragraph', text: 'Cada dígrafo consonantal reduz exatamente 1 fonema.' },
            { type: 'formula', text: 'F = L - 1' },
          ],
        },
      ],
    },
    resolution: {
      procedures: [
        {
          procedureId: 'PROC-01',
          title: 'Algoritmo de Contagem de Fonemas',
          objective: 'Determinar a fórmula exata da palavra',
          blocks: [
            {
              type: 'list',
              ordered: true,
              items: ['Contar as letras (L)', 'Identificar dígrafos (D)', 'Aplicar F = L - D'],
            },
          ],
        },
      ],
    },
    traps: {
      items: [
        {
          trapId: 'TRAP-01',
          title: 'Dígrafo em GU e QU',
          errorPattern: 'Achar que toda ocorrência de GU/QU forma dígrafo.',
          correctiveRule: 'Só há dígrafo quando o U for mudo.',
          blocks: [],
        },
      ],
    },
    glossary: {
      blocks: [
        {
          type: 'list',
          ordered: false,
          items: ['Fonema: Menor unidade sonora distintiva.', 'Dígrafo: Duas letras representando um único som.'],
        },
      ],
    },
    recall: {
      blocks: [
        {
          type: 'list',
          ordered: false,
          items: ['Sei calcular F = L - D', 'Identifico dígrafos consonantais e vocálicos'],
        },
      ],
    },
  },
  officialQuestions: [
    {
      questionId: 'Q-01',
      questionType: 'multiple_choice',
      examBoard: 'FGV',
      organization: 'TJ-SP',
      year: 2024,
      prompt: 'Assinale a opção com dígrafo consonantal.',
      options: [
        { label: 'a', text: 'Prato' },
        { label: 'b', text: 'Chuva' },
      ],
      officialAnswer: 'B',
      explanation: 'Em "Chuva", CH é dígrafo.',
    },
  ],
};

const sampleSyntacticUnitView: PedagogicalUnitView = {
  viewSchemaVersion: '1.0.0',
  source: {
    unitId: 'IP-A05-G01',
    canonicalSchemaVersion: '2.0.0',
    buildId: 'v2-test',
    generatedAt: '2026-08-18T18:00:00Z',
  },
  unit: {
    unitId: 'IP-A05-G01',
    lessonId: 'A05',
    groupId: 'G01',
    title: 'Transitividade Verbal e Valência',
    variant: 'standard',
    canonicalTopicId: 'transitividade',
    methodologyLevel: 'central',
    learningObjectives: ['Classificar verbos quanto à predicação'],
  },
  sections: {
    suveca: {
      level: 'central',
      label: 'Análise de Valência na Oração',
      summary: 'A transitividade define os blocos Ve e C na SuVeCA.',
      steps: ['Localize o verbo', 'Identifique os complementos'],
      limits: ['A transitividade depende do contexto'],
      decisiveTests: ['Quem entrega, entrega algo a alguém'],
    },
  },
};

describe('PedagogicalUnitRenderer (View Model V1)', () => {
  beforeEach(() => localStorage.clear());

  it('omite a seção SuVeCA em unidades com nível outside_core e inicia pelas regras/prerequisitos', () => {
    render(<PedagogicalUnitRenderer view={sampleUnitView} />);

    expect(screen.getByRole('heading', { level: 1, name: /fonética e fonologia estrutural/i })).toBeInTheDocument();
    expect(screen.getByText(/distinguir fonemas e grafemas/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /sumário da unidade/i })).toBeInTheDocument();

    // A seção SuVeCA sintática NÃO deve ser renderizada em unidades outside_core
    expect(screen.queryByText(/camada fonética própria/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/conexão com o método suveca/i)).not.toBeInTheDocument();

    // As demais seções continuam normalmente
    expect(screen.getByText(/regra do dígrafo consonantal/i)).toBeInTheDocument();
  });

  it('renderiza a seção SuVeCA em unidades com nível central ou strong', () => {
    render(<PedagogicalUnitRenderer view={sampleSyntacticUnitView} />);

    expect(screen.getByRole('heading', { level: 1, name: /transitividade verbal e valência/i })).toBeInTheDocument();
    expect(screen.getAllByText((_content, element) => element?.textContent?.includes('Conexão com o método SuVeCA') ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText(/análise de valência na oração/i)).toBeInTheDocument();
    expect(screen.getByText(/localize o verbo/i)).toBeInTheDocument();
  });

  it('permite interagir com checklist de recuperação ativa e atualizar progresso', async () => {
    const user = userEvent.setup();
    render(<PedagogicalUnitRenderer view={sampleUnitView} />);

    // Clica para expandir todas as seções
    const expandAllButton = screen.getByRole('button', { name: /expandir todas/i });
    await user.click(expandAllButton);

    expect(screen.getByText(/0 de 2 recuperados/i)).toBeInTheDocument();

    const check1 = screen.getByRole('button', { name: /sei calcular f = l - d/i });
    await user.click(check1);
    await user.click(screen.getAllByRole('button', { name: /recuperei/i })[0]);
    expect(screen.getByText(/1 de 2 recuperados \(50%\)/i)).toBeInTheDocument();
  });

  it('renderiza questões oficiais estruturadas com banca e ano', () => {
    render(<PedagogicalUnitRenderer view={sampleUnitView} />);

    expect(screen.getByText(/questões oficiais de prova/i)).toBeInTheDocument();
    expect(screen.getByText('FGV')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText(/assinale a opção com dígrafo/i)).toBeInTheDocument();
  });
});
