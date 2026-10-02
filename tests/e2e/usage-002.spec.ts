import { test, expect, openApp, expectNoDocumentOverflow } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test('Feynman abre no viewport, contém foco e retorna à leitura', async ({ page }, testInfo) => {
  await openApp(page, '/?module=mod0&unit=IP-A00-G06&section=recall');
  const trigger = page.getByRole('button', { name: /Feynman/i }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /Método Feynman/ });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Fechar modal', exact: true });
  const rect = await close.boundingBox();
  await testInfo.attach('modal-position', { body: JSON.stringify({ rect, viewport: page.viewportSize(), scrollY: await page.evaluate(() => scrollY) }), contentType: 'application/json' });
  expect(rect).not.toBeNull();
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(rect!.width).toBeGreaterThanOrEqual(44);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(close).toBeFocused();
  await expectNoDocumentOverflow(page);
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('feynman-visible.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('rodapé avança dentro da aula e anotações flutuantes preservam o texto', async ({ page }) => {
  await openApp(page, '/?module=mod0&unit=IP-A00-G06&section=examples');
  await page.getByRole('button', { name: 'Ferramentas de leitura', exact: true }).click();
  await page.getByRole('navigation', { name: 'Ferramentas de leitura' }).getByRole('button', { name: 'Anotações', exact: true }).click();
  const notes = page.getByRole('dialog', { name: 'Anotações da unidade' });
  await expect(notes).toBeVisible();
  const bounds = await notes.boundingBox();
  expect(Math.round(bounds!.x + bounds!.width)).toBe(page.viewportSize()!.width);
  expect(Math.round(bounds!.height)).toBe(page.viewportSize()!.height);
  if (page.viewportSize()!.width >= 768) expect(bounds!.width).toBeLessThanOrEqual(520);
  await notes.getByRole('textbox').fill('Minha anotação durante a leitura.');
  await notes.getByRole('button', { name: 'Fechar anotações da unidade' }).click();
  await page.getByRole('button', { name: 'Ferramentas de leitura', exact: true }).click();
  await page.getByRole('navigation', { name: 'Ferramentas de leitura' }).getByRole('button', { name: 'Anotações', exact: true }).click();
  await expect(notes.getByRole('textbox')).toContainText('Minha anotação durante a leitura.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Ferramentas de leitura', exact: true })).toBeFocused();
  const footer = page.getByRole('navigation', { name: 'Continuar percurso de estudo' });
  await footer.getByRole('button', { name: /^Próximo:/ }).click();
  await expect(page).toHaveURL(/module=mod0/);
  await expect(page).not.toHaveURL(/unit=IP-A00-G06/);
  await expectNoDocumentOverflow(page);
});

test('exemplos mostram enunciados antes da resolução e tabela como consulta', async ({ page }) => {
  await openApp(page, '/?module=mod0&unit=IP-A00-G06&section=examples');
  const examples = page.locator('#IP-A00-G06-examples');
  const pair = examples.locator('article').filter({ has: page.getByRole('heading', { name: /Questão 9/ }) });
  await expect(pair.getByText(/Item A \(DPE-DF\)/)).toBeVisible();
  await expect(pair.getByText(/Item B \(MPE-SC Promotor\)/)).toBeVisible();
  await expect(pair.getByText(/Gabarito/)).toHaveCount(0);
  await pair.getByRole('button', { name: 'Ver resolução' }).first().click();
  await expect(pair.getByText(/Gabarito/)).toHaveCount(1);
  await expect(examples.getByRole('heading', { name: /Quadro de fixação de nomes compostos/ })).toBeVisible();
});
