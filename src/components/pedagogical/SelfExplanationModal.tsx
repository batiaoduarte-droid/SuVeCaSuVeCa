import { TTSPlayer } from '../../lib/audio/ttsService';
import { LiveAudioClient } from '../../lib/audio/liveAudioClient';
import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Mic,
  Square,
  Send,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  BookmarkPlus,
  LoaderCircle,
  FileText,
  Radio,
  Award,
} from 'lucide-react';
import type {
  ExplanationMode,
  FeynmanDiagnosis,
  FeynmanEvaluationRequest,
} from '../../types/feynman';
import type { CadernoErroItem } from '../../types/suveca';
import { auth, getCurrentUserToken } from '../../lib/firebase';

export interface SelfExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  targetRuleContext?: string;
  sourceType: 'module_section' | 'pbl_case';
  sourceId: string;
  userId?: string;
  onSaveToCaderno?: (
    conteudo: string,
    erroCometido: string,
    regraDecisiva: string,
    metadata?: Partial<CadernoErroItem>
  ) => void;
}

export const SelfExplanationModal: React.FC<SelfExplanationModalProps> = ({
  isOpen,
  onClose,
  topicTitle,
  targetRuleContext,
  sourceType,
  sourceId,
  userId,
  onSaveToCaderno,
}) => {
  const [mode, setMode] = useState<ExplanationMode>('text');
  const [userText, setUserText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [diagnosis, setDiagnosis] = useState<FeynmanDiagnosis | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Live Duplex Voice states
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'speaking' | 'error'>('idle');
  const [liveTranscript, setLiveTranscript] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([]);
  const liveClientRef = useRef<LiveAudioClient | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const stopLiveSession = () => { liveClientRef.current?.stop(); liveClientRef.current = null; };
  const startLiveSession = async () => {
    stopLiveSession();
    setErrorMessage(''); setLiveTranscript([]);
    const client = new LiveAudioClient({
      onStatus: setLiveStatus,
      onText: text => setLiveTranscript(previous => [...previous, { sender: 'bot', text }]),
      onError: setErrorMessage,
    });
    liveClientRef.current = client;
    await client.start(`Gostaria de explicar o tópico: ${topicTitle}. Contexto publicado: ${targetRuleContext || 'Faça perguntas sobre meu raciocínio e explicite limites quando faltar contexto.'}`);
  };
  useEffect(() => {
    if (!isOpen || mode !== 'live_voice') stopLiveSession();
    return () => stopLiveSession();
  }, [isOpen, mode, userId, sourceId, topicTitle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setUserText('');
      stopRecordingCleanup();
      setDiagnosis(null);
      setErrorMessage('');
      setIsSaved(false);
    }
  }, [isOpen]);

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleStartRecording = async () => {
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(fullBlob);
        setAudioUrl(URL.createObjectURL(fullBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 90) {
            handleStopRecording();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(
        'Não foi possível acessar o microfone. Verifique as permissões do seu navegador.'
      );
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmitEvaluation = async () => {
    setErrorMessage('');
    setLoading(true);

    try {
      let audioBase64: string | undefined = undefined;
      let audioMimeType: string | undefined = undefined;

      if (mode === 'audio_batch') {
        if (!audioBlob) {
          setErrorMessage('Grave um áudio antes de enviar para avaliação.');
          setLoading(false);
          return;
        }
        audioBase64 = await blobToBase64(audioBlob);
        audioMimeType = audioBlob.type;
      } else if (mode === 'text') {
        if (!userText.trim() || userText.trim().split(/\s+/).length < 4) {
          setErrorMessage('Por favor, digite uma explicação com pelo menos algumas frases completas.');
          setLoading(false);
          return;
        }
      }

      const token = await getCurrentUserToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload: FeynmanEvaluationRequest = {
        userId,
        sourceType,
        sourceId,
        topicTitle,
        targetRuleContext,
        mode,
        userText: mode === 'text' ? userText : undefined,
        audioBase64,
        audioMimeType,
      };

      const res = await fetch('/api/pedagogy/evaluate-explanation', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status} ao avaliar explicação.`);
      }

      const result: FeynmanDiagnosis = await res.json();
      setDiagnosis(result);

      if (result.conceptualAccuracy === 'alta' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('suveca:feynman-high-accuracy'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro ao processar a avaliação pedagógica.');
    } finally {
      setLoading(false);
    }
  };

  const [isSpeakingFeedback, setIsSpeakingFeedback] = useState(false);
  const feedbackPlayer = useRef<TTSPlayer | null>(null);
  if (!feedbackPlayer.current) feedbackPlayer.current = new TTSPlayer();
  useEffect(() => () => feedbackPlayer.current?.stop(), []);
  useEffect(() => { feedbackPlayer.current?.stop(); setIsSpeakingFeedback(false); }, [isOpen, mode, userId]);
  const handleToggleSpeech = (text: string) => {
    if (isSpeakingFeedback) { feedbackPlayer.current?.stop(); setIsSpeakingFeedback(false); return; }
    setIsSpeakingFeedback(true);
    void feedbackPlayer.current!.speak(text, { onEnd: () => setIsSpeakingFeedback(false) });
  };

  const handleExportMarkdown = () => {
    if (!diagnosis) return;

    const lines = [
      `# Diagnóstico Feynman: ${topicTitle}`,
      `*Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}*`,
      `*Precisão Conceitual: ${diagnosis.conceptualAccuracy.toUpperCase()}*`,
      `*Pegadinha da Banca Abordada: ${diagnosis.bancaTrapAddressed ? 'SIM' : 'NÃO'}*`,
      '',
      '## 🟢 Pontos Fortes Dominados',
      ...(diagnosis.strengths.length > 0
        ? diagnosis.strengths.map((s) => `- ${s}`)
        : ['- Nenhum critério formal consolidado evidente.']),
      '',
      '## ⚠️ Pontos Cegos e Omissões Detectadas',
      ...(diagnosis.conceptualGaps.length > 0
        ? diagnosis.conceptualGaps.map((g) => `- ${g}`)
        : ['- Nenhuma lacuna crítica detectada.']),
      '',
      '## 🧑‍🏫 Parecer do Tutor SuVeCA',
      diagnosis.bancaFeedback,
      '',
    ];

    if (diagnosis.suggestedFlashcard) {
      lines.push(
        '## 🗂️ Flashcard de Reforço Sugerido (SM-2)',
        `**Frente:** ${diagnosis.suggestedFlashcard.front}`,
        `**Verso:** ${diagnosis.suggestedFlashcard.back}`,
        ''
      );
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Feynman_${topicTitle.replace(/[^\w\d-_]/g, '_')}_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveFlashcardToCaderno = () => {
    if (!diagnosis || !onSaveToCaderno) return;

    const gapText =
      diagnosis.conceptualGaps.length > 0
        ? diagnosis.conceptualGaps.join('; ')
        : 'Autoexplicação do Método Feynman';

    const cardRule =
      diagnosis.suggestedFlashcard?.back ||
      diagnosis.bancaFeedback ||
      'Regra revisada no teste ativo';

    onSaveToCaderno(
      topicTitle,
      gapText,
      cardRule,
      {
        origin: 'feynman',
        novoExemplo: diagnosis.suggestedFlashcard?.front || undefined,
        sourceRefs: diagnosis.sourceRefs,
      }
    );

    setIsSaved(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feynman-modal-title"
    >
      <div
        ref={modalRef}
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-teal-900 to-teal-800 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-teal-100 shadow-xs">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="feynman-modal-title" className="text-base font-bold tracking-tight text-white m-0">
                  Método Feynman · Autoexplicação Ativa
                </h2>
                <span className="rounded-full bg-teal-700/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-200">
                  Recuperação Ativa
                </span>
              </div>
              <p className="text-xs text-teal-200/90 font-medium m-0 truncate max-w-md">
                {topicTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-teal-200 hover:bg-teal-700/50 hover:text-white transition cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {!diagnosis ? (
            <>
              {/* Context Guidance Box */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-950">
                  <Sparkles className="h-4 w-4 text-teal-700 shrink-0" />
                  <span>Como funciona este desafio de retenção:</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed m-0">
                  Explique a regra com suas próprias palavras, como se estivesse ensinando um colega. Destaque o critério gramatical decisivo, cite um exemplo de aplicação e aponte a pegadinha clássica da banca examinadora.
                </p>
                {targetRuleContext && (
                  <div className="mt-2 pt-2 border-t border-teal-200/60 text-[11px] text-teal-900 font-medium">
                    <strong>Ponto focal:</strong> {targetRuleContext}
                  </div>
                )}
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 gap-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'text'}
                  onClick={() => setMode('text')}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mode === 'text'
                      ? 'bg-white text-teal-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Texto Escrito</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'audio_batch'}
                  onClick={() => setMode('audio_batch')}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mode === 'audio_batch'
                      ? 'bg-white text-teal-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Gravar Áudio</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'live_voice'}
                  onClick={() => setMode('live_voice')}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mode === 'live_voice'
                      ? 'bg-white text-teal-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Radio className="h-3.5 w-3.5 text-rose-600" />
                  <span>Live Duplex (Beta)</span>
                </button>
              </div>

              {/* Input Area by Mode */}
              {mode === 'text' && (
                <div className="space-y-2">
                  <label htmlFor="feynman-text-input" className="block text-xs font-bold text-slate-700">
                    Sua explicação espontânea:
                  </label>
                  <textarea
                    id="feynman-text-input"
                    rows={5}
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="Ex.: 'Nesta regra, a crase ocorre porque o termo regente exige a preposição A e a palavra seguinte admite artigo feminino. A pegadinha da FGV é colocar um pronome indefinido que...'"
                    className="w-full rounded-xl border border-slate-300 p-3.5 text-xs sm:text-sm text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition resize-y"
                    disabled={loading}
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>Evite decorar termos técnicos; explique a lógica por trás da regra.</span>
                    <span>{userText.trim().split(/\s+/).filter(Boolean).length} palavras</span>
                  </div>
                </div>
              )}

              {mode === 'audio_batch' && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-4 text-center">
                  {!audioUrl && !isRecording && (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-800 shadow-inner">
                        <Mic className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Gravação Oral de Autoexplicação</h3>
                        <p className="text-xs text-slate-600 mt-1 max-w-sm">
                          Fale em voz alta por 20 a 60 segundos explicando o conceito gramatical e as pegadinhas da banca.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartRecording}
                        className="flex items-center gap-2 rounded-xl bg-teal-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-900 transition shadow-sm cursor-pointer"
                      >
                        <Mic className="h-4 w-4" /> Iniciar Gravação
                      </button>
                    </>
                  )}

                  {isRecording && (
                    <div className="space-y-3 w-full max-w-xs">
                      <div className="flex items-center justify-center gap-2 text-rose-600">
                        <span className="h-3 w-3 rounded-full bg-rose-600 animate-ping" />
                        <span className="text-sm font-black tracking-wider">
                          GRAVANDO ({recordingSeconds}s / 90s)
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Articule com calma a regra e o teste prático de concurso...
                      </p>
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition shadow-sm cursor-pointer"
                      >
                        <Square className="h-4 w-4" /> Concluir Fala
                      </button>
                    </div>
                  )}

                  {audioUrl && !isRecording && (
                    <div className="space-y-3 w-full max-w-sm">
                      <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4" /> Gravação finalizada ({recordingSeconds}s)
                      </div>
                      <audio controls src={audioUrl} className="w-full h-10" />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAudioUrl(null);
                            setAudioBlob(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Gravar novamente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'live_voice' && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 text-center space-y-4">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-indigo-100 text-indigo-800 shadow-xs">
                    <Radio className={`h-8 w-8 ${liveStatus === 'speaking' || liveStatus === 'connected' ? 'animate-pulse text-indigo-600' : 'text-indigo-400'}`} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-indigo-950">Gemini Live API · Sabatina Oral Feynman</h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed mt-1">
                      Conexão contínua de áudio duplex com o Professor SuVeCA. Fale ao microfone para defender seu raciocínio e receba arguições orais imediatas em tempo real.
                    </p>
                  </div>

                  {liveStatus === 'idle' && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={startLiveSession}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs cursor-pointer"
                      >
                        <Mic className="h-4 w-4" /> Iniciar Sabatina Oral
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('audio_batch')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Alternar para Áudio Gravado
                      </button>
                    </div>
                  )}

                  {liveStatus === 'connecting' && (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-900 bg-indigo-100/70 p-3 rounded-xl">
                      <LoaderCircle className="h-4 w-4 animate-spin text-indigo-700" />
                      <span>Conectando ao túnel WebSocket do Gemini Live...</span>
                    </div>
                  )}

                  {(liveStatus === 'connected' || liveStatus === 'speaking') && (
                    <div className="space-y-4 bg-white border border-indigo-200 rounded-xl p-4 text-left">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-xs font-bold text-slate-900">
                            {liveStatus === 'speaking' ? 'Professor SuVeCA falando...' : 'Microfone ativo · Pode falar'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={stopLiveSession}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 transition cursor-pointer"
                        >
                          Concluir Sabatina
                        </button>
                      </div>

                      {liveTranscript.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
                          {liveTranscript.map((turn, i) => (
                            <div key={i} className={`p-2 rounded-lg ${turn.sender === 'bot' ? 'bg-indigo-50 text-indigo-950' : 'bg-slate-100 text-slate-800'}`}>
                              <strong>{turn.sender === 'bot' ? 'Professor:' : 'Você:'}</strong> {turn.text}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic text-center py-3 m-0">
                          Aguardando intervenção oral do Professor SuVeCA...
                        </p>
                      )}
                    </div>
                  )}

                  {liveStatus === 'error' && (
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={startLiveSession}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" /> Tentar Conectar Novamente
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          ) : (
            /* Diagnosis & Pedagogical Feedback Panel */
            <div className="space-y-5">
              {/* Score Header */}
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 sm:p-5 ${
                diagnosis.conceptualAccuracy === 'alta'
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : diagnosis.conceptualAccuracy === 'parcial'
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-rose-200 bg-rose-50/60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${
                    diagnosis.conceptualAccuracy === 'alta'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : diagnosis.conceptualAccuracy === 'parcial'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-rose-600 text-white shadow-xs'
                  }`}>
                    {diagnosis.masteryScore}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 m-0">
                        {diagnosis.conceptualAccuracy === 'alta'
                          ? 'Retenção Sólida & Compreensão Real'
                          : diagnosis.conceptualAccuracy === 'parcial'
                          ? 'Compreensão Parcial com Lacunas'
                          : 'Necessita Aprofundamento Conceitual'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 font-medium m-0">
                      Precisão conceitual classificada como <strong>{diagnosis.conceptualAccuracy}</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs">
                  <ShieldAlert className={`h-4 w-4 ${diagnosis.bancaTrapAddressed ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span>{diagnosis.bancaTrapAddressed ? 'Pegadinha da banca identificada ✓' : 'Pegadinha da banca não tratada'}</span>
                </div>
              </div>

              {/* Strengths & Gaps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>O que você dominou:</span>
                  </div>
                  {diagnosis.strengths.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-800 font-medium">
                      {diagnosis.strengths.map((str, idx) => (
                        <li key={idx} className="leading-relaxed">{str}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic m-0">Nenhum critério decisivo claro foi identificado na explicação.</p>
                  )}
                </div>

                {/* Conceptual Gaps */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Pontos cegos / Omissões:</span>
                  </div>
                  {diagnosis.conceptualGaps.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-800 font-medium">
                      {diagnosis.conceptualGaps.map((gap, idx) => (
                        <li key={idx} className="leading-relaxed">{gap}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-800 font-semibold m-0">Nenhuma lacuna crítica detectada!</p>
                  )}
                </div>
              </div>

              {/* Banca / Examiner Feedback */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Parecer do Tutor SuVeCa:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleSpeech(diagnosis.bancaFeedback)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-950 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    title={isSpeakingFeedback ? 'Pausar áudio' : 'Ouvir parecer do tutor'}
                  >
                    {isSpeakingFeedback ? (
                      <>
                        <VolumeX className="h-3.5 w-3.5 text-teal-700" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5 text-teal-700" />
                        <span>Ouvir Parecer</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed m-0 font-medium">
                  {diagnosis.bancaFeedback}
                </p>
              </div>

              {/* Suggested Flashcard Preview */}
              {diagnosis.suggestedFlashcard && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                      <BookmarkPlus className="h-4 w-4 text-teal-700" /> Flashcard de Reforço Sugerido:
                    </span>
                    <span className="text-[10px] rounded-md bg-teal-100 px-2 py-0.5 font-bold text-teal-800">
                      Revisão Espaçada (SM-2)
                    </span>
                  </div>
                  <div className="bg-white rounded-lg border border-teal-200 p-3 space-y-1.5 text-xs">
                    <div className="text-slate-900 font-bold">
                      Frente: {diagnosis.suggestedFlashcard.front}
                    </div>
                    <div className="text-slate-700 border-t border-slate-100 pt-1.5">
                      Verso: {diagnosis.suggestedFlashcard.back}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          {!diagnosis ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitEvaluation}
                disabled={loading || (mode === 'audio_batch' && !audioBlob) || (mode === 'text' && !userText.trim())}
                className="flex items-center gap-1.5 rounded-xl bg-teal-800 px-5 py-2 text-xs font-bold text-white hover:bg-teal-900 transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    <span>Avaliando raciocínio...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Avaliar com Método Feynman</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setDiagnosis(null);
                  setAudioUrl(null);
                  setAudioBlob(null);
                  setIsSaved(false);
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reformular Explicação
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  title="Baixar diagnóstico completo em formato Markdown (.md)"
                >
                  <Download className="h-3.5 w-3.5 text-teal-700" />
                  <span className="hidden sm:inline">Exportar Resumo (.md)</span>
                  <span className="sm:hidden">.md</span>
                </button>

                {onSaveToCaderno && (
                  <button
                    type="button"
                    onClick={handleSaveFlashcardToCaderno}
                    disabled={isSaved}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                      isSaved
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    <span>{isSaved ? '✓ Salvo no Caderno de Erros' : 'Salvar Lacuna no Caderno de Erros'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-teal-800 px-5 py-2 text-xs font-bold text-white hover:bg-teal-900 transition cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
