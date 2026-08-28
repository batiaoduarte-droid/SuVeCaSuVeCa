import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const normalizedPath = path.join(root, 'public', 'knowledge', 'official-questions.normalized.json');
const viewsDir = path.join(root, 'public', 'knowledge', 'pedagogical', 'views');
const contextReference = /\b(?:texto\s+(?:[A-Z]{1,4}\d[A-Z]?\d?|anterior)|parágrafo\s+\d+|linha\s+\d+)/i;
const visualReference = /\b(?:destacad[ao]s?|sublinhad[ao]s?|grif[ao]d[ao]s?|negrito)\b/i;
const richEmphasis = /(?:\*\*[^*]+\*\*|\*[^*]+\*)/;

const fail = (message) => {
  console.error(`[question-presentations] FAIL: ${message}`);
  process.exitCode = 1;
};

const normalized = JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));
if (!Array.isArray(normalized)) {
  fail('official-questions.normalized.json must contain an array');
  process.exit();
}

const byOfficialRef = new Map();
for (const question of normalized) {
  const officialRef = question?.presentation?.provenance?.sourceOfficialQuestionRef;
  if (typeof officialRef === 'string' && officialRef) byOfficialRef.set(officialRef, question);
  if (typeof question?.primaryLessonId === 'string' && typeof question?.originalQuestionId === 'string') {
    byOfficialRef.set(`OQ-${question.primaryLessonId}-${question.originalQuestionId}`, question);
  }
  if (typeof question?.id === 'string' && question.id.includes(':')) {
    const [lessonId, ...sourceParts] = question.id.split(':');
    byOfficialRef.set(`OQ-${lessonId}-${sourceParts.join(':')}`, question);
  }
}

const viewOccurrences = [];
const viewQuestions = new Map();
const collectQuestions = (value) => {
  if (!value || typeof value !== 'object') return;
  if (typeof value.officialQuestionId === 'string') {
    viewOccurrences.push(value.officialQuestionId);
    if (!viewQuestions.has(value.officialQuestionId)) viewQuestions.set(value.officialQuestionId, value);
  }
  for (const nested of Object.values(value)) collectQuestions(nested);
};

for (const filename of fs.readdirSync(viewsDir)) {
  if (!filename.endsWith('.json') || filename === 'manifest.json') continue;
  collectQuestions(JSON.parse(fs.readFileSync(path.join(viewsDir, filename), 'utf8')));
}

const promptFor = (viewQuestion, normalizedQuestion) => String(
  normalizedQuestion?.prompt
  || viewQuestion?.questionPresentation?.stem
  || viewQuestion?.questionPayload?.prompt
  || viewQuestion?.prompt
  || ''
);
const viewSupportFor = (viewQuestion) => String(viewQuestion?.questionPayload?.support_text || '');
const presentationRichText = (question) => [
  question?.presentation?.commandRichText,
  question?.presentation?.supportRichText,
  ...Object.values(question?.presentation?.optionRichText || {}),
].filter(Boolean).join('\n');

const contextual = [];
const visual = [];
for (const [ref, viewQuestion] of viewQuestions) {
  const question = byOfficialRef.get(ref);
  const prompt = promptFor(viewQuestion, question);
  if (contextReference.test(prompt)) {
    const sourceBacked = Boolean(
      viewSupportFor(viewQuestion).trim()
      || (question?.presentation?.contextStatus === 'source_backed' && String(question?.supportText || '').trim())
    );
    contextual.push({ ref, sourceBacked });
  }
  if (visualReference.test(prompt)) {
    const sourceBacked = question?.presentation?.formattingStatus === 'source_backed'
      && richEmphasis.test(presentationRichText(question));
    visual.push({ ref, sourceBacked });
  }
}

const highlighted = byOfficialRef.get('OQ-A00-aula00.q0006');
const highlightedCommand = String(highlighted?.presentation?.commandRichText || '');
if (!highlightedCommand.includes('**processo**') || !highlightedCommand.includes('**amadurecimento**')) {
  fail('OQ-A00-aula00.q0006 lost its two source-backed typographic highlights');
}

const recovered = byOfficialRef.get('OQ-A00-aula00.q0077');
if (
  recovered?.presentation?.contextStatus !== 'source_backed'
  || recovered?.presentation?.provenance?.recoveredParallelSupport !== true
  || !String(recovered?.supportText || '').includes('Texto CB2A1')
) {
  fail('OQ-A00-aula00.q0077 does not contain the recovered source-backed CB2A1 text');
}

for (const { ref } of visual) {
  const question = byOfficialRef.get(ref);
  if (question && !['source_backed', 'source_missing'].includes(question?.presentation?.formattingStatus)) {
    fail(`${ref} cites visual emphasis but has no explicit formatting safety status`);
  }
}

console.log(JSON.stringify({
  status: process.exitCode ? 'fail' : 'ok',
  viewQuestionOccurrences: viewOccurrences.length,
  uniqueViewQuestionRefs: viewQuestions.size,
  normalizedViewQuestionRefs: [...viewQuestions.keys()].filter((ref) => byOfficialRef.has(ref)).length,
  fallbackViewQuestionRefs: [...viewQuestions.keys()].filter((ref) => !byOfficialRef.has(ref)).length,
  contextualQuestionRefs: contextual.length,
  sourceBackedContextRefs: contextual.filter((item) => item.sourceBacked).length,
  failClosedContextRefs: contextual.filter((item) => !item.sourceBacked).length,
  visualReferenceQuestionRefs: visual.length,
  sourceBackedVisualRefs: visual.filter((item) => item.sourceBacked).length,
  failClosedVisualRefs: visual.filter((item) => !item.sourceBacked).length,
  highlightedRegression: 'OQ-A00-aula00.q0006',
  recoveredSupportRegression: 'OQ-A00-aula00.q0077',
}, null, 2));
