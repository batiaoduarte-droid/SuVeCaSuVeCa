#!/usr/bin/env node
/**
 * scripts/audit-pedagogical-views.mjs
 *
 * Auditoria automatizada do acervo de Visões Pedagógicas (PedagogicalUnitView e CumulativeReviewView V1 / V2.1).
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = path.resolve(process.cwd());
const VIEWS_DIR = path.join(ROOT, 'public', 'knowledge', 'pedagogical', 'views');
const MANIFEST_PATH = path.join(VIEWS_DIR, 'manifest.json');

assert(fs.existsSync(MANIFEST_PATH), `Manifesto de visões não encontrado em ${MANIFEST_PATH}`);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
assert(manifest.viewSchemaVersion === '1.0.0', 'viewSchemaVersion incompatível');
assert(manifest.unitsCount === 115, `Esperadas 115 unidades no manifesto, encontradas ${manifest.unitsCount}`);
assert(manifest.unresolvedRefs === 0, 'Existem referências não resolvidas no manifesto');
assert(manifest.unknownBlockTypes === 0, 'Existem blocos de tipo desconhecido no manifesto');

const viewFiles = fs.readdirSync(VIEWS_DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
assert(viewFiles.length === 115, `Esperados 115 arquivos JSON de visões, encontrados ${viewFiles.length}`);

const ALLOWED_SECTIONS = [
  'suveca', 'prerequisites', 'explanation', 'rules', 'resolution',
  'contrasts', 'examples', 'mnemonics', 'traps', 'glossary', 'recall',
];

const ALLOWED_CUMULATIVE_SECTIONS = [
  'suveca', 'conceptMap', 'prioritizedRules', 'structuredSynthesis', 'recoveryExamples', 'activeReviewProtocol'
];

const checkBlock = (block, unitId) => {
  assert(block && typeof block === 'object', `${unitId}: bloco inválido`);
  assert(['paragraph', 'heading', 'list', 'formula', 'table_ref', 'callout', 'code', 'diagram'].includes(block.type),
    `${unitId}: tipo de bloco desconhecido '${block.type}'`);
  if (block.type === 'table_ref') {
    assert(block.table && Array.isArray(block.table.headers) && Array.isArray(block.table.rows),
      `${unitId}: table_ref '${block.tableId}' sem payload de tabela incorporado`);
  }
};

let checkedBlocks = 0;
let checkedQuestions = 0;

for (const file of viewFiles) {
  const filePath = path.join(VIEWS_DIR, file);
  const view = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const unitId = view.unit?.unitId;

  assert(unitId, `${file}: unitId ausente`);
  assert(view.viewSchemaVersion === '1.0.0', `${unitId}: viewSchemaVersion inválida`);
  assert(view.sections?.suveca, `${unitId}: seção SuVeCA obrigatória ausente`);

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
  assert(view.source?.canonicalSchemaVersion, `${unitId}: canonicalSchemaVersion ausente`);

  for (const secKey of ALLOWED_SECTIONS) {
    const sec = view.sections[secKey];
    if (!sec) continue;

    if (sec.blocks) {
      for (const b of sec.blocks) {
        checkBlock(b, unitId);
        checkedBlocks += 1;
      }
    }

    if (sec.items) {
      for (const item of sec.items) {
        assert(item.blocks, `${unitId}: item em '${secKey}' sem blocks`);
        for (const b of item.blocks) {
          checkBlock(b, unitId);
          checkedBlocks += 1;
        }
      }
    }

    if (sec.procedures) {
      for (const proc of sec.procedures) {
        assert(proc.blocks, `${unitId}: procedure '${proc.procedureId}' sem blocks`);
        for (const b of proc.blocks) {
          checkBlock(b, unitId);
          checkedBlocks += 1;
        }
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
      assert(q.questionId, `${unitId}: questão sem questionId`);
      assert(q.prompt, `${unitId}: questão '${q.questionId}' sem prompt`);
      assert(Array.isArray(q.options), `${unitId}: questão '${q.questionId}' sem array de opções`);
      checkedQuestions += 1;
    }
  }
}

console.log(JSON.stringify({
  status: 'ok',
  viewSchemaVersion: manifest.viewSchemaVersion,
  sourceBuildId: manifest.sourceBuildId,
  unitsAudited: viewFiles.length,
  standardUnits: manifest.standardUnitsCount || 102,
  cumulativeUnits: manifest.cumulativeUnitsCount || 13,
  blocksAudited: checkedBlocks,
  officialQuestionsAudited: checkedQuestions,
  tablesEmbedded: manifest.tablesEmbeddedCount,
  unresolvedRefs: manifest.unresolvedRefs,
  unknownBlockTypes: manifest.unknownBlockTypes,
}, null, 2));
