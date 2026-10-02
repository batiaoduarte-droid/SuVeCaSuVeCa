import { test, expect, openApp, expectNoDocumentOverflow } from './fixtures';
import type { Page } from '@playwright/test';

const username = 'regression.user';
const displayName = 'Pessoa de Regressão';
const password = 'conta-regressao-123';
const fixtureId = 'local-auth-regression-fixture';
const fixtureUid = `local-user-${fixtureId}`;
const existingCard = [{
  id: 'local-auth-saved-card', errorId: 'local-auth-saved-error', source: 'caderno', topic: 'Estudo preservado',
  front: 'Anotação anterior da conta pessoal', back: 'Conteúdo preservado após sair e entrar.',
  createdAt: '2026-08-01T00:00:00.000Z', correctCount: 0, incorrectCount: 0,
}];

async function openLogin(page: Page) {
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Acesso à Plataforma' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Usuário ou e-mail', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Senha', { exact: true })).toBeVisible();
  return dialog;
}

async function expectPersonalSession(page: Page, uid: string) {
  await expect(page.getByRole('dialog', { name: 'Acesso à Plataforma' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('suveca_active_local_user'))).toBe(uid);
}

test('Entrar permite criar e acessar a mesma conta por usuário/e-mail, preservando uid e estudo após sair e recarregar', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await openApp(page);
  let dialog = await openLogin(page);
  await expect(dialog.getByLabel('Usuário ou e-mail', { exact: true })).toBeFocused();
  const closeButton = dialog.getByRole('button', { name: 'Fechar janela', exact: true });
  const googleButton = dialog.getByRole('button', { name: 'Ou conectar com conta Google', exact: true });
  await googleButton.focus();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(googleButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeFocused();
  dialog = await openLogin(page);
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('local-login.png') });

  await dialog.getByRole('tab', { name: 'Criar Conta', exact: true }).click();
  await expect(dialog.getByLabel('Seu Nome de Exibição', { exact: true })).toBeFocused();
  await dialog.getByLabel('Seu Nome de Exibição', { exact: true }).fill(displayName);
  await dialog.locator('#reg-username').fill(username);
  await dialog.getByLabel('Senha', { exact: true }).fill(password);
  await dialog.getByLabel('Confirmar Senha', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Criar Conta e Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();

  const uid = await page.evaluate(() => localStorage.getItem('suveca_active_local_user'));
  expect(uid).toMatch(/^local-user-u_/);
  await expectPersonalSession(page, uid!);
  await page.evaluate(({ uid, cards }) => localStorage.setItem(`suveca_flashcards_${uid}`, JSON.stringify(cards)), { uid, cards: existingCard });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectPersonalSession(page, uid!);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('suveca_local_dev_auth_enabled'))).not.toBe('true');

  dialog = await openLogin(page);
  await dialog.getByLabel('Usuário ou e-mail', { exact: true }).fill(`${username}@suveca.local`);
  await dialog.getByLabel('Senha', { exact: true }).fill('senha-incorreta');
  await dialog.getByRole('button', { name: 'Entrar na Minha Conta', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Senha incorreta. Tente novamente.');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('suveca_local_dev_auth_enabled'))).not.toBe('true');

  await dialog.getByLabel('Senha', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Entrar na Minha Conta', exact: true }).click();
  await expectPersonalSession(page, uid!);
  expect(await page.evaluate(({ uid }) => JSON.parse(localStorage.getItem(`suveca_flashcards_${uid}`)!), { uid })).toEqual(existingCard);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('suveca_local_accounts')!).length)).toBe(1);

  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  dialog = await openLogin(page);
  await dialog.getByLabel('Usuário ou e-mail', { exact: true }).fill(username);
  await dialog.getByLabel('Senha', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Entrar na Minha Conta', exact: true }).click();
  await expectPersonalSession(page, uid!);
});

test('atalho Eu escolhe a conta de teste e Trocar conta recupera o acesso à conta pessoal já cadastrada', async ({ page }) => {
  await page.addInitScript(({ username, displayName, fixtureId, fixtureUid, cards }) => {
    if (localStorage.getItem('local-auth-regression-seeded')) return;
    localStorage.setItem('suveca_local_accounts', JSON.stringify([{
      id: fixtureId, username, displayName,
      passwordHash: '6b9206937562a81c2efa1601135bd28faf33dae63f60d7eb21f9792486c47728',
      createdAt: '2026-08-01T00:00:00.000Z',
    }]));
    localStorage.setItem('suveca_active_local_user', fixtureUid);
    localStorage.setItem(`suveca_flashcards_${fixtureUid}`, JSON.stringify(cards));
    localStorage.setItem('local-auth-regression-seeded', 'true');
  }, { username, displayName, fixtureId, fixtureUid, cards: existingCard });
  await openApp(page);

  await page.getByTitle('Entrar diretamente como usuário de teste local (sem Firebase/Google)', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair do modo local', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('suveca_active_local_user'))).toBe('local-test-user');
  await page.getByRole('button', { name: 'Trocar conta', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Acesso à Plataforma' });
  await expect(dialog).toBeVisible();
  await expectNoDocumentOverflow(page);
  await dialog.getByLabel('Usuário ou e-mail', { exact: true }).fill(`${username}@suveca.local`);
  await dialog.getByLabel('Senha', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Entrar na Minha Conta', exact: true }).click();
  await expectPersonalSession(page, fixtureUid);
  expect(await page.evaluate(({ uid }) => JSON.parse(localStorage.getItem(`suveca_flashcards_${uid}`)!), { uid: fixtureUid })).toEqual(existingCard);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('suveca_local_accounts')!).length)).toBe(1);
});
