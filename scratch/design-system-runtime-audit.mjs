import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'docs/design-system/evidence';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const tools = ['modules', 'analyzer', 'pbl', 'simulado', 'errors', 'flashcards', 'pomodoro', 'agenda', 'decision', 'planner', 'duel', 'questions', 'stats', 'profile'];
const routes = tools.map(tool => ({ name: tool, path: `/?tool=${tool}` })).concat([
  { name: 'unit-explanation', path: '/?module=mod0&unit=IP-A00-G01&section=explanation' },
  { name: 'unit-legacy', path: '/?module=mod0&unit=IP-A00-G06&section=explanation' },
  { name: 'unit-comparison', path: '/?module=mod10&unit=IP-A10-G06&section=explanation' },
  { name: 'unit-review', path: '/?module=mod14&unit=IP-A14-S01&section=synthesis' },
]);
const results = [];
for (const width of [1440, 768, 390, 320]) {
  const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, locale: 'pt-BR', reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('suveca_onboarding_completed_v2', 'true'));
  const page = await context.newPage();
  for (const route of routes) {
    const errors = [];
    const onError = error => errors.push(error.message);
    page.on('pageerror', onError);
    try {
      await page.goto(`http://127.0.0.1:3000${route.path}`, { waitUntil: 'domcontentloaded' });
      await page.locator('main').waitFor();
      await page.getByText('Carregando ferramenta de estudo…').waitFor({ state: 'hidden' });
      await page.waitForTimeout(650);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const root = document.documentElement;
        const main = document.querySelector('main');
        const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
        const buttons = [...document.querySelectorAll('button,a[href],input,select,textarea,[role="tab"]')].filter(visible);
        return { documentWidth: root.scrollWidth, viewportWidth: root.clientWidth, mainWidth: main.getBoundingClientRect().width,
          fontFamily: getComputedStyle(main).fontFamily, headings: [...main.querySelectorAll('h1,h2,h3')].filter(visible).map(el => ({ level: el.tagName, text: el.textContent.trim().slice(0,120), size: getComputedStyle(el).fontSize })).slice(0,14),
          smallTargets: buttons.filter(el => { const r=el.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(el=>({text:(el.getAttribute('aria-label') || el.textContent).trim().slice(0,90),width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)})).slice(0,25),
          loadingText: main.textContent.includes('Carregando'), textSample:main.textContent.trim().slice(0,450) };
      });
      let axe = null;
      if (width === 1440 || width === 390) {
        const report = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
        axe = report.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,10)}));
      }
      if ([1440,390].includes(width) && ['modules','analyzer','pbl','questions','unit-explanation','unit-review','profile','flashcards'].includes(route.name)) {
        await page.screenshot({ path: `${out}/${route.name}-${width}.png`, fullPage: false });
      }
      results.push({ route:route.name,path:route.path,width,...geometry,axe,errors });
      console.log(JSON.stringify({route:route.name,width,overflow:geometry.documentWidth>geometry.viewportWidth,axe:axe?.map(v=>v.id),errors}));
    } catch(error) { results.push({route:route.name,width,error:String(error),errors}); console.log(`${width} ${route.name}: ${error}`); }
    page.off('pageerror', onError);
    await writeFile(`${out}/runtime-audit.json`, JSON.stringify({date:new Date().toISOString(),mode:'anonymous-local',results},null,2));
  }
  await context.close();
}
await browser.close();
