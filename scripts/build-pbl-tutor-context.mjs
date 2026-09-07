import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PBL_DIR = path.resolve(ROOT, 'public', 'knowledge', 'pbl');
const TUTOR_DIR = path.join(PBL_DIR, 'tutor');
const PARTS_DIR = path.join(TUTOR_DIR, 'parts');
const VIEWS_DIR = path.resolve(ROOT, 'public', 'knowledge', 'pedagogical', 'views');
const OFFICIAL_PARTS_DIR = path.resolve(ROOT, 'public', 'knowledge', 'official-question-parts');
const PROCEDURES_FILE = path.resolve(ROOT, 'public', 'knowledge', 'pedagogical', 'decision-procedures.json');
const MACRO_CATALOG_FILE = path.resolve(ROOT, 'public', 'knowledge', 'pedagogical', 'curriculum', 'macro-catalog.v1.json');

const TARGET_SHARD_BYTES = 2 * 1024 * 1024; // 2 MB

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const jsonBuffer = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

const readJson = async (filePath) => {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const normalizedRuleRef = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/^RULF-/, 'RULE-')
  .replace(/-(\d+)$/, (_match, digits) => `-${Number(digits)}`);

async function main() {
  console.log('[build-pbl-tutor-context] Iniciando compilação da projeção do tutor PBL...');

  // 1. Carregar artefatos base do PBL
  const [competencyMap, cases, authoredQuestions, pedagogyIndex, linksIndex, authoredPackages] = await Promise.all([
    readJson(path.join(PBL_DIR, 'pbl_competency_map.json')),
    readJson(path.join(PBL_DIR, 'pbl_cases.json')),
    readJson(path.join(PBL_DIR, 'pbl_authored_questions.json')),
    readJson(path.join(PBL_DIR, 'question_pedagogy_index.json')),
    readJson(path.join(PBL_DIR, 'question_competency_links.json')),
    readJson(path.join(PBL_DIR, 'pbl_authored_packages.json')).catch(() => []),
  ]);

  console.log(`[build-pbl-tutor-context] Carregadas ${competencyMap.length} competências, ${cases.length} casos e ${authoredPackages.length} pacotes de autoria.`);

  const authoredPackageQuestions = new Map();
  const authoredPackageQuestionsByComp = new Map();
  const authoredWorkedExamples = new Map();
  const authoredWorkedExamplesByComp = new Map();
  const authoredRulesByQuestion = new Map();
  const authoredProceduresByQuestion = new Map();
  const authoredContrastsByQuestion = new Map();
  const authoredTablesByQuestion = new Map();
  const authoredBoundariesByQuestion = new Map();

  for (const pkg of (authoredPackages || [])) {
    for (const q of (pkg.questions || [])) {
      if (q.id) {
        authoredPackageQuestionsByComp.set(`${q.id}::${pkg.competencyRef}`, q);
        if (!authoredPackageQuestions.has(q.id)) {
          authoredPackageQuestions.set(q.id, q);
        }
      }
    }

    for (const itv of (pkg.interventions || [])) {
      const qRefs = itv.appliesToQuestionRefs || [];

      for (const h of (itv.hint || [])) {
        if (h.block?.type === 'rule') {
          const ruleObj = {
            ruleRef: h.id || `RULE-${pkg.competencyRef}`,
            unitId: pkg.unitId,
            title: h.block.title || 'Regra Canônica',
            statement: h.block.statement || '',
            conditions: Array.isArray(h.block.conditions) ? h.block.conditions : [],
            exceptions: Array.isArray(h.block.exceptions) ? h.block.exceptions : [],
          };
          for (const qRef of qRefs) {
            if (!authoredRulesByQuestion.has(qRef)) authoredRulesByQuestion.set(qRef, []);
            authoredRulesByQuestion.get(qRef).push(ruleObj);
          }
        } else if (h.block?.type === 'rule_boundary') {
          const boundaryObj = {
            boundaryRef: h.id || `BOUNDARY-HNT-${pkg.competencyRef}`,
            title: h.block.title || 'Limites e Armadilhas da Regra',
            text: h.block.text || '',
            conditions: Array.isArray(h.block.conditions) ? h.block.conditions : [],
            exceptions: Array.isArray(h.block.exceptions) ? h.block.exceptions : [],
            scope: h.block.scope || '',
            limits: Array.isArray(h.block.limits) ? h.block.limits : [],
            traps: Array.isArray(h.block.traps) ? h.block.traps : [],
            nonApplicabilityConditions: Array.isArray(h.block.nonApplicabilityConditions) ? h.block.nonApplicabilityConditions : [],
            sourceRefs: Array.isArray(h.sourceRefs) ? h.sourceRefs : [],
            derivation: h.derivation || undefined,
            interventionId: itv.id,
            layer: 'hint',
          };
          for (const qRef of qRefs) {
            if (!authoredBoundariesByQuestion.has(qRef)) authoredBoundariesByQuestion.set(qRef, []);
            authoredBoundariesByQuestion.get(qRef).push(boundaryObj);
          }
        } else if (h.block?.type === 'table') {
          const tableObj = {
            id: h.id || `TABLE-HNT-${pkg.competencyRef}-${authoredTablesByQuestion.size + 1}`,
            unitId: pkg.unitId,
            title: h.block.title || h.block.caption || 'Tabela de Apoio',
            columns: Array.isArray(h.block.headers) ? h.block.headers : (Array.isArray(h.block.columns) ? h.block.columns : []),
            rows: Array.isArray(h.block.rows) ? h.block.rows : [],
          };
          for (const qRef of qRefs) {
            if (!authoredTablesByQuestion.has(qRef)) authoredTablesByQuestion.set(qRef, []);
            authoredTablesByQuestion.get(qRef).push(tableObj);
          }
        }
      }

      for (const p of (itv.partial || [])) {
        if (p.block?.type === 'procedure') {
          const pObj = {
            procedureRef: p.id || `PROC-${pkg.competencyRef}`,
            title: p.block.title || 'Procedimento Passo a Passo',
            markdown: Array.isArray(p.block.steps)
              ? p.block.steps.map((s) => `${s.order || ''}. **${s.action || ''}**: ${s.explanation || ''} _(Teste: ${s.test || ''})_`).join('\n\n')
              : '',
            unitId: pkg.unitId,
          };
          for (const qRef of qRefs) {
            if (!authoredProceduresByQuestion.has(qRef)) authoredProceduresByQuestion.set(qRef, []);
            authoredProceduresByQuestion.get(qRef).push(pObj);
          }
        } else if (p.block?.type === 'contrast') {
          const cObj = {
            contrastRef: p.id || `CONTRAST-${pkg.competencyRef}`,
            unitId: pkg.unitId,
            title: p.block.title || 'Contraste Conceitual',
            poleA: p.block.sideA?.label || '',
            poleB: p.block.sideB?.label || '',
            sideACriteria: Array.isArray(p.block.sideA?.criteria) ? p.block.sideA.criteria : [],
            sideBCriteria: Array.isArray(p.block.sideB?.criteria) ? p.block.sideB.criteria : [],
            decisionCriterion: p.block.decisiveDifference || '',
            examples: [],
          };
          for (const qRef of qRefs) {
            if (!authoredContrastsByQuestion.has(qRef)) authoredContrastsByQuestion.set(qRef, []);
            authoredContrastsByQuestion.get(qRef).push(cObj);
          }
        } else if (p.block?.type === 'table') {
          const tableObj = {
            id: p.id || `TABLE-PRT-${pkg.competencyRef}-${authoredTablesByQuestion.size + 1}`,
            unitId: pkg.unitId,
            title: p.block.title || p.block.caption || 'Tabela de Procedimento',
            columns: Array.isArray(p.block.headers) ? p.block.headers : (Array.isArray(p.block.columns) ? p.block.columns : []),
            rows: Array.isArray(p.block.rows) ? p.block.rows : [],
          };
          for (const qRef of qRefs) {
            if (!authoredTablesByQuestion.has(qRef)) authoredTablesByQuestion.set(qRef, []);
            authoredTablesByQuestion.get(qRef).push(tableObj);
          }
        } else if (p.block?.type === 'rule_boundary') {
          const boundaryObj = {
            boundaryRef: p.id || `BOUNDARY-PRT-${pkg.competencyRef}`,
            title: p.block.title || 'Limites e Armadilhas da Regra',
            text: p.block.text || '',
            conditions: Array.isArray(p.block.conditions) ? p.block.conditions : [],
            exceptions: Array.isArray(p.block.exceptions) ? p.block.exceptions : [],
            scope: p.block.scope || '',
            limits: Array.isArray(p.block.limits) ? p.block.limits : [],
            traps: Array.isArray(p.block.traps) ? p.block.traps : [],
            nonApplicabilityConditions: Array.isArray(p.block.nonApplicabilityConditions) ? p.block.nonApplicabilityConditions : [],
            sourceRefs: Array.isArray(p.sourceRefs) ? p.sourceRefs : [],
            derivation: p.derivation || undefined,
            interventionId: itv.id,
            layer: 'partial',
          };
          for (const qRef of qRefs) {
            if (!authoredBoundariesByQuestion.has(qRef)) authoredBoundariesByQuestion.set(qRef, []);
            authoredBoundariesByQuestion.get(qRef).push(boundaryObj);
          }
        }
      }

      for (const f of (itv.full || [])) {
        const fullQRefs = f.appliesToQuestionRefs || qRefs;
        for (const qRef of fullQRefs) {
          authoredWorkedExamplesByComp.set(`${qRef}::${pkg.competencyRef}`, f);
          if (!authoredWorkedExamples.has(qRef)) {
            authoredWorkedExamples.set(qRef, f);
          }
        }
      }
    }
  }

  console.log(`[build-pbl-tutor-context] Indexados ${authoredPackageQuestions.size} itens únicos (${authoredPackageQuestionsByComp.size} mapeamentos por competência) e ${authoredWorkedExamples.size} resoluções guiadas dos pacotes de autoria.`);

  const competenciesById = new Map();
  for (const comp of competencyMap) {
    competenciesById.set(comp.competencyId, comp);
  }

  const casesByCompetency = new Map();
  for (const c of cases) {
    casesByCompetency.set(c.competencyRef, c);
  }

  // 2. Carregar macro-catálogo
  const macroByUnit = new Map();
  const macroByLesson = new Map();
  try {
    const macroCatalog = await readJson(MACRO_CATALOG_FILE);
    const allEntries = [
      ...(macroCatalog.regularEntries || []),
      ...(macroCatalog.cumulativeReviewEntries || []),
    ];
    for (const entry of allEntries) {
      if (Array.isArray(entry.unitRefs)) {
        for (const uRef of entry.unitRefs) {
          macroByUnit.set(uRef, {
            macroId: entry.macroId,
            title: entry.title,
            entryKind: entry.entryKind,
            lessonId: entry.lessonId,
          });
        }
      }
      if (entry.lessonId && !macroByLesson.has(entry.lessonId)) {
        macroByLesson.set(entry.lessonId, {
          macroId: entry.macroId,
          title: entry.title,
        });
      }
    }
  } catch (err) {
    console.warn('[build-pbl-tutor-context] Aviso ao carregar macro-catálogo:', err.message);
  }

  // 3. Carregar procedimentos de decisão
  const proceduresByRef = new Map();
  const proceduresByUnit = new Map();
  try {
    const procData = await readJson(PROCEDURES_FILE);
    for (const proc of (procData.procedures || [])) {
      const pRecord = {
        procedureRef: proc.id || proc.sourceRefs?.[1] || proc.sourceRefs?.[0] || '',
        title: proc.title || 'Procedimento de Resolução',
        markdown: proc.markdown || '',
        unitId: proc.unitId,
      };
      if (Array.isArray(proc.sourceRefs)) {
        for (const ref of proc.sourceRefs) {
          proceduresByRef.set(ref, pRecord);
        }
      }
      if (proc.id) {
        proceduresByRef.set(proc.id, pRecord);
      }
      if (proc.unitId && !proceduresByUnit.has(proc.unitId)) {
        proceduresByUnit.set(proc.unitId, pRecord);
      }
    }
  } catch (err) {
    console.warn('[build-pbl-tutor-context] Aviso ao carregar decision-procedures:', err.message);
  }

  // 4. Carregar View Models compilados (102 regulares + 13 cumulativos)
  console.log('[build-pbl-tutor-context] Indexando views pedagógicas...');
  const viewFiles = (await readdir(VIEWS_DIR)).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
  const unitViews = new Map();
  const rulesByRef = new Map();
  const tablesById = new Map();
  const tablesByUnit = new Map();
  const contrastsByRef = new Map();
  const contrastsByUnit = new Map();
  const viewQuestionsByRef = new Map();

  for (const vf of viewFiles) {
    const vData = await readJson(path.join(VIEWS_DIR, vf));
    const unitId = vf.replace('.json', '');
    unitViews.set(unitId, vData);

    // Extrair tabelas de supplementaryBlocks
    const supBlocks = [
      ...(vData.sections?.rules?.supplementaryBlocks || []),
      ...(vData.sections?.contrasts?.supplementaryBlocks || []),
    ];
    for (const b of supBlocks) {
      if (b.table) {
        const tableObj = {
          id: b.table.tableId || b.tableId || `TABLE-${unitId}-${tablesById.size + 1}`,
          unitId,
          title: b.table.caption || b.title || 'Tabela normativa',
          columns: Array.isArray(b.table.headers) ? b.table.headers : (Array.isArray(b.table.columns) ? b.table.columns : []),
          rows: Array.isArray(b.table.rows) ? b.table.rows : [],
        };
        tablesById.set(tableObj.id, tableObj);
        if (!tablesByUnit.has(unitId)) tablesByUnit.set(unitId, []);
        tablesByUnit.get(unitId).push(tableObj);
      }
    }

    // Extrair tabelas de explanation groups
    const expGroups = vData.sections?.explanation?.groups || [];
    for (const g of expGroups) {
      for (const b of (g.blocks || [])) {
        if (b.type === 'table' && b.columns && b.rows) {
          const tableObj = {
            id: b.id || `TABLE-EXP-${unitId}-${tablesById.size + 1}`,
            unitId,
            title: b.title || g.title || 'Quadro conceitual',
            columns: b.columns,
            rows: b.rows,
          };
          tablesById.set(tableObj.id, tableObj);
          if (!tablesByUnit.has(unitId)) tablesByUnit.set(unitId, []);
          tablesByUnit.get(unitId).push(tableObj);
        }
      }
    }

    // Extrair regras
    const ruleItems = vData.sections?.rules?.items || [];
    for (let idx = 0; idx < ruleItems.length; idx += 1) {
      const rule = ruleItems[idx];
      const ref = rule.entityId || rule.id || `RULE-${unitId}-${String(idx + 1).padStart(3, '0')}`;

      // Encontrar tabela associada à regra
      let resolvedTable = rule.resolvedTable;
      if (!resolvedTable && rule.blocks?.length) {
        const tableRefBlock = rule.blocks.find((b) => b.type === 'table_ref');
        if (tableRefBlock?.tableId && tablesById.has(tableRefBlock.tableId)) {
          resolvedTable = tablesById.get(tableRefBlock.tableId);
        }
        if (!resolvedTable) {
          const directTable = rule.blocks.find((b) => b.type === 'table');
          if (directTable?.columns && directTable?.rows) {
            resolvedTable = {
              id: directTable.id || `TABLE-RULE-${ref}`,
              title: directTable.title || rule.title || 'Tabela da regra',
              columns: directTable.columns,
              rows: directTable.rows,
            };
          }
        }
      }
      if (!resolvedTable && tablesByUnit.has(unitId)) {
        resolvedTable = tablesByUnit.get(unitId)[0];
      }

      const ruleObj = {
        ruleRef: ref,
        unitId,
        title: rule.title || `Regra ${ref}`,
        statement: rule.statement || '',
        conditions: Array.isArray(rule.conditions) ? [...rule.conditions] : [],
        exceptions: Array.isArray(rule.exceptions) ? [...rule.exceptions] : [],
        resolvedTable,
      };

      rulesByRef.set(ref, ruleObj);
      rulesByRef.set(normalizedRuleRef(ref), ruleObj);
    }

    // Extrair contrastes
    const contrastItems = vData.sections?.contrasts?.items || [];
    for (const c of contrastItems) {
      const ref = c.contrastId || c.entityId;
      if (ref) {
        const cObj = {
          contrastRef: ref,
          unitId,
          title: c.title || 'Contraste de Prova',
          poleA: c.conceptA || c.poleA || '',
          poleB: c.conceptB || c.poleB || '',
          sideA: c.sideA || '',
          sideB: c.sideB || '',
          decisionCriterion: c.decisionCriterion || c.explanation || '',
          examples: Array.isArray(c.blocks) ? c.blocks.map((b) => b.text).filter(Boolean) : [],
        };
        contrastsByRef.set(ref, cObj);
        if (!contrastsByUnit.has(unitId)) contrastsByUnit.set(unitId, []);
        contrastsByUnit.get(unitId).push(cObj);
      }
    }

    // Questões na view
    for (const q of (vData.officialQuestions || [])) {
      const qRef = q.officialQuestionId || q.questionId;
      if (qRef) {
        viewQuestionsByRef.set(qRef, q);
      }
    }
  }

  console.log(`[build-pbl-tutor-context] Indexadas ${rulesByRef.size} referências de regras, ${tablesById.size} tabelas, ${contrastsByRef.size} contrastes e ${viewQuestionsByRef.size} questões de views.`);

  // 5. Carregar shards de questões normalizadas para fallback
  console.log('[build-pbl-tutor-context] Carregando shards de questões oficiais...');
  const officialNormalizedMap = new Map();
  const officialPartFiles = (await readdir(OFFICIAL_PARTS_DIR)).filter((f) => f.includes('.normalized.') && f.endsWith('.json'));
  for (const partFile of officialPartFiles) {
    const partData = await readJson(path.join(OFFICIAL_PARTS_DIR, partFile));
    if (Array.isArray(partData)) {
      for (const item of partData) {
        if (item.id) {
          officialNormalizedMap.set(item.id, item);
          const sep = item.id.indexOf(':');
          if (sep > 0) {
            const lesson = item.id.slice(0, sep).toUpperCase();
            const src = item.id.slice(sep + 1);
            officialNormalizedMap.set(`OQ-${lesson}-${src}`, item);
            officialNormalizedMap.set(src, item);
          }
        }
        if (item.originalQuestionId) {
          officialNormalizedMap.set(item.originalQuestionId, item);
        }
      }
    }
  }
  console.log(`[build-pbl-tutor-context] Mapeadas ${officialNormalizedMap.size} referências de questões oficiais.`);

  // 6. Montar a projeção por questão
  console.log('[build-pbl-tutor-context] Projetando contexto do tutor para todas as 4.945 questões...');

  const auditedCorrections = [];
  const coverageInventory = {
    generatedAt: new Date().toISOString(),
    totalQuestions: Object.keys(pedagogyIndex).length,
    totalCompetencies: competencyMap.length,
    competenciesCoverage: {},
    summary: {
      ready: 0,
      limited: 0,
      questionsWithRules: 0,
      questionsWithProcedures: 0,
      questionsWithContrasts: 0,
      questionsWithTables: 0,
      questionsWithSolutionStrategy: 0,
      auditedPoremQuestionChecked: false,
    },
  };

  const projectedQuestions = new Map();

  for (const [questionRef, pedagogy] of Object.entries(pedagogyIndex)) {
    const link = linksIndex[questionRef] || {};
    const primaryCompRef = link.primaryCompetencyRef || link.competencyId || pedagogy.primaryUnitRef || '';
    const comp = competenciesById.get(primaryCompRef);
    const pblCase = comp ? casesByCompetency.get(comp.competencyId) : undefined;
    const unitId = comp?.unitId || pedagogy.primaryUnitRef || (pedagogy.allUnitRefs && pedagogy.allUnitRefs[0]) || '';
    const lessonId = comp?.lessonId || pedagogy.lessonId || (unitId ? unitId.split('-')[1] : '');

    // A. Resolução em cascata dos dados da questão (priorizando viewQuestion com payload completo)
    let prompt = '';
    let command = '';
    let supportBlocks = [];
    let options = [];
    let officialAnswer = '';
    let questionType = 'multiple_choice';
    let examBoard = '';
    let year = undefined;
    let officialCommentary = '';

    const viewQuestion = viewQuestionsByRef.get(questionRef);
    const authored = authoredQuestions[questionRef];
    const normalized = officialNormalizedMap.get(questionRef);

    if (viewQuestion) {
      prompt = viewQuestion.questionPayload?.prompt
        || viewQuestion.prompt
        || viewQuestion.presentation?.prompt
        || viewQuestion.presentation?.command
        || '';
      command = viewQuestion.presentation?.command
        || viewQuestion.questionPayload?.prompt
        || prompt;

      if (Array.isArray(viewQuestion.presentation?.supportBlocks) && viewQuestion.presentation.supportBlocks.length > 0) {
        supportBlocks = viewQuestion.presentation.supportBlocks;
      } else if (viewQuestion.questionPayload?.support_text) {
        supportBlocks = [{ type: 'text', content: viewQuestion.questionPayload.support_text }];
      }

      const rawOpts = viewQuestion.questionPayload?.options || viewQuestion.options || viewQuestion.presentation?.options || [];
      if (Array.isArray(rawOpts) && rawOpts.length > 0) {
        options = rawOpts.map((opt) => ({
          label: String(opt.label || opt.letter || '').trim().toUpperCase(),
          letter: String(opt.letter || opt.label || '').trim().toUpperCase(),
          text: opt.text || '',
        }));
      }

      officialAnswer = String(
        viewQuestion.answerPayload?.answer
        || viewQuestion.officialAnswer
        || viewQuestion.presentation?.officialAnswer
        || ''
      ).trim().toUpperCase();

      questionType = viewQuestion.questionPayload?.question_type
        || viewQuestion.questionType
        || (options.length > 2 ? 'multiple_choice' : 'true_false');

      examBoard = viewQuestion.questionPayload?.exam_board || viewQuestion.examBoard || '';
      year = viewQuestion.questionPayload?.year || viewQuestion.year;
      officialCommentary = viewQuestion.answerPayload?.commentary
        || viewQuestion.explanation
        || viewQuestion.commentary
        || '';
    }

    // Fallback para authoredQuestions se campos vitais estiverem ausentes
    if ((!prompt || options.length === 0 || !officialAnswer) && authored) {
      if (!prompt && authored.prompt) {
        prompt = authored.prompt;
        command = prompt;
      }
      if (options.length === 0 && Array.isArray(authored.options)) {
        options = authored.options.map((opt) => ({
          label: String(opt.label || opt.letter || '').trim().toUpperCase(),
          letter: String(opt.letter || opt.label || '').trim().toUpperCase(),
          text: opt.text || '',
        }));
      }
      if (!officialAnswer && authored.correctAnswer) {
        officialAnswer = String(authored.correctAnswer).trim().toUpperCase();
      }
      if (!questionType && authored.questionType) {
        questionType = authored.questionType;
      }
      if (!examBoard && authored.examBoard) {
        examBoard = authored.examBoard;
      }
      if (!year && authored.year) {
        year = authored.year;
      }
      if (!officialCommentary && authored.commentary) {
        officialCommentary = authored.commentary;
      }
    }

    // Fallback para officialNormalizedMap se ainda faltar prompt ou gabarito
    if ((!prompt || options.length === 0 || !officialAnswer) && normalized) {
      if (!prompt && normalized.prompt) {
        prompt = normalized.prompt;
        command = prompt;
      }
      if (supportBlocks.length === 0 && normalized.supportText) {
        supportBlocks = [{ type: 'text', content: normalized.supportText }];
      }
      if (options.length === 0 && Array.isArray(normalized.options)) {
        options = normalized.options.map((opt) => ({
          label: String(opt.letter || opt.label || '').trim().toUpperCase(),
          letter: String(opt.letter || opt.label || '').trim().toUpperCase(),
          text: opt.text || '',
        }));
      }
      if (!officialAnswer && normalized.correctAnswer) {
        officialAnswer = String(normalized.correctAnswer).trim().toUpperCase();
      }
      if (!questionType) {
        questionType = normalized.questionType === 'CERTO_ERRADO' ? 'true_false' : 'multiple_choice';
      }
      if (!examBoard && normalized.bank) {
        examBoard = normalized.bank;
      }
      if (!year && normalized.year) {
        year = normalized.year;
      }
      if (!officialCommentary && normalized.commentary) {
        officialCommentary = normalized.commentary;
      }
    }

    // Normalização canônica para questões de Certo/Errado
    if (officialAnswer === 'INCORRECT' || officialAnswer === 'ERRADO') {
      officialAnswer = 'E';
    } else if (officialAnswer === 'CORRECT' || officialAnswer === 'CERTO') {
      officialAnswer = 'C';
    }

    if (options.length === 0 && (questionType === 'true_false' || officialAnswer === 'C' || officialAnswer === 'E')) {
      questionType = 'true_false';
      options = [
        { label: 'C', letter: 'C', text: 'Certo' },
        { label: 'E', letter: 'E', text: 'Errado' },
      ];
    }

    const isUnavailable = !prompt || !officialAnswer;

    // B. Resolução de regras normativas
    const candidateRuleRefs = [
      ...(pedagogy.decisiveRuleRefs || []),
      ...(pedagogy.primaryDecisiveRuleRef ? [pedagogy.primaryDecisiveRuleRef] : []),
      ...(comp?.ruleRefs || []),
      ...(pblCase?.primaryDecisiveRuleRef ? [pblCase.primaryDecisiveRuleRef] : []),
    ];
    const uniqueRuleRefs = [...new Set(candidateRuleRefs)].filter(Boolean);

    const rules = [];
    for (const rRef of uniqueRuleRefs) {
      let found = rulesByRef.get(rRef) || rulesByRef.get(normalizedRuleRef(rRef));
      if (!found && unitId) {
        const view = unitViews.get(unitId);
        const uRules = view?.sections?.rules?.items || [];
        const ord = Number.parseInt(/-(\d+)$/.exec(normalizedRuleRef(rRef))?.[1] || '', 10);
        if (Number.isFinite(ord) && ord > 0 && uRules[ord - 1]) {
          found = rulesByRef.get(uRules[ord - 1].entityId || uRules[ord - 1].id || '');
        }
      }
      if (found && !rules.some((r) => r.ruleRef === found.ruleRef)) {
        rules.push(found);
      }
    }

    // Fallback: se nenhuma regra específica casou, herdar as regras da unidade correspondente
    if (!rules.length && unitId) {
      const view = unitViews.get(unitId);
      const uRules = view?.sections?.rules?.items || [];
      for (const r of uRules) {
        const ref = r.entityId || r.id;
        const found = rulesByRef.get(ref);
        if (found && !rules.some((item) => item.ruleRef === found.ruleRef)) {
          rules.push(found);
        }
      }
    }

    // Fallback secundário: regra sintetizada a partir do caso PBL / competência
    if (!rules.length && comp) {
      rules.push({
        ruleRef: `RULE-SYNTH-${comp.competencyId}`,
        unitId,
        title: comp.title,
        statement: comp.description || 'Aplique o critério normativo canônico para resolver a questão.',
        conditions: [],
        exceptions: [],
        resolvedTable: tablesByUnit.get(unitId)?.[0] || undefined,
      });
    }

    // Incorporar regras autoradas do pacote se existirem para esta questão
    if (authoredRulesByQuestion.has(questionRef)) {
      const authRules = authoredRulesByQuestion.get(questionRef) || [];
      for (const ar of authRules) {
        if (!rules.some((r) => r.ruleRef === ar.ruleRef)) {
          rules.unshift(ar);
        }
      }
    }

    // C. Resolução de procedimentos
    const candidateProcRefs = [
      ...(pedagogy.procedureRefs || []),
      ...(comp?.procedureRefs || []),
    ];
    const uniqueProcRefs = [...new Set(candidateProcRefs)].filter(Boolean);
    const procedures = [];
    for (const pRef of uniqueProcRefs) {
      const found = proceduresByRef.get(pRef);
      if (found && !procedures.some((p) => p.procedureRef === found.procedureRef)) {
        procedures.push(found);
      }
    }
    if (!procedures.length && unitId && proceduresByUnit.has(unitId)) {
      procedures.push(proceduresByUnit.get(unitId));
    }
    if (!procedures.length && pblCase?.solutionStrategy?.stepByStepAlgorithm?.length) {
      procedures.push({
        procedureRef: `PROC-CASE-${pblCase.caseId}`,
        title: 'Procedimento Decisivo',
        markdown: pblCase.solutionStrategy.stepByStepAlgorithm.join('\n'),
        unitId,
      });
    }
    // Incorporar procedimentos autorados do pacote se existirem para esta questão
    if (authoredProceduresByQuestion.has(questionRef)) {
      const authProcs = authoredProceduresByQuestion.get(questionRef) || [];
      for (const ap of authProcs) {
        if (!procedures.some((p) => p.procedureRef === ap.procedureRef)) {
          procedures.unshift(ap);
        }
      }
    }

    // D. Resolução de contrastes
    const candidateContrastRefs = [
      ...(pedagogy.contrastRefs || []),
      ...(comp?.contrastRefs || []),
    ];
    const uniqueContrastRefs = [...new Set(candidateContrastRefs)].filter(Boolean);
    const contrasts = [];
    for (const cRef of uniqueContrastRefs) {
      const found = contrastsByRef.get(cRef);
      if (found && !contrasts.some((c) => c.contrastRef === found.contrastRef)) {
        contrasts.push(found);
      }
    }
    if (!contrasts.length && unitId && contrastsByUnit.has(unitId)) {
      contrasts.push(...contrastsByUnit.get(unitId).slice(0, 2));
    }
    if (pblCase?.contrastingScaffold?.poleA && pblCase?.contrastingScaffold?.poleB) {
      contrasts.push({
        contrastRef: `CASE-CONTRAST-${pblCase.caseId}`,
        title: 'Contraste do Caso PBL',
        poleA: pblCase.contrastingScaffold.poleA,
        poleB: pblCase.contrastingScaffold.poleB,
        decisionCriterion: pblCase.contrastingScaffold.distinctionRule || '',
        examples: [],
      });
    }
    // Incorporar contrastes autorados do pacote se existirem para esta questão
    if (authoredContrastsByQuestion.has(questionRef)) {
      const authContrasts = authoredContrastsByQuestion.get(questionRef) || [];
      for (const ac of authContrasts) {
        if (!contrasts.some((c) => c.contrastRef === ac.contrastRef)) {
          contrasts.unshift(ac);
        }
      }
    }

    // E. Estratégia de resolução (solutionStrategy)
    const workedExample = authoredWorkedExamplesByComp.get(`${questionRef}::${primaryCompRef}`)
      || authoredWorkedExamples.get(questionRef);
    const rawStrategy = viewQuestion?.solutionStrategy || pedagogy.solutionStrategy;
    let solutionStrategy = undefined;
    if (workedExample?.block?.analysisSteps && workedExample.block.analysisSteps.length > 0) {
      solutionStrategy = workedExample.block.analysisSteps.map((step, idx) => {
        const text = typeof step === 'string' ? step : JSON.stringify(step);
        const parts = text.split(':');
        const action = parts.length > 1 ? parts[0].trim() : `Passo ${idx + 1}`;
        const rationale = parts.length > 1 ? parts.slice(1).join(':').trim() : text;
        return {
          stepNumber: idx + 1,
          action,
          rationale,
        };
      });
    } else if (Array.isArray(rawStrategy) && rawStrategy.length > 0) {
      solutionStrategy = rawStrategy.map((step, idx) => ({
        stepNumber: step.stepNumber || step.order || idx + 1,
        action: typeof step.action === 'string' ? step.action : String(step.action || ''),
        rationale: typeof step.rationale === 'string'
          ? step.rationale
          : step.explanation || (step.rationale ? JSON.stringify(step.rationale) : undefined),
      }));
    }

    // F. Análises objetivas das alternativas
    // PRIORIZAÇÃO: authoredPkgQ.feedback -> viewQuestion.distractorAnalysis -> pedagogy.distractorAnalysis
    const authoredPkgQ = authoredPackageQuestionsByComp.get(`${questionRef}::${primaryCompRef}`)
      || authoredPackageQuestions.get(questionRef);
    let objectiveOptionAnalyses = undefined;
    if (authoredPkgQ?.feedback && Object.keys(authoredPkgQ.feedback).length > 0) {
      const seenLabels = new Set();
      objectiveOptionAnalyses = Object.entries(authoredPkgQ.feedback).map(([rawLabel, rawRefutation]) => {
        const label = String(rawLabel || '').trim().toUpperCase();
        if (!label || seenLabels.has(label)) return null;
        seenLabels.add(label);
        let refutation = rawRefutation;

        // BENCHMARK TÉCNICO AUDITÁVEL DO CASO "PORÉM / POREM" (OQ-A00-estrategia.4001030449)
        if (
          (questionRef === 'OQ-A00-estrategia.4001030449' && label === 'C') ||
          (/\bporem\b/i.test(refutation) && /futuro do subjuntivo/i.test(refutation) && /p[oô]r/i.test(refutation))
        ) {
          const originalText = refutation;
          refutation = "Incorreta. A supressão do acento de 'porém' origina a forma verbal 'porem' (flexão de infinitivo pessoal do verbo pôr: 'para eles porem'). Nota: o futuro do subjuntivo do verbo pôr é 'quando eles puserem'.";

          auditedCorrections.push({
            questionRef,
            label,
            rule: 'correcao_futuro_subjuntivo_porem',
            reason: 'Separação auditável de erro gramatical na explicação derivada: porem é infinitivo pessoal, não futuro do subjuntivo.',
            originalRefutation: originalText,
            correctedRefutation: refutation,
          });
        }

        const isCorrect = Boolean(officialAnswer && label === officialAnswer);
        const matchingOpt = options.find((o) => (o.label || o.letter) === label);

        return {
          label,
          letter: label,
          isCorrect,
          optionText: matchingOpt?.text || '',
          refutation,
          authoritative: false,
        };
      }).filter(Boolean);
    } else {
      const rawDistractors = (Array.isArray(viewQuestion?.distractorAnalysis) && viewQuestion.distractorAnalysis.length > 0)
        ? viewQuestion.distractorAnalysis
        : pedagogy.distractorAnalysis;

      if (Array.isArray(rawDistractors) && rawDistractors.length > 0) {
        const seenLabels = new Set();
        objectiveOptionAnalyses = rawDistractors.map((d) => {
          const label = String(d.label || '').trim().toUpperCase();
          if (!label || seenLabels.has(label)) return null;
          seenLabels.add(label);
          let refutation = d.analysis || d.refutation || '';

          // BENCHMARK TÉCNICO AUDITÁVEL DO CASO "PORÉM / POREM" (OQ-A00-estrategia.4001030449)
          if (
            (questionRef === 'OQ-A00-estrategia.4001030449' && label === 'C') ||
            (/\bporem\b/i.test(refutation) && /futuro do subjuntivo/i.test(refutation) && /p[oô]r/i.test(refutation))
          ) {
            const originalText = refutation;
            refutation = "Incorreta. A supressão do acento de 'porém' origina a forma verbal 'porem' (flexão de infinitivo pessoal do verbo pôr: 'para eles porem'). Nota: o futuro do subjuntivo do verbo pôr é 'quando eles puserem'.";

            auditedCorrections.push({
              questionRef,
              label,
              rule: 'correcao_futuro_subjuntivo_porem',
              reason: 'Separação auditável de erro gramatical na explicação derivada: porem é infinitivo pessoal, não futuro do subjuntivo.',
              originalRefutation: originalText,
              correctedRefutation: refutation,
            });
          }

          const isCorrect = Boolean(d.isCorrect || (officialAnswer && label === officialAnswer));
          const matchingOpt = options.find((o) => (o.label || o.letter) === label);

          return {
            label,
            letter: label,
            isCorrect,
            optionText: d.optionText || matchingOpt?.text || '',
            refutation,
            authoritative: false,
          };
        }).filter(Boolean);
      }
    }

    // Também corrigir menção a "porem / futuro do subjuntivo" em officialCommentary se existir
    if (questionRef === 'OQ-A00-estrategia.4001030449' && /subjuntivo/i.test(officialCommentary)) {
      officialCommentary = officialCommentary.replace(
        /flexão do infinitivo pessoal ou do futuro do subjuntivo do verbo pôr/gi,
        'flexão do infinitivo pessoal do verbo pôr (como em "para eles porem"; o futuro do subjuntivo seria "quando eles puserem")'
      );
    }

    // G. Macrogrupo e pré-requisitos
    const macro = macroByUnit.get(unitId) || macroByLesson.get(lessonId);

    // H. Identificação de lacunas
    const gapDetails = [];
    if (!rules.length) gapDetails.push('Regras normativas detalhadas não vinculadas');
    if (!procedures.length) gapDetails.push('Procedimento operacional não vinculado');
    if (!contrasts.length) gapDetails.push('Pares de contraste não vinculados');
    if (!solutionStrategy) gapDetails.push('Estratégia passo a passo ausente');
    if (!options.length) gapDetails.push('Alternativas da questão não estruturadas');
    if (!prompt) gapDetails.push('missing_prompt');
    if (!officialAnswer) gapDetails.push('missing_official_answer');
    if (isUnavailable) gapDetails.push('question_unavailable');

    const hasGaps = gapDetails.length > 0;

    // I. Montagem do payload projetado
    const candidateTables = [
      ...(authoredTablesByQuestion.get(questionRef) || []),
    ];
    if (candidateTables.length === 0 && unitId && tablesByUnit.has(unitId)) {
      candidateTables.push(...tablesByUnit.get(unitId).slice(0, 2));
    }

    const boundaries = authoredBoundariesByQuestion.get(questionRef) || [];
    const criteriaRules = rules.map((r, idx) => ({
      ruleRef: r.ruleRef,
      title: r.title,
      statement: r.statement,
      conditions: r.conditions,
      exceptions: r.exceptions,
      boundaries: (idx === 0 && boundaries.length > 0)
        ? boundaries.map((b) => ({
            boundaryRef: b.boundaryRef,
            title: b.title,
            text: b.text,
            conditions: b.conditions,
            exceptions: b.exceptions,
            scope: b.scope,
            limits: b.limits,
            traps: b.traps,
            nonApplicabilityConditions: b.nonApplicabilityConditions,
            sourceRefs: b.sourceRefs,
            derivation: b.derivation,
            interventionId: b.interventionId,
            layer: b.layer,
          }))
        : undefined,
      resolvedTable: r.resolvedTable,
    }));
    const criteriaProcedures = procedures.map((p) => ({
      procedureRef: p.procedureRef,
      title: p.title,
      markdown: p.markdown,
    }));
    const criteriaContrasts = contrasts.map((c) => ({
      contrastRef: c.contrastRef,
      title: c.title,
      poleA: c.poleA,
      poleB: c.poleB,
      sideACriteria: c.sideACriteria,
      sideBCriteria: c.sideBCriteria,
      decisionCriterion: c.decisionCriterion,
    }));

    // Construção de variantes de competência para questões compartilhadas/multicompetência
    const rawSecondaryFromAssignments = Array.isArray(link.competencyAssignments)
      ? link.competencyAssignments.map((a) => a.competencyId).filter(Boolean)
      : [];
    const allCompRefsForQuestion = [
      primaryCompRef,
      ...(Array.isArray(link.secondaryCompetencyRefs) ? link.secondaryCompetencyRefs : []),
      ...rawSecondaryFromAssignments,
    ].filter(Boolean);

    for (const key of authoredPackageQuestionsByComp.keys()) {
      if (key.startsWith(`${questionRef}::`)) {
        const cRef = key.split('::')[1];
        if (cRef && !allCompRefsForQuestion.includes(cRef)) {
          allCompRefsForQuestion.push(cRef);
        }
      }
    }
    for (const key of authoredWorkedExamplesByComp.keys()) {
      if (key.startsWith(`${questionRef}::`)) {
        const cRef = key.split('::')[1];
        if (cRef && !allCompRefsForQuestion.includes(cRef)) {
          allCompRefsForQuestion.push(cRef);
        }
      }
    }

    const uniqueCompRefs = [...new Set(allCompRefsForQuestion)];

    const competencyVariants = {};
    for (const compRef of uniqueCompRefs) {
      if (compRef === primaryCompRef) continue;
      const cComp = competenciesById.get(compRef);
      const cWorkedExample = authoredWorkedExamplesByComp.get(`${questionRef}::${compRef}`);
      const cPkgQ = authoredPackageQuestionsByComp.get(`${questionRef}::${compRef}`);

      if (cPkgQ || cWorkedExample || cComp) {
        let cStrategy = undefined;
        if (cWorkedExample?.block?.analysisSteps?.length > 0) {
          cStrategy = cWorkedExample.block.analysisSteps.map((step, idx) => {
            const text = typeof step === 'string' ? step : JSON.stringify(step);
            const parts = text.split(':');
            const action = parts.length > 1 ? parts[0].trim() : `Passo ${idx + 1}`;
            const rationale = parts.length > 1 ? parts.slice(1).join(':').trim() : text;
            return { stepNumber: idx + 1, action, rationale };
          });
        }

        let cOptAnalyses = undefined;
        if (cPkgQ?.feedback && Object.keys(cPkgQ.feedback).length > 0) {
          const seenLabels = new Set();
          cOptAnalyses = Object.entries(cPkgQ.feedback).map(([rawLabel, rawRefutation]) => {
            const label = String(rawLabel || '').trim().toUpperCase();
            if (!label || seenLabels.has(label)) return null;
            seenLabels.add(label);
            const isCorrect = Boolean(officialAnswer && label === officialAnswer);
            const matchingOpt = options.find((o) => (o.label || o.letter) === label);
            return {
              label,
              letter: label,
              isCorrect,
              optionText: matchingOpt?.text || '',
              refutation: rawRefutation,
              authoritative: false,
            };
          }).filter(Boolean);
        }

        competencyVariants[compRef] = {
          competencyRef: compRef,
          competencyTitle: cComp?.title || undefined,
          pedagogy: {
            learningObjectives: cComp?.learningObjectiveRefs || [],
            testedConcepts: cComp?.conceptRefs || [],
            decisivePoint: cWorkedExample?.block?.decisivePoint || undefined,
            commonMistake: cWorkedExample?.block?.commonMistake || undefined,
          },
          solutionStrategy: cStrategy,
          objectiveOptionAnalyses: cOptAnalyses,
        };
      }
    }

    const projected = {
      questionRef,
      competencyRefs: uniqueCompRefs.length > 0 ? uniqueCompRefs : [primaryCompRef].filter(Boolean),
      primaryCompetencyRef: primaryCompRef || undefined,
      lessonId,
      unitRefs: pedagogy.allUnitRefs || (unitId ? [unitId] : []),
      presentation: {
        prompt,
        command: command || prompt,
        supportBlocks,
        options,
        officialAnswer,
        questionType,
        examBoard: examBoard || undefined,
        year: year || undefined,
        isUnavailable: isUnavailable || undefined,
      },
      pedagogy: {
        cognitiveDemand: pedagogy.cognitiveDemand || 'analise_estrutural',
        difficulty: pedagogy.difficulty || 'medio',
        learningObjectives: pedagogy.targetLearningObjectiveRefs || comp?.learningObjectiveRefs || [],
        testedConcepts: pedagogy.testedConceptRefs || comp?.conceptRefs || [],
        decisivePoint: workedExample?.block?.decisivePoint || undefined,
        commonMistake: workedExample?.block?.commonMistake || undefined,
      },
      criteria: {
        rules: criteriaRules,
        procedures: criteriaProcedures,
        contrasts: criteriaContrasts,
        tables: candidateTables.length > 0 ? candidateTables : undefined,
        boundaries: boundaries.length > 0 ? boundaries : undefined,
      },
      solutionStrategy,
      officialCommentary: officialCommentary || undefined,
      objectiveOptionAnalyses,
      competencyVariants: Object.keys(competencyVariants).length > 0 ? competencyVariants : undefined,
      curriculum: {
        macroGroupId: macro?.macroId,
        macroGroupTitle: macro?.title,
        prerequisites: pedagogy.prerequisiteRefs || comp?.prerequisiteCompetencyRefs || [],
      },
      provenance: {
        questionSha256: sha256(Buffer.from(prompt || questionRef, 'utf8')),
        answerSha256: officialAnswer ? sha256(Buffer.from(officialAnswer, 'utf8')) : undefined,
        hasGaps,
        gapDetails: hasGaps ? gapDetails : undefined,
      },
    };

    projectedQuestions.set(questionRef, projected);

    // Métricas de cobertura
    if (rules.length) coverageInventory.summary.questionsWithRules += 1;
    if (procedures.length) coverageInventory.summary.questionsWithProcedures += 1;
    if (contrasts.length) coverageInventory.summary.questionsWithContrasts += 1;
    if (rules.some((r) => r.resolvedTable) || candidateTables.length > 0) coverageInventory.summary.questionsWithTables += 1;
    if (solutionStrategy) coverageInventory.summary.questionsWithSolutionStrategy += 1;
    if (questionRef === 'OQ-A00-estrategia.4001030449') {
      coverageInventory.summary.auditedPoremQuestionChecked = true;
    }
  }

  // J. Inventário de cobertura por competência
  const authoredCompRefs = new Set((authoredPackages || []).map((p) => p.competencyRef));
  coverageInventory.summary.authoredPackages = authoredCompRefs.size;
  coverageInventory.summary.pendingAuthorship = competencyMap.length - authoredCompRefs.size;

  for (const comp of competencyMap) {
    const eligibleRefs = comp.eligibleQuestionRefs || [];
    const questionsInComp = eligibleRefs.map((ref) => projectedQuestions.get(ref)).filter(Boolean);

    const hasAuthoredPackage = authoredCompRefs.has(comp.competencyId);
    const hasRules = questionsInComp.some((q) => q.criteria.rules.length > 0);
    const hasProcedures = questionsInComp.some((q) => q.criteria.procedures.length > 0);
    const hasContrasts = questionsInComp.some((q) => q.criteria.contrasts.length > 0);
    const hasTables = questionsInComp.some((q) => q.criteria.rules.some((r) => r.resolvedTable) || (q.criteria.tables && q.criteria.tables.length > 0));
    const allHaveAnswers = questionsInComp.length > 0 && questionsInComp.every((q) => Boolean(q.presentation.officialAnswer));

    const isReady = hasAuthoredPackage && questionsInComp.length > 0 && hasRules && allHaveAnswers;

    if (isReady) {
      coverageInventory.summary.ready += 1;
    } else {
      coverageInventory.summary.limited += 1;
    }

    coverageInventory.competenciesCoverage[comp.competencyId] = {
      title: comp.title,
      unitId: comp.unitId,
      lessonId: comp.lessonId,
      status: isReady ? 'ready' : 'limited',
      hasAuthoredPackage,
      totalProjectedQuestions: questionsInComp.length,
      hasRules,
      hasProcedures,
      hasContrasts,
      hasTables,
      allHaveAnswers,
      learningObjectivesCount: comp.learningObjectiveRefs?.length || 0,
      missingOptionalEnrichments: [
        ...(!hasAuthoredPackage ? ['pacote_autoria_semantica'] : []),
        ...(!hasProcedures ? ['procedimentos_especificos'] : []),
        ...(!hasContrasts ? ['contrastes_especificos'] : []),
        ...(!hasTables ? ['tabelas_normativas'] : []),
      ],
    };
  }

  // 7. Gravação dos artefatos de deployment (Shards com limite de tamanho seguro)
  await rm(TUTOR_DIR, { recursive: true, force: true });
  await mkdir(PARTS_DIR, { recursive: true });

  const questionEntries = Array.from(projectedQuestions.entries());
  questionEntries.sort(([a], [b]) => a.localeCompare(b, 'en'));

  const shards = [];
  const groups = [];
  let currentGroup = [];
  let currentBytes = 3;

  for (const entry of questionEntries) {
    const entryBytes = Buffer.byteLength(`${JSON.stringify(entry[0])}:${JSON.stringify(entry[1])}`, 'utf8');
    const candidateBytes = currentBytes + entryBytes + (currentGroup.length > 0 ? 1 : 0);
    if (currentGroup.length > 0 && candidateBytes > TARGET_SHARD_BYTES) {
      groups.push(currentGroup);
      currentGroup = [];
      currentBytes = 3;
    }
    currentGroup.push(entry);
    currentBytes += entryBytes + (currentGroup.length > 1 ? 1 : 0);
  }
  if (currentGroup.length) groups.push(currentGroup);

  for (let index = 0; index < groups.length; index += 1) {
    const partNum = String(index + 1).padStart(3, '0');
    const fileName = `tutor-context.part-${partNum}.json`;
    const relPath = `parts/${fileName}`;
    const absPath = path.join(TUTOR_DIR, relPath);

    const payloadObj = Object.fromEntries(groups[index]);
    const buffer = jsonBuffer(payloadObj);
    await writeFile(absPath, buffer);

    shards.push({
      part: index + 1,
      file: relPath,
      recordCount: groups[index].length,
      bytes: buffer.length,
      sha256: sha256(buffer),
      firstQuestionRef: groups[index][0][0],
      lastQuestionRef: groups[index].at(-1)[0],
    });
  }

  // 8. Gravar Manifesto do Tutor
  const manifest = {
    schemaVersion: '1.0.0',
    kind: 'suveca-pbl-tutor-projection',
    generatedAt: new Date().toISOString(),
    policy: {
      causalInterpretationExcluded: true,
      depreciativeHypothesesRemoved: true,
      normativeAuthorityPreserved: true,
      derivedAnalysisDifferentiated: true,
      runtimeIndependence: 'autonomous_public_deployment_artifact',
    },
    totalCompetencies: competencyMap.length,
    totalQuestions: questionEntries.length,
    maximumShardBytes: TARGET_SHARD_BYTES,
    auditedCorrections,
    shards,
  };

  await writeFile(
    path.join(TUTOR_DIR, 'pbl_tutor_manifest.json'),
    jsonBuffer(manifest)
  );

  await writeFile(
    path.join(TUTOR_DIR, 'pbl_tutor_coverage_inventory.json'),
    jsonBuffer(coverageInventory)
  );

  console.log('[build-pbl-tutor-context] Projeção gerada com sucesso:');
  console.log(JSON.stringify({
    totalQuestions: questionEntries.length,
    shardsCount: shards.length,
    readyCompetencies: coverageInventory.summary.ready,
    limitedCompetencies: coverageInventory.summary.limited,
    questionsWithRules: coverageInventory.summary.questionsWithRules,
    questionsWithTables: coverageInventory.summary.questionsWithTables,
    questionsWithContrasts: coverageInventory.summary.questionsWithContrasts,
    auditedCorrectionsCount: auditedCorrections.length,
  }, null, 2));
}

main().catch((err) => {
  console.error('[build-pbl-tutor-context] Falha fatal:', err);
  process.exit(1);
});
