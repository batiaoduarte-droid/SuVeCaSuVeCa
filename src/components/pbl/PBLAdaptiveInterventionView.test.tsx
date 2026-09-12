import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  InterventionPayload,
  PBLAttempt,
  PBLQuestionPresentation,
  PBLSession,
  PBLTutorEpisode,
} from '../../types/pbl';
import { PBLAdaptiveInterventionView } from './PBLAdaptiveInterventionView';

const mockSession: PBLSession = {
  sessionId: 'test-session-1',
  userId: 'user-1',
  mode: 'guided',
  status: 'active',
  startedAt: '2026-09-07T12:00:00.000Z',
  updatedAt: '2026-09-07T12:00:00.000Z',
  targetCompetencyRefs: ['COMP-1'],
  currentCompetencyIndex: 0,
  currentCompetencyRef: 'COMP-1',
  currentCaseRef: 'CASE-1',
  currentQuestionRef: 'Q-1',
  phase: 'tutor',
  currentTransferItemIndex: 0,
  attempts: [],
  masterySnapshot: {},
  conductionMode: 'tutor',
  sessionStats: {
    initialAccuracy: 0,
    postInterventionAccuracy: 0,
    transferRate: 0,
    misconceptionsCaught: 0,
    totalTimeMs: 0,
  },
};

const mockQuestion: PBLQuestionPresentation = {
  questionRef: 'Q-1',
  questionType: 'true_false',
  prompt: 'Em "Vou a Roma dos césares", o acento indicativo de crase é obrigatório.',
  options: [
    { label: 'C', text: 'Certo' },
    { label: 'E', text: 'Errado' },
  ],
  correctAnswer: 'C',
  examBoard: 'CEBRASPE',
  year: 2024,
};

const mockAttempt: PBLAttempt = {
  attemptId: 'att-1',
  sessionId: 'test-session-1',
  questionRef: 'Q-1',
  competencyRef: 'COMP-1',
  userAnswer: 'E',
  correctAnswer: 'C',
  isCorrect: false,
  confidence: 'high',
  stage: 'initial',
  createdAt: '2026-09-07T12:01:00.000Z',
  evaluation: 'high_confidence_error',
  detectedTrapRefs: ['WARN-1'],
  detectedMisconceptionRefs: [],
  interventionRefs: [],
  assistanceLevel: 'none',
  responseTimeMs: 5000,
};

const mockIntervention: InterventionPayload = {
  interventionId: 'INT-1',
  competencyRef: 'COMP-1',
  microLessonText: 'Topônimos modificados por adjunto restritivo passam a admitir artigo definido feminino.',
  ruleTitle: 'Crase com Nomes de Lugar Especificados',
  ruleStatement: 'A regra geral "volta de, crase pra quê" é suspensa se o topônimo vier acompanhado de termo modificador.',
  procedureSteps: ['1. Verifique se o topônimo admite artigo.', '2. Verifique se há termo restritivo.'],
  contrastingPoleA: 'Vou à Roma dos césares (especificada: com crase)',
  contrastingPoleB: 'Vou a Roma (pura: sem crase)',
  structuredSteps: [
    {
      order: 1,
      action: 'Identifique o topônimo e se há especificador',
      explanation: '"dos césares" especifica qual Roma se refere',
      test: 'Substitua por "à linda Roma"',
    },
  ],
  workedExample: {
    stem: 'Julgue: "Retornou a Paris de outrora".',
    stepByStep: ['Paris especificada por "de outrora".', 'Exige artigo definido.'],
    resolution: 'A frase correta com crase é "Retornou à Paris de outrora".',
  },
};

const mockEpisode: PBLTutorEpisode = {
  episodeId: 'ep-1',
  sessionId: 'test-session-1',
  competencyRef: 'COMP-1',
  questionRef: 'Q-1',
  attemptStage: 'initial',
  initialUserAnswer: 'E',
  initialConfidence: 'high',
  assistanceLevel: 'hint',
  startedAt: '2026-09-07T12:01:05.000Z',
  updatedAt: '2026-09-07T12:01:05.000Z',
  turns: [
    {
      turnId: 't-1',
      role: 'tutor',
      content: 'Observe que "Roma" está acompanhada de "dos césares". Isso modifica a aplicação da regra geral.',
      timestamp: '2026-09-07T12:01:06.000Z',
      intent: 'explain_rule',
      continuityRecommendation: 'try_alternative',
      reasoningChips: ['Por que a especificação atrai a crase?', 'Como testar em outra frase?'],
      metacognitiveInsight: 'Você respondeu com segurança, indicando que a regra geral de nomes de cidades obscureceu a exceção.',
      quickCheck: {
        prompt: 'Em "Fui a Bahia de todos os santos", deve haver crase?',
        options: [
          { label: 'A', text: 'Sim, pela especificação' },
          { label: 'B', text: 'Não, nomes de lugar não admitem' },
        ],
        correctOption: 'A',
        explanation: 'A especificação exige artigo e atrai a crase com a preposição "a".',
      },
      notebookDraft: {
        title: 'Crase com Topônimos Especificados',
        triggerCondition: 'Nome de lugar seguido de modificador restritivo',
        decisionRule: 'Ocorre crase quando o topônimo está determinado',
        contrastExample: 'Vou à Roma antiga vs. Vou a Roma',
      },
    },
  ],
  resolved: false,
  totalAiLatencyMs: 1200,
};

describe('PBLAdaptiveInterventionView', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('exibe ancoragem da questão, destaque de resposta do aluno e insight metacognitivo imediato', () => {
    render(
      <PBLAdaptiveInterventionView
        session={mockSession}
        episode={mockEpisode}
        question={mockQuestion}
        intervention={mockIntervention}
        attempt={mockAttempt}
        onConclude={vi.fn()}
      />
    );

    // Destaque de resposta e gabarito
    expect(screen.getByText(/Resposta Incorreta/i)).toBeInTheDocument();
    expect(screen.getByText(/conferir o critério usado com alta confiança/i)).toBeInTheDocument();
    expect(screen.getByText('Sua escolha')).toBeInTheDocument();
    expect(screen.getByText('Gabarito')).toBeInTheDocument();

    // Enunciado da questão ancorado
    expect(screen.getByText(/Em "Vou a Roma dos césares"/i)).toBeInTheDocument();

    // Diagnóstico metacognitivo
    expect(screen.getByText(/Reflexão sobre a tentativa:/i)).toBeInTheDocument();
    expect(screen.getByText(/Você respondeu com segurança/i)).toBeInTheDocument();
  });

  it('permite interação rápida com chips de raciocínio sem necessidade de digitar', async () => {
    const user = userEvent.setup();
    const onRecordTurn = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ pedagogicalText: 'Confira a condição de aplicação.', executionMetadata: {} }) })));

    render(
      <PBLAdaptiveInterventionView
        session={mockSession}
        episode={mockEpisode}
        question={mockQuestion}
        intervention={mockIntervention}
        attempt={mockAttempt}
        onRecordTurn={onRecordTurn}
        onConclude={vi.fn()}
      />
    );

    const chip = screen.getByRole('button', { name: /Por que a especificação atrai a crase\?/i });
    expect(chip).toBeInTheDocument();

    await user.click(chip);
    expect(onRecordTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'student',
        content: 'Por que a especificação atrai a crase?',
      })
    );
  });

  it('permite responder ao micro-desafio (quickCheck) com feedback de compreensão imediata', async () => {
    const user = userEvent.setup();

    render(
      <PBLAdaptiveInterventionView
        session={mockSession}
        episode={mockEpisode}
        question={mockQuestion}
        intervention={mockIntervention}
        attempt={mockAttempt}
        onConclude={vi.fn()}
      />
    );

    expect(screen.getByText(/Checagem de compreensão/i)).toBeInTheDocument();
    const optA = screen.getByRole('button', { name: /Sim, pela especificação/i });
    expect(optA).toBeInTheDocument();

    await user.click(optA);
    expect(screen.getByText(/Excelente!/i)).toBeInTheDocument();
    expect(screen.getByText(/A especificação exige artigo/i)).toBeInTheDocument();
  });

  it('oferece andaimagem cognitiva graduada revelando contraste e procedimento guiado', async () => {
    const user = userEvent.setup();

    render(
      <PBLAdaptiveInterventionView
        session={mockSession}
        episode={mockEpisode}
        question={mockQuestion}
        intervention={mockIntervention}
        attempt={mockAttempt}
        onConclude={vi.fn()}
      />
    );

    expect(screen.getByText('Pista Decisiva')).toBeInTheDocument();
    expect(screen.queryByText(/Compare os dois caminhos/i)).not.toBeInTheDocument();

    const revealBtn = screen.getByRole('button', { name: /ver contraste e procedimento/i });
    await user.click(revealBtn);

    expect(screen.getByText(/Compare os dois caminhos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Vou à Roma dos césares/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Vou a Roma \(pura: sem crase\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Procedimento de resolução guiado/i)).toBeInTheDocument();
  });

  it('permite salvar no Caderno de Erros com um clique', async () => {
    const user = userEvent.setup();
    const onSaveToCaderno = vi.fn();

    render(
      <PBLAdaptiveInterventionView
        session={mockSession}
        episode={mockEpisode}
        question={mockQuestion}
        intervention={mockIntervention}
        attempt={mockAttempt}
        onSaveToCaderno={onSaveToCaderno}
        onConclude={vi.fn()}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Salvar no Meu Caderno/i });
    await user.click(saveBtn);

    expect(onSaveToCaderno).toHaveBeenCalledWith(
      'Crase com Topônimos Especificados',
      'Alternativa marcada: E',
      'Ocorre crase quando o topônimo está determinado',
      expect.objectContaining({
        novoExemplo: 'Vou à Roma antiga vs. Vou a Roma',
        selectedAnswer: 'E',
        correctAnswer: 'C',
      })
    );

    expect(screen.getByText(/Salvo no Caderno/i)).toBeInTheDocument();
  });

  it('aciona transição de percurso ao clicar em nova questão prática', async () => {
    const user = userEvent.setup();
    const onConclude = vi.fn();

    render(
      <PBLAdaptiveInterventionView
        session={mockSession}
        episode={mockEpisode}
        question={mockQuestion}
        intervention={mockIntervention}
        attempt={mockAttempt}
        onConclude={onConclude}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /Nova questão prática/i });
    await user.click(nextBtn);

    expect(onConclude).toHaveBeenCalledWith('try_alternative');
  });
  it('não transforma seleção não submetida em erro nem revela o gabarito', () => {
    render(<PBLAdaptiveInterventionView session={mockSession} episode={{ ...mockEpisode, turns: [{ ...mockEpisode.turns[0], content: 'Como iniciar a análise?', metacognitiveInsight: undefined }] }} question={mockQuestion} intervention={mockIntervention} onConclude={vi.fn()} />);
    expect(screen.getByText('Ainda não respondida')).toBeInTheDocument();
    expect(screen.queryByText(/Resposta Incorreta|Gabarito|Sua escolha/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Checagem de compreensão/)).not.toBeInTheDocument();
    expect(screen.queryByText('Pista Decisiva')).not.toBeInTheDocument();
    expect(screen.queryByText(/Síntese para o Caderno de Erros/)).not.toBeInTheDocument();
  });

  it('exibe dois polos válidos com rótulos neutros e não inventa uma checagem', async () => {
    const user = userEvent.setup();
    const episode = { ...mockEpisode, turns: [{ ...mockEpisode.turns[0], quickCheck: undefined, notebookDraft: undefined }] };
    render(<PBLAdaptiveInterventionView session={mockSession} episode={episode} question={mockQuestion} intervention={{ ...mockIntervention, contrastDecisionCriterion: 'Compare a presença de especificação do topônimo.' }} attempt={mockAttempt} onConclude={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /ver contraste e procedimento/i }));
    expect(screen.getByText('Caso A')).toBeInTheDocument();
    expect(screen.getByText('Caso B')).toBeInTheDocument();
    expect(screen.getByText('Critério de distinção:')).toBeInTheDocument();
    expect(screen.queryByText(/Aplicação correta|Atrator ou erro típico|Checagem de compreensão/)).not.toBeInTheDocument();
  });

  it('renderiza AST por camada e registra ajuda parcial e completa', async () => {
    const user = userEvent.setup();
    const onAssistanceChange = vi.fn();
    const intervention: InterventionPayload = { ...mockIntervention, procedureSteps: [], structuredSteps: [], workedExample: undefined, semanticBlocks: {
      hint: [{ type: 'paragraph', text: 'Pista publicada isolada.' }],
      partial: [{ type: 'paragraph', text: 'Passo publicado para conferir a condição.' }],
      full: [{ type: 'paragraph', text: 'Exemplo completo publicado e fundamentado.' }],
    } };
    const props = { session: mockSession, episode: mockEpisode, question: mockQuestion, intervention, attempt: mockAttempt, onConclude: vi.fn(), onAssistanceChange };
    const { unmount } = render(<PBLAdaptiveInterventionView {...props} />);
    expect(screen.getByText('Pista publicada isolada.')).toBeInTheDocument();
    expect(screen.queryByText('Passo publicado para conferir a condição.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ver contraste e procedimento/i }));
    expect(screen.getByText('Passo publicado para conferir a condição.')).toBeInTheDocument();
    expect(onAssistanceChange).toHaveBeenCalledWith('partial');
    await user.click(screen.getByRole('button', { name: /Ver exemplo resolvido completo/i }));
    expect(screen.getByText('Exemplo completo publicado e fundamentado.')).toBeInTheDocument();
    expect(onAssistanceChange).toHaveBeenCalledWith('full');
    unmount();
    render(<PBLAdaptiveInterventionView {...props} episode={{ ...mockEpisode, assistanceLevel: 'full' }} />);
    expect(screen.getByText('Exemplo completo publicado e fundamentado.')).toBeInTheDocument();
  });

  it('renderiza passos legados e passos do exemplo quando não há AST', async () => {
    const user = userEvent.setup();
    render(<PBLAdaptiveInterventionView session={mockSession} episode={mockEpisode} question={mockQuestion} intervention={{ ...mockIntervention, structuredSteps: undefined }} attempt={mockAttempt} onConclude={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /ver contraste e procedimento/i }));
    expect(screen.getByText(mockIntervention.procedureSteps[0])).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ver exemplo resolvido completo/i }));
    expect(screen.getByText(mockIntervention.workedExample!.stepByStep[0])).toBeInTheDocument();
  });

  it('mantém a checagem entre turnos e associa cada resposta à atividade', async () => {
    const user = userEvent.setup();
    const onQuickCheckAnswer = vi.fn();
    const props = { session: mockSession, episode: mockEpisode, question: mockQuestion, attempt: mockAttempt, onConclude: vi.fn(), onQuickCheckAnswer };
    const { rerender } = render(<PBLAdaptiveInterventionView {...props} />);
    await user.click(screen.getByRole('button', { name: /Sim, pela especificação/ }));
    expect(onQuickCheckAnswer).toHaveBeenCalledWith(expect.any(String), 'A');
    const episode: PBLTutorEpisode = { ...mockEpisode, turns: [...mockEpisode.turns, { turnId: 'student-next', role: 'student', timestamp: mockEpisode.updatedAt, content: 'Como testar?' }] };
    rerender(<PBLAdaptiveInterventionView {...props} episode={episode} />);
    expect(screen.getByRole('button', { name: /Sim, pela especificação/ })).toBeDisabled();
    episode.turns = [...episode.turns, { ...mockEpisode.turns[0], turnId: 'new-check', quickCheck: { ...mockEpisode.turns[0].quickCheck!, prompt: 'Outro caso para analisar', correctOption: 'B' } }];
    rerender(<PBLAdaptiveInterventionView {...props} episode={episode} />);
    expect(screen.getByText('Outro caso para analisar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sim, pela especificação/ })).toBeEnabled();
    expect(screen.queryByText(/Excelente!/)).not.toBeInTheDocument();
  });

  it('usa a classificação do motor para confiança média e acerto frágil', () => {
    const props = { session: mockSession, episode: { ...mockEpisode, turns: [{ ...mockEpisode.turns[0], metacognitiveInsight: undefined }] }, question: mockQuestion, onConclude: vi.fn() };
    const { rerender } = render(<PBLAdaptiveInterventionView {...props} attempt={{ ...mockAttempt, confidence: 'medium' }} />);
    expect(screen.queryByText(/critério usado com alta confiança/)).not.toBeInTheDocument();
    rerender(<PBLAdaptiveInterventionView {...props} attempt={{ ...mockAttempt, confidence: 'low', isCorrect: true }} />);
    expect(screen.getByText(/Acerto frágil/)).toBeInTheDocument();
  });

  it('exibe o nome Professor PBL e desduplica balões de orientação repetidos', () => {
    const duplicateTurnsEpisode: PBLTutorEpisode = {
      ...mockEpisode,
      turns: [
        {
          turnId: 't-1',
          role: 'tutor',
          content: 'Identifique o que o comando pede e qual relação gramatical deve ser examinada.',
          timestamp: '2026-09-07T12:01:06.000Z',
          intent: 'explain_rule',
        },
        {
          turnId: 't-2',
          role: 'tutor',
          content: 'Identifique o que o comando pede e qual relação gramatical deve ser examinada.',
          timestamp: '2026-09-07T12:01:07.000Z',
          intent: 'explain_rule',
        },
      ],
    };

    render(
      <PBLAdaptiveInterventionView
        session={mockSession}
        episode={duplicateTurnsEpisode}
        question={mockQuestion}
        intervention={mockIntervention}
        attempt={mockAttempt}
        onConclude={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /professor pbl/i })).toBeInTheDocument();
    expect(screen.queryByText(/professor suveca/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Orientação do Professor/i)).toHaveLength(1);
    expect(screen.getAllByText(/Identifique o que o comando pede/i)).toHaveLength(1);
  });
});
