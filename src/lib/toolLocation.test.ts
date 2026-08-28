import { describe, expect, it } from 'vitest';
import { readToolLocation, toolLocationUrl } from './toolLocation';

describe('toolLocation', () => {
  it('restaura ferramenta, questão, filtros e prática editorial', () => {
    expect(readToolLocation('?tool=questions&question=A00%3Aq1&q=crase&q_bank=FGV&practice=editorial')).toMatchObject({
      tab: 'questions',
      questionId: 'A00:q1',
      editorialPractice: true,
      questionFilters: { query: 'crase', bank: 'FGV' },
    });
  });

  it('preserva a rota curricular ao serializar uma ferramenta', () => {
    expect(toolLocationUrl('https://test.local/?module=mod0&unit=IP-A00-G01', {
      tab: 'questions',
      questionId: 'A00:q1',
      questionFilters: { bank: 'CEBRASPE' },
    })).toContain('module=mod0&unit=IP-A00-G01&tool=questions&question=A00%3Aq1&q_bank=CEBRASPE');
  });
});
