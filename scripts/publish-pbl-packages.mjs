import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, unlink, access } from 'node:fs/promises';
import { constants, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const DEFAULT_LEDGER_PATH = path.resolve(ROOT, '..', 'Notebook LM', '03_Autoria_Semantica', 'pbl', 'v2', 'reviews', 'pbl_review_ledger.json');
const DEFAULT_PACKAGES_DIR = path.resolve(ROOT, '..', 'Notebook LM', '03_Autoria_Semantica', 'pbl', 'v2', 'packages');
const DEFAULT_REVIEWS_DIR = path.resolve(ROOT, '..', 'Notebook LM', '03_Autoria_Semantica', 'pbl', 'v2', 'reviews');
const DEFAULT_TARGET_FILE = path.resolve(ROOT, 'public', 'knowledge', 'pbl', 'pbl_authored_packages.json');
const DEFAULT_SCHEMA_PATH = path.resolve(ROOT, '..', 'Notebook LM', '03_Autoria_Semantica', 'pbl', 'v2', 'schemas', 'pbl_authorship_v2.schema.json');
const DEFAULT_DECISION_SCHEMA_PATH = path.resolve(ROOT, '..', 'Notebook LM', '03_Autoria_Semantica', 'pbl', 'v2', 'schemas', 'pbl_review_decision.schema.json');
const PYTHON_PATH = path.resolve(ROOT, '..', 'Notebook LM', '.venv', 'Scripts', 'python.exe');

export const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

export const ALLOWED_ADMIN_METADATA_PATHS = new Set([
  'authorship.reviewStatus',
  'authorship.publicationStatus',
  'authorship.verifiedSha256',
  'authorship.reviewedAt',
  'authorship.reviewedBy',
  'authorship.publishedAt',
  'authorship.approvedSha256',
  'authorship.reconciliationNotes',
  'authorship.model',
  'authorship.delegatedSessionId',
]);

export function getObjectDiffPaths(a, b, prefix = '') {
  const paths = new Set();
  if (a === b) return paths;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    if (prefix) paths.add(prefix);
    return paths;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    if (prefix) paths.add(prefix);
    return paths;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      if (prefix) paths.add(prefix);
    } else {
      for (let i = 0; i < a.length; i++) {
        const itemPath = prefix ? `${prefix}[${i}]` : `[${i}]`;
        const sub = getObjectDiffPaths(a[i], b[i], itemPath);
        for (const p of sub) paths.add(p);
      }
    }
    return paths;
  }

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    const propPath = prefix ? `${prefix}.${key}` : key;
    if (!(key in a) || !(key in b)) {
      paths.add(propPath);
    } else {
      const sub = getObjectDiffPaths(a[key], b[key], propPath);
      for (const p of sub) paths.add(p);
    }
  }
  return paths;
}

const REQUIRED_PACKAGE_FIELDS = [
  'schemaVersion',
  'packageId',
  'title',
  'unitId',
  'competencyRef',
  'learningObjectiveRef',
  'scope',
  'authorship',
  'sources',
  'questions',
  'hypotheses',
  'interventions',
  'journey',
  'reflection',
  'revision'
];

/**
 * Valida conformidade estrutural básica do pacote
 */
export function validatePackageSchema(pkg, fileName = 'package') {
  if (!pkg || typeof pkg !== 'object') {
    throw new Error(`[Schema Error] ${fileName}: Conteúdo do pacote não é um objeto.`);
  }

  for (const field of REQUIRED_PACKAGE_FIELDS) {
    if (pkg[field] === undefined) {
      throw new Error(`[Schema Error] ${fileName}: Campo obrigatório ausente '${field}'.`);
    }
  }

  if (pkg.schemaVersion !== 'pbl-authorship/2.0.0') {
    throw new Error(`[Schema Error] ${fileName}: schemaVersion inválido '${pkg.schemaVersion}'. Esperado 'pbl-authorship/2.0.0'.`);
  }

  if (!pkg.authorship || typeof pkg.authorship !== 'object') {
    throw new Error(`[Schema Error] ${fileName}: Campo 'authorship' inválido ou ausente.`);
  }

  const { author, method, reviewStatus } = pkg.authorship;
  if (!author || !method || !reviewStatus) {
    throw new Error(`[Schema Error] ${fileName}: authorship deve conter author, method e reviewStatus.`);
  }

  if (!Array.isArray(pkg.sources) || !Array.isArray(pkg.questions) || !Array.isArray(pkg.interventions)) {
    throw new Error(`[Schema Error] ${fileName}: sources, questions e interventions devem ser arrays.`);
  }

  return true;
}

/**
 * Valida conformidade estrita e completa contra o JSON Schema v2 oficial (Draft 2020-12)
 */
export function validatePackageFullSchema(pkg, schemaPath = DEFAULT_SCHEMA_PATH, fileName = 'package') {
  validatePackageSchema(pkg, fileName);

  const pyScript = `
import json, sys, jsonschema
schema_file = sys.argv[1]
with open(schema_file, 'r', encoding='utf-8') as f:
    schema = json.load(f)
validator = jsonschema.Draft202012Validator(schema)
pkg = json.loads(sys.stdin.read())
errors = list(validator.iter_errors(pkg))
if errors:
    err_list = [{'path': list(e.path), 'message': e.message} for e in errors]
    print(json.dumps(err_list, ensure_ascii=False))
    sys.exit(1)
sys.exit(0)
`;

  const result = spawnSync(PYTHON_PATH, ['-c', pyScript, schemaPath], {
    input: JSON.stringify(pkg),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    let errorDetails = result.stdout || result.stderr || 'Draft 2020-12 schema validation failed';
    try {
      const parsedErrors = JSON.parse(result.stdout);
      errorDetails = parsedErrors.map((e) => `/${e.path.join('/')}: ${e.message}`).join('; ');
    } catch {}
    throw new Error(`[Full Schema v2 Error] ${fileName}: Violação do schema Draft 2020-12: ${errorDetails}`);
  }

  return true;
}

/**
 * Valida conformidade estrita da decisão de revisão contra o JSON Schema Draft 2020-12
 */
export function validateReviewDecisionSchema(entry, schemaPath = DEFAULT_DECISION_SCHEMA_PATH, fileName = 'ledger entry') {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`[Review Decision Schema Error] ${fileName}: Entrada do ledger não é um objeto.`);
  }

  const pyScript = `
import json, sys, jsonschema
schema_file = sys.argv[1]
with open(schema_file, 'r', encoding='utf-8') as f:
    schema = json.load(f)
validator = jsonschema.Draft202012Validator(schema)
entry = json.loads(sys.stdin.read())
errors = list(validator.iter_errors(entry))
if errors:
    err_list = [{'path': list(e.path), 'message': e.message} for e in errors]
    print(json.dumps(err_list, ensure_ascii=False))
    sys.exit(1)
sys.exit(0)
`;

  const result = spawnSync(PYTHON_PATH, ['-c', pyScript, schemaPath], {
    input: JSON.stringify(entry),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    let errorDetails = result.stdout || result.stderr || 'Draft 2020-12 review decision schema validation failed';
    try {
      const parsedErrors = JSON.parse(result.stdout);
      errorDetails = parsedErrors.map((e) => `/${e.path.join('/')}: ${e.message}`).join('; ');
    } catch {}
    throw new Error(`[Review Decision Schema Error] ${fileName}: Violação do schema de decisão Draft 2020-12: ${errorDetails}`);
  }

  return true;
}

/**
 * Publicador verificável de pacotes autorais PBL.
 * Opera de forma puramente atômica e fail-closed.
 */
export async function publishPackages(options = {}) {
  const ledgerPath = options.ledgerPath || DEFAULT_LEDGER_PATH;
  const packagesDir = options.packagesDir || DEFAULT_PACKAGES_DIR;
  const reviewsDir = options.reviewsDir || DEFAULT_REVIEWS_DIR;
  const targetFile = options.targetFile || DEFAULT_TARGET_FILE;
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const decisionSchemaPath = options.decisionSchemaPath || DEFAULT_DECISION_SCHEMA_PATH;

  console.log(`[publish-pbl-packages] Iniciando publicação controlada...`);
  console.log(`  Ledger: ${ledgerPath}`);
  console.log(`  Packages Dir: ${packagesDir}`);
  console.log(`  Target: ${targetFile}`);

  // 1. Ler o Review Ledger
  let ledgerContent;
  try {
    ledgerContent = await readFile(ledgerPath, 'utf8');
  } catch (err) {
    throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Não foi possível ler o ledger em ${ledgerPath}: ${err.message}`);
  }

  const ledger = JSON.parse(ledgerContent);
  if (!ledger.packages || !Array.isArray(ledger.packages)) {
    throw new Error('[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Ledger inválido: campo packages ausente ou não é array.');
  }

  // Mapear ledger por competencyRef
  const ledgerByComp = new Map();
  for (const entry of ledger.packages) {
    if (ledgerByComp.has(entry.competencyRef)) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Entrada duplicada no ledger para ${entry.competencyRef}.`);
    }
    ledgerByComp.set(entry.competencyRef, entry);
  }

  // 2. Determinar quais pacotes processar com escopo estrito
  let targetCompRefs = [];
  if (Array.isArray(options.batch)) {
    if (options.batch.length === 0) {
      throw new Error('[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Lote vazio fornecido (--batch []). Especifique as competências explicitamente ou utilize --all para publicar todo o acervo.');
    }
    targetCompRefs = [...new Set(options.batch)];
  } else if (options.all === true) {
    targetCompRefs = Array.from(ledgerByComp.keys());
  } else {
    throw new Error('[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Nenhuma competência ou escopo especificado. Forneça --batch <compRef...> ou --all.');
  }

  console.log(`[publish-pbl-packages] Lote solicitado: ${targetCompRefs.length} pacotes: [${targetCompRefs.join(', ')}]`);

  // 3. Validação Fail-Closed do Lote ANTES de qualquer escrita no destino
  const verifiedPackagesToPublish = [];
  const auditLog = [];

  for (const compRef of targetCompRefs) {
    const entry = ledgerByComp.get(compRef);
    if (!entry) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Competência ${compRef} não está registrada no Review Ledger.`);
    }

    // A0. Validação estrita do schema de decisão de revisão (Draft 2020-12)
    validateReviewDecisionSchema(entry, decisionSchemaPath, compRef);

    const { packageFile, reviewedSha256, status, finalVerdict, packageId, unitId, reviewReport } = entry;

    // A. Status PASS E finalVerdict PASS estritamente obrigatórios (decisão estruturada como autoridade)
    if (status !== 'PASS' || finalVerdict !== 'PASS') {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Pacote ${compRef} possui status '${status}' e finalVerdict '${finalVerdict}' (ambos devem ser PASS). Publicação abortada.`);
    }

    // B. Conferência do relatório de revisão independente (evidência/audit trail)
    if (!reviewReport) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Pacote ${compRef} não possui reviewReport registrado no ledger.`);
    }
    const reportPath = path.join(reviewsDir, reviewReport);
    try {
      await access(reportPath, constants.R_OK);
    } catch (err) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Relatório de revisão inacessível para ${compRef} (${reviewReport}): ${err.message}`);
    }

    // C. Verificação estrita de hash SHA-256 byte-a-byte do arquivo de autoria
    const packageFilePath = path.join(packagesDir, packageFile);
    let fileBytes;
    try {
      fileBytes = await readFile(packageFilePath);
    } catch (err) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Arquivo de autoria ${packageFile} não encontrado: ${err.message}`);
    }

    const actualSha256 = sha256(fileBytes);
    if (actualSha256 !== reviewedSha256) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Divergência de hash SHA-256 no pacote ${compRef}: esperado ${reviewedSha256}, obtido ${actualSha256}`);
    }

    // D. Verificação estrita de Reconciliação verificável (caso preApprovalSha256 ou reconciliation sejam declarados)
    if (entry.preApprovalSha256 || entry.reconciliation) {
      if (!entry.preApprovalSha256 || !entry.reconciliation) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Pacote ${compRef} declara preApprovalSha256 ou reconciliation sem o par correspondente.`);
      }

      const rec = entry.reconciliation;
      if (typeof rec !== 'object' || rec === null) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação inválida para ${compRef}: deve ser um objeto estruturado.`);
      }

      // Vínculo 1: Hash da versão revisada
      if (rec.reviewedSha256 !== entry.preApprovalSha256) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação inválida para ${compRef}: reviewedSha256 (${rec.reviewedSha256}) não coincide com preApprovalSha256 (${entry.preApprovalSha256}).`);
      }

      // Vínculo 2: Hash da versão atual (deve bater exatamente com os bytes reais do arquivo no disco)
      if (rec.targetSha256 !== actualSha256) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação falsa/incompleta para ${compRef}: targetSha256 da reconciliação (${rec.targetSha256}) não confere com os bytes reais do arquivo no disco (${actualSha256}).`);
      }

      // Vínculo 3: Integridade do conteúdo pedagógico
      if (rec.pedagogicalContentIntegrity !== true) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação para ${compRef} não atesta pedagogicalContentIntegrity: true.`);
      }

      // Vínculo 4: Classificação do delta restrita a metadados ou formatação estrutural
      if (!['metadata_only', 'structural_formatting_only'].includes(rec.deltaClassification)) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação para ${compRef} possui deltaClassification não autorizada: '${rec.deltaClassification}'.`);
      }

      // Vínculo 5: Verificação de comparisonResult no ledger
      if (rec.comparisonResult !== 'MATCH_VERIFIED') {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação para ${compRef} possui comparisonResult inválido: '${rec.comparisonResult}'. Esperado: 'MATCH_VERIFIED'.`);
      }

      // Vínculo 6: Validação estrita do conteúdo estruturado do artefato de comparação
      if (!rec.comparisonArtifact || typeof rec.comparisonArtifact !== 'string' || rec.comparisonArtifact.trim() === '') {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação para ${compRef} não possui comparisonArtifact válido.`);
      }

      let artifactPath = path.isAbsolute(rec.comparisonArtifact)
        ? rec.comparisonArtifact
        : path.resolve(ROOT, '..', rec.comparisonArtifact);

      if (!existsSync(artifactPath)) {
        artifactPath = path.resolve(ROOT, '..', 'Notebook LM', rec.comparisonArtifact);
      }
      if (!existsSync(artifactPath)) {
        artifactPath = path.resolve(reviewsDir, '..', rec.comparisonArtifact);
      }
      if (!existsSync(artifactPath)) {
        artifactPath = path.resolve(reviewsDir, '..', '..', rec.comparisonArtifact);
      }
      if (!existsSync(artifactPath)) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Artefato de comparação não encontrado no disco: ${rec.comparisonArtifact}`);
      }

      let artifactData;
      try {
        const artifactContent = await readFile(artifactPath, 'utf8');
        artifactData = JSON.parse(artifactContent);
      } catch (err) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Artefato de comparação ilegível ou JSON inválido para ${compRef}: ${err.message}`);
      }

      // Validação estrita dos vínculos no artefato de comparação
      if (artifactData.comparisonResult !== 'MATCH_VERIFIED') {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Artefato de comparação para ${compRef} possui comparisonResult inválido: '${artifactData.comparisonResult}'. Esperado: 'MATCH_VERIFIED'.`);
      }
      if (artifactData.reviewedSha256 !== rec.reviewedSha256) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Inconsistência no artefato de comparação para ${compRef}: reviewedSha256 do artefato (${artifactData.reviewedSha256}) difere do ledger (${rec.reviewedSha256}).`);
      }
      if (artifactData.targetSha256 !== rec.targetSha256) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Inconsistência no artefato de comparação para ${compRef}: targetSha256 do artefato (${artifactData.targetSha256}) difere do ledger (${rec.targetSha256}).`);
      }
      if (artifactData.targetSha256 !== actualSha256) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Inconsistência no artefato de comparação para ${compRef}: targetSha256 do artefato (${artifactData.targetSha256}) não confere com os bytes reais do arquivo em disco (${actualSha256}).`);
      }
      if (artifactData.pedagogicalContentIntegrity !== true) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Artefato de comparação não atesta integridade pedagógica (pedagogicalContentIntegrity !== true) para ${compRef}.`);
      }
      if (artifactData.deltaClassification !== rec.deltaClassification) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Inconsistência no artefato de comparação para ${compRef}: deltaClassification do artefato (${artifactData.deltaClassification}) difere do ledger (${rec.deltaClassification}).`);
      }
      if (!Array.isArray(artifactData.changedPaths)) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Artefato de comparação para ${compRef} não lista os caminhos alterados (changedPaths ausente ou não é array).`);
      }

      // Vínculo 7: Localização e verificação física da versão revisada original
      const candidateReviewedFiles = [
        rec.reviewedVersionFile,
        artifactData.reviewedVersionFile,
        path.resolve(path.dirname(artifactPath), `${compRef}_reviewed.json`),
        path.resolve(path.dirname(artifactPath), `${path.basename(packageFile, '.json')}_reviewed.json`),
        path.resolve(reviewsDir, `${compRef}_reviewed.json`),
        path.resolve(reviewsDir, '..', 'reconciliations', `${compRef}_reviewed.json`),
      ].filter(Boolean);

      let reviewedFilePath = null;
      for (const candidate of candidateReviewedFiles) {
        const resolved = path.isAbsolute(candidate)
          ? candidate
          : [
              path.resolve(ROOT, '..', candidate),
              path.resolve(ROOT, '..', 'Notebook LM', candidate),
              path.resolve(path.dirname(artifactPath), candidate),
              path.resolve(reviewsDir, candidate),
            ].find((p) => existsSync(p));
        if (resolved && existsSync(resolved)) {
          reviewedFilePath = resolved;
          break;
        }
      }

      if (!reviewedFilePath) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Arquivo da versão revisada original não encontrado para reconciliação de ${compRef}.`);
      }

      const reviewedBytes = await readFile(reviewedFilePath);
      const actualReviewedSha256 = sha256(reviewedBytes);
      if (actualReviewedSha256 !== rec.reviewedSha256) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Hash real em disco da versão revisada de ${compRef} (${actualReviewedSha256}) difere do reviewedSha256 declarado (${rec.reviewedSha256}).`);
      }

      // Vínculo 8: Diffing semântico estruturado real entre a versão revisada e o pacote alvo
      let reviewedObj;
      try {
        reviewedObj = JSON.parse(reviewedBytes.toString('utf8'));
      } catch (err) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: JSON inválido na versão revisada de ${compRef}: ${err.message}`);
      }

      let targetObj;
      try {
        targetObj = JSON.parse(fileBytes.toString('utf8'));
      } catch (err) {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: JSON inválido no pacote alvo de ${compRef}: ${err.message}`);
      }

      const actualDiffPaths = getObjectDiffPaths(reviewedObj, targetObj);

      if (rec.deltaClassification === 'structural_formatting_only') {
        if (actualDiffPaths.size > 0) {
          throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação para ${compRef} declarou 'structural_formatting_only', mas há diferenças semânticas reais: ${[...actualDiffPaths].join(', ')}`);
        }
      } else if (rec.deltaClassification === 'metadata_only') {
        // 1. Cada caminho alterado DEVE pertencer estritamente à whitelist de metadados permitidos
        for (const diffPath of actualDiffPaths) {
          if (!ALLOWED_ADMIN_METADATA_PATHS.has(diffPath)) {
            throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Alteração não autorizada detectada na reconciliação de ${compRef}: o caminho '${diffPath}' não é metadado administrativo permitido.`);
          }
        }

        // 2. Não pode haver alteração pedagógica em nenhuma hipótese
        const forbiddenPedagogicalPrefixes = [
          'questions',
          'interventions',
          'criteria',
          'scenarios',
          'case',
          'transfers',
          'review',
          'prompt',
          'officialAnswer',
          'solutionStrategy',
          'decisivePoint',
          'pedagogy',
        ];
        for (const diffPath of actualDiffPaths) {
          const violatesPedagogical = forbiddenPedagogicalPrefixes.some(
            (prefix) => diffPath === prefix || diffPath.startsWith(`${prefix}.`) || diffPath.startsWith(`${prefix}[`)
          );
          if (violatesPedagogical) {
            throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Alteração pedagógica não autorizada detectada na reconciliação de ${compRef}: '${diffPath}'.`);
          }
        }

        // 3. Correspondência biunívoca estrita entre actualDiffPaths e artifactData.changedPaths
        const declaredSet = new Set(artifactData.changedPaths || []);
        for (const diffPath of actualDiffPaths) {
          if (!declaredSet.has(diffPath)) {
            throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Caminho alterado real '${diffPath}' não foi declarado em changedPaths do artefato para ${compRef}.`);
          }
        }
        for (const declaredPath of declaredSet) {
          if (!actualDiffPaths.has(declaredPath)) {
            throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Caminho declarado em changedPaths '${declaredPath}' não foi alterado na realidade para ${compRef}.`);
          }
        }
      }

      // Vínculo 9: Autorizador e data da decisão que autoriza a reconciliação
      if (!rec.authorizedBy || typeof rec.authorizedBy !== 'string' || rec.authorizedBy.trim() === '') {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação para ${compRef} não possui authorizedBy.`);
      }
      if (!rec.authorizedAt || typeof rec.authorizedAt !== 'string' || rec.authorizedAt.trim() === '') {
        throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Reconciliação para ${compRef} não possui authorizedAt.`);
      }
    }

    // D. Validação de parse e identidade
    let parsedPackage;
    try {
      parsedPackage = JSON.parse(fileBytes.toString('utf8'));
    } catch (err) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: JSON corrompido em ${packageFile}: ${err.message}`);
    }

    if (packageId && parsedPackage.packageId !== packageId) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Identidade divergente: packageId do ledger '${packageId}' != pacote '${parsedPackage.packageId}'`);
    }
    if (parsedPackage.competencyRef !== compRef) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Identidade divergente: competencyRef do ledger '${compRef}' != pacote '${parsedPackage.competencyRef}'`);
    }
    if (unitId && parsedPackage.unitId !== unitId) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Identidade divergente: unitId do ledger '${unitId}' != pacote '${parsedPackage.unitId}'`);
    }

    // E. Validação de Schema v2 Completo
    validatePackageFullSchema(parsedPackage, schemaPath, packageFile);

    // F. Formatação segura para publicação (sem mutar arquivo de autoria original)
    const publishedPackage = {
      ...parsedPackage,
      authorship: {
        ...(parsedPackage.authorship || {}),
        reviewStatus: 'homologated',
        publicationStatus: 'product_ready', // Conforme schema v2
        verifiedSha256: actualSha256,
        reviewedAt: entry.reviewedAt || new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
    };

    // Validar também a projeção publicada contra o schema v2
    validatePackageFullSchema(publishedPackage, schemaPath, `${packageFile} [projeção publicada]`);

    verifiedPackagesToPublish.push(publishedPackage);
    auditLog.push({
      competencyRef: compRef,
      packageId: parsedPackage.packageId,
      unitId: parsedPackage.unitId,
      sha256: actualSha256,
      status: 'VERIFIED_OK',
    });
  }

  // 4. Ler pacotes existentes no destino para PRESERVAR todos os pacotes fora do lote atual
  let existingPublished = [];
  try {
    const existingContent = await readFile(targetFile, 'utf8');
    try {
      const parsed = JSON.parse(existingContent);
      if (!Array.isArray(parsed)) {
        throw new Error('Conteúdo existente não é um array JSON.');
      }
      existingPublished = parsed;
    } catch (parseErr) {
      throw new Error(`[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Destino existente ${targetFile} está corrompido ou ilegível: ${parseErr.message}. Publicação abortada para preservar os dados.`);
    }
  } catch (readErr) {
    if (readErr.code === 'ENOENT') {
      existingPublished = [];
    } else {
      throw readErr;
    }
  }

  // Preservar todos os pacotes existentes cuja competência não foi atualizada neste lote
  const updatingCompRefs = new Set(verifiedPackagesToPublish.map((p) => p.competencyRef));
  const preservedPackages = existingPublished.filter((p) => !updatingCompRefs.has(p.competencyRef));

  console.log(`[publish-pbl-packages] Pacotes anteriores preservados: ${preservedPackages.length}`);
  console.log(`[publish-pbl-packages] Novos pacotes certificados a incorporar: ${verifiedPackagesToPublish.length}`);

  // 5. Montar lista final
  const finalPackages = [...preservedPackages, ...verifiedPackagesToPublish];

  // Ordenar de forma estável por competencyRef para idempotência exata
  finalPackages.sort((a, b) => (a.competencyRef || '').localeCompare(b.competencyRef || ''));

  if (options.dryRun) {
    console.log(`[publish-pbl-packages] Dry-run ativo. Nenhuma alteração gravada.`);
    return {
      success: true,
      published: verifiedPackagesToPublish.length,
      publishedCount: finalPackages.length,
      updatedCount: verifiedPackagesToPublish.length,
      preservedCount: preservedPackages.length,
      auditLog,
    };
  }

  // 6. Gravação Atômica usando arquivo temporário
  const tmpFile = `${targetFile}.tmp.${Date.now()}`;
  const outputBuffer = Buffer.from(`${JSON.stringify(finalPackages, null, 2)}\n`, 'utf8');

  try {
    await writeFile(tmpFile, outputBuffer);
    // Verificar que o arquivo temporário é legível e parseável antes da substituição atômica
    const verifyRead = await readFile(tmpFile, 'utf8');
    const verifyJson = JSON.parse(verifyRead);
    if (!Array.isArray(verifyJson) || verifyJson.length !== finalPackages.length) {
      throw new Error(`Falha na verificação de integridade do arquivo temporário gravado.`);
    }

    // Substituição atômica
    await rename(tmpFile, targetFile);
  } catch (err) {
    try { await unlink(tmpFile); } catch {}
    throw new Error(`[publish-pbl-packages] Falha fatal na gravação atômica: ${err.message}`);
  }

  console.log(`[publish-pbl-packages] Publicação atômica concluída com sucesso.`);
  console.log(`  - Total de pacotes finais no catálogo publicado: ${finalPackages.length}`);
  console.log(`  - Pacotes preservados intactos: ${preservedPackages.length}`);
  console.log(`  - Pacotes atualizados/certificados: ${verifiedPackagesToPublish.length}`);
  for (const item of auditLog) {
    console.log(`    * [PASS] ${item.competencyRef} (${item.packageId}) -> SHA: ${item.sha256.slice(0, 16)}...`);
  }

  return {
    success: true,
    published: verifiedPackagesToPublish.length,
    publishedCount: finalPackages.length,
    updatedCount: verifiedPackagesToPublish.length,
    preservedCount: preservedPackages.length,
    auditLog,
  };
}

// Execução direta CLI
const isDirectCall = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectCall) {
  const args = process.argv.slice(2);
  const batchIdx = args.indexOf('--batch');
  let batch = null;
  if (batchIdx !== -1) {
    batch = [];
    for (let i = batchIdx + 1; i < args.length; i++) {
      if (args[i].startsWith('--')) break;
      batch.push(args[i]);
    }
  }

  const all = args.includes('--all');
  const dryRun = args.includes('--dry-run');

  if (!all && batch === null) {
    console.error('[publish-pbl-packages] BLOQUEIO FAIL-CLOSED: Forneça --batch <compRef...> ou --all para publicar.');
    process.exit(1);
  }

  publishPackages({ batch, all, dryRun }).catch((err) => {
    console.error('[publish-pbl-packages] ERRO FATAL:', err.message);
    process.exit(1);
  });
}
