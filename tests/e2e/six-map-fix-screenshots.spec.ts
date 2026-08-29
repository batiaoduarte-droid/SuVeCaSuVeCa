import { expect, openApp, openTab, test } from './fixtures';
import path from 'node:path';
import fs from 'node:fs';

const SIX_MAPS = [
  {
    id: 'SMP-D1A9CBB6BCB285AC',
    name: 'analise-fonetica',
    search: 'Protocolo Mestre de Análise Fonética e Silábica',
    buttonMatcher: /protocolo mestre de análise fonética e silábica/i,
    expectedTexts: [
      'Fase 1: Divisão Silábica Fonética',
      'Fase 2: Varredura e Identificação de Dígrafos',
      'Fase 3: Enquadramento de Encontros Vocálicos e Consonantais',
      'Fase 4: Equação Final de Letras vs. Fonemas',
      'Convergência',
    ],
    filename: 'SMP-D1A9CBB6BCB285AC-analise-fonetica.png',
  },
  {
    id: 'SMP-A7E6EA1DDBFCFDF2',
    name: 'analise-verbal',
    search: 'Método da Análise Verbal de Trás para Frente',
    buttonMatcher: /método da análise verbal de trás para frente/i,
    expectedTexts: [
      'Passo 1: Localizar Todos os Verbos da Cadeia',
      'Passo 2: Isolar o Último Verbo (Verbo Principal)',
      'Passo 3: O Verbo Principal Possui Sujeito Sintático?',
      'SIM (Pessoal)',
      'NÃO (Impessoal)',
      'Passo 4: Classificar os Verbos Anteriores como Auxiliares',
      'Passo 5: Aplicar a Regra de Concordância Verbal',
      'Convergência',
    ],
    filename: 'SMP-A7E6EA1DDBFCFDF2-analise-verbal.png',
  },
  {
    id: 'SMP-0BCA237394DF7375',
    name: 'se-pa-pis-realce',
    search: 'Algoritmo Decisório para Funções do Pronome SE',
    buttonMatcher: /algoritmo decisório para funções do pronome se/i,
    expectedTexts: [
      'Localizar Verbo + Pronome SE',
      'O termo seguinte é preposicionado ou o verbo é VTI, VI ou VL?',
      'SE = Partícula Indeterminadora do Sujeito (PIS / IIS)',
      'Validação: Aceita transposição natural para a Passiva Analítica',
      'SE = Partícula Apassivadora (PA / CPA)',
      'SE = Partícula Expletiva ou de Realce',
    ],
    filename: 'SMP-0BCA237394DF7375-se-pa-pis-realce.png',
  },
  {
    id: 'SMP-E5A399B484D6DB67',
    name: 'se-pa-pis',
    search: 'Algoritmo Decisório para a Partícula SE',
    buttonMatcher: /algoritmo decisório para a partícula se/i,
    expectedTexts: [
      'Analisar Transitividade Verbal Associada ao SE',
      'Qual é a Transitividade do Verbo com SE',
      'SE = Partícula Indeterminadora do Sujeito (PIS / IIS)',
      'Teste Operacional de Transposição para Passiva Analítica',
      'SE = Partícula Apassivadora (PA / CPA)',
      'Verbo CONCORDA com o Sujeito Paciente',
    ],
    filename: 'SMP-E5A399B484D6DB67-se-pa-pis.png',
  },
  {
    id: 'SMP-7CCD212EA51004D6',
    name: 'homonimo-paronimo',
    search: 'Teste Fono-Ortográfico de Decisão: Homônimo vs. Parônimo',
    buttonMatcher: /teste fono-ortográfico de decisão/i,
    expectedTexts: [
      'Início: Analisar o Par de Vocábulos',
      'A grafia é 100% idêntica',
      'A pronúncia e o timbre são 100% idênticos?',
      'Classificação: HOMÔNIMO',
      'Classificação: PARÔNIMO',
      'SIM (Grafia Idêntica)',
      'NÃO (Grafias Diferentes)',
      'NÃO (Som Diferente)',
      'Convergência',
    ],
    filename: 'SMP-7CCD212EA51004D6-homonimo-paronimo.png',
  },
  {
    id: 'SMP-6227CEC2AACD5AB5',
    name: 'tipologia-cebraspe',
    search: 'Procedimento Integrado de Diagnóstico Tipológico Cebraspe',
    buttonMatcher: /procedimento integrado de diagnóstico tipológico cebraspe/i,
    expectedTexts: [
      'Início: Texto Dissertativo em Prova Cebraspe',
      'Passo 1: Mapear os Extremos e a Fonte Bibliográfica',
      'Passo 2: Aplicar a Pergunta-Guia de Intencionalidade',
      'Passo 3: Rastrear Presença de Tese Explícita ou Explicação Conceitual',
      'Passo 4: Avaliar Dados Estatísticos e Modalizadores',
      'Passo 5: Como o Parágrafo Conclusivo Arremata o Texto',
      'DISSERTATIVO-ARGUMENTATIVO',
      'DISSERTATIVO-EXPOSITIVO',
    ],
    filename: 'SMP-6227CEC2AACD5AB5-tipologia-cebraspe.png',
  },
];

test.describe('Validação Visual e Captura dos 6 Mapas Estruturados Corrigidos', () => {
  test('inspeciona e captura os 6 mapas em desktop e mobile', async ({ page }, testInfo) => {
    test.skip(!['desktop-1440', 'mobile-390'].includes(testInfo.project.name), 'Screenshots apenas em desktop-1440 e mobile-390');

    const mode = testInfo.project.name === 'desktop-1440' ? 'desktop' : 'mobile';
    const outputDir = path.resolve(
      process.cwd(),
      `../Notebook LM/05_Auditorias/semantica/structured-maps-v2-regeneration/reports/assets/six-map-fix/${mode}`,
    );
    fs.mkdirSync(outputDir, { recursive: true });

    await openApp(page);
    await openTab(page, 'Roteiros');

    const searchInput = page.getByLabel(/buscar nos roteiros/i);
    const results = page.getByRole('navigation', { name: /roteiros de resolução encontrados/i });

    for (const item of SIX_MAPS) {
      await searchInput.fill(item.search);
      const button = results.getByRole('button', { name: item.buttonMatcher }).first();
      await expect(button).toBeVisible();
      await button.click();

      const diagram = page.locator('#decision-procedure-content');
      await expect(diagram).toBeVisible();

      for (const expected of item.expectedTexts) {
        await expect(diagram.getByText(expected, { exact: false }).first()).toBeVisible();
      }

      await expect(diagram.getByText(/^SIM NÃO$/i)).toHaveCount(0);

      const screenshotPath = path.join(outputDir, item.filename);
      await diagram.screenshot({ path: screenshotPath });
      expect(fs.existsSync(screenshotPath)).toBe(true);
    }
  });

  test('valida o Modo Foco em largura total na ferramenta de Roteiros', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Teste de modo foco em desktop-1440');

    await openApp(page);
    await openTab(page, 'Roteiros');

    const searchInput = page.getByLabel(/buscar nos roteiros/i);
    const results = page.getByRole('navigation', { name: /roteiros de resolução encontrados/i });

    await searchInput.fill('Protocolo Mestre de Análise Fonética');
    const button = results.getByRole('button').first();
    await button.click();

    // Initial state: sidebar results visible, focus strip not present
    await expect(page.getByTestId('sidebar-results')).toBeVisible();
    await expect(page.getByTestId('focus-results-strip')).toHaveCount(0);

    // Click focus mode button
    const focusButton = page.getByRole('button', { name: /modo foco/i });
    await expect(focusButton).toBeVisible();
    await focusButton.click();

    // Verify NO modal/dialog exists
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Verify horizontal strip is visible
    const focusStrip = page.getByTestId('focus-results-strip');
    await expect(focusStrip).toBeVisible();
    await expect(page.getByTestId('sidebar-results')).toHaveCount(0);

    // Verify diagram is visible in full width
    const diagram = page.locator('#decision-procedure-content');
    await expect(diagram).toBeVisible();
    await expect(diagram.getByText('Fase 1: Divisão Silábica Fonética').first()).toBeVisible();
    await expect(diagram.getByText('Convergência').first()).toBeVisible();

    // Test restoring via restore button
    const restoreButton = page.getByRole('button', { name: /restaurar/i });
    await expect(restoreButton).toBeVisible();
    await restoreButton.click();

    // Verify back to normal mode with sidebar
    await expect(page.getByTestId('sidebar-results')).toBeVisible();
    await expect(page.getByTestId('focus-results-strip')).toHaveCount(0);
  });

  test('valida layout do mapa integrado de hífen e roteiro dos porquês', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Validação layout especializado em desktop-1440');

    await openApp(page);
    await openTab(page, 'Roteiros');

    const searchInput = page.getByLabel(/buscar nos roteiros/i);
    const results = page.getByRole('navigation', { name: /roteiros de resolução encontrados/i });

    // 1. Porquês (decision flow spine + offramp)
    await searchInput.fill('Roteiro Geral de Decisão Ortográfica e Sintática dos Porquês');
    const porquesBtn = results.getByRole('button').first();
    await porquesBtn.click();
    const porquesDiagram = page.locator('#decision-procedure-content');
    await expect(porquesDiagram).toBeVisible();
    await expect(porquesDiagram.getByText('Há determinante antes da lacuna?').first()).toBeVisible();
    await expect(porquesDiagram.getByText('Escreva PORQUÊ (Junto com Acento)', { exact: false }).first()).toBeVisible();
    await expect(porquesDiagram.getByText('A lacuna introduz justificativa', { exact: false }).first()).toBeVisible();
    await expect(porquesDiagram.getByText('Escreva PORQUE (Junto sem Acento)', { exact: false }).first()).toBeVisible();
    await expect(porquesDiagram.getByText(/saída terminal/i).first()).toBeVisible();

    // 2. Hífen Integrado (stacked lanes for complex branches)
    await searchInput.fill('Algoritmo Integrado de Decisão para Questões de Hífen');
    const hifenBtn = results.getByRole('button').first();
    await hifenBtn.click();
    const hifenDiagram = page.locator('#decision-procedure-content');
    await expect(hifenDiagram).toBeVisible();
    await expect(hifenDiagram.getByText('Triagem Estrutural: A Palavra é Prefixada ou Composta?', { exact: false }).first()).toBeVisible();
    await expect(hifenDiagram.getByText('Eixo da Prefixação', { exact: false }).first()).toBeVisible();
    await expect(hifenDiagram.getByText('Eixo dos Nomes Compostos', { exact: false }).first()).toBeVisible();
  });

  test('valida composição hierárquica do Protocolo Mestre de Transposição (IP-A05-G06)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Validação de composição em desktop-1440');

    await openApp(page, '/?unit=IP-A05-G06&section=resolution');

    // Verify section opened and procedure present
    const resolutionSection = page.locator('#IP-A05-G06-resolution');
    await expect(resolutionSection).toBeVisible();

    // Verify single shared toolbar
    const sharedToolbar = resolutionSection.getByRole('tablist', { name: /modo de exibição do protocolo/i });
    await expect(sharedToolbar).toBeVisible();

    // Verify step hierarchy
    await expect(resolutionSection.getByText('Sequência de Execução em 5 Passos', { exact: false }).first()).toBeVisible();
    await expect(resolutionSection.getByText('Passo 2', { exact: false }).first()).toBeVisible();
    await expect(resolutionSection.getByText('Conversão do Sujeito', { exact: false }).first()).toBeVisible();
    await expect(resolutionSection.getByText('Passo 3', { exact: false }).first()).toBeVisible();
    await expect(resolutionSection.getByText('Montagem da Locução Passiva no Rascunho', { exact: false }).first()).toBeVisible();
    await expect(resolutionSection.getByText('Passo 4', { exact: false }).first()).toBeVisible();
    await expect(resolutionSection.getByText('Tratamento do Agente da Passiva', { exact: false }).first()).toBeVisible();
    await expect(resolutionSection.getByText('Passo 5', { exact: false }).first()).toBeVisible();
    await expect(resolutionSection.getByText('Confronto com as Alternativas da Questão', { exact: false }).first()).toBeVisible();

    // Verify NO duplicate full dark headers inside the embedded steps
    // (all embedded diagrams have hideHeader=true)
    const embeddedSections = resolutionSection.locator('.overflow-hidden.rounded-xl');
    expect(await embeddedSections.count()).toBeGreaterThanOrEqual(5);

    // Capture screenshot of the clean composed view
    const outputDir = path.resolve(
      process.cwd(),
      '../Notebook LM/05_Auditorias/semantica/structured-maps-v2-regeneration/reports/assets/six-map-fix/desktop',
    );
    const screenshotPath = path.join(outputDir, 'IP-A05-G06-composed-transposicao.png');
    await resolutionSection.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
