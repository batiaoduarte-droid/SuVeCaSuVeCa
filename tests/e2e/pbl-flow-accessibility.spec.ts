import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { expect, expectNoDocumentOverflow, openApp, openTab, test } from './fixtures';

interface PublishedQuestionAnswer {
  id: string;
  correctAnswer: string;
  options?: unknown[];
}

const publishedQuestionAnswers = new Map(
  (JSON.parse(fs.readFileSync(
    path.resolve('public/knowledge/official-questions.normalized.json'),
    'utf8'
  )) as PublishedQuestionAnswer[]).map((question) => [
    `OQ-${question.id.replace(':', '-')}`,
    question,
  ])
);

const chooseAnswer = async (page: Parameters<typeof openApp>[0], answer: string) => {
  await page.getByRole('button', { name: new RegExp(`^${answer}(?:\\s|$)`, 'i') }).first().click();
};

const chooseCurrentPublishedCorrectAnswer = async (page: Parameters<typeof openApp>[0]) => {
  const questionRef = await page.locator('[data-pbl-question-ref]').getAttribute('data-pbl-question-ref');
  const published = questionRef ? publishedQuestionAnswers.get(questionRef) : undefined;
  expect(published, `Questão publicada não encontrada: ${questionRef}`).toBeDefined();
  const answer = published!.options?.length
    ? published!.correctAnswer
    : ['C', 'CERTO', 'CORRETO', 'CORRECT', 'TRUE'].includes(published!.correctAnswer.toUpperCase())
      ? 'Certo'
      : 'Errado';
  await chooseAnswer(page, answer);
};

const chooseCurrentPublishedWrongAnswer = async (page: Parameters<typeof openApp>[0]) => {
  const questionRef = await page.locator('[data-pbl-question-ref]').getAttribute('data-pbl-question-ref');
  const published = questionRef ? publishedQuestionAnswers.get(questionRef) : undefined;
  expect(published, `Questão publicada não encontrada: ${questionRef}`).toBeDefined();
  const correctAnswer = published!.options?.length
    ? published!.correctAnswer
    : ['C', 'CERTO', 'CORRETO', 'CORRECT', 'TRUE'].includes(published!.correctAnswer.toUpperCase())
      ? 'Certo'
      : 'Errado';
  let wrongAnswer = 'A';
  if (published!.options?.length) {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    wrongAnswer = letters.find((l) => l !== correctAnswer) || 'B';
  } else {
    wrongAnswer = correctAnswer === 'Certo' ? 'Errado' : 'Certo';
  }
  await chooseAnswer(page, wrongAnswer);
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
    const probeButton = page.getByRole('button', { name: /responder sondagem curta/i });
    if (await probeButton.isVisible()) {
      await probeButton.click();
      await chooseCurrentPublishedWrongAnswer(page);
      await submitWithHighConfidence(page, /confirmar/i);
    }
    await page.getByRole('button', { name: /ver intervenção/i }).click();

    await expect(page.getByText('Pista decisiva', { exact: true })).toBeVisible();
    await expect(page.getByText(/^Regra Decisiva:\s*RULE-/i)).toHaveCount(0);
    await expect(page.getByText(/procedimento de resolução/i)).toHaveCount(0);
    await page.getByRole('button', { name: /ver procedimento e contraste/i }).click();
    await expect(page.getByText(/procedimento de resolução/i)).toBeVisible();
    await expect(page.getByText('Exemplo resolvido', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /ver exemplo resolvido/i }).click();
    await expect(page.getByText('Exemplo resolvido', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /aplicar sem apoio visível/i }).click();

    await expect(page.getByText(/nova aplicação após a intervenção/i)).toBeVisible();
    await chooseCurrentPublishedCorrectAnswer(page);
    await submitWithHighConfidence(page, /confirmar nova aplicação/i);
    await expect(page.getByText(/resposta correta/i)).toBeVisible();
    await page.getByRole('button', { name: /avançar para transferência/i }).click();

    await expect(page.getByText(/transferência/i).first()).toBeVisible();
    await chooseCurrentPublishedCorrectAnswer(page);
    await submitWithHighConfidence(page, /validar transferência/i);
    await chooseCurrentPublishedCorrectAnswer(page);
    await submitWithHighConfidence(page, /validar transferência/i);

    await expect(page.getByRole('heading', { name: /transforme o resultado em uma decisão/i })).toBeVisible();
    await expect(page.getByText(/orientação para comparação/i)).toHaveCount(0);
    await expect(page.getByText(/^(?:RULE|RULF)-/i)).toHaveCount(0);
    await page.getByLabel(/na próxima questão, primeiro vou/i).fill('Primeiro identificarei o fenômeno e aplicarei o teste decisivo antes de comparar as alternativas.');
    await page.getByRole('button', { name: /comparar com a orientação/i }).click();
    await expect(page.getByText(/orientação para comparação/i)).toBeVisible();
    await page.getByText('Manter minha regra', { exact: true }).click();
    await page.getByRole('button', { name: /salvar decisão e ver próximos passos/i }).click();

    await expect(page.getByText(/sessão finalizada/i)).toBeVisible();
    await expect(page.getByText(/transferência imediata confirmada/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /abrir caderno de erros/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /voltar à fila de revisão/i })).toBeVisible();

    const savedPBLItem = await page.evaluate(() => {
      const raw = localStorage.getItem('suveca_caderno_erros_guest');
      const items = raw ? JSON.parse(raw) : [];
      return items.find((item: { origin?: string }) => item.origin === 'pbl');
    });
    expect(savedPBLItem).toMatchObject({ origin: 'pbl', moduleRef: 'IP-A00-G01', questionId: 'OQ-A00-aula00.q0068' });
    expect(savedPBLItem.nextReviewAt).toBeTruthy();
  });

  test('reflexão exige recuperação antes de mostrar a regra pedagógica', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Aprender por Problemas (PBL)');
    await page.getByRole('button', { name: /iniciar sessão recomendada/i }).click();

    await chooseAnswer(page, 'Errado');
    await submitWithHighConfidence(page, /confirmar hipótese/i);
    await page.getByRole('button', { name: /avançar para transferência/i }).click();

    await chooseCurrentPublishedCorrectAnswer(page);
    await submitWithHighConfidence(page, /validar transferência/i);
    await chooseCurrentPublishedCorrectAnswer(page);
    await submitWithHighConfidence(page, /validar transferência/i);

    await expect(page.getByText(/orientação para comparação/i)).toHaveCount(0);
    await page.getByLabel(/na próxima questão, primeiro vou/i).fill('Primeiro compararei letras e fonemas usando o critério recuperado sem consultar a explicação.');
    await page.getByRole('button', { name: /comparar com a orientação/i }).click();
    await expect(page.getByText(/orientação para comparação/i)).toBeVisible();
    await expect(page.getByText(/número de fonemas.*número de letras/i)).toBeVisible();
    await expect(page.getByText(/^(?:RULE|RULF)-/i)).toHaveCount(0);
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
