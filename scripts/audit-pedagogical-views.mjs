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

assert(fs.existsSync(MANIFEST_PATH), `Manifesto de visões não encontrado em ${MANIFEST_PATH}`);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
assert(
  manifest.schemaVersion === '4.2.0' || manifest.viewSchemaVersion === '1.0.0',
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
  }
};

let checkedBlocks = 0;
let checkedQuestions = 0;

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
      checkedQuestions += 1;
    }
  }
}

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
  unresolvedRefs: manifest.unresolvedRefs,
  unknownBlockTypes: manifest.unknownBlockTypes,
}, null, 2));
