import type { OfficialQuestionView } from '../types/pedagogicalView';
import type { NormalizedQuestion } from './officialQuestionsLoader';
import { hasSourceBackedVisualPresentation, requiresIdentifiedContext, requiresVisualEmphasis } from './questionPresentationSafety';
export const questionReference = (question: OfficialQuestionView): string => {
  const payload = question.questionPayload || {};
  return question.officialQuestionId
    || question.sourceQuestionId
    || payload.question_id
    || question.questionId
    || '';
};

export const normalizedQuestionFor = (
  question: OfficialQuestionView,
  lessonId: string,
  map: Record<string, NormalizedQuestion>,
): NormalizedQuestion | undefined => {
  const payload = question.questionPayload || {};
  const sourceQuestionId = question.sourceQuestionId || payload.question_id || question.questionId || '';
  const questionId = question.officialQuestionId || question.questionId || sourceQuestionId;
  return map[questionId] || map[sourceQuestionId] || map[`${lessonId}:${sourceQuestionId}`];
};

export const hasSafePracticePresentation = (
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

