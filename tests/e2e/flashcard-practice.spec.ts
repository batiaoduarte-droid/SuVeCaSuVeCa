import { expect, expectNoDocumentOverflow, openApp, openTab, test } from './fixtures';

test.describe('Flashcards SuVeCa — Jornada e Apresentação Editorial', () => {
  test('executa a jornada completa: frente, dica, revelação, blocos semânticos e avaliação', async ({ page }) => {
    await openApp(page, '/?tool=flashcards');
    await expect(page.getByRole('heading', { level: 1, name: 'Revisão ativa com Flashcards' })).toBeVisible();

    // Trocar para a base editorial para garantir cards disponíveis
    const baseEditorialBtn = page.getByRole('button', { name: /Base editorial/i });
    if (await baseEditorialBtn.isVisible()) {
      await baseEditorialBtn.click();
    }

    // Valida que a pergunta está visível e não há transbordamento horizontal
    const questionText = page.locator('.max-w-3xl p').first();
    await expect(questionText).toBeVisible();
    await expectNoDocumentOverflow(page);

    // Dica (se disponível no card ativo)
    const tipBtn = page.getByRole('button', { name: /ver dica/i });
    if (await tipBtn.isVisible()) {
      await tipBtn.click();
      await expect(page.getByText('Dica da Regra:')).toBeVisible();
    }

    // Revela a resposta
    const showAnswerBtn = page.getByRole('button', { name: 'Mostrar resposta' });
    await expect(showAnswerBtn).toBeVisible();
    await showAnswerBtn.click();

    // A resposta deve estar visível e o botão de mostrar resposta deve sumir
    await expect(showAnswerBtn).toBeHidden();
    await expect(page.locator('section.max-w-3xl')).toBeVisible();

    // Os 4 botões de avaliação devem estar disponíveis e equilibrados
    const againBtn = page.getByRole('button', { name: /errei/i });
    const hardBtn = page.getByRole('button', { name: /difícil/i });
    const goodBtn = page.getByRole('button', { name: /^bom$/i });
    const easyBtn = page.getByRole('button', { name: /fácil/i });

    await expect(againBtn).toBeVisible();
    await expect(hardBtn).toBeVisible();
    await expect(goodBtn).toBeVisible();
    await expect(easyBtn).toBeVisible();

    // Executa autoavaliação (Bom)
    await goodBtn.click();

    // Verifica feedback da repetição espaçada e botão de Próximo
    await expect(page.getByRole('button', { name: /próximo/i })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test('apresenta o card de Haviam / Fazem em 3 blocos semânticos e captura evidência', async ({ page }) => {
    await page.addInitScript(() => {
      const errorItem = {
        id: 'err-haver-fazem',
        data: '2026-08-11T00:00:00.000Z',
        conteudo: 'Concordância Verbal',
        pergunta: 'Qual erro deve ser evitado ao empregar haver e fazer?',
        suaResposta: 'Haviam muitas pessoas',
        gabarito: 'Havia muitas pessoas',
        regraOuro: 'Haver e fazer são impessoais',
        status: 'pendente',
      };
      const card = {
        id: 'card-haver-fazem',
        errorId: 'err-haver-fazem',
        source: 'caderno',
        topic: 'Concordância Verbal',
        front: 'Qual erro deve ser evitado ao empregar haver e fazer?',
        back: 'O Erro: Escrever ou aceitar formas como "Haviam muitas pessoas", "Fazem dez meses", "Houveram problemas". Por que ocorre: No cotidiano informal, o falante transfere a concordância de existir para o verbo haver e pluraliza fazer pelo valor numérico. Como evitar: Haver (= existir) e fazer (tempo) são estritamente impessoais. Os substantivos associados são objetos diretos ou adjuntos. A flexão correta é sempre no singular: Havia muitas pessoas, Faz dez meses, Houve problemas.',
        explanation: 'Verbos impessoais não possuem sujeito.',
        createdAt: '2026-08-11T00:00:00.000Z',
        correctCount: 0,
        incorrectCount: 0,
      };
      window.localStorage.setItem('suveca_caderno_erros_guest', JSON.stringify([errorItem]));
      window.localStorage.setItem('suveca_flashcards_guest', JSON.stringify([card]));
    });

    // Carrega o app na aba de flashcards
    await openApp(page, '/?tool=flashcards');

    const cardSection = page.locator('section.max-w-3xl');
    await expect(cardSection).toBeVisible();
    await expect(page.getByText('Qual erro deve ser evitado ao empregar haver e fazer?')).toBeVisible();

    // Captura Frente
    await page.screenshot({ path: 'test-results/evidence-haver-fazem-1-frente.png' });

    // Revela Resposta
    const showAnswerBtn = page.getByRole('button', { name: 'Mostrar resposta' });
    await expect(showAnswerBtn).toBeVisible();
    await showAnswerBtn.click();

    // Valida que os 3 blocos foram renderizados
    await expect(page.getByText('O Erro', { exact: true })).toBeVisible();
    await expect(page.getByText('Por que ocorre', { exact: true })).toBeVisible();
    await expect(page.getByText('Como evitar', { exact: true })).toBeVisible();

    const goodBtn = page.getByRole('button', { name: /^bom$/i });
    await expect(goodBtn).toBeVisible();
    await goodBtn.scrollIntoViewIfNeeded();

    // Captura Verso
    await page.screenshot({ path: 'test-results/evidence-haver-fazem-2-verso.png' });

    // Avalia como Bom
    await goodBtn.click();

    // Valida feedback da repetição espaçada
    await expect(page.getByRole('button', { name: /próximo/i })).toBeVisible();

    // Captura Feedback pós-avaliação
    await page.screenshot({ path: 'test-results/evidence-haver-fazem-3-feedback.png' });
  });
});

