import React, { useEffect, useRef, useState } from 'react';
import { readReadingAttempts, saveReadingAttempt, READING_ATTEMPT_EVENT, READING_ATTEMPTS_UPDATED, type ReadingAttempt } from '../../lib/readingAttempts';
import { normalizeOfficialAnswer } from '../../lib/officialQuestionPresentation';
import { AlertTriangle, BadgeCheck, Building2, CalendarDays, CircleHelp, Check, X, Eye, EyeOff, Sparkles } from 'lucide-react';
import { ConfidenceChoice } from './ConfidenceChoice';
import { QuestionOptions } from './QuestionOptions';
import { QuestionCommentaryRenderer } from './QuestionCommentaryRenderer';

export interface QuestionBlockModel {
  title: string;
  prompt?: string;
  promptContent?: React.ReactNode;
  options: Array<{ letter: string; text: string }>;
  solution?: string;
  answer?: string;
  extra?: string;
  board?: string;
  year?: string;
  interactionUnavailableReason?: string;
}

interface QuestionBlockProps extends QuestionBlockModel {
  renderMarkdown: (markdown: string) => React.ReactNode;
  onAskTutor?: (questionContext: string) => void;
  attemptIdentity?: { questionId: string; lessonId: string; userId?: string };
}

export const QuestionBlock: React.FC<QuestionBlockProps> = ({
  title,
  prompt,
  promptContent,
  options,
  solution,
  answer,
  extra,
  board,
  year,
  interactionUnavailableReason,
  renderMarkdown,
  onAskTutor,
  attemptIdentity,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confidence, setConfidence] = useState<ReadingAttempt['confidence'] | null>(null);
  const [justification, setJustification] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const identity = `${attemptIdentity?.userId || 'guest'}:${attemptIdentity?.questionId || ''}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  useEffect(() => {
    setSelectedOption(null); setShowAnswer(false); setConfirmed(false); setSaveMessage('');
    setJustification(''); setConfidence(null);
    const restore = () => {
      if (!attemptIdentity) return;
      const attempt = readReadingAttempts(attemptIdentity.userId).filter(a => a.questionId === attemptIdentity.questionId).at(-1);
      if (attempt) {
        setSelectedOption(attempt.answer); setConfirmed(true); setShowAnswer(true);
        setConfidence(attempt.confidence); setJustification(attempt.justification);
      }
    };
    restore();
    const update = (event: Event) => {
      if ((event as CustomEvent).detail?.userId === (attemptIdentity?.userId || 'guest')) restore();
    };
    window.addEventListener(READING_ATTEMPTS_UPDATED, update);
    return () => window.removeEventListener(READING_ATTEMPTS_UPDATED, update);
  }, [attemptIdentity?.questionId, attemptIdentity?.userId]);

  // Normaliza a letra do gabarito (ex: 'A', 'B', 'C', 'Certo', 'Errado')
  const cleanAnswer = (answer || '').trim();

  const handleSelectOption = (letter: string) => {
    if (confirmed) return;
    setSelectedOption(letter);
  };

  const hasSelectableAnswer = options.length > 0;
  const canRevealAnswer = hasSelectableAnswer && selectedOption !== null && (!attemptIdentity || confidence !== null);
  const reveal = () => {
    if (confirmed) { setShowAnswer(value => !value); return; }
    if (!selectedOption || (attemptIdentity && !confidence)) return;
    if (attemptIdentity) {
      const attempt: ReadingAttempt = {
        id: crypto.randomUUID(), questionId: attemptIdentity.questionId, lessonId: attemptIdentity.lessonId,
        answer: selectedOption, correct: normalizeOfficialAnswer(selectedOption) === normalizeOfficialAnswer(answer),
        assistanceLevel: readReadingAttempts(attemptIdentity.userId).some(previous => previous.questionId === attemptIdentity.questionId) ? 'full' : 'none',
        confidence: confidence!, confidenceSource: 'explicit', justification, createdAt: new Date().toISOString(),
      };
      void saveReadingAttempt(attemptIdentity.userId, attempt, () => {
        if (identityRef.current !== identity) return;
        setConfirmed(true); setShowAnswer(true);
        setSaveMessage('Tentativa salva neste dispositivo.');
        window.dispatchEvent(new CustomEvent(READING_ATTEMPT_EVENT, { detail: {
          userId: attemptIdentity.userId || 'guest', attempt, title, prompt, solution, answer,
        } }));
      }).then(synced => {
        if (identityRef.current === identity) setSaveMessage(synced ? 'Tentativa salva.' : 'Tentativa salva neste dispositivo. Sincronização pendente.');
      }).catch(() => { if (identityRef.current === identity) setSaveMessage('Não foi possível salvar a tentativa neste dispositivo.'); });
    }
    if (!attemptIdentity) { setConfirmed(true); setShowAnswer(true); }
  };

  return (
    <article className="question-block my-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition">
      <header className="border-b border-slate-200 bg-slate-50/90 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 font-black">
              <CircleHelp className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="m-0 text-sm sm:text-base font-bold text-slate-950">{title}</h3>
              {(board || year) && (
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                  {board && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 shadow-2xs">
                      <Building2 className="h-3 w-3 text-slate-500" />
                      {board}
                    </span>
                  )}
                  {year && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 shadow-2xs">
                      <CalendarDays className="h-3 w-3 text-slate-500" />
                      {year}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!showAnswer && !canRevealAnswer}
            onClick={reveal}
            className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition shadow-2xs disabled:cursor-not-allowed disabled:opacity-55 ${
              showAnswer
                ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'border border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100'
            }`}
          >
            {showAnswer ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-amber-700" />
                <span>Ocultar Gabarito</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-teal-700" />
                <span>
                  {!hasSelectableAnswer
                    ? 'Tentativa indisponível'
                    : canRevealAnswer
                      ? 'Confirmar tentativa e corrigir'
                      : 'Selecione uma resposta'}
                </span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="space-y-4 px-4 py-5 sm:px-5">
        {/* Enunciado da questão */}
        {(promptContent || prompt) && (
          <section aria-label={`Enunciado de ${title}`}>
            {promptContent || (
              <>
                <h4 className="mb-2 text-[11px] font-black uppercase tracking-wider text-teal-900">
                  Enunciado
                </h4>
                <div className="text-xs sm:text-sm leading-relaxed text-slate-800 font-medium">
                  {renderMarkdown(prompt || '')}
                </div>
              </>
            )}
          </section>
        )}

        {/* Alternativas Interativas */}
        {options.length > 0 && (
          <section aria-label={`Alternativas de ${title}`}>
            <QuestionOptions options={options.map(o => ({ id: o.letter.toUpperCase(), text: o.text }))}
              selected={selectedOption} answer={showAnswer ? normalizeOfficialAnswer(answer) || undefined : undefined}
              disabled={confirmed} onSelect={handleSelectOption} renderText={renderMarkdown} />
          </section>
        )}

        {!hasSelectableAnswer && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <strong className="block font-black">Tentativa não disponível</strong>
              <span>{interactionUnavailableReason || 'As alternativas desta questão estão incompletas.'}</span>
            </div>
          </div>
        )}

        {attemptIdentity && !confirmed && <div className="space-y-3">
          <ConfidenceChoice value={confidence} onChange={setConfidence} />
          <label className="block text-sm font-semibold text-slate-800">
            Qual critério você usou? (opcional)
            <textarea
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal text-slate-800 shadow-2xs transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              maxLength={1000}
              value={justification}
              onChange={event => setJustification(event.target.value)}
            />
          </label>
        </div>}
        {saveMessage && <p role="status" className="text-sm text-slate-700">{saveMessage}</p>}
        {confirmed && (
          <button
            type="button"
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-teal-400 hover:bg-teal-50 cursor-pointer"
            onClick={() => { setConfirmed(false); setShowAnswer(false); setSelectedOption(null); setJustification(''); setConfidence(null); setSaveMessage(''); }}
          >
            Tentar novamente
          </button>
        )}
        {/* Gabarito e Solução Comentada (Revelada apenas quando showAnswer é true) */}
        {showAnswer && (
          <div className="space-y-3 pt-2" aria-live="polite">
            {answer && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-xs sm:text-sm text-emerald-950 shadow-2xs">
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 block font-black">Gabarito Oficial:</strong>
                  <div className="font-semibold">{renderMarkdown(answer)}</div>
                </div>
              </div>
            )}

            {solution && (
              <QuestionCommentaryRenderer
                commentary={solution}
                correctAnswerLabel={answer}
              />
            )}
          </div>
        )}

        {extra && <div className="border-t border-slate-200 pt-3 text-xs">{renderMarkdown(extra)}</div>}
      </div>
    </article>
  );
};
