import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import type { OfficialQuestionView } from '../../../types/pedagogicalView';
import { QuestionBlock } from '../../ui/QuestionBlock';
import { InlineRichText } from '../blocks/InlineRichText';
import { QuestionPresentationContent } from '../../QuestionPresentationContent';
import {
  fetchNormalizedQuestionsByRefs,
  type NormalizedQuestion,
} from '../../../lib/officialQuestionsLoader';
import {
  isBinaryOfficialQuestion,
  normalizeOfficialAnswer,
  presentOfficialQuestionOptions,
} from '../../../lib/officialQuestionPresentation';
import { recordQuestionEncounter } from '../../../lib/questionEncounterLedger';
import {
  hasSourceBackedVisualPresentation,
  requiresIdentifiedContext,
  requiresVisualEmphasis,
} from '../../../lib/questionPresentationSafety';

interface OfficialQuestionsSectionProps {
  questions?: OfficialQuestionView[];
  lessonId?: string;
  userId?: string;
  onPracticeMore?: () => void;
}

const QUESTIONS_PAGE_SIZE = 5;

const questionReference = (question: OfficialQuestionView): string => {
  const payload = question.questionPayload || {};
  return question.officialQuestionId
    || question.sourceQuestionId
    || payload.question_id
    || question.questionId
    || '';
};

const normalizedQuestionFor = (
  question: OfficialQuestionView,
  lessonId: string,
  map: Record<string, NormalizedQuestion>,
): NormalizedQuestion | undefined => {
  const payload = question.questionPayload || {};
  const sourceQuestionId = question.sourceQuestionId || payload.question_id || question.questionId || '';
  const questionId = question.officialQuestionId || question.questionId || sourceQuestionId;
  return map[questionId] || map[sourceQuestionId] || map[`${lessonId}:${sourceQuestionId}`];
};

const hasSafePracticePresentation = (
  question: OfficialQuestionView,
  lessonId: string,
  map: Record<string, NormalizedQuestion>,
): boolean => {
  const presentation = question.questionPresentation;
  if (['source_incomplete', 'source_conflict'].includes(presentation?.status || '')) return false;
  const normalized = normalizedQuestionFor(question, lessonId, map);
  if (!normalized) return true;
  if (
    normalized.presentation?.contextStatus === 'source_missing'
    || normalized.presentation?.formattingStatus === 'source_missing'
  ) return false;
  const payload = question.questionPayload || {};
  const prompt = presentation?.stem || normalized.prompt || payload.prompt || question.prompt || '';
  const support = normalized.presentation?.supportRichText
    || normalized.presentation?.supportBlocks?.map((block) => block.richText || block.text).join('\n\n')
    || normalized.supportText
    || payload.support_text;
  const command = normalized.presentation?.commandRichText || prompt;
  if (requiresIdentifiedContext(prompt) && !String(support || '').trim()) return false;
  return !(
    requiresVisualEmphasis(prompt)
    && !hasSourceBackedVisualPresentation(normalized.presentation, support)
  );
};

export const OfficialQuestionsSection: React.FC<OfficialQuestionsSectionProps> = ({
  questions = [],
  lessonId = 'A00',
  userId,
  onPracticeMore,
}) => {
  const [enrichedMap, setEnrichedMap] = useState<Record<string, NormalizedQuestion>>({});
  const [resolvedQuestionSetKey, setResolvedQuestionSetKey] = useState('');
  const [page, setPage] = useState(0);
  const questionListRef = useRef<HTMLDivElement>(null);
  const encounteredRefs = useRef(new Set<string>());
  const sourceEligibleQuestions = useMemo(
    () => questions.filter((question) => !['source_incomplete', 'source_conflict'].includes(
      question.questionPresentation?.status || '',
    )),
    [questions],
  );
  const questionSetKey = questions.map(questionReference).join('\u001f');
  const enrichmentReady = resolvedQuestionSetKey === questionSetKey;
  const practiceQuestions = useMemo(
    () => enrichmentReady
      ? sourceEligibleQuestions.filter((question) => hasSafePracticePresentation(question, lessonId, enrichedMap))
      : [],
    [enrichedMap, enrichmentReady, lessonId, sourceEligibleQuestions],
  );
  const excludedQuestions = enrichmentReady
    ? questions.length - practiceQuestions.length
    : questions.length - sourceEligibleQuestions.length;
  const displayedQuestionCount = enrichmentReady ? practiceQuestions.length : sourceEligibleQuestions.length;
  const pageCount = Math.max(1, Math.ceil(practiceQuestions.length / QUESTIONS_PAGE_SIZE));
  const pageStart = page * QUESTIONS_PAGE_SIZE;
  const visibleQuestions = practiceQuestions.slice(pageStart, pageStart + QUESTIONS_PAGE_SIZE);
  const visibleRefs = visibleQuestions.map(questionReference).filter(Boolean);
  const visibleRefsKey = visibleRefs.join('\u001f');
  const eligibleRefs = sourceEligibleQuestions.map(questionReference).filter(Boolean);
  const eligibleRefsKey = eligibleRefs.join('\u001f');

  useEffect(() => {
    setPage(0);
    setEnrichedMap({});
    setResolvedQuestionSetKey('');
    encounteredRefs.current.clear();
  }, [lessonId, questionSetKey]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const loadRealQuestions = async () => {
      const map = await fetchNormalizedQuestionsByRefs(eligibleRefs, lessonId, controller.signal);
      if (active) {
        setEnrichedMap(map);
        setResolvedQuestionSetKey(questionSetKey);
      }
    };
    loadRealQuestions();
    return () => {
      active = false;
      controller.abort();
    };
  }, [eligibleRefsKey, lessonId, questionSetKey]);

  useEffect(() => {
    const root = questionListRef.current;
    if (!root) return;

    const record = (questionId: string) => {
      if (!questionId || encounteredRefs.current.has(questionId)) return;
      encounteredRefs.current.add(questionId);
      recordQuestionEncounter(userId, {
        questionId,
        purpose: 'acquisition_practice',
        encounteredAt: new Date().toISOString(),
      });
    };

    const candidates = Array.from(root.querySelectorAll<HTMLElement>('[data-question-encounter-ref]'));
    if (typeof IntersectionObserver === 'undefined') {
      candidates.forEach((element) => record(element.dataset.questionEncounterRef || ''));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        record(element.dataset.questionEncounterRef || '');
        observer.unobserve(element);
      }
    }, { threshold: 0.25 });
    candidates.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [userId, visibleRefsKey]);

  if (!questions || questions.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-teal-100/80 pb-3">
        <HelpCircle className="h-5 w-5 text-teal-700" />
        <h3 className="m-0 text-base font-black text-slate-900">
          Questões Oficiais de Prova ({displayedQuestionCount})
        </h3>
      </div>

      {excludedQuestions > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <strong className="block font-black">
              {excludedQuestions} {excludedQuestions === 1 ? 'questão foi omitida' : 'questões foram omitidas'} da prática
            </strong>
            A fonte publicada não permite uma tentativa segura. A sequência continua com as questões verificáveis da unidade.
          </div>
        </div>
      )}

      {!enrichmentReady && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600" role="status">
          Verificando a integridade das questões desta unidade…
        </div>
      )}

      {enrichmentReady && <div ref={questionListRef} className="space-y-6">
        {visibleQuestions.map((q, idx) => {
          const payload = q.questionPayload || {};
          const answerPayload = q.answerPayload || {};
          const presentation = q.questionPresentation;
          const sourceQuestionId = q.sourceQuestionId || payload.question_id || q.questionId || '';
          const qId = q.officialQuestionId || q.questionId || sourceQuestionId;
          const normalized = normalizedQuestionFor(q, lessonId, enrichedMap);

          let prompt = presentation?.stem || normalized?.prompt || payload.prompt || q.prompt || '';
          const supportText = normalized?.supportText || payload.support_text;
          if (prompt.includes('Julgue o item a seguir referente aos preceitos gramaticais da questão OQ-')) {
            if ((q.options || payload.options || []).length > 0) {
              prompt = 'Assinale a alternativa correta referente aos conceitos gramaticais e fonéticos estudados:';
            } else {
              prompt = 'Julgue o item a seguir quanto à correção das regras gramaticais e fonéticas:';
            }
          }

          const commandRichText = normalized?.presentation?.commandRichText || prompt;
          const supportRichText = normalized?.presentation?.supportRichText
            || normalized?.presentation?.supportBlocks?.map((block) => block.richText || block.text).join('\n\n')
            || supportText;
          const missingIdentifiedContext = requiresIdentifiedContext(prompt) && !String(supportRichText || '').trim();
          const missingVisualEmphasis = requiresVisualEmphasis(prompt)
            && !hasSourceBackedVisualPresentation(normalized?.presentation, supportRichText);
          const presentationBlocksInteraction = normalized?.presentation?.contextStatus === 'source_missing'
            || normalized?.presentation?.formattingStatus === 'source_missing'
            || missingIdentifiedContext
            || missingVisualEmphasis
            || presentation?.status === 'source_incomplete'
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
                  text: normalized?.presentation?.optionRichText?.[(opt.letter || opt.label || '').toUpperCase()] || opt.richText || opt.text || '',
                }))
              : publishedOptions.map((opt) => ({
                  letter: (opt.label || opt.letter || '').toUpperCase(),
                  text: normalized?.presentation?.optionRichText?.[(opt.label || opt.letter || '').toUpperCase()] || ('richText' in opt ? String(opt.richText || '') : '') || opt.text || '',
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
            <div key={qId || idx} data-question-encounter-ref={qId || sourceQuestionId}>
            <QuestionBlock
              title={`Questão ${pageStart + idx + 1}: ${organization || board || 'Concurso Público'}`}
              board={board}
              year={year}
              promptContent={(
                <QuestionPresentationContent
                  presentation={normalized?.presentation}
                  supportText={supportRichText}
                  prompt={commandRichText}
                />
              )}
              options={options}
              solution={solution}
              answer={answer}
              interactionUnavailableReason={
                presentationBlocksInteraction
                  ? normalized?.presentation?.contextStatus === 'source_missing' || missingIdentifiedContext
                    ? 'O texto-base identificado no comando não está disponível em fonte compatível; a tentativa foi bloqueada.'
                    : normalized?.presentation?.formattingStatus === 'source_missing' || missingVisualEmphasis
                    ? 'A marcação tipográfica exigida pelo comando não está disponível em fonte compatível; a tentativa foi bloqueada.'
                    : presentation?.reason
                  : options.length === 0
                  ? 'Esta questão não possui alternativas completas para uma tentativa segura.'
                  : undefined
              }
              renderMarkdown={(text) => <InlineRichText>{text}</InlineRichText>}
            />
            </div>
          );
        })}
      </div>}
      {enrichmentReady && practiceQuestions.length === 0 && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-relaxed text-teal-950" role="status">
          Nenhuma questão desta seleção possui fonte suficiente para uma tentativa segura. Use a prática adaptativa abaixo para continuar no mesmo tema.
        </div>
      )}
      {practiceQuestions.length > 0 && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="m-0 text-xs font-semibold text-slate-700" aria-live="polite">
          Página {page + 1} de {pageCount}. Exibindo {pageStart + 1}–{pageStart + visibleQuestions.length} de {practiceQuestions.length} questões.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:border-teal-400 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Página anterior
          </button>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:border-teal-400 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima página
          </button>
        </div>
      </div>
      )}
      {onPracticeMore && (
        <button type="button" onClick={onPracticeMore} className="min-h-11 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-900 hover:bg-teal-100">
          Continuar praticando este tema
        </button>
      )}
    </div>
  );
};
