import AxeBuilder from '@axe-core/playwright';
import { expect, expectNoDocumentOverflow, openApp, openTab, test } from './fixtures';

const chooseAnswer = async (page: Parameters<typeof openApp>[0], answer: string) => {
  await page.getByRole('button', { name: new RegExp(`^${answer}(?:\\s|$)`, 'i') }).first().click();
};

const submitWithHighConfidence = async (page: Parameters<typeof openApp>[0], submitName: RegExp) => {
  await page.getByRole('button', { name: /muito seguro/i }).click();
  await page.getByRole('button', { name: submitName }).click();
};

test.describe('PBL Adaptativo - fluxo, layout e acessibilidade', () => {
  test('Dashboard usa divulgação progressiva e não cria overflow', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Aprender por Problemas (PBL)');

    await expect(page.getByRole('heading', { name: /aprenda português resolvendo problemas reais/i })).toBeVisible();
    await expect(page.getByText(/mostrando 12 de 190/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /próxima/i })).toBeVisible();
    await expectNoDocumentOverflow(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(9000);

    const axeResults = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axeResults.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')).toEqual([]);
  });

  test('percorre erro -> intervenção -> nova questão -> transferência -> reflexão -> resumo', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Aprender por Problemas (PBL)');
    await page.getByRole('button', { name: /iniciar sessão recomendada/i }).click();

    await expect(page.getByText(/caso-âncora pbl/i)).toBeVisible();
    await chooseAnswer(page, 'Certo');
    await submitWithHighConfidence(page, /confirmar hipótese/i);

    await expect(page.getByText(/não corresponde ao gabarito/i)).toBeVisible();
    await expect(page.getByText(/gabarito:\s*incorrect/i)).toHaveCount(0);
    await page.getByRole('button', { name: /salvar no caderno de erros/i }).click();
    await expect(page.getByRole('button', { name: /salvo no caderno/i })).toBeDisabled();
    await page.getByRole('button', { name: /ver intervenção/i }).click();

    await expect(page.getByText(/microaula de intervenção/i)).toBeVisible();
    await expect(page.getByText(/^Regra Decisiva:\s*RULE-/i)).toHaveCount(0);
    await page.getByRole('button', { name: /aplicar em uma nova questão/i }).click();

    await expect(page.getByText(/nova aplicação após a intervenção/i)).toBeVisible();
    await chooseAnswer(page, 'D');
    await submitWithHighConfidence(page, /confirmar nova aplicação/i);
    await expect(page.getByText(/resposta correta/i)).toBeVisible();
    await page.getByRole('button', { name: /avançar para transferência/i }).click();

    await expect(page.getByText(/transferência/i).first()).toBeVisible();
    await chooseAnswer(page, 'D');
    await submitWithHighConfidence(page, /validar transferência/i);
    await chooseAnswer(page, 'D');
    await submitWithHighConfidence(page, /validar transferência/i);

    await expect(page.getByRole('heading', { name: /feche o ciclo/i })).toBeVisible();
    await page.getByLabel(/que critério você aplicará/i).fill('Primeiro identificarei o fenômeno e aplicarei o teste decisivo antes de comparar as alternativas.');
    await page.getByRole('button', { name: /registrar reflexão/i }).click();

    await expect(page.getByText(/sessão finalizada/i)).toBeVisible();
    await expect(page.getByText(/domínio demonstrado em transferência/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /abrir caderno de erros/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ir para revisão/i })).toBeVisible();

    const savedPBLItem = await page.evaluate(() => {
      const raw = localStorage.getItem('suveca_caderno_erros_guest');
      const items = raw ? JSON.parse(raw) : [];
      return items.find((item: { origin?: string }) => item.origin === 'pbl');
    });
    expect(savedPBLItem).toMatchObject({ origin: 'pbl', moduleRef: 'IP-A00-G01', questionId: 'OQ-A00-aula00.q0068' });
    expect(savedPBLItem.nextReviewAt).toBeTruthy();
  });

  test('pausa e retoma uma sessão ativa', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Aprender por Problemas (PBL)');
    await page.getByRole('button', { name: /iniciar sessão recomendada/i }).click();
    await page.getByRole('button', { name: /sair da sessão/i }).click();
    await expect(page.getByRole('dialog', { name: /deseja pausar ou encerrar/i })).toBeVisible();
    await page.getByRole('button', { name: /pausar e sair/i }).click();
    await expect(page.getByText(/sessão pausada/i)).toBeVisible();
    await page.getByRole('button', { name: /continuar sessão/i }).click();
    await expect(page.getByText(/caso-âncora pbl/i)).toBeVisible();
  });
});
