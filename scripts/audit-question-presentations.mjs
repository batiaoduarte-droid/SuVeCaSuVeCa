import fs from 'node:fs';
import path from 'node:path';
import { hasDuplicatedInlineOptions } from './lib/official-question-presentation.mjs';
import { hasQuestionSupportEditorialLeak } from './lib/question-support-presentation.mjs';

const root = process.cwd();
const knowledgeDir = path.join(root, 'public', 'knowledge');
const questionManifestPath = path.join(knowledgeDir, 'official-questions.manifest.json');
const fallbackPath = path.join(root, 'public', 'knowledge', 'official-question-presentation-fallbacks.json');
const viewsDir = path.join(root, 'public', 'knowledge', 'pedagogical', 'views');
const contextReference = /\b(?:texto\s+(?:[A-Z]{1,4}\d[A-Z]?\d?|anterior)|parágrafo\s+\d+|linha\s+\d+)/i;
const visualReference = /\b(?:destacad[ao]s?|sublinhad[ao]s?|grif[ao]d[ao]s?|negrito)\b/i;
const richEmphasis = /(?:\*\*[^*]+\*\*|\*[^*]+\*)/;

const fail = (message) => {
  console.error(`[question-presentations] FAIL: ${message}`);
  process.exitCode = 1;
};

const questionManifest = JSON.parse(fs.readFileSync(questionManifestPath, 'utf8'));
const normalized = (questionManifest.shards || []).flatMap((shard) =>
  JSON.parse(fs.readFileSync(path.join(knowledgeDir, shard.normalized.file), 'utf8'))
);
const presentationFallbacks = fs.existsSync(fallbackPath)
  ? JSON.parse(fs.readFileSync(fallbackPath, 'utf8')).presentations || {}
  : {};
if (!Array.isArray(normalized)) {
  fail('Os shards normalizados de questões devem formar um array');
  process.exit();
}

const byOfficialRef = new Map();
const duplicatedInlineOptions = [];
const supportEditorialLeaks = [];
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
  for (const alias of question?.officialQuestionAliases || []) {
    if (typeof alias === 'string' && alias) byOfficialRef.set(alias, question);
  }
  const learnerCommand = question?.presentation?.commandRichText
    || question?.presentation?.command
    || question?.prompt;
  if (hasDuplicatedInlineOptions(learnerCommand, question?.options)) {
    duplicatedInlineOptions.push(question.id || '(sem id)');
  }
  if (hasQuestionSupportEditorialLeak(question?.presentation?.supportBlocks)) {
    supportEditorialLeaks.push(question.id || '(sem id)');
  }
}
for (const [officialRef, question] of Object.entries(presentationFallbacks)) {
  if (!byOfficialRef.has(officialRef)) byOfficialRef.set(officialRef, question);
}

if (duplicatedInlineOptions.length) {
  fail(`${duplicatedInlineOptions.length} questões repetem alternativas no comando: ${duplicatedInlineOptions.slice(0, 10).join(', ')}`);
}
if (supportEditorialLeaks.length) {
  fail(`${supportEditorialLeaks.length} textos de apoio contêm resíduos editoriais: ${supportEditorialLeaks.slice(0, 10).join(', ')}`);
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
const hasSourceVisual = (question) => (question?.presentation?.media || [])
  .some((asset) => typeof asset?.url === 'string' && asset.url.trim());

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
      && (richEmphasis.test(presentationRichText(question)) || hasSourceVisual(question));
    visual.push({ ref, sourceBacked });
  }
}

const highlighted = byOfficialRef.get('OQ-A00-aula00.q0006');
const highlightedCommand = String(highlighted?.presentation?.commandRichText || '');
if (!highlightedCommand.includes('**processo**') || !highlightedCommand.includes('**amadurecimento**')) {
  fail('OQ-A00-aula00.q0006 lost its two source-backed typographic highlights');
}

const recoveredCharge = byOfficialRef.get('OQ-A00-aula00.q0038');
if (
  recoveredCharge?.presentation?.formattingStatus !== 'source_backed'
  || recoveredCharge?.presentation?.mediaKind !== 'visual_essential'
  || !recoveredCharge?.presentation?.media?.some((asset) => asset.url === '/knowledge/question-assets/OQ-A00-aula00.q0038.png')
) {
  fail('OQ-A00-aula00.q0038 lost its source-backed original charge');
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
  failClosedContextRefIds: contextual.filter((item) => !item.sourceBacked).map((item) => item.ref).sort(),
  visualReferenceQuestionRefs: visual.length,
  sourceBackedVisualRefs: visual.filter((item) => item.sourceBacked).length,
  failClosedVisualRefs: visual.filter((item) => !item.sourceBacked).length,
  failClosedVisualRefIds: visual.filter((item) => !item.sourceBacked).map((item) => item.ref).sort(),
  highlightedRegression: 'OQ-A00-aula00.q0006',
  recoveredVisualRegression: 'OQ-A00-aula00.q0038',
  recoveredSupportRegression: 'OQ-A00-aula00.q0077',
  duplicatedInlineOptions: duplicatedInlineOptions.length,
  supportEditorialLeaks: supportEditorialLeaks.length,
}, null, 2));
