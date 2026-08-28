const EDITORIAL_FOOTER = /(?:www\.estrategiaconcursos\.com\.br|\blíngua portuguesa\s+\d+\s*$)/i;
const GENERIC_ITEM_DIRECTIVE = /^(?:no que se refere[^,]{0,180},\s*)?julgue (?:o|este) item (?:a seguir|subsequente)\.?$/i;
const BIBLIOGRAPHIC_SOURCE = /(?:\bIn:\s|\b(?:p|pp)\.\s*\d|\bcom adaptações\b|^adaptad[oa] de\b)/i;

export const projectQuestionSupportBlocks = (blocks) => {
  const projected = [];
  let removedEditorialFragments = 0;
  let sourceBlocksClassified = 0;

  for (const block of Array.isArray(blocks) ? blocks : []) {
    const text = String(block?.richText || block?.text || '').trim();
    if (!text) continue;
    if (EDITORIAL_FOOTER.test(text) || GENERIC_ITEM_DIRECTIVE.test(text)) {
      removedEditorialFragments += 1;
      continue;
    }
    const sourceLike = block.type === 'source' || block.type === 'caption' || BIBLIOGRAPHIC_SOURCE.test(text);
    if (sourceLike && block.type !== 'source') sourceBlocksClassified += 1;
    projected.push(sourceLike ? { ...block, type: 'source' } : block);
  }

  return { blocks: projected, removedEditorialFragments, sourceBlocksClassified };
};

export const hasQuestionSupportEditorialLeak = (blocks) => (
  (Array.isArray(blocks) ? blocks : []).some((block) => {
    const text = String(block?.richText || block?.text || '').trim();
    return EDITORIAL_FOOTER.test(text) || GENERIC_ITEM_DIRECTIVE.test(text);
  })
);
