import React, { useState } from 'react';
import { AlertTriangle, BadgeCheck, Building2, CalendarDays, CircleHelp, Check, X, Eye, EyeOff, Sparkles } from 'lucide-react';

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
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  // Normaliza a letra do gabarito (ex: 'A', 'B', 'C', 'Certo', 'Errado')
  const cleanAnswer = (answer || '').trim();
  const answerLetter = cleanAnswer.replace(/^.*(?:letra|alternativa|item)\s*([A-Ea-e]|certo|errado).*$/i, '$1').toUpperCase();

  const handleSelectOption = (letter: string) => {
    if (showAnswer) return;
    setSelectedOption(letter);
  };

  const hasSelectableAnswer = options.length > 0;
  const canRevealAnswer = hasSelectableAnswer && selectedOption !== null;

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
            onClick={() => setShowAnswer((prev) => !prev)}
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
            <ol className="m-0 grid list-none gap-2.5 p-0">
              {options.map((option, optionIndex) => {
                const optLetter = option.letter.toUpperCase();
                const isSelected = selectedOption === optLetter;
                const isCorrect = showAnswer && (answerLetter === optLetter || cleanAnswer.toUpperCase().includes(`(${optLetter})`) || cleanAnswer.toUpperCase().startsWith(optLetter));
                const isWrongSelected = showAnswer && isSelected && !isCorrect;

                let borderClasses = 'border-slate-200 hover:border-teal-300 bg-white';
                let badgeClasses = 'bg-slate-100 text-slate-800';

                if (showAnswer) {
                  if (isCorrect) {
                    borderClasses = 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-400';
                    badgeClasses = 'bg-emerald-600 text-white font-black';
                  } else if (isWrongSelected) {
                    borderClasses = 'border-rose-400 bg-rose-50/60 ring-1 ring-rose-300';
                    badgeClasses = 'bg-rose-600 text-white font-black';
                  }
                } else if (isSelected) {
                  borderClasses = 'border-teal-600 bg-teal-50/60 ring-1 ring-teal-500';
                  badgeClasses = 'bg-teal-700 text-white font-black';
                }

                return (
                  <li key={`${option.letter}-${optionIndex}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(optLetter)}
                      aria-pressed={isSelected}
                      disabled={showAnswer}
                      className={`grid w-full grid-cols-[2rem_1fr] items-start gap-3 rounded-xl border p-3 text-left text-xs sm:text-sm transition cursor-pointer shadow-2xs ${borderClasses}`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${badgeClasses}`}
                      >
                        {showAnswer && isCorrect ? (
                          <Check className="h-4 w-4" />
                        ) : showAnswer && isWrongSelected ? (
                          <X className="h-4 w-4" />
                        ) : (
                          option.letter
                        )}
                      </span>
                      <span className="min-w-0 pt-0.5 text-slate-800 leading-relaxed font-medium">
                        {renderMarkdown(option.text)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
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
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-950 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Comentário & Justificativa do Gabarito</span>
                </div>
                <div className="text-xs sm:text-sm leading-relaxed text-slate-800 font-medium">
                  {renderMarkdown(solution)}
                </div>
              </div>
            )}
          </div>
        )}

        {extra && <div className="border-t border-slate-200 pt-3 text-xs">{renderMarkdown(extra)}</div>}
      </div>
    </article>
  );
};
