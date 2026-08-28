import { describe, expect, it } from 'vitest';
import { hasQuestionSupportEditorialLeak, projectQuestionSupportBlocks } from './question-support-presentation.mjs';

describe('question support presentation projection', () => {
  it('preserva parágrafos, classifica a fonte e remove resíduos editoriais', () => {
    const projection = projectQuestionSupportBlocks([
      { type: 'paragraph', text: 'Primeiro parágrafo do texto.' },
      { type: 'paragraph', text: 'Autor. Título. In: Obra, 2024, pp. 10-12 (com adaptações)' },
      { type: 'paragraph', text: 'No que se refere ao texto, julgue o item a seguir.' },
      { type: 'paragraph', text: 'BACEN - Língua Portuguesa 116 www.estrategiaconcursos.com.br 154' },
    ]);

    expect(projection.blocks).toEqual([
      { type: 'paragraph', text: 'Primeiro parágrafo do texto.' },
      { type: 'source', text: 'Autor. Título. In: Obra, 2024, pp. 10-12 (com adaptações)' },
    ]);
    expect(projection.removedEditorialFragments).toBe(2);
    expect(projection.sourceBlocksClassified).toBe(1);
    expect(hasQuestionSupportEditorialLeak(projection.blocks)).toBe(false);
  });
});
