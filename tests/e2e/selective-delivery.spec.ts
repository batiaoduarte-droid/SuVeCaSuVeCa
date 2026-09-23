import { expect, openApp, test } from './fixtures';

test('a explicação não baixa questões e a navegação conserva a tentativa', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await openApp(page, '/?unit=IP-A13-G01&section=explanation');
  await expect(page.locator('.pedagogical-unit-view')).toBeVisible();
  expect(requests.filter(url => /question-pages|official-question-parts/.test(url))).toEqual([]);
  const section = page.locator('#IP-A13-G01-official-questions');
  await section.locator(':scope > summary').click();
  const first = section.locator('.question-block:visible').first();
  await expect(first).toBeVisible();
  await expect(section.locator('.question-block:visible')).toHaveCount(5);
  const options = first.locator('section[aria-label^="Alternativas de"] button');
  if (await options.count()) await options.first().click();
  await first.getByRole('button', { name: /confirmar tentativa/i }).click();
  await expect(first.getByText(/gabarito oficial/i)).toBeVisible();
  const pages = () => [...new Set(requests.filter(url => url.includes('/question-pages/')))];
  expect(pages()).toHaveLength(1);
  await section.getByRole('button', { name: 'Próxima página', exact: true }).click();
  await expect(section.locator('.question-block:visible')).toHaveCount(5);
  expect(pages()).toHaveLength(2);
  await section.getByRole('button', { name: 'Página anterior', exact: true }).click();
  await expect(section.locator('.question-block:visible').first().getByText(/gabarito oficial/i)).toBeVisible();
  await section.locator(':scope > summary').click();
  await section.locator(':scope > summary').click();
  await expect(section.locator('.question-block:visible').first().getByText(/gabarito oficial/i)).toBeVisible();
  expect(pages()).toHaveLength(2);
});

test('o painel PBL não baixa conteúdos de sessão antecipadamente', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await openApp(page, '/?tool=pbl');
  await expect(page.getByRole('heading', { name: /aprenda português resolvendo problemas reais/i }).first()).toBeVisible();
  expect(requests.filter(url => /runtime-parts|structure-parts|authored-parts|pbl_authored_packages/.test(url))).toEqual([]);
});
