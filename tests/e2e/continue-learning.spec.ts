import { expect, openApp, test } from './fixtures';

test('Continuar aula abre a unidade correta em modo de estudo', async ({ page }) => {
  await openApp(page);

  const continueButton = page.getByRole('button', { name: /Continuar aula/i });
  await expect(continueButton).toBeVisible();
  await continueButton.click();

  await expect(page.getByText(/Foco Total —/i)).toBeVisible();
  await expect(page.getByText('Continue de onde parou')).toBeHidden();
  await expect(page).toHaveURL(/\?module=mod\d+&unit=/);
  await expect(page.locator('[id^="module-unit-"]').first()).toBeVisible();
});
