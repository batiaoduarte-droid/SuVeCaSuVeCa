const EDITORIAL_FOOTER = /(?:www\.estrategiaconcursos\.com\.br|\blíngua portuguesa\s+\d+\s*$)/i;
const GENERIC_ITEM_DIRECTIVE = /^(?:no que se refere[^,]{0,180},\s*)?julgue (?:o|este) item (?:a seguir|subsequente)\.?$/i;
export const hasQuestionSupportEditorialLeak = (blocks) => (
  (Array.isArray(blocks) ? blocks : []).some((block) => {
    const text = String(block?.richText || block?.text || '').trim();
    return EDITORIAL_FOOTER.test(text) || GENERIC_ITEM_DIRECTIVE.test(text);
  })
);
