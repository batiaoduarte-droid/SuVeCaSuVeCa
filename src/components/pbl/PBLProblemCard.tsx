import React from 'react';
import type { PBLCase, PBLQuestionPresentation } from '../../types/pbl';
import { Sparkles } from 'lucide-react';
import { QuestionPresentationContent } from '../QuestionPresentationContent';

interface PBLProblemCardProps {
  pblCase: PBLCase;
  question?: PBLQuestionPresentation | null;
  selectedAnswer: string;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
}

export const PBLProblemCard: React.FC<PBLProblemCardProps> = ({
  pblCase,
  question,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
}) => {
  const isMultipleChoice = question
    ? question.questionType === 'multiple_choice'
    : Boolean(pblCase.options?.length);
  const options = question?.options || pblCase.options;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            <Sparkles className="h-3 w-3" /> Caso-Âncora PBL
          </span>
        </div>
        <div className="text-xs font-medium text-slate-600">
          {pblCase.title}
          {question?.examBoard ? ` · ${question.examBoard}${question.year ? ` ${question.year}` : ''}` : ''}
        </div>
      </div>

      {/* Question Stem */}
      {question ? (
        <QuestionPresentationContent presentation={question.presentation} supportText={question.supportText} prompt={question.prompt} />
      ) : (
        <div className="text-sm font-medium leading-relaxed text-slate-900">
          {pblCase.questionStem || 'Analise os termos e a estrutura normativa da assertiva abaixo.'}
        </div>
      )}

      {/* Answer Choices / Judgment */}
      <div className="mt-6" role="group" aria-label="Alternativas da questão">
        {isMultipleChoice ? (
          <div className="space-y-3">
            {options.map((opt) => {
              const isSelected = selectedAnswer === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => onSelectAnswer(opt.label)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-xs ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="mt-0.5 leading-relaxed">{opt.text}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-4">
            {['Certo', 'Errado'].map((val) => {
              const isSelected = selectedAnswer.toUpperCase() === val.toUpperCase();
              const isCerto = val === 'Certo';
              return (
                <button
                  key={val}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => onSelectAnswer(val)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-4 text-sm font-bold transition-all ${
                    isSelected
                      ? isCerto
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                        : 'border-rose-600 bg-rose-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {val.toUpperCase()}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
