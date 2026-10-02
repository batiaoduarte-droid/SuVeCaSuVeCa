import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PBLTransferView } from './pbl/PBLTransferView';
import { RichNoteEditor } from './RichNoteEditor';
import { WorkedExampleCard } from './study-visuals/WorkedExampleCard';
import type { PBLTransferItem } from '../types/pbl';
import { readExampleStudy } from '../lib/exampleStudy';
import { ContentBlockRenderer } from './pedagogical/blocks/ContentBlockRenderer';

describe('Regressões do relato de uso', () => {
  it('separa a tentativa e a revelação por subitem, sem nota de acerto e por usuário', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<WorkedExampleCard userId="aluno-a" unitId="unidade-teste" example={{ title: 'Exemplo em dois itens', exampleId: 'exemplo-teste', practiceItems: [
      { id: 'A', prompt: 'Enunciado A', solutionBlocks: [{ type: 'paragraph', text: 'Resolução A' }] },
      { id: 'B', prompt: 'Enunciado B', solutionBlocks: [{ type: 'paragraph', text: 'Resolução B' }] },
    ] }} renderBlock={block => <ContentBlockRenderer block={block} />} />);
    expect(screen.queryByText('Resolução A')).not.toBeInTheDocument();
    await user.type(screen.getAllByRole('textbox')[0], 'Minha hipótese');
    await user.click(screen.getAllByRole('button', { name: 'Registrar tentativa' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Ver resolução' })[0]);
    expect(screen.getByText('Resolução A')).toBeVisible();
    expect(screen.queryByText('Resolução B')).not.toBeInTheDocument();
    expect(readExampleStudy('aluno-a').map(event => event.kind)).toEqual(['attempt', 'reveal']);
    expect(readExampleStudy('aluno-a')[0].reflection).toBe('Minha hipótese');
    expect(readExampleStudy('aluno-a')[0]).not.toHaveProperty('correct');
    expect(readExampleStudy('aluno-b')).toEqual([]);
    expect(localStorage.getItem('suveca_reading_attempts_v1_aluno-a')).toBeNull();
  });
  it('separa grafia, julgamento e explicação sem inferir a partir de prosa', () => {
    render(<WorkedExampleCard example={{ title: 'Hífen', spellingReview: { proposed: 'contraatacar', judgment: 'incorrect', judgmentLabel: 'ERRADO (E)', corrected: 'contra-atacar', explanation: 'Vogais iguais neste prefixo.' } }} />);
    expect(screen.getByText('contraatacar')).toBeInTheDocument();
    expect(screen.getByText('contra-atacar')).toBeInTheDocument();
    expect(screen.getByText('Grafia apresentada · ERRADO (E)')).toBeInTheDocument();
    expect(screen.getByText('Vogais iguais neste prefixo.')).toBeInTheDocument();
  });
  it('feedback anterior não revela pista; pedir ajuda registra exposição e preserva negrito', async () => {
    const user = userEvent.setup(), reveal = vi.fn();
    const item = { validationStatus: 'audited', cognitiveDelta: 'Comparação específica.', transferType: 'near_transfer' } as PBLTransferItem;
    const question = { questionRef: 'Q1', questionType: 'multiple_choice' as const, prompt: 'Compare os termos.', options: [{ label: 'A', text: 'Termo em destaque' }], correctAnswer: 'A', presentation: { command: 'Compare os termos.', supportBlocks: [], optionRichText: { A: '**Termo** em destaque' } } };
    render(<PBLTransferView question={question as any} transferItem={item} feedbackMessage="Próximo item." selectedAnswer="" onSelectAnswer={vi.fn()} onRevealHint={reveal} />);
    expect(screen.queryByText('Comparação específica.')).not.toBeInTheDocument();
    expect(screen.getByText('Termo').tagName).toBe('STRONG');
    await user.click(screen.getByRole('button', { name: /Pedir pista/ }));
    expect(screen.getByText(/Comparação específica/)).toBeInTheDocument();
    expect(reveal).toHaveBeenCalledOnce();
  });

  it('posiciona o cursor fora da etiqueta de anotação', () => {
    render(<RichNoteEditor value="" onChange={vi.fn()} ariaLabel="Anotação de teste" />);
    const editor = screen.getByRole('textbox', { name: 'Anotação de teste' });
    editor.focus();
    const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    fireEvent.click(screen.getByRole('button', { name: /Regra/i }));
    expect(selection.anchorNode?.nodeType).toBe(Node.TEXT_NODE);
    expect(selection.anchorNode?.parentNode).toBe(editor);
    expect(editor.querySelector('span')).not.toBeNull();
  });
});
