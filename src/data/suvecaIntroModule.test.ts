import { describe, expect, it } from 'vitest';
import { SUVECA_INTRO_MODULE } from './suvecaIntroModule';
import { MODULES_DATA } from './modulesData';
import { getLessonName, getLessonSearchLabel } from './lessonCatalog';

describe('SUVECA_INTRO_MODULE', () => {
  it('possui identificação e estrutura válidas', () => {
    expect(SUVECA_INTRO_MODULE.id).toBe('mod-intro');
    expect(SUVECA_INTRO_MODULE.title).toBe('Fundamentos do Método SuVeCA');
    expect(SUVECA_INTRO_MODULE.sections).toHaveLength(6);
    expect(SUVECA_INTRO_MODULE.questions).toHaveLength(5);
  });

  it('contém as 6 seções didáticas projetadas uma vez em guias interativos', () => {
    const titles = SUVECA_INTRO_MODULE.sections.map((s) => s.title);
    expect(titles[0]).toContain('1. O que é o Método SuVeCA');
    expect(titles[1]).toContain('2. A Metáfora do Trem');
    expect(titles[2]).toContain('3. O Código Visual');
    expect(titles[3]).toContain('4. O Algoritmo Decisório');
    expect(titles[4]).toContain('5. Os 5 Padrões Estruturais');
    expect(titles[5]).toContain('6. As 7 Camadas');

    for (const section of SUVECA_INTRO_MODULE.sections) {
      expect(section.contentMarkdown).toMatch(/^```text\n.+\n```$/);
      expect(section.contentMarkdown).not.toContain('Detalhamento dos 8 Passos');
      expect(section.contentMarkdown).not.toContain('As 5 Escalas Detalhadas');
      expect(section.highlightBox).toBeUndefined();
      expect(section.keyTable).toBeUndefined();
      expect(section.summary?.length).toBeGreaterThan(20);
    }
  });

  it('possui 5 questões com comentários, resposta e regra decisiva', () => {
    expect(SUVECA_INTRO_MODULE.questions?.every((q) => q.questionText && q.commentary && q.correctAnswer)).toBe(true);
    expect(SUVECA_INTRO_MODULE.questions?.every((q) => q.resolution?.decisiveRule)).toBe(true);
  });

  it('integra-se como primeiro módulo em MODULES_DATA mantendo a integridade das 15 aulas', () => {
    expect(MODULES_DATA[0].id).toBe('mod-intro');
    expect(MODULES_DATA[1].id).toBe('mod0');
    expect(MODULES_DATA.filter((m) => /^mod\d+$/.test(m.id))).toHaveLength(15);
  });

  it('reconhece mod-intro nos utilitários de catálogo de lições', () => {
    expect(getLessonName('mod-intro')).toBe('Fundamentos SuVeCA');
    expect(getLessonName('mod-intro', 'full')).toContain('Fundamentos do Método SuVeCA');
    expect(getLessonSearchLabel('mod-intro')).toContain('Fundamentos SuVeCA');
  });
});
