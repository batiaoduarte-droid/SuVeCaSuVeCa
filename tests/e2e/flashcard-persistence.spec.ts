import { test, expect, openApp, openTab, expectNoDocumentOverflow } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { EDITORIAL_FLASHCARDS } from '../../src/data/editorialFlashcards.generated';

test('card revisado permanece na biblioteca após recarregar, inclusive sem registro de origem', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('suveca_local_dev_auth_enabled', 'true');
    localStorage.setItem('suveca_active_local_user', 'local-test-user');
    if (!localStorage.getItem('flashcard-fixture-seeded')) {
      localStorage.setItem('suveca_flashcards_local-test-user', JSON.stringify([{
        id: 'fixture-personal', errorId: 'deleted-origin', source: 'caderno', topic: 'Revisão de concordância',
        front: 'Qual é a concordância de haver existencial?', back: 'Haver existencial permanece no singular.',
        createdAt: '2026-08-01T00:00:00.000Z', correctCount: 0, incorrectCount: 0,
      }]));
      localStorage.setItem('flashcard-fixture-seeded', 'true');
    }
  });
  await openApp(page);
  await openTab(page, 'Flashcards');
  await page.getByRole('button', { name: 'Meu Caderno (1/1)' }).click();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: 'Bom', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir revisão' }).click();
  await expect(page.getByRole('button', { name: 'Meu Caderno (0/1)' })).toBeVisible();
  await page.reload();
  await openTab(page, 'Flashcards');
  await page.getByRole('button', { name: 'Meu Caderno (0/1)' }).click();
  await page.getByRole('button', { name: 'Biblioteca e histórico' }).click();
  const library = page.getByRole('region', { name: 'Biblioteca de flashcards' });
  await expect(library.getByText('Qual é a concordância de haver existencial?')).toBeVisible();
  await expect(library.getByText(/registro de origem não está/)).toBeVisible();
  await library.getByText('Consultar verso', { exact: true }).click();
  await expect(library.getByText('Haver existencial permanece no singular.')).toBeVisible();
  await expectNoDocumentOverflow(page);
  const axe = await new AxeBuilder({ page }).include('[aria-label="Biblioteca de flashcards"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('flashcard-library.png') });
  await library.getByRole('button', { name: 'Arquivar card' }).click();
  await expect(library.getByText('Arquivado', { exact: true })).toBeVisible();
  await library.getByRole('button', { name: 'Restaurar card' }).click();
  await expect(library.getByRole('button', { name: 'Estudar livremente' })).toBeVisible();
});

test('versos reais preservam o julgamento editorial, as condições e o complemento útil', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    localStorage.setItem('suveca_local_dev_auth_enabled', 'true');
    localStorage.setItem('suveca_active_local_user', 'local-test-user');
  });
  await openApp(page);
  await openTab(page, 'Flashcards');
  await page.getByRole('button', { name: /^Base editorial/ }).click();
  await page.getByRole('button', { name: 'Biblioteca e histórico' }).click();
  const library = page.getByRole('region', { name: 'Biblioteca de flashcards' });
  const cases = [
    ['a00-g05-001', 'incorrect'], ['a09-g02-003', 'incorrect'],
    ['a02-g03-008', 'invalid_transform'], ['a01-g01-011', 'incorrect'],
    ['a10-g01-011', 'incorrect'], ['a02-g01-006', 'invalid_transform'],
    ['a00-g01-002', 'boundary'], ['a00-g01-009', 'boundary'], ['a00-g01-003', 'valid_contrast'],
  ] as const;
  for (const [suffix, role] of cases) {
    const card = EDITORIAL_FLASHCARDS.find(c => c.id === `editorial-flash-ip-${suffix}`)!;
    await library.getByRole('searchbox', { name: 'Buscar na biblioteca' }).fill(card.front);
    const article = library.getByRole('article').filter({ hasText: card.front });
    await expect(article).toHaveCount(1);
    await article.getByText('Consultar verso', { exact: true }).click();
    await expect(article.locator(`[data-example-role="${role}"]`)).toBeVisible();
    if (role === 'invalid_transform') {
      await expect(article.getByText('Operação inválida', { exact: true })).toBeVisible();
      await expect(article.locator('[data-example-role="incorrect"]')).toHaveCount(0);
    }
    if (suffix === 'a02-g01-006') {
      await expect(article).toContainText('modo adequado ao conector e ao contexto');
      await expect(article).not.toContainText('exigem o modo indicativo');
    }
    await expectNoDocumentOverflow(page);
    const axe = await new AxeBuilder({ page }).include('[aria-label="Biblioteca de flashcards"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(axe.violations, suffix).toEqual([]);
    if (suffix === 'a02-g03-008') await page.screenshot({ path: testInfo.outputPath('substituicao-invalida.png') });
  }
  for (const suffix of ['a00-g01-001', 'a10-g01-007']) {
    const card = EDITORIAL_FLASHCARDS.find(c => c.id === `editorial-flash-ip-${suffix}`)!;
    await library.getByRole('searchbox', { name: 'Buscar na biblioteca' }).fill(card.front);
    const article = library.getByRole('article').filter({ hasText: card.front });
    await article.getByText('Consultar verso', { exact: true }).click();
    const complement = article.getByRole('button', { name: 'Ver explicação complementar' });
    if (suffix === 'a00-g01-001') await expect(complement).toHaveCount(0);
    else {
      await complement.click();
      await expect(article).toContainText('objeto indireto');
      await expect(article).toContainText('predicativo do objeto');
    }
    await expectNoDocumentOverflow(page);
  }
});
