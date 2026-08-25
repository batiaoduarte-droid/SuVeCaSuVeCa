import AxeBuilder from '@axe-core/playwright';
import { expect, expectNoDocumentOverflow, openApp, openTab, test } from './fixtures';

const allLayoutTabs = [
  'Apostila',
  'Analisador',
  'Aprender por Problemas (PBL)',
  'Simulado',
  'Caderno de erros',
  'Flashcards',
  'Cronômetro Foco',
  'Review diário',
  'Roteiros',
  'Planejamento',
  'Modo Desafio',
  'Questões editoriais',
  'Estatísticas',
  'Perfil',
];
const auditedTabs = ['Apostila', 'Analisador', 'Simulado', 'Cronômetro Foco', 'Roteiros', 'Questões editoriais'];
const representativePedagogicalUnits = [
  { moduleId: 'mod0', unitId: 'IP-A00-G01', sectionId: 'explanation', profile: 'todos os blocos centrais' },
  { moduleId: 'mod0', unitId: 'IP-A00-G06', sectionId: 'explanation', profile: 'callouts e conteúdo legado' },
  { moduleId: 'mod10', unitId: 'IP-A10-G06', sectionId: 'explanation', profile: 'matrizes e comparações' },
  { moduleId: 'mod14', unitId: 'IP-A14-S01', sectionId: 'synthesis', profile: 'revisão cumulativa A14' },
] as const;

test.describe('layout responsivo', () => {
  for (const tab of allLayoutTabs) {
    test(`${tab} não cria rolagem horizontal na página`, async ({ page }) => {
      await openApp(page);
      if (tab !== 'Apostila') await openTab(page, tab);
      await expectNoDocumentOverflow(page);
    });
  }

  test('shell principal aproveita a largura disponível', async ({ page }) => {
    await openApp(page);
    const ratio = await page.locator('main').evaluate((element) => element.getBoundingClientRect().width / window.innerWidth);
    expect(ratio).toBeGreaterThan(0.9);
  });

  test('unidade aprofundada preserva largura útil em tela pequena', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-320', 'Critério específico para a menor tela homologada.');
    await openApp(page, '/?module=mod0&unit=IP-A00-G02&section=explanation');
    const unit = page.locator('.pedagogical-unit-view');
    await expect(unit).toBeVisible();
    const ratio = await unit.evaluate((element) => element.getBoundingClientRect().width / window.innerWidth);
    expect(ratio).toBeGreaterThan(0.92);
  });

  for (const sample of representativePedagogicalUnits) {
    test(`unidade representativa (${sample.profile}) respeita o viewport`, async ({ page }) => {
      await openApp(page, `/?module=${sample.moduleId}&unit=${sample.unitId}&section=${sample.sectionId}`);
      await expect(page.locator('.pedagogical-unit-view, .cumulative-review-view')).toBeVisible();
      await expectNoDocumentOverflow(page);
    });
  }

  test('alvos principais da navegação têm pelo menos 44px', async ({ page }) => {
    await openApp(page);
    const navigation = (await page.getByRole('navigation', { name: 'Navegação principal' }).isVisible())
      ? page.getByRole('navigation', { name: 'Navegação principal' })
      : page.getByRole('navigation', { name: 'Navegação móvel' });

    const undersized = await navigation.getByRole('button').evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        })
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return { name: button.getAttribute('aria-label') || button.textContent?.trim(), width: rect.width, height: rect.height };
        })
    );

    expect(undersized).toEqual([]);
  });

  test('reflow equivalente a zoom de 200% não cria rolagem horizontal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Amostra de reflow executada uma vez.');
    await page.setViewportSize({ width: 720, height: 900 });
    await openApp(page);
    await expectNoDocumentOverflow(page);
  });
});

test.describe('teclado e leitores de tela', () => {
  test('Cronômetro Foco renderiza a experiência, sem aba vazia', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Cronômetro Foco');
    await expect(page.getByRole('heading', { name: /cronômetro de foco/i })).toBeVisible();
  });

  test('variações SuVeCA são navegáveis e enviam o exemplo ao analisador', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Analisador');

    const explorer = page.getByRole('region', { name: /5 padrões estruturais da SuVeCA/i });
    await expect(explorer).toBeVisible();
    const inversePattern = explorer.getByRole('tab', { name: /Padrão 2 Ordem inversa/i });
    await inversePattern.click();
    await expect(inversePattern).toHaveAttribute('aria-selected', 'true');
    await expect(explorer.getByRole('heading', { name: /2\. Ordem inversa/i })).toBeVisible();

    await explorer.getByRole('button', { name: /usar este exemplo/i }).click();
    const input = page.locator('#suveca-analyzer-input');
    await expect(input).toHaveValue('Ontem chegaram os fiscais.');
    await expect(input).toBeFocused();
  });

  test('perfil apresenta os cinco pilares de domínio sem depender de barras verticais', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Perfil');
    const balance = page.getByRole('region', { name: 'Equilíbrio de Domínio Sintático' });
    await expect(balance).toBeVisible();
    await expect(balance.getByRole('progressbar')).toHaveCount(5);
    await expect(balance.locator('svg.recharts-surface')).toHaveCount(0);
    await expect(balance.getByText(/pilares ativos/i)).toBeVisible();
  });

  test('módulo introdutório concentra o conteúdo nos guias interativos sem detalhamento duplicado', async ({ page }) => {
    await openApp(page, '/?module=mod-intro');
    const overview = page.getByRole('region', { name: 'Visão geral do Método SuVeCA' });
    await expect(overview).toBeVisible();
    const unifiedTitle = overview.getByRole('heading', { level: 1, name: 'O que é o Método SuVeCA (e o que NÃO é)' });
    await expect(unifiedTitle).toHaveCount(1);
    await expect(unifiedTitle).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(page.getByRole('heading', { name: 'Fundamentos do Método SuVeCA', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Conexão SuVeCA com esta aula' })).toHaveCount(0);
    await expect(overview.getByText('Módulo 00-Intro · Comece por aqui')).toBeVisible();
    await expect(overview.getByText('Unidade 1/6 · percurso de 25 min')).toBeVisible();
    const contrastAudit = await new AxeBuilder({ page })
      .include('section[aria-label="Visão geral do Método SuVeCA"]')
      .withRules(['color-contrast'])
      .analyze();
    expect(contrastAudit.violations).toEqual([]);
    await expect(page.getByRole('list', { name: /Sujeito mais Verbo mais Complemento/i }).first()).toBeVisible();
    await expect(page.getByText('Detalhamento dos 8 Passos')).toHaveCount(0);
    await expect(page.getByText('As 5 Escalas Detalhadas')).toHaveCount(0);
    await expect(page.getByText('Guia Rápido por Aula')).toHaveCount(0);
  });

  test('contadores pedagógicos não quebram palavra por palavra no mobile', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'Critério específico para telas estreitas.');

    for (const sample of [
      { section: 'traps', label: '3 armadilhas' },
      { section: 'mnemonics', label: '1 mnemônico' },
    ]) {
      await openApp(page, `/?module=mod0&unit=IP-A00-G01&section=${sample.section}`);
      const badge = page.getByText(sample.label, { exact: true });
      await expect(badge).toBeVisible();
      const geometry = await badge.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          height: rect.height,
          whiteSpace: getComputedStyle(element).whiteSpace,
          fitsContent: element.scrollWidth <= element.clientWidth,
        };
      });
      expect(geometry.whiteSpace).toBe('nowrap');
      expect(geometry.height).toBeLessThan(32);
      expect(geometry.fitsContent).toBe(true);
      await expectNoDocumentOverflow(page);
    }
  });

  test('equação de fonemas recompõe as parcelas sem scroll lateral', async ({ page }) => {
    await openApp(page, '/?module=mod0&unit=IP-A00-G01&section=explanation');
    const formula = page.locator('[data-responsive-formula="phoneme-count"]');
    await expect(formula).toBeVisible();
    expect(await formula.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expectNoDocumentOverflow(page);
  });

  test('Pomodoro minimiza sobre o conteúdo e restaura a mesma sessão', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Cronômetro Foco');
    await page.getByRole('button', { name: /minimizar/i }).click();
    const miniPanel = page.getByRole('region', { name: /mini-painel/i });
    await expect(miniPanel).toBeVisible();
    await expect(page.getByRole('heading', { name: /cronômetro de foco pomodoro/i })).toBeHidden();
    await miniPanel.getByRole('button', { name: /expandir cronômetro/i }).click();
    await expect(page.getByRole('heading', { name: /cronômetro de foco pomodoro/i })).toBeVisible();
  });

  test('questão editorial prende o foco, fecha com Escape e devolve o foco', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Questões editoriais');
    const opener = page.getByRole('button', { name: 'Estudar questão' }).first();
    await expect(opener).toBeVisible();
    await opener.click();
    const dialog = page.getByRole('dialog', { name: /questão editorial/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Fechar questão' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('questão editorial mantém o gabarito oculto até a tentativa', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Questões editoriais');
    await page.getByRole('button', { name: 'Estudar questão' }).first().click();
    const dialog = page.getByRole('dialog', { name: /questão editorial/i });
    const verifyButton = dialog.getByRole('button', { name: 'Verificar resposta' });
    await expect(verifyButton).toBeDisabled();
    await expect(dialog.getByText(/Comentário Pedagógico/i)).toHaveCount(0);

    const answerButtons = dialog.locator('ol button, .grid.grid-cols-2 button');
    await answerButtons.first().click();
    await expect(verifyButton).toBeEnabled();
    await verifyButton.click();
    await expect(dialog.getByText(/Comentário Pedagógico/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  });

  test('texto de apoio é exibido em blocos e preserva a digitalização original', async ({ page }) => {
    await openApp(page);
    await openTab(page, 'Questões editoriais');
    await page.getByLabel('Buscar no banco editorial').fill('Educação prisional');
    const searchResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/knowledge/questions'
        && url.searchParams.get('query') === 'Educação prisional'
        && response.ok();
    });
    await page.getByRole('button', { name: 'Aplicar busca' }).click();
    await searchResponse;
    await expect(page.getByText(/questões encontradas/)).not.toContainText('3485');
    const opener = page.getByRole('button', { name: 'Estudar questão' }).first();
    await expect(opener).toBeVisible();
    await opener.click();

    const dialog = page.getByRole('dialog', { name: /questão editorial/i });
    await expect(dialog.getByText('Texto de apoio', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('region', { name: 'Comando da questão' })).toBeVisible();
    await expect(dialog.getByText('Consultar digitalização original')).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test('mídia visual permanece primária e usa a projeção de maior resolução', async ({ request }) => {
    const response = await request.get('/api/knowledge/questions/A00%3Aestrategia.4000720108');
    expect(response.ok()).toBe(true);
    const detail = await response.json();
    expect(detail.editorial.normalized.presentation).toMatchObject({
      mediaKind: 'visual_essential',
      displayMode: 'image_primary',
    });
    expect(detail.editorial.normalized.presentation.media[0].url).toContain('-800.');
  });

  test('atalho de busca abre modal e Escape devolve o foco', async ({ page }) => {
    await openApp(page);
    const searchButton = page.getByRole('button', { name: 'Abrir pesquisa' });
    await searchButton.focus();
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('searchbox')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(searchButton).toBeFocused();
  });

  test('menu Mais é operável por teclado', async ({ page }) => {
    await openApp(page);
    const desktopNavigation = page.getByRole('navigation', { name: 'Navegação principal' });
    if (await desktopNavigation.isVisible()) {
      const moreButton = desktopNavigation.getByRole('button', { name: 'Mais', exact: true });
      await moreButton.focus();
      await page.keyboard.press('Enter');
      const menu = page.getByRole('menu', { name: 'Outras ferramentas' });
      await expect(menu).toBeVisible();
      const items = menu.getByRole('menuitem');
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(moreButton).toBeFocused();
    } else {
      const moreButton = page.getByRole('button', { name: 'Ver mais abas de navegação' });
      await moreButton.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Outras Ferramentas' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Fechar painel' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(moreButton).toBeFocused();
    }
  });

  for (const tab of auditedTabs) {
    test(`${tab} sem violações axe sérias ou críticas`, async ({ page }) => {
      await openApp(page);
      if (tab !== 'Apostila') await openTab(page, tab);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const severeViolations = results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
      expect(severeViolations, JSON.stringify(severeViolations, null, 2)).toEqual([]);
    });
  }
});
