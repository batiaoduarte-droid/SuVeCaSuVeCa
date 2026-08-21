#!/usr/bin/env node
/**
 * scripts/audit-pedagogical-views.mjs
 *
 * Auditoria automatizada do acervo de Visões Pedagógicas (PedagogicalUnitView e CumulativeReviewView v4.2).
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = path.resolve(process.cwd());
const VIEWS_DIR = path.join(ROOT, 'public', 'knowledge', 'pedagogical', 'views');
const MANIFEST_PATH = path.join(VIEWS_DIR, 'manifest.json');
const IDENTITY_RECONCILIATION_PATH = path.join(ROOT, 'public', 'knowledge', 'pedagogical', 'identity-reconciliation.json');
const QUESTION_REPAIR_PATH = path.join(ROOT, 'public', 'knowledge', 'pedagogical', 'question-presentation-repair.json');
const SEMANTIC_COVERAGE_PATH = path.join(ROOT, 'public', 'knowledge', 'pedagogical', 'semantic-coverage-repair.json');

assert(fs.existsSync(MANIFEST_PATH), `Manifesto de visões não encontrado em ${MANIFEST_PATH}`);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
assert(
  String(manifest.schemaVersion).startsWith('4.2') || manifest.viewSchemaVersion === '1.0.0',
  'schemaVersion incompatível no manifesto'
);
assert(
  manifest.totalViews === 115 || manifest.unitsCount === 115,
  `Esperadas 115 unidades no manifesto, encontradas ${manifest.totalViews || manifest.unitsCount}`
);
assert(manifest.unresolvedRefs === 0, 'Existem referências não resolvidas no manifesto');
assert(manifest.unknownBlockTypes === 0, 'Existem blocos de tipo desconhecido no manifesto');

const viewFiles = fs.readdirSync(VIEWS_DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
assert(viewFiles.length === 115, `Esperados 115 arquivos JSON de visões, encontrados ${viewFiles.length}`);

assert(fs.existsSync(IDENTITY_RECONCILIATION_PATH), 'Ledger de reconciliação de identidade ausente');
const identityReconciliation = JSON.parse(fs.readFileSync(IDENTITY_RECONCILIATION_PATH, 'utf8'));
const reconciledById = new Map(identityReconciliation.units.map((entry) => [entry.unitId, entry]));
assert(
  reconciledById.size === manifest.identityReconciledUnits,
  `Manifesto declara ${manifest.identityReconciledUnits} unidades reconciliadas, ledger contém ${reconciledById.size}`
);
assert(fs.existsSync(QUESTION_REPAIR_PATH), 'Ledger de reparo de apresentação das questões ausente');
const questionRepair = JSON.parse(fs.readFileSync(QUESTION_REPAIR_PATH, 'utf8'));
const repairedQuestionIds = new Set(questionRepair.questions.map((entry) => entry.officialQuestionId));
assert(fs.existsSync(SEMANTIC_COVERAGE_PATH), 'Ledger de cobertura semântica ausente');
const semanticCoverage = JSON.parse(fs.readFileSync(SEMANTIC_COVERAGE_PATH, 'utf8'));
assert(semanticCoverage.status === 'PASS', 'Reparo de cobertura semântica não está aprovado');
assert(semanticCoverage.unresolved.length === 0, 'Reparo de cobertura semântica contém referências não resolvidas');

const ALLOWED_SECTIONS = [
  'suveca', 'prerequisites', 'explanation', 'rules', 'resolution',
  'contrasts', 'examples', 'mnemonics', 'traps', 'glossary', 'recall',
];

const ALLOWED_CUMULATIVE_SECTIONS = [
  'suveca', 'conceptMap', 'prioritizedRules', 'structuredSynthesis', 'recoveryExamples', 'activeReviewProtocol'
];

const KNOWN_BLOCK_TYPES = new Set([
  'concept_definition',
  'concept_explanation',
  'classification',
  'taxonomy',
  'comparison_matrix',
  'rule_boundary',
  'formula',
  'procedure',
  'contrast',
  'minimal_pair',
  'annotated_sentence',
  'table',
  'bullet_list',
  'rule',
  'worked_example',
  'mnemonic',
  'exam_trap',
  'recall_prompt',
  'paragraph',
  'heading',
  'list',
  'table_ref',
  'callout',
  'code',
  'diagram',
]);

const canonicalTableIds = new Set();
let canonicalTableBackfills = 0;

const checkBlock = (block, unitId) => {
  assert(block && typeof block === 'object', `${unitId}: bloco inválido`);
  assert(
    KNOWN_BLOCK_TYPES.has(block.type),
    `${unitId}: tipo de bloco semântico desconhecido '${block.type}'`
  );
  if (block.type === 'table_ref') {
    assert(
      block.table && Array.isArray(block.table.headers) && Array.isArray(block.table.rows),
      `${unitId}: table_ref '${block.tableId}' sem payload de tabela incorporado`
    );
    assert(!canonicalTableIds.has(block.tableId), `${unitId}: table_ref canônico duplicado '${block.tableId}'`);
    canonicalTableIds.add(block.tableId);
    if (block.coverageOrigin === 'canonical_table_backfill') canonicalTableBackfills += 1;
  }
};

let checkedBlocks = 0;
let checkedQuestions = 0;
let projectedBinaryQuestions = 0;
let unavailableQuestions = 0;
let checkedExamples = 0;
let checkedTraps = 0;
let checkedProcedures = 0;
let recoveredQuestionPresentations = 0;
let blockedQuestionConflicts = 0;
let sourceBackedPresentations = 0;
let genericProjectionLeaks = 0;

const normalizeToken = (value = '') => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const BINARY_TYPES = new Set([
  'certo_errado', 'true_false', 'open_or_judgment', 'true_false_or_open',
  'true_false_or_statement', 'true_false_or_judgment',
]);

const isBinaryQuestion = (type, answer, prompt) => {
  const answerToken = normalizeToken(answer);
  if (/^option_[a-e]$/.test(answerToken)) return false;
  const encodedLetter = answerToken.match(/^letter_([a-e])$/)?.[1];
  if (encodedLetter) {
    return ['c', 'e'].includes(encodedLetter)
      && BINARY_TYPES.has(normalizeToken(type))
      && /\bjulgue\b|\bcerto\s*(?:ou|\/)\s*errado\b/i.test(prompt || '');
  }
  if (BINARY_TYPES.has(normalizeToken(type))) return true;
  if (/^(correct|incorrect|correta?|certo|verdadeir[oa]|errada?|errado|incorreta?|incorreto|fals[oa])$/.test(answerToken)) return true;
  return /^[ce]$/.test(answerToken) && /\b(julgue|certo|errado|correto|incorreto)\b/i.test(prompt || '');
};

const normalizedAnswerLetter = (answer = '') => {
  const token = normalizeToken(answer);
  if (/^(correct|correta?|certo|verdadeir[oa])$/.test(token)) return 'C';
  if (/^(incorrect|errada?|errado|incorreta?|incorreto|fals[oa])$/.test(token)) return 'E';
  return token.match(/^(?:letter|option|letra|alternativa|item)_?([a-e])$/)?.[1]?.toUpperCase()
    || (/^[a-e]$/.test(token) ? token.toUpperCase() : undefined);
};

const sideLabel = (item, key) => typeof item[key] === 'object' && item[key] ? item[key].label : '';
const isGenericProjection = (family, item) => {
  if (family === 'rules') {
    return (item.conditions || []).some((condition) =>
      condition.startsWith('Presença da estrutura-alvo de ')
      || condition.startsWith('Aplicação direta dos critérios normativos canônicos de ')
    );
  }
  if (family === 'procedures') return String(item.goal || '').startsWith('Executar o algoritmo decisório para ');
  if (family === 'contrasts') return sideLabel(item, 'sideA') === 'Elemento A' && sideLabel(item, 'sideB') === 'Elemento B';
  if (family === 'examples') return String(item.reasoning || '').startsWith('Aplicação analítica e passo a passo da regra canônica');
  if (family === 'traps') return String(item.errorPattern || '').startsWith('Indução a falso raciocínio por semelhança');
  return false;
};

const assertSourceBackedProjection = (family, item, unitId) => {
  const generic = isGenericProjection(family, item);
  const presentation = item.presentation;
  const entityId = item.ruleId || item.procedureId || item.contrastId || item.exampleId || item.trapId || item.entityId;
  const sourceBacked = presentation?.status === 'source_backed';
  const valid = sourceBacked
    && presentation.sourceKind === 'canonical_content_block'
    && Array.isArray(presentation.sourceEntityRefs)
    && presentation.sourceEntityRefs.includes(entityId)
    && Array.isArray(item.blocks)
    && item.blocks.length > 0;
  if (sourceBacked) {
    assert(valid, `${unitId}: apresentação source-backed inválida em '${entityId}'`);
    sourceBackedPresentations += 1;
  }
  if (!generic) return;
  const genericCovered = valid && presentation.hideGenericScaffold === true;
  if (!genericCovered) genericProjectionLeaks += 1;
  assert(genericCovered, `${unitId}: projeção genérica '${entityId}' sem apresentação canônica completa`);
};

const assertValidOptions = (options, answer, unitId, qId) => {
  assert(options.length >= 2 && options.length <= 5, `${unitId}: questão '${qId}' possui quantidade inválida de alternativas`);
  const labels = options.map((option) => String(option.label || option.letter || '').toUpperCase());
  assert(labels.every((label) => /^[A-E]$/.test(label)), `${unitId}: questão '${qId}' possui rótulo inválido`);
  assert(new Set(labels).size === labels.length, `${unitId}: questão '${qId}' possui rótulos duplicados`);
  const expected = normalizedAnswerLetter(answer);
  if (expected) assert(labels.includes(expected), `${unitId}: gabarito '${expected}' ausente nas alternativas de '${qId}'`);
};

for (const file of viewFiles) {
  const filePath = path.join(VIEWS_DIR, file);
  const view = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const unitId = view.unit?.unitId;

  assert(unitId, `${file}: unitId ausente`);
  assert(
    view.viewSchemaVersion?.startsWith('4.2') || view.viewSchemaVersion === '1.0.0',
    `${unitId}: viewSchemaVersion inválida '${view.viewSchemaVersion}'`
  );
  assert(view.sections?.suveca, `${unitId}: seção SuVeCA obrigatória ausente`);

  const reconciliation = reconciledById.get(unitId);
  if (reconciliation) {
    assert(view.unit.title === reconciliation.canonicalTitle, `${unitId}: título diverge da reconciliação canônica`);
    assert(view.source?.title === reconciliation.canonicalTitle, `${unitId}: source.title diverge da reconciliação canônica`);
    assert(
      view.viewSchemaVersion === '4.2.2-source-backed-coverage',
      `${unitId}: schema reconciliado com cobertura source-backed ausente`
    );
  }

  if (view.unitType === 'cumulative_review') {
    // Validação de unidade cumulativa da Aula 14
    for (const secKey of ALLOWED_CUMULATIVE_SECTIONS) {
      const sec = view.sections[secKey];
      assert(sec, `${unitId}: seção cumulativa obrigatória '${secKey}' ausente`);
      if (sec.blocks) {
        for (const b of sec.blocks) {
          checkBlock(b, unitId);
          checkedBlocks += 1;
        }
      }
    }
    continue;
  }

  // Validação de unidades padrão (A00-A13)
  assert(view.source?.canonicalSource || view.source?.canonicalSchemaVersion, `${unitId}: canonicalSource ausente`);

  for (const secKey of ALLOWED_SECTIONS) {
    const sec = view.sections[secKey];
    if (!sec) continue;

    if (sec.blocks) {
      for (const b of sec.blocks) {
        checkBlock(b, unitId);
        checkedBlocks += 1;
      }
    }

    if (sec.groups) {
      for (const grp of sec.groups) {
        assert(Array.isArray(grp.blocks), `${unitId}: grupo '${grp.groupId}' sem array de blocks`);
        for (const b of grp.blocks) {
          checkBlock(b, unitId);
          checkedBlocks += 1;
        }
      }
    }

    if (sec.items) {
      for (const item of sec.items) {
        if (['rules', 'contrasts', 'examples', 'traps'].includes(secKey)) {
          assertSourceBackedProjection(secKey, item, unitId);
        }
        if (secKey === 'examples') {
          assert(item.prompt || item.sentence, `${unitId}: exemplo '${item.title}' sem frase ou enunciado`);
          assert(
            item.analysis || item.analysisSteps?.length || item.result || item.pedagogicalTakeaway || item.blocks?.length,
            `${unitId}: exemplo '${item.title}' sem comentário renderizável`
          );
          checkedExamples += 1;
        }
        if (secKey === 'traps') {
          assert(item.trigger, `${unitId}: pegadinha '${item.title}' sem gatilho`);
          assert(
            item.correctReasoning || item.correctApproach || item.correctiveRule || item.counterRule || item.blocks?.length,
            `${unitId}: pegadinha '${item.title}' sem correção renderizável`
          );
          checkedTraps += 1;
        }
        if (item.blocks) {
          for (const b of item.blocks) {
            checkBlock(b, unitId);
            checkedBlocks += 1;
          }
        }
      }
    }

    if (sec.procedures) {
      for (const proc of sec.procedures) {
        assertSourceBackedProjection('procedures', proc, unitId);
        assert(Array.isArray(proc.steps) && proc.steps.length > 0, `${unitId}: procedimento '${proc.title}' sem passos`);
        for (const step of proc.steps) {
          assert(
            typeof step === 'string' ? step.trim() : step?.action?.trim(),
            `${unitId}: procedimento '${proc.title}' contém passo vazio`
          );
        }
        checkedProcedures += 1;
        if (proc.blocks) {
          for (const b of proc.blocks) {
            checkBlock(b, unitId);
            checkedBlocks += 1;
          }
        }
      }
    }

    if (sec.prompts) {
      for (const prompt of sec.prompts) {
        assert(prompt.question, `${unitId}: recall prompt sem question`);
      }
    }

    if (sec.supplementaryBlocks) {
      for (const b of sec.supplementaryBlocks) {
        checkBlock(b, unitId);
        checkedBlocks += 1;
      }
    }
  }

  // Validar questões oficiais
  if (view.officialQuestions) {
    for (const q of view.officialQuestions) {
      const qId = q.officialQuestionId || q.questionId || q.questionPayload?.question_id;
      assert(qId, `${unitId}: questão sem identificador`);
      const prompt = q.prompt || q.questionPayload?.prompt;
      assert(prompt, `${unitId}: questão '${qId}' sem prompt`);
      const options = q.options || q.questionPayload?.options;
      assert(Array.isArray(options), `${unitId}: questão '${qId}' sem array de opções`);
      const type = q.questionType || q.questionPayload?.question_type;
      const answer = q.officialAnswer || q.answerPayload?.answer;
      const presentation = q.questionPresentation;
      if (presentation) {
        assert(repairedQuestionIds.has(qId), `${unitId}: reparo de '${qId}' ausente no ledger`);
        assert(presentation.sourcePayloadPreserved === true, `${unitId}: reparo de '${qId}' não preserva a fonte`);
        if (presentation.status === 'ready') {
          assertValidOptions(presentation.options, presentation.answer || answer, unitId, qId);
          recoveredQuestionPresentations += 1;
        } else {
          assert(presentation.status === 'source_conflict', `${unitId}: status de reparo inesperado em '${qId}'`);
          assert(presentation.options.length === 0 && presentation.reason, `${unitId}: conflito '${qId}' sem bloqueio explicado`);
          unavailableQuestions += 1;
          blockedQuestionConflicts += 1;
        }
      } else if (options.length < 2) {
        if (isBinaryQuestion(type, answer, prompt)) projectedBinaryQuestions += 1;
        else assert.fail(`${unitId}: questão incompleta '${qId}' sem projeção segura`);
      } else {
        assertValidOptions(options, answer, unitId, qId);
      }
      checkedQuestions += 1;
    }
  }
}

assert(
  sourceBackedPresentations === semanticCoverage.counts['all.resolvable'],
  `Ledger declara ${semanticCoverage.counts['all.resolvable']} apresentações source-backed, auditoria encontrou ${sourceBackedPresentations}`
);
assert(
  sourceBackedPresentations === manifest.sourceBackedPresentations,
  `Manifesto declara ${manifest.sourceBackedPresentations} apresentações source-backed, auditoria encontrou ${sourceBackedPresentations}`
);
assert(genericProjectionLeaks === 0, `${genericProjectionLeaks} projeções genéricas continuam sem cobertura`);
assert(
  canonicalTableIds.size === manifest.tablesCorpusCount,
  `Corpus declara ${manifest.tablesCorpusCount} tabelas canônicas, views incorporam ${canonicalTableIds.size}`
);
assert(
  canonicalTableIds.size === manifest.tablesEmbeddedCount,
  `Manifesto declara ${manifest.tablesEmbeddedCount} tabelas incorporadas, auditoria encontrou ${canonicalTableIds.size}`
);

console.log(JSON.stringify({
  status: 'ok',
  viewSchemaVersion: manifest.schemaVersion || manifest.viewSchemaVersion,
  sourceSemanticVersion: manifest.sourceSemanticVersion || 'v4.2',
  homologationStatus: manifest.homologationStatus,
  unitsAudited: viewFiles.length,
  standardUnits: manifest.regularViews || manifest.standardUnitsCount || 102,
  cumulativeUnits: manifest.cumulativeViews || manifest.cumulativeUnitsCount || 13,
  blocksAudited: checkedBlocks,
  officialQuestionsAudited: checkedQuestions,
  projectedBinaryQuestions,
  unavailableQuestions,
  recoveredQuestionPresentations,
  blockedQuestionConflicts,
  examplesAudited: checkedExamples,
  trapsAudited: checkedTraps,
  proceduresAudited: checkedProcedures,
  identityReconciledUnits: reconciledById.size,
  sourceBackedPresentations,
  genericProjectionLeaks,
  canonicalTablesEmbedded: canonicalTableIds.size,
  canonicalTableBackfills,
  unresolvedRefs: manifest.unresolvedRefs,
  unknownBlockTypes: manifest.unknownBlockTypes,
}, null, 2));
