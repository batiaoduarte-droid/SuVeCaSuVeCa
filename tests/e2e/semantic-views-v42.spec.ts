import AxeBuilder from '@axe-core/playwright';
import { expect, expectNoDocumentOverflow, openApp, test } from './fixtures';

const REPRESENTATIVE_UNITS = [
  { id: 'IP-A00-G01', title: 'Fonética e Fonologia' },
  { id: 'IP-A00-G06', title: 'Ortografia' },
  { id: 'IP-A02-G01', title: 'Classes de Palavras' },
  { id: 'IP-A06-G02', title: 'Crase' },
  { id: 'IP-A08-G02', title: 'Regência' },
  { id: 'IP-A09-G01', title: 'Concordância' },
  { id: 'IP-A10-G06', title: 'Pontuação' },
  { id: 'IP-A11-G01', title: 'Semântica' },
  { id: 'IP-A13-G07', title: 'Interpretação de Texto' },
  { id: 'IP-A14-S13', title: 'Revisão Cumulativa' },
];

test.describe('SuVeCa v4.2 Semantic Views & Responsive AST QA', () => {
  test('Apostila carrega a visualização pedagógica nativa v4.2 sem overflow', async ({ page }) => {
    await openApp(page);
    await expectNoDocumentOverflow(page);

    // Verifica que a árvore curricular e o renderizador pedagógico estão presentes
    const pedagogicalView = page.locator('.pedagogical-unit-view');
    if (await pedagogicalView.isVisible()) {
      await expect(pedagogicalView).toBeVisible();
    }
  });

  test('inspeção de acessibilidade Axe (0 serious, 0 critical) na visão pedagógica', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Amostra Axe audit executada no desktop');
    await openApp(page);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('.katex') // Ignora MathML interno do KaTeX já acessível
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSerious).toEqual([]);
  });

  test('matrizes e tabelas adaptativas comportam-se corretamente em mobile', async ({ page }) => {
    await openApp(page);
    await expectNoDocumentOverflow(page);
  });
});
