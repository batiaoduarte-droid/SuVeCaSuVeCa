import fs from 'node:fs';
import path from 'node:path';
import type { PBLQuestionPresentation } from '../../../types/pbl';

export const loadPublishedQuestionPresentations = (): Record<string, PBLQuestionPresentation> => {
  const result: Record<string, PBLQuestionPresentation> = {};
  const authoredFile = path.resolve('public/knowledge/pbl/pbl_authored_questions.json');
  if (fs.existsSync(authoredFile)) {
    Object.assign(
      result,
      JSON.parse(fs.readFileSync(authoredFile, 'utf8')) as Record<string, PBLQuestionPresentation>
    );
  }

  const partsDir = path.resolve('public/knowledge/official-question-parts');
  if (fs.existsSync(partsDir)) {
    for (const file of fs.readdirSync(partsDir).filter((name) => name.startsWith('official-questions.normalized.part-'))) {
      const questions = JSON.parse(fs.readFileSync(path.join(partsDir, file), 'utf8')) as Array<Record<string, any>>;
      for (const question of questions) {
        if (!question.id || !question.prompt || !question.correctAnswer) continue;
        const questionRef = `OQ-${String(question.id).replace(':', '-')}`;
        result[questionRef] = {
          questionRef,
          questionType: question.options?.length ? 'multiple_choice' : 'true_false',
          supportText: question.supportText,
          prompt: question.prompt,
          options: (question.options || []).map((option: Record<string, string>, index: number) => ({
            label: String(option.letter || option.label || String.fromCharCode(65 + index)).toUpperCase(),
            text: option.text || '',
          })),
          correctAnswer: question.correctAnswer,
          commentary: question.commentary,
          examBoard: question.bank,
          year: question.year,
        };
      }
    }
  }

  const viewsDir = path.resolve('public/knowledge/pedagogical/views');
  for (const file of fs.readdirSync(viewsDir).filter((name) => name.endsWith('.json') && name !== 'manifest.json')) {
    const view = JSON.parse(fs.readFileSync(path.join(viewsDir, file), 'utf8')) as { officialQuestions?: Array<Record<string, any>> };
    for (const question of view.officialQuestions || []) {
      const payload = question.questionPayload || question;
      const answerPayload = question.answerPayload || {};
      const correctAnswer = answerPayload.answer || question.officialAnswer;
      // Incomplete published presentations remain unavailable; never invent a key.
      if (!correctAnswer) continue;
      if (!payload.prompt) continue;
      const questionRef = question.officialQuestionId || question.questionId;
      const presentation: PBLQuestionPresentation = {
        questionRef,
        questionType: payload.options?.length ? 'multiple_choice' : 'true_false',
        supportText: payload.support_text || payload.supportText,
        prompt: payload.prompt,
        options: (payload.options || []).map((option: Record<string, string>, index: number) => ({
          label: String(option.label || option.letter || String.fromCharCode(65 + index)).toUpperCase(),
          text: option.text || '',
        })),
        correctAnswer,
        commentary: answerPayload.commentary || question.explanation,
        examBoard: payload.exam_board || question.examBoard,
        organization: payload.organization || question.organization,
        year: payload.year || question.year,
      };
      const candidateRefs = [
        question.officialQuestionId,
        question.questionId,
        question.questionId ? `OQ-${question.questionId}` : undefined,
        (question.lessonId && question.questionId) ? `OQ-${question.lessonId}-${question.questionId}` : undefined,
      ].filter(Boolean) as string[];
      for (const ref of candidateRefs) {
        if (!result[ref]) result[ref] = { ...presentation, questionRef: ref };
      }
    }
  }
  return result;
};
