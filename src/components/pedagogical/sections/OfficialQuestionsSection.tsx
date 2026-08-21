import React, { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { OfficialQuestionView } from '../../../types/pedagogicalView';
import { QuestionBlock } from '../../ui/QuestionBlock';
import { InlineRichText } from '../blocks/InlineRichText';
import { fetchNormalizedQuestionsForLesson } from '../../../lib/officialQuestionsLoader';
import {
  isBinaryOfficialQuestion,
  normalizeOfficialAnswer,
  presentOfficialQuestionOptions,
} from '../../../lib/officialQuestionPresentation';

interface OfficialQuestionsSectionProps {
  questions?: OfficialQuestionView[];
  lessonId?: string;
  onPracticeMore?: () => void;
}

export const OfficialQuestionsSection: React.FC<OfficialQuestionsSectionProps> = ({
  questions = [],
  lessonId = 'A00',
  onPracticeMore,
}) => {
  const [enrichedMap, setEnrichedMap] = useState<Record<string, any>>({});

  useEffect(() => {
    let active = true;
    const loadRealQuestions = async () => {
      const map = await fetchNormalizedQuestionsForLesson(lessonId);
      if (active && Object.keys(map).length > 0) {
        setEnrichedMap(map);
      }
    };
    loadRealQuestions();
    return () => {
      active = false;
    };
  }, [lessonId]);

  if (!questions || questions.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-teal-100/80 pb-3">
        <HelpCircle className="h-5 w-5 text-teal-700" />
        <h3 className="m-0 text-base font-black text-slate-900">
          Questões Oficiais de Prova ({questions.length})
        </h3>
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => {
          const payload = q.questionPayload || {};
          const answerPayload = q.answerPayload || {};
          const presentation = q.questionPresentation;
          const sourceQuestionId = q.sourceQuestionId || payload.question_id || q.questionId || '';
          const qId = q.officialQuestionId || q.questionId || sourceQuestionId;
          const normalized = enrichedMap[qId]
            || enrichedMap[sourceQuestionId]
            || enrichedMap[`${lessonId}:${sourceQuestionId}`];

          let prompt = presentation?.stem || normalized?.prompt || payload.prompt || q.prompt || '';
          if (prompt.includes('Julgue o item a seguir referente aos preceitos gramaticais da questão OQ-')) {
            if ((q.options || payload.options || []).length > 0) {
              prompt = 'Assinale a alternativa correta referente aos conceitos gramaticais e fonéticos estudados:';
            } else {
              prompt = 'Julgue o item a seguir quanto à correção das regras gramaticais e fonéticas:';
            }
          }

          const presentationBlocksInteraction = presentation?.status === 'source_incomplete'
            || presentation?.status === 'source_conflict';
          const publishedOptions = presentation?.status === 'ready'
            ? presentation.options
            : q.options || payload.options || [];
          const rawOptions =
            presentationBlocksInteraction
              ? []
              : presentation?.status !== 'ready' && normalized?.options && normalized.options.length > 0
              ? normalized.options.map((opt: any) => ({
                  letter: (opt.letter || opt.label || '').toUpperCase(),
                  text: opt.text || '',
                }))
              : publishedOptions.map((opt) => ({
                  letter: (opt.label || opt.letter || '').toUpperCase(),
                  text: opt.text || '',
                }));
          const solution = presentationBlocksInteraction
            ? undefined
            : normalized?.commentary || answerPayload.commentary || q.explanation;
          const rawAnswer = presentation?.answer
            || normalized?.correctAnswer
            || answerPayload.answer
            || q.officialAnswer;
          const questionType = normalized?.questionType || q.questionType || payload.question_type;
          const options = presentationBlocksInteraction ? [] : presentOfficialQuestionOptions({
            options: rawOptions,
            questionType,
            answer: rawAnswer,
            prompt,
          });
          const isBinary = !presentationBlocksInteraction
            && isBinaryOfficialQuestion({ questionType, answer: rawAnswer, prompt });
          const answer = isBinary ? normalizeOfficialAnswer(rawAnswer) : rawAnswer;
          const board = normalized?.bank || payload.exam_board || q.examBoard;
          const publishedYear = payload.year || q.year;
          const year = normalized?.year ? String(normalized.year) : publishedYear ? String(publishedYear) : undefined;
          const organization = payload.organization || q.organization;

          return (
            <QuestionBlock
              key={qId || idx}
              title={`Questão ${idx + 1}: ${organization || board || 'Concurso Público'}`}
              board={board}
              year={year}
              prompt={prompt}
              options={options}
              solution={solution}
              answer={answer}
              interactionUnavailableReason={
                presentationBlocksInteraction
                  ? presentation?.reason
                  : options.length === 0
                  ? 'Esta questão não possui alternativas completas para uma tentativa segura.'
                  : undefined
              }
              renderMarkdown={(text) => <InlineRichText>{text}</InlineRichText>}
            />
          );
        })}
      </div>
      {onPracticeMore && (
        <button type="button" onClick={onPracticeMore} className="min-h-11 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-900 hover:bg-teal-100">
          Continuar praticando este tema
        </button>
      )}
    </div>
  );
};
