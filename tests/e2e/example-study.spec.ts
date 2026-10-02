import { test, expect, openApp, expectNoDocumentOverflow } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test('exemplo completo exige confiança, preserva tentativa e permite Caderno explícito', async ({ page }, testInfo) => {
  await openApp(page, '/?module=mod0&unit=IP-A00-G06&section=examples');
  const section=page.locator('#IP-A00-G06-examples');
  const card=section.locator('article').filter({ has: page.getByRole('heading', { name: 'Questão 1', exact: true }) }).first();
  await expect(card).toBeVisible();
  await expect(card.getByRole('region',{name:'Resolução'})).toHaveCount(0);
  await card.getByRole('button',{name:/^E\s*Errado/}).click();
  await expect(card.getByRole('button',{name:'Registrar tentativa'})).toBeDisabled();
  await card.getByRole('button',{name:/^Pouco Seguro/}).click();
  await card.getByRole('textbox').fill('Preciso comparar a regra do prefixo.');
  await card.getByRole('button',{name:'Registrar tentativa'}).click();
  await expect(card.getByRole('region',{name:'Resolução'})).toBeVisible();
  await page.reload();
  await expect(card.getByText(/Histórico · 1/)).toBeVisible();
  await card.getByRole('button',{name:'Adicionar ao Caderno'}).click();
  const preview=card.getByRole('region',{name:'Prévia do Caderno'});
  await preview.getByRole('textbox').fill('Revisar a união com co-.');
  await preview.getByRole('button',{name:'Confirmar inclusão no Caderno'}).click();
  await expect(card.getByText('Ficha salva no Caderno neste dispositivo.')).toBeVisible();
  await card.getByRole('button',{name:'Nova tentativa'}).click();
  await expect(card.getByRole('button',{name:/^Pouco Seguro/})).toHaveAttribute('aria-pressed','false');
  await expectNoDocumentOverflow(page);
  const accessibility=await new AxeBuilder({page}).include('#IP-A00-G06-examples').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('example-study.png')});
});

test('consulta registra assistência e os subitens A/B têm tentativas separadas',async({page})=>{
  await openApp(page,'/?module=mod0&unit=IP-A00-G06&section=examples');
  const section=page.locator('#IP-A00-G06-examples');
  const a=section.locator('article').filter({hasText:'Item A (DPE-DF)'}).first();
  const b=section.locator('article').filter({hasText:'Item B (MPE-SC Promotor)'}).first();
  await a.getByRole('button',{name:'Consultar resolução'}).click();
  await a.getByRole('button',{name:'Ocultar resolução'}).click();
  await a.getByRole('button',{name:/^E\s*Errado/}).click();
  await a.getByRole('button',{name:/^Seguro/}).click();
  await a.getByRole('button',{name:'Registrar tentativa'}).click();
  await a.locator('summary').click();
  await expect(a.getByText(/Com consulta nesta tentativa/)).toBeVisible();
  await expect(b.getByRole('button',{name:'Registrar tentativa'})).toBeDisabled();
  await expect(b.getByRole('region',{name:'Resolução'})).toHaveCount(0);
  await expectNoDocumentOverflow(page);
});

test('IP-A00-G05 apresenta itens de hífen como desafio interativo de Certo/Errado com resolução oculta e sem título duplicado', async ({ page }) => {
  await openApp(page, '/?module=mod0&unit=IP-A00-G05&section=examples');
  const section = page.locator('#IP-A00-G05-examples');
  const card = section.locator('article').filter({ has: page.getByRole('heading', { name: 'Questão 1', exact: true }) }).first();
  await expect(card).toBeVisible();
  await expect(card.getByText('Proposição do Item: a) contraatacar')).toBeVisible();
  // Resolution comparison is not visible initially
  await expect(card.getByRole('region', { name: 'Resolução' })).toHaveCount(0);
  await expect(card.getByText('contra-atacar')).toHaveCount(0);

  // Choose Errado + Seguro and submit attempt
  await card.getByRole('button', { name: /^E\s*Errado/ }).click();
  await card.getByRole('button', { name: /^Seguro/ }).click();
  await card.getByRole('button', { name: 'Registrar tentativa' }).click();

  // Resolution is now revealed
  await expect(card.getByText('Resposta correta.')).toBeVisible();
  const resolution = card.getByRole('region', { name: 'Resolução' });
  await expect(resolution).toBeVisible();
  await expect(resolution.getByText('Grafia correta')).toBeVisible();
  await expect(resolution.getByText('contra-atacar')).toBeVisible();
  // Assert no duplicate inner title in resolution
  await expect(resolution.getByRole('heading', { name: 'Questão 1' })).toHaveCount(0);
  await expect(resolution.getByRole('heading', { name: /Revisão de grafia/ })).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page }).include('#IP-A00-G05-examples').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});
