import { describe, expect, it } from 'vitest';
import { containsTechnicalReference, toLearnerFacingContent } from './learnerContent';

describe('learner-facing AI content', () => {
  it('remove referências técnicas sem alterar o conteúdo pedagógico', () => {
    const result = toLearnerFacingContent(
      '**Regra:** o verbo é impessoal. [PASSAGE:source:abc#1-20]\nCompare com existir. QUESTION:123 KB:abc-def',
    );
    expect(result).toContain('**Regra:** o verbo é impessoal.');
    expect(result).toContain('Compare com existir.');
    expect(containsTechnicalReference(result)).toBe(false);
  });
});
