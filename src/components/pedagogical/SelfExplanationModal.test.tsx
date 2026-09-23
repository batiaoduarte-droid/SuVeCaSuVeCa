import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelfExplanationModal } from './SelfExplanationModal';
import { LiveAudioClient } from '../../lib/audio/liveAudioClient';

describe('SelfExplanationModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('encerra a conversa em andamento ao trocar de conta com o modal aberto', async () => {
    const start = vi.spyOn(LiveAudioClient.prototype, 'start').mockResolvedValue(undefined);
    const stop = vi.spyOn(LiveAudioClient.prototype, 'stop').mockImplementation(() => {});
    const props = { isOpen: true, onClose: vi.fn(), topicTitle: 'Regência', sourceType: 'module_section' as const, sourceId: 'IP-A00-G01' };
    const view = render(<SelfExplanationModal {...props} userId="alice" />);
    await userEvent.click(screen.getByRole('tab', { name: /live duplex/i }));
    await userEvent.click(screen.getByRole('button', { name: /iniciar sabatina oral/i }));
    expect(start).toHaveBeenCalledOnce();
    view.rerender(<SelfExplanationModal {...props} userId="bob" />);
    expect(stop).toHaveBeenCalledOnce();
  });

  it('não renderiza nada quando isOpen é false', () => {
    render(
      <SelfExplanationModal
        isOpen={false}
        onClose={vi.fn()}
        topicTitle="Crase antes de nomes femininos"
        sourceType="module_section"
        sourceId="IP-A00-G01"
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renderiza título e abas de modo quando isOpen é true', () => {
    render(
      <SelfExplanationModal
        isOpen={true}
        onClose={vi.fn()}
        topicTitle="Regência do verbo visar"
        targetRuleContext="Exige preposição 'a' no sentido de almejar"
        sourceType="module_section"
        sourceId="IP-A00-G01"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Método Feynman · Autoexplicação Ativa/i)).toBeInTheDocument();
    expect(screen.getByText('Regência do verbo visar')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /texto escrito/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /gravar áudio/i })).toBeInTheDocument();
  });

  it('avalia explicação por texto e exibe diagnóstico cognitivo', async () => {
    const user = userEvent.setup();
    const mockDiagnosis = {
      masteryScore: 88,
      conceptualAccuracy: 'alta',
      strengths: ['Explicou corretamente a regência indireta do verbo visar'],
      conceptualGaps: ['Faltou citar o sentido direto de apontar arma'],
      bancaTrapAddressed: true,
      bancaFeedback: 'Excelente fundamentação gramatical. Você neutralizou a armadilha.',
      suggestedFlashcard: {
        front: 'Qual é a regência do verbo visar no sentido de almejar?',
        back: 'Transitivo indireto com preposição a.',
        explanation: 'No sentido de ter como meta, exige a preposição a.',
        sourceRefs: ['EDITORIAL:01'],
      },
      sourceRefs: ['EDITORIAL:01'],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockDiagnosis,
    } as any);

    const onSaveToCaderno = vi.fn();

    render(
      <SelfExplanationModal
        isOpen={true}
        onClose={vi.fn()}
        topicTitle="Regência do verbo visar"
        sourceType="module_section"
        sourceId="IP-A00-G01"
        onSaveToCaderno={onSaveToCaderno}
      />
    );

    const textarea = screen.getByLabelText(/sua explicação espontânea/i);
    await user.type(
      textarea,
      'O verbo visar no sentido de ter como meta exige preposição A obrigatoriamente.'
    );

    const submitBtn = screen.getByRole('button', { name: /avaliar com método feynman/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('88%')).toBeInTheDocument();
      expect(screen.getByText(/Retenção Sólida & Compreensão Real/i)).toBeInTheDocument();
      expect(screen.getByText(/Explicou corretamente a regência indireta/i)).toBeInTheDocument();
      expect(screen.getByText(/Pegadinha da banca identificada/i)).toBeInTheDocument();
    });

    // Salvar no Caderno de Erros
    const saveBtn = screen.getByRole('button', { name: /salvar lacuna no caderno de erros/i });
    await user.click(saveBtn);

    expect(onSaveToCaderno).toHaveBeenCalledWith(
      'Regência do verbo visar',
      'Faltou citar o sentido direto de apontar arma',
      'Transitivo indireto com preposição a.',
      expect.objectContaining({
        origin: 'feynman',
      })
    );
  });
});
