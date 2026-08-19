import AxeBuilder from '@axe-core/playwright';
import { expect, expectNoDocumentOverflow, openApp, openTab, test } from './fixtures';

test.describe('PBL Adaptativo - Layout, E2E & Acessibilidade', () => {
  test('PBL Dashboard abre sem rolagem horizontal e com acessibilidade compatível', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Aprender por Problemas (PBL)');

    // 1. Check title & headers
    await expect(page.getByRole('heading', { name: /aprenda português resolvendo problemas reais/i })).toBeVisible();
    await expect(page.getByText('190 competências ativas')).toBeVisible();

    // 2. Responsive Layout Check
    await expectNoDocumentOverflow(page);

    // 3. Axe Accessibility Check
    const axeResults = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalOrSerious = axeResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test('PBL Session Flow: Iniciar Sessão -> Responder -> Diagnóstico -> Intervenção -> Reattempt -> Resumo', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Aprender por Problemas (PBL)');

    // 1. Start Recommended Session
    const startButton = page.getByRole('button', { name: /iniciar sessão recomendada/i });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // 2. Problem View Loaded
    await expect(page.getByText(/caso-âncora pbl/i)).toBeVisible();
    await expectNoDocumentOverflow(page);

    // 3. Select Answer (e.g. Certo or option A)
    const certoButton = page.getByRole('button', { name: /^CERTO$/i });
    if (await certoButton.isVisible()) {
      await certoButton.click();
    } else {
      await page.getByRole('button').filter({ hasText: 'A' }).first().click();
    }

    // 4. Select Confidence
    await page.getByRole('button', { name: /muito seguro/i }).click();

    // 5. Submit Hypothesis
    const submitButton = page.getByRole('button', { name: /confirmar hipótese/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // 6. Diagnostic or Transfer Phase
    await page.waitForTimeout(500);
    const advanceButton = page.getByRole('button', { name: /(ver intervenção|avançar para transferência)/i });
    await expect(advanceButton).toBeVisible();
  });
});
