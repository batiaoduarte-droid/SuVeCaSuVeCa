import AxeBuilder from '@axe-core/playwright';
import { PEDAGOGICAL_VIEW_INDEX } from '../../src/data/pedagogicalViewIndex.generated';
import { expect, expectNoDocumentOverflow, openApp, openTab, test } from './fixtures';

const REGULAR_UNIT = 'IP-A00-G01';
const CUMULATIVE_UNIT = 'IP-A14-S13';

test.describe('SuVeCa v4.2 — contrato publicado e experiência nativa', () => {
  test('os 115 artefatos publicados respondem e satisfazem o contrato de identidade', async ({ request }) => {
    const results = await Promise.all(PEDAGOGICAL_VIEW_INDEX.map(async (entry) => {
      const response = await request.get(`/knowledge/pedagogical/views/${entry.unitId}.json`);
      if (!response.ok()) return { id: entry.unitId, status: response.status() };
      const view = await response.json();
      return {
        id: entry.unitId,
        status: response.status(),
        sourceId: view.unit?.unitId || view.source?.unitId,
        lessonId: view.unit?.lessonId || view.source?.lessonId || entry.lessonId,
        version: view.viewSchemaVersion,
        title: view.unit?.title,
        hasSections: Boolean(view.sections && typeof view.sections === 'object'),
      };
    }));

    expect(results).toHaveLength(115);
    expect(results.filter((result) =>
      result.status !== 200
      || result.sourceId !== result.id
      || result.lessonId !== result.id.slice(3, 6)
      || !result.title
      || !result.hasSections
      || !(result.version === '1.0.0' || String(result.version).startsWith('4.2.'))
    )).toEqual([]);
  });

  test('deep link abre unidade regular, seção correta e preserva a rota no refresh', async ({ page }) => {
    await openApp(page, `/?unit=${REGULAR_UNIT}&section=rules`);

    await expect(page).toHaveURL(new RegExp(`unit=${REGULAR_UNIT}.*section=rules`));
    await expect(page.locator('.pedagogical-unit-view')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Fonética e Fonologia' })).toBeVisible();
    await expect(page.locator(`#${REGULAR_UNIT}-rules`)).toHaveAttribute('open', '');
    await expect(page).toHaveURL(new RegExp(`unit=${REGULAR_UNIT}.*section=rules`));
    await expectNoDocumentOverflow(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.pedagogical-unit-view')).toBeVisible();
    await expect(page.locator(`#${REGULAR_UNIT}-rules`)).toHaveAttribute('open', '');
    await expect(page).toHaveURL(new RegExp(`unit=${REGULAR_UNIT}.*section=rules`));
    const reopenedTour = page.getByRole('button', { name: 'Fechar tour' });
    if (await reopenedTour.count() && await reopenedTour.isVisible()) await reopenedTour.click();

    const unitIndex = page.getByRole('navigation', { name: /unidades pedagógicas de/i });
    await unitIndex.getByRole('button').nth(1).click();
    await expect(page).toHaveURL(/unit=IP-A00-G02/);
    await expect(page.getByRole('heading', { level: 1, name: 'Encontros Vocálicos e Consonantais' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`unit=${REGULAR_UNIT}`));
    await expect(page.getByRole('heading', { level: 1, name: 'Fonética e Fonologia' })).toBeVisible();
  });

  test('A14 usa seu renderer cumulativo e permanece estudável sem overflow', async ({ page }) => {
    await openApp(page, `/?unit=${CUMULATIVE_UNIT}&section=protocol`);

    await expect(page.locator('.cumulative-review-view')).toBeVisible();
    await expect(page.locator(`#${CUMULATIVE_UNIT}-protocol`)).toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: /praticar esta revisão/i })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test('resposta oficial fica oculta até uma tentativa explícita', async ({ page }) => {
    await openApp(page, `/?unit=${REGULAR_UNIT}&section=official-questions`);
    const question = page.locator('.question-block').first();
    await expect(question).toBeVisible();
    await expect(question.getByText(/gabarito oficial/i)).toBeHidden();

    const alternatives = question.locator('section[aria-label^="Alternativas de"] button');
    if (await alternatives.count()) await alternatives.first().click();
    await question.getByRole('button', { name: /confirmar tentativa/i }).click();
    await expect(question.getByText(/gabarito oficial/i)).toBeVisible();
  });

  test('Roteiros carrega o dataset AST v2.1 sem descartar registros visuais', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Contrato funcional completo executado no desktop');
    await openApp(page);
    await openTab(page, 'Roteiros');

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('413 roteiros encontrados');
    const results = page.getByRole('navigation', { name: /roteiros de resolução encontrados/i });
    await expect(results).toBeVisible();
    await page.getByLabel(/buscar nos roteiros/i).fill('Algoritmo Universal de Contagem de Fonemas e Letras');
    await results.getByRole('button', { name: /algoritmo universal de contagem de fonemas e letras/i }).click();
    await expect(page.getByRole('tab', { name: /visual/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /estrutura textual/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /fonte original/i })).toBeVisible();
  });

  test('mapas corrigidos preservam decisões, ramos e etapas no DOM operacional', async ({ page }, testInfo) => {
    test.skip(!['desktop-1440', 'mobile-390'].includes(testInfo.project.name), 'Regressões topológicas validadas em desktop e mobile');
    await openApp(page);
    await openTab(page, 'Roteiros');
    const search = page.getByLabel(/buscar nos roteiros/i);
    const results = page.getByRole('navigation', { name: /roteiros de resolução encontrados/i });

    await search.fill('Roteiro Geral de Decisão Ortográfica e Sintática dos Porquês');
    await results.getByRole('button', { name: /roteiro geral de decisão ortográfica e sintática dos porquês/i }).click();
    await expect(page.getByText('Há determinante antes da lacuna?')).toBeVisible();
    await expect(page.getByText('A lacuna introduz justificativa, causa ou finalidade?')).toBeVisible();
    await expect(page.getByText('Escreva POR QUÊ')).toBeVisible();

    await search.fill('Algoritmo Mestre de Decisão Rápida para Hifenização de Prefixos');
    await results.getByRole('button', { name: /algoritmo mestre de decisão rápida para hifenização de prefixos/i }).click();
    await expect(page.getByText('O segundo elemento começa com H?')).toBeVisible();
    await expect(page.getByText('Prefixo regular em vogal')).toBeVisible();
    await expect(page.getByText('Vogal + R ou S')).toBeVisible();
    await expect(page.getByText(/^SIM NÃO$/i)).toHaveCount(0);
    await page.getByRole('list', { name: /fluxo de decisão/i }).screenshot({ path: `test-results/structured-map-hifenizacao-${testInfo.project.name}.png` });

    await search.fill('Protocolo Mestre de Transposição da Passiva Analítica para a Ativa');
    await results.getByRole('button', { name: /protocolo mestre de transposição da passiva analítica para a ativa/i }).click();
    await expect(page.getByRole('region', { name: /chamamento do feito à ordem/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /definição do sujeito ativo/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /transformação e redução verbal/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /conversão do objeto e validação/i })).toBeVisible();
    await page.getByRole('list', { name: /sequência de análise/i }).screenshot({ path: `test-results/structured-map-transposicao-${testInfo.project.name}.png` });
  });

  test('Axe não encontra violações nas experiências regular e A14', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Gate Axe completo executado no desktop');
    await openApp(page, `/?unit=${REGULAR_UNIT}&section=rules`);

    const scan = await new AxeBuilder({ page }).exclude('.katex').analyze();
    expect(scan.violations).toEqual([]);

    await openApp(page, `/?unit=${CUMULATIVE_UNIT}&section=protocol`);
    const cumulativeScan = await new AxeBuilder({ page }).exclude('.katex').analyze();
    expect(cumulativeScan.violations).toEqual([]);
  });
});
