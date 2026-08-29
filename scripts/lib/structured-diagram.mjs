import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const GLYPH_PATTERN = /[┌┐└┘├┤┬┴┼│▼▲─═]/gu;

const normalizeSource = (source) => String(source || '').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('pt-BR');
const sourceHash = (source) => crypto.createHash('sha256').update(normalizeSource(source), 'utf8').digest('hex');
const overlayPath = path.resolve(process.cwd(), 'public/knowledge/pedagogical/structured-map-presentations.json');
const curatedByHash = (() => {
  if (!fs.existsSync(overlayPath)) return new Map();
  const payload = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  return new Map((payload.presentations || []).map((record) => [record.sourceHash, record.structure]));
})();

export const extractStructuredSource = (markdown) => {
  const source = String(markdown || '');
  const fenced = [...source.matchAll(/```(?:text)?\s*\n([\s\S]*?)\n```/gi)]
    .map((match) => match[1].trim())
    .filter((candidate) => (candidate.match(GLYPH_PATTERN) || []).length >= 2);
  if (fenced.length) return fenced.sort((a, b) => b.length - a.length)[0];
  return (source.match(GLYPH_PATTERN) || []).length >= 3 ? source.trim() : '';
};

export const projectStructuredDiagram = (source) => {
  const compact = String(source || '').replace(/\s+/gu, ' ').trim();
  if (!compact) return undefined;
  const curated = curatedByHash.get(sourceHash(source));
  if (curated) return structuredClone(curated);
  return undefined;
};

export const projectStructuredDiagramFromMarkdown = (markdown) => {
  const sourceText = extractStructuredSource(markdown);
  if (!sourceText) return undefined;
  const structure = projectStructuredDiagram(sourceText);
  if (!structure) return undefined;
  return {
    sourceText,
    structure,
  };
};
