// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { readPublishedView, readVerifiedJson } from '../../scripts/lib/published-data.mjs';
import { fetchNormalizedQuestionsByRefs } from './officialQuestionsLoader';
import { hasSafePracticePresentation, questionReference } from './officialPracticePresentation';
import { resetPublishedDataCache } from './publishedData';
it('preserves every occurrence and applies the same eligibility rule to all published pages', async () => {
  resetPublishedDataCache();
  const root = path.resolve('public/knowledge/pedagogical');
  const files = fs.readdirSync(path.join(root, 'views')).filter(name => /^IP-A\d{2}-G\d{2}\.json$/.test(name));
  expect(files).toHaveLength(102);
  for (const name of files) {
    const file = path.join(root, 'views', name);
    const body = JSON.parse(fs.readFileSync(file, 'utf8'));
    const full = readPublishedView(file);
    const questions = full.officialQuestions;
    expect(body).not.toHaveProperty('officialQuestions');
    const normalized = await fetchNormalizedQuestionsByRefs(questions.map(questionReference).filter(Boolean), full.unit.lessonId);
    const eligible = questions.map((question: any, index: number) => ({ question, index })).filter((r: any) => hasSafePracticePresentation(r.question, full.unit.lessonId, normalized));
    const pages = body.questionDelivery.pages.flatMap((descriptor: any) => {
      expect(descriptor.count).toBeGreaterThan(0);
      expect(descriptor.bytes).toBeLessThanOrEqual(1024 * 1024);
      return readVerifiedJson(root, descriptor);
    });
    expect(pages, name).toEqual(eligible);
    expect(body.questionDelivery.availableCount, name).toBe(eligible.length);
  }
}, 60000);
