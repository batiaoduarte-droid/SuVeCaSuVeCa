import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PedagogicalUnitView, CumulativeReviewView } from '../../types/pedagogicalView';
import { PedagogicalUnitRenderer } from './PedagogicalUnitRenderer';
import { CumulativeReviewRenderer } from './CumulativeReviewRenderer';

interface DefectReport {
  unitId: string;
  category: string;
  subCategory: string;
  description: string;
  details?: any;
}

describe('Varredura Mecânica Rigorosa do DOM/HTML', () => {
  it('executa auditoria profunda nos 115 view models renderizados com todas as seções expandidas', () => {
    const root = path.join(process.cwd(), 'public', 'knowledge', 'pedagogical', 'views');
    const files = fs.readdirSync(root).filter((name) => name.endsWith('.json') && name !== 'manifest.json').sort();
    
    expect(files.length).toBe(115);

    const defects: DefectReport[] = [];
    const auditedStats = {
      totalUnits: files.length,
      regularUnits: 0,
      cumulativeUnits: 0,
      totalDetailsSections: 0,
      totalTables: 0,
      totalBadges: 0,
      totalListItems: 0,
      totalCards: 0,
    };

    for (const file of files) {
      localStorage.clear();
      const raw = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      const unitId = raw.unit?.unitId || file.replace('.json', '');
      const isCumulative = raw.unitType === 'cumulative_review';

      if (isCumulative) {
        auditedStats.cumulativeUnits += 1;
      } else {
        auditedStats.regularUnits += 1;
      }

      // Renderiza o componente
      const rendered = isCumulative
        ? render(<CumulativeReviewRenderer view={raw as CumulativeReviewView} />)
        : render(<PedagogicalUnitRenderer view={raw as PedagogicalUnitView} />);

      const container = rendered.container;

      // Força a expansão de todas as seções <details> no DOM
      const detailsList = container.querySelectorAll('details');
      auditedStats.totalDetailsSections += detailsList.length;
      detailsList.forEach((d) => {
        d.setAttribute('open', '');
        d.open = true;
      });

      // -------------------------------------------------------------
      // 1. Tags vazias ou nós sem texto
      // -------------------------------------------------------------
      
      // 1.1 Listas <ul> / <ol> com itens <li> vazios
      const allLis = container.querySelectorAll('li');
      auditedStats.totalListItems += allLis.length;
      allLis.forEach((li, idx) => {
        const text = li.textContent?.trim() || '';
        // Verifica se tem elementos visuais mesmo sem texto direto (ex: svg, input, button)
        const hasVisualElement = li.querySelector('svg, img, input, button, canvas');
        if (!text && !hasVisualElement) {
          defects.push({
            unitId,
            category: '1. Tags vazias ou nós sem texto',
            subCategory: 'Item de lista (li) vazio',
            description: `<li> index ${idx} está vazio no DOM`,
            details: { html: li.outerHTML },
          });
        }
      });

      // 1.2 Tags <p>, <span>, <div> vazias dentro de contêineres de passos ou seções
      const stepContainers = container.querySelectorAll(
        '.space-y-2, .space-y-3, .space-y-4, .space-y-5, [class*="step"], [class*="procedure"], [class*="analysis"]'
      );
      stepContainers.forEach((sc) => {
        const paragraphs = sc.querySelectorAll('p');
        paragraphs.forEach((p) => {
          const text = p.textContent?.trim() || '';
          const hasVisual = p.querySelector('svg, img, input, button, canvas');
          if (!text && !hasVisual) {
            defects.push({
              unitId,
              category: '1. Tags vazias ou nós sem texto',
              subCategory: 'Parágrafo (<p>) vazio em contêiner de passos/procedimentos',
              description: `<p> vazio encontrado em contêiner: ${p.outerHTML}`,
            });
          }
        });
      });

      // -------------------------------------------------------------
      // 2. Sintaxe não processada / Vazamento de código bruto
      // -------------------------------------------------------------
      
      // Itera por todos os nós de texto (exceto <script>, <style>, <code>, <pre>)
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (['script', 'style', 'code', 'pre'].includes(tag)) return NodeFilter.FILTER_REJECT;
            // Ignora nós dentro de .katex que são elementos matemáticos gerados
            if (parent.closest('.katex')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let currentNode = walker.nextNode();
      while (currentNode) {
        const text = currentNode.textContent || '';

        // 2.1 LaTeX não processado (ex.: $...$, \text{...}, \frac{...})
        // Ignora cifras legítimas como R$ 100
        const unparsedLatexMatches = text.match(/\$(?!\s*[\d,.]+\b)[^$\n]+\$|\\text\{|\\frac\{|\\mathbf\{/g);
        if (unparsedLatexMatches) {
          defects.push({
            unitId,
            category: '2. Sintaxe não processada / Vazamento de código bruto',
            subCategory: 'LaTeX não convertido por KaTeX',
            description: `Fragmento com LaTeX bruto: "${text.trim().slice(0, 100)}"`,
            details: { matches: unparsedLatexMatches },
          });
        }

        // 2.2 Marcações Markdown não parseadas (ex.: **texto**, *texto*, [link](url))
        // Observação: asteriscos simples como operadores matemáticos (ex: 2 * 3) não são bold markdown
        const boldMatches = text.match(/\*\*[^*]+\*\*/g);
        if (boldMatches) {
          defects.push({
            unitId,
            category: '2. Sintaxe não processada / Vazamento de código bruto',
            subCategory: 'Markdown negrito (**) não parseado',
            description: `Texto contém '**' não convertido: "${text.trim().slice(0, 100)}"`,
            details: { matches: boldMatches },
          });
        }

        const mdLinkMatches = text.match(/\[[^\]]+\]\([^)]+\)/g);
        if (mdLinkMatches) {
          defects.push({
            unitId,
            category: '2. Sintaxe não processada / Vazamento de código bruto',
            subCategory: 'Markdown link [text](url) não parseado',
            description: `Texto contém link markdown bruto: "${text.trim().slice(0, 100)}"`,
            details: { matches: mdLinkMatches },
          });
        }

        // 2.3 Entidades HTML quebradas ou escapes literais incorretos (\n visível, &amp;, &quot;)
        const entityMatches = text.match(/&amp;|&quot;|&lt;|&gt;|&#39;|&nbsp;/g);
        if (entityMatches) {
          defects.push({
            unitId,
            category: '2. Sintaxe não processada / Vazamento de código bruto',
            subCategory: 'Entidade HTML aparente em texto visível',
            description: `Texto contém entidade HTML não resolvida: "${text.trim().slice(0, 100)}"`,
            details: { matches: entityMatches },
          });
        }

        const literalNewlineMatch = text.match(/(?<!\\)\\n/g);
        if (literalNewlineMatch && !text.includes('\n')) {
          // Se contiver '\n' literal como texto visível sem quebra real
          if (text.includes('\\n') && !text.includes('regex') && !text.includes('código')) {
            defects.push({
              unitId,
              category: '2. Sintaxe não processada / Vazamento de código bruto',
              subCategory: 'Escape \\n literal visível',
              description: `Texto contém '\\n' literal: "${text.trim().slice(0, 100)}"`,
            });
          }
        }

        currentNode = walker.nextNode();
      }

      // -------------------------------------------------------------
      // 3. Inconsistência em Contadores e Badges
      // -------------------------------------------------------------
      
      // 3.1 Badges anunciando contadores
      const badgeElements = container.querySelectorAll('.rounded-full, .rounded-md, span, h2, h3');
      badgeElements.forEach((badge) => {
        const badgeText = badge.textContent?.trim() || '';
        
        // Verifica padrão "0 itens", "0 conceitos", "0 regras", "0 exemplos", "0 contrastes", "0 armadilhas"
        const zeroMatch = badgeText.match(/\b0\s+(itens|conceitos|regras|exemplos|contrastes|armadilhas|roteiros|questões)\b/i);
        if (zeroMatch) {
          defects.push({
            unitId,
            category: '3. Inconsistência em Contadores e Badges',
            subCategory: 'Badge exibindo 0 itens em seção ativa',
            description: `Badge exibe contagem zero: "${badgeText}"`,
            details: { html: badge.outerHTML },
          });
        }
      });

      // 3.2 Divergência entre contadores declarados no cabeçalho da seção e cards renderizados
      if (!isCumulative) {
        const sections = raw.sections || {};

        // Regras:
        if (sections.rules?.items?.length) {
          const expected = sections.rules.items.length;
          const rulesHeader = container.querySelector('#' + CSS.escape(`${unitId}-rules`));
          if (rulesHeader) {
            const badge = rulesHeader.querySelector('.rounded-full');
            const match = badge?.textContent?.match(/(\d+)\s+regra/i);
            if (match) {
              const announced = parseInt(match[1], 10);
              if (announced !== expected) {
                defects.push({
                  unitId,
                  category: '3. Inconsistência em Contadores e Badges',
                  subCategory: 'Divergência de contador em Regras',
                  description: `Anunciado ${announced} regras no badge, mas payload possui ${expected}`,
                });
              }
            }
          }
        }

        // Roteiros (procedures):
        if (sections.resolution?.procedures?.length) {
          const expected = sections.resolution.procedures.length;
          const resHeader = container.querySelector('#' + CSS.escape(`${unitId}-resolution`));
          if (resHeader) {
            const badge = resHeader.querySelector('.rounded-full');
            const match = badge?.textContent?.match(/(\d+)\s+roteiro/i);
            if (match) {
              const announced = parseInt(match[1], 10);
              if (announced !== expected) {
                defects.push({
                  unitId,
                  category: '3. Inconsistência em Contadores e Badges',
                  subCategory: 'Divergência de contador em Roteiros',
                  description: `Anunciado ${announced} roteiros no badge, mas payload possui ${expected}`,
                });
              }
            }
          }
        }

        // Contrastes:
        if (sections.contrasts?.items?.length) {
          const expected = sections.contrasts.items.length;
          const contHeader = container.querySelector('#' + CSS.escape(`${unitId}-contrasts`));
          if (contHeader) {
            const badge = contHeader.querySelector('.rounded-full');
            const match = badge?.textContent?.match(/(\d+)\s+contraste/i);
            if (match) {
              const announced = parseInt(match[1], 10);
              if (announced !== expected) {
                defects.push({
                  unitId,
                  category: '3. Inconsistência em Contadores e Badges',
                  subCategory: 'Divergência de contador em Contrastes',
                  description: `Anunciado ${announced} contrastes no badge, mas payload possui ${expected}`,
                });
              }
            }
          }
        }

        // Exemplos:
        if (sections.examples?.items?.length) {
          const expected = sections.examples.items.length;
          const exHeader = container.querySelector('#' + CSS.escape(`${unitId}-examples`));
          if (exHeader) {
            const badge = exHeader.querySelector('.rounded-full');
            const match = badge?.textContent?.match(/(\d+)\s+exemplo/i);
            if (match) {
              const announced = parseInt(match[1], 10);
              if (announced !== expected) {
                defects.push({
                  unitId,
                  category: '3. Inconsistência em Contadores e Badges',
                  subCategory: 'Divergência de contador em Exemplos',
                  description: `Anunciado ${announced} exemplos no badge, mas payload possui ${expected}`,
                });
              }
            }
          }
        }

        // Pegadinhas:
        if (sections.traps?.items?.length) {
          const expected = sections.traps.items.length;
          const trapHeader = container.querySelector('#' + CSS.escape(`${unitId}-traps`));
          if (trapHeader) {
            const badge = trapHeader.querySelector('.rounded-full');
            const match = badge?.textContent?.match(/(\d+)\s+armadilha/i);
            if (match) {
              const announced = parseInt(match[1], 10);
              if (announced !== expected) {
                defects.push({
                  unitId,
                  category: '3. Inconsistência em Contadores e Badges',
                  subCategory: 'Divergência de contador em Pegadinhas',
                  description: `Anunciado ${announced} armadilhas no badge, mas payload possui ${expected}`,
                });
              }
            }
          }
        }

        // Questões Oficiais:
        if (raw.officialQuestions?.length) {
          const expected = raw.officialQuestions.length;
          const qSection = container.querySelector('#' + CSS.escape(`${unitId}-official-questions`));
          if (qSection) {
            const heading = qSection.querySelector('h3');
            const match = heading?.textContent?.match(/Questões Oficiais de Prova\s*\((\d+)\)/i);
            if (match) {
              const announced = parseInt(match[1], 10);
              if (announced !== expected) {
                defects.push({
                  unitId,
                  category: '3. Inconsistência em Contadores e Badges',
                  subCategory: 'Divergência de contador em Questões Oficiais',
                  description: `Anunciado ${announced} questões no título, mas payload possui ${expected}`,
                });
              }
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 4. Quebra de Layout, Tabelas e Overflow
      // -------------------------------------------------------------
      
      const tables = container.querySelectorAll('table');
      auditedStats.totalTables += tables.length;

      tables.forEach((table, tIdx) => {
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        const headers = thead ? thead.querySelectorAll('th') : [];
        const headerCount = headers.length;

        // 4.1 Cabeçalhos vazios
        headers.forEach((th, hIdx) => {
          if (!th.textContent?.trim()) {
            defects.push({
              unitId,
              category: '4. Quebra de Layout, Tabelas e Overflow',
              subCategory: 'Cabeçalho de tabela (th) em branco',
              description: `Tabela ${tIdx + 1} possui coluna ${hIdx + 1} com cabeçalho <th> vazio`,
            });
          }
        });

        // 4.2 Desalinhamento entre th e td
        if (tbody) {
          const rows = tbody.querySelectorAll('tr');
          rows.forEach((tr, rIdx) => {
            const cells = tr.querySelectorAll('td');
            if (headerCount > 0 && cells.length !== headerCount) {
              defects.push({
                unitId,
                category: '4. Quebra de Layout, Tabelas e Overflow',
                subCategory: 'Desalinhamento entre <th> e <td>',
                description: `Tabela ${tIdx + 1}, linha ${rIdx + 1}: ${cells.length} células (td) para ${headerCount} cabeçalhos (th)`,
              });
            }
            // Verifica células completamente em branco
            cells.forEach((td, cIdx) => {
              if (!td.textContent?.trim() && !td.querySelector('svg, img, input')) {
                defects.push({
                  unitId,
                  category: '4. Quebra de Layout, Tabelas e Overflow',
                  subCategory: 'Célula de tabela (td) em branco',
                  description: `Tabela ${tIdx + 1}, linha ${rIdx + 1}, coluna ${cIdx + 1} possui célula vazia`,
                });
              }
            });
          });
        }
      });

      // 4.4 Textos cortados indevidamente por classes de truncamento (sem title ou visualização completa)
      const truncatedElements = container.querySelectorAll('.truncate');
      truncatedElements.forEach((el) => {
        const titleAttr = el.getAttribute('title');
        const parentTitle = el.parentElement?.getAttribute('title');
        const text = el.textContent?.trim() || '';
        if (text.length > 50 && !titleAttr && !parentTitle) {
          defects.push({
            unitId,
            category: '4. Quebra de Layout, Tabelas e Overflow',
            subCategory: 'Texto truncado sem atributo title acessível',
            description: `Elemento com .truncate e ${text.length} chars sem title: "${text.slice(0, 40)}..."`,
          });
        }
      });

      // -------------------------------------------------------------
      // 5. Acessibilidade e Atributos de Estado
      // -------------------------------------------------------------
      
      // 5.1 IDs duplicados no DOM renderizado
      const allIds = container.querySelectorAll('[id]');
      const seenIds = new Set<string>();
      allIds.forEach((el) => {
        const id = el.getAttribute('id');
        if (id) {
          if (seenIds.has(id)) {
            defects.push({
              unitId,
              category: '5. Acessibilidade e Atributos de Estado',
              subCategory: 'ID duplicado no DOM',
              description: `ID duplicado detectado: "${id}"`,
            });
          } else {
            seenIds.add(id);
          }
        }
      });

      // 5.2 Botões de alternância e atributos de estado (details, summary, aria-expanded)
      const detailsElements = container.querySelectorAll('details');
      detailsElements.forEach((det, dIdx) => {
        const summary = det.querySelector('summary');
        if (!summary) {
          defects.push({
            unitId,
            category: '5. Acessibilidade e Atributos de Estado',
            subCategory: 'Elemento <details> sem <summary>',
            description: `<details> index ${dIdx} não possui elemento <summary>`,
          });
        }
      });

      const ariaExpandedElements = container.querySelectorAll('[aria-expanded]');
      ariaExpandedElements.forEach((el) => {
        const val = el.getAttribute('aria-expanded');
        if (val !== 'true' && val !== 'false') {
          defects.push({
            unitId,
            category: '5. Acessibilidade e Atributos de Estado',
            subCategory: 'Valor inválido de aria-expanded',
            description: `Elemento possui aria-expanded="${val}"`,
          });
        }
      });

      cleanup();
    }

    console.log('=== RELATÓRIO DA AUDITORIA MECÂNICA DO DOM ===');
    console.log(JSON.stringify({ auditedStats, totalDefects: defects.length }, null, 2));

    const groupedByCategory: Record<string, DefectReport[]> = {};
    for (const d of defects) {
      if (!groupedByCategory[d.category]) groupedByCategory[d.category] = [];
      groupedByCategory[d.category].push(d);
    }

    for (const [cat, items] of Object.entries(groupedByCategory)) {
      console.log(`\n--- CATEGORIA: ${cat} (${items.length} ocorrências) ---`);
      for (const item of items.slice(0, 15)) {
        console.log(`  [${item.unitId}] ${item.subCategory}: ${item.description}`);
      }
      if (items.length > 15) {
        console.log(`  ... e mais ${items.length - 15} ocorrências`);
      }
    }

    const reportPath = path.join(process.cwd(), 'DOM_MECHANICAL_SCAN_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify({ auditedStats, defectCount: defects.length, defects, groupedByCategory }, null, 2), 'utf8');

    expect(defects).toBeDefined();
  }, 120_000);
});
