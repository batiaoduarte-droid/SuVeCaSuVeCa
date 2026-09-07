import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { publishPackages, sha256 } from '../../../../scripts/publish-pbl-packages.mjs';

const REAL_PACKAGE_PATH = path.resolve(process.cwd(), '..', 'Notebook LM', '03_Autoria_Semantica', 'pbl', 'v2', 'packages', 'COMP-A00-G02-01.json');

describe('publishPackages (Isolated Fixtures & Fail-Closed Guards)', { timeout: 20000 }, () => {
  let tempDir: string;
  let packagesDir: string;
  let reviewsDir: string;
  let ledgerPath: string;
  let targetFile: string;
  let validSamplePackage: any;

  const existingTargetPackages = [
    {
      competencyRef: 'COMP-A00-G01-01',
      packageId: 'PKG-COMP-A00-G01-01',
      title: 'Piloto Base G01',
      authorship: { reviewStatus: 'homologated', publicationStatus: 'product_ready' },
    },
    {
      competencyRef: 'COMP-A00-G07-01',
      packageId: 'PKG-COMP-A00-G07-01',
      title: 'Piloto Base G07',
      authorship: { reviewStatus: 'homologated', publicationStatus: 'product_ready' },
    },
  ];

  const makeLedgerEntry = (overrides: Record<string, unknown> = {}) => ({
    competencyRef: 'COMP-A00-G02-01',
    packageId: 'PKG-COMP-A00-G02-01',
    unitId: 'IP-A00-G02',
    packageFile: 'COMP-A00-G02-01.json',
    reviewReport: 'COMP-A00-G02-01_review.md',
    reviewedSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    status: 'PASS',
    finalVerdict: 'PASS',
    reviewedAt: '2026-09-07T12:00:00Z',
    reviewer: 'PBL Independent Reviewer',
    ...overrides,
  });

  beforeEach(async () => {
    const raw = await readFile(REAL_PACKAGE_PATH, 'utf8');
    validSamplePackage = JSON.parse(raw);
    validSamplePackage.authorship.reviewStatus = 'draft';
    tempDir = await mkdtemp(path.join(tmpdir(), 'pbl-pub-test-'));
    packagesDir = path.join(tempDir, 'packages');
    reviewsDir = path.join(tempDir, 'reviews');
    await mkdir(packagesDir, { recursive: true });
    await mkdir(reviewsDir, { recursive: true });

    ledgerPath = path.join(tempDir, 'pbl_review_ledger.json');
    targetFile = path.join(tempDir, 'pbl_authored_packages.json');

    // Create existing target file
    await writeFile(targetFile, JSON.stringify(existingTargetPackages, null, 2), 'utf8');
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('Scenario 1: Divergent hash fails fail-closed and leaves target file completely intact', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório de Revisão\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: '0000000000000000000000000000000000000000000000000000000000000000',
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const beforeContent = await readFile(targetFile, 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/Divergência de hash SHA-256/);

    const afterContent = await readFile(targetFile, 'utf8');
    expect(afterContent).toBe(beforeContent);
  });

  it('Scenario 2: Requested package without PASS fails fail-closed and leaves target intact', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório de Revisão\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: REQUIRES_ADJUSTMENT\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
          status: 'REQUIRES_ADJUSTMENT',
          finalVerdict: 'REQUIRES_ADJUSTMENT',
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const beforeContent = await readFile(targetFile, 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/possui status 'REQUIRES_ADJUSTMENT'/);

    const afterContent = await readFile(targetFile, 'utf8');
    expect(afterContent).toBe(beforeContent);
  });

  it('Scenario 3: Missing review report fails fail-closed and leaves target intact', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewReport: 'COMP-A00-G02-01_review.md',
          reviewedSha256: sha256(pkgBytes),
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const beforeContent = await readFile(targetFile, 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/Relatório de revisão inacessível/);

    const afterContent = await readFile(targetFile, 'utf8');
    expect(afterContent).toBe(beforeContent);
  });

  it('Scenario 4: Divergent identity (packageId mismatch) fails fail-closed and leaves target intact', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório de Revisão\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          packageId: 'PKG-COMP-A00-G99-99',
          reviewedSha256: sha256(pkgBytes),
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const beforeContent = await readFile(targetFile, 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/Identidade divergente: packageId/);

    const afterContent = await readFile(targetFile, 'utf8');
    expect(afterContent).toBe(beforeContent);
  });

  it('Scenario 5: Package incompatible with schema fails fail-closed and leaves target intact', async () => {
    const invalidPackage = { ...validSamplePackage };
    delete invalidPackage.journey; // Violates required field in schema v2
    const pkgBytes = Buffer.from(JSON.stringify(invalidPackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório de Revisão\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const beforeContent = await readFile(targetFile, 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/Schema Error/);

    const afterContent = await readFile(targetFile, 'utf8');
    expect(afterContent).toBe(beforeContent);
  });

  it('Scenario 6: Partial valid batch updates authorized package and strictly preserves all other packages', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório de Revisão\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const result = await publishPackages({
      ledgerPath,
      packagesDir,
      reviewsDir,
      targetFile,
      batch: ['COMP-A00-G02-01'],
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);
    expect(result.preservedCount).toBe(2);

    const publishedContent = await readFile(targetFile, 'utf8');
    const publishedList = JSON.parse(publishedContent);

    expect(publishedList.length).toBe(3);
    const publishedG02 = publishedList.find((p: any) => p.competencyRef === 'COMP-A00-G02-01');
    expect(publishedG02).toBeDefined();
    expect(publishedG02.authorship.reviewStatus).toBe('homologated');
    expect(publishedG02.authorship.publicationStatus).toBe('product_ready');
    expect(publishedG02.authorship.verifiedSha256).toBe(sha256(pkgBytes));

    const preservedG01 = publishedList.find((p: any) => p.competencyRef === 'COMP-A00-G01-01');
    const preservedG07 = publishedList.find((p: any) => p.competencyRef === 'COMP-A00-G07-01');
    expect(preservedG01).toBeDefined();
    expect(preservedG01.title).toBe('Piloto Base G01');
    expect(preservedG07).toBeDefined();
    expect(preservedG07.title).toBe('Piloto Base G07');
  });

  it('Scenario 7: Re-executing same batch is strictly idempotent without duplications', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório de Revisão\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    // First run
    await publishPackages({
      ledgerPath,
      packagesDir,
      reviewsDir,
      targetFile,
      batch: ['COMP-A00-G02-01'],
    });

    const firstRunData = JSON.parse(await readFile(targetFile, 'utf8'));
    expect(firstRunData.length).toBe(3);

    // Second run
    await publishPackages({
      ledgerPath,
      packagesDir,
      reviewsDir,
      targetFile,
      batch: ['COMP-A00-G02-01'],
    });

    const secondRunData = JSON.parse(await readFile(targetFile, 'utf8'));
    expect(secondRunData.length).toBe(3);

    const counts = secondRunData.reduce((acc: any, p: any) => {
      acc[p.competencyRef] = (acc[p.competencyRef] || 0) + 1;
      return acc;
    }, {});
    expect(counts['COMP-A00-G01-01']).toBe(1);
    expect(counts['COMP-A00-G07-01']).toBe(1);
    expect(counts['COMP-A00-G02-01']).toBe(1);
  });

  it('Scenario 8: Markdown report contains divergent prose or historical text, but structured decision in ledger governs (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    // Report has a different SHA-256 mentioned in narrative text or legacy format
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório Histórico\nHash anterior: ${'a'.repeat(64)}\nObservações preliminares.\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const beforeContent = await readFile(targetFile, 'utf8');

    const result = await publishPackages({
      ledgerPath,
      packagesDir,
      reviewsDir,
      targetFile,
      batch: ['COMP-A00-G02-01'],
    });

    expect(result.published).toBe(1);
    const afterContent = await readFile(targetFile, 'utf8');
    expect(afterContent).not.toBe(beforeContent);
  });

  it('Scenario 9: Report with Final verdict: PASS in prose but ledger finalVerdict: FAIL fails fail-closed (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    // Report prose says Final verdict: PASS, but structured decision in ledger says finalVerdict: FAIL
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
          finalVerdict: 'FAIL',
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const beforeContent = await readFile(targetFile, 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/possui status 'PASS' e finalVerdict 'FAIL'/);

    const afterContent = await readFile(targetFile, 'utf8');
    expect(afterContent).toBe(beforeContent);
  });

  it('Scenario 10: Corrupt existing target fails fail-closed without overwriting or destroying content (RGO-003)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    // Corrupt existing destination file with truncated JSON
    const corruptContent = '[{"competencyRef": "CORRUPT", "data": ';
    await writeFile(targetFile, corruptContent, 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/Destino existente .* está corrompido ou ilegível/);

    // Verify target file was NOT overwritten or truncated
    const preservedCorruptContent = await readFile(targetFile, 'utf8');
    expect(preservedCorruptContent).toBe(corruptContent);
  });

  it('Scenario 11: Ledger entry with status: FAIL and finalVerdict: PASS fails fail-closed (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
          status: 'FAIL',
          finalVerdict: 'PASS',
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/possui status 'FAIL' e finalVerdict 'PASS'/);
  });

  it('Scenario 12: Ledger entry with status: PASS and finalVerdict: FAIL fails fail-closed (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
          status: 'PASS',
          finalVerdict: 'FAIL',
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/possui status 'PASS' e finalVerdict 'FAIL'/);
  });

  it('Scenario 13: Ledger entry missing required decision fields fails Draft 2020-12 schema validation (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório\nHash SHA-256: ${sha256(pkgBytes)}\nFinal verdict: PASS\n`, 'utf8');

    const incompleteEntry: any = makeLedgerEntry({
      reviewedSha256: sha256(pkgBytes),
    });
    delete incompleteEntry.finalVerdict;
    delete incompleteEntry.reviewer;
    delete incompleteEntry.reviewedAt;

    const ledger = { packages: [incompleteEntry] };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/Review Decision Schema Error/);
  });

  it('Scenario 14: Structured decision is the sole authority; Markdown narrative notes do not decide publication (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    // Report has narrative notes or discussions mentioning historical FAIL/NEEDS_ADJUSTMENT
    await writeFile(
      path.join(reviewsDir, 'COMP-A00-G02-01_review.md'),
      `Audit History\nInitial test: FAIL\nSecond attempt: REQUIRES_ADJUSTMENT\nResolved in latest round.\nHash SHA-256: ${sha256(pkgBytes)}\n`,
      'utf8'
    );

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
          status: 'PASS',
          finalVerdict: 'PASS',
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    // Structured decision is PASS -> publishes successfully regardless of Markdown text
    const result = await publishPackages({
      ledgerPath,
      packagesDir,
      reviewsDir,
      targetFile,
      batch: ['COMP-A00-G02-01'],
    });
    expect(result.published).toBe(1);
  });

  it('Scenario 15: preApprovalSha256 declared without reconciliation object fails schema validation (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    const oldHash = 'a'.repeat(64);
    await writeFile(
      path.join(reviewsDir, 'COMP-A00-G02-01_review.md'),
      `Package: PKG-COMP-A00-G02-01\nSHA-256: ${oldHash}\n`,
      'utf8'
    );

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
          preApprovalSha256: oldHash,
          // No reconciliation object provided -> fails dependentRequired in schema
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/(?:Review Decision Schema Error|sem o par correspondente)/);
  });

  it('Scenario 16: Strict batch selection blocks empty batch or unspecified scope fail-closed (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    await writeFile(path.join(reviewsDir, 'COMP-A00-G02-01_review.md'), `# Relatório\nHash SHA-256: ${sha256(pkgBytes)}\n`, 'utf8');

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: sha256(pkgBytes),
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    // 1. Empty batch array must fail fail-closed
    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: [],
      })
    ).rejects.toThrow(/Lote vazio fornecido/);

    // 2. Neither batch nor all provided must fail fail-closed
    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
      })
    ).rejects.toThrow(/Nenhuma competência ou escopo especificado/);
  });

  it('Scenario 17: Formally filled but false/inconsistent reconciliation object fails fail-closed (RGO-002)', async () => {
    const pkgBytes = Buffer.from(JSON.stringify(validSamplePackage, null, 2), 'utf8');
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), pkgBytes);
    const actualHash = sha256(pkgBytes);
    const oldReviewedHash = 'b'.repeat(64);
    const fakeTargetHash = 'c'.repeat(64); // Does NOT match actual package bytes!

    await writeFile(
      path.join(reviewsDir, 'COMP-A00-G02-01_review.md'),
      `# Relatório\nHash: ${oldReviewedHash}\n`,
      'utf8'
    );

    const reconciliationFile = path.join(tempDir, 'reconciliation.json');
    await writeFile(
      reconciliationFile,
      JSON.stringify({
        schemaVersion: 'pbl-reconciliation/1.0.0',
        competencyRef: 'COMP-A00-G02-01',
        packageId: 'PKG-COMP-A00-G02-01',
        reviewedSha256: oldReviewedHash,
        targetSha256: fakeTargetHash,
        comparisonArtifact: reconciliationFile,
        comparisonResult: 'MATCH_VERIFIED',
        changedPaths: ['authorship.reviewStatus'],
        deltaSummary: 'declarative only text',
        deltaClassification: 'metadata_only',
        pedagogicalContentIntegrity: true,
        authorizedBy: 'PBL Independent Reviewer',
        authorizedAt: '2026-09-07T12:00:00Z',
      }, null, 2),
      'utf8'
    );

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: actualHash,
          preApprovalSha256: oldReviewedHash,
          reconciliation: {
            reviewedSha256: oldReviewedHash,
            targetSha256: fakeTargetHash, // Mismatched target SHA!
            comparisonArtifact: reconciliationFile,
            comparisonResult: 'MATCH_VERIFIED',
            changedPaths: ['authorship.reviewStatus'],
            deltaSummary: 'declarative only text',
            deltaClassification: 'metadata_only',
            pedagogicalContentIntegrity: true,
            authorizedBy: 'PBL Independent Reviewer',
            authorizedAt: '2026-09-07T12:00:00Z',
          },
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/Reconciliação falsa\/incompleta.*targetSha256 da reconciliação.*não confere com os bytes reais/);
  });

  it('Scenario 18: Audit Case 1 — Authentic verifiable reconciliation with valid metadata-only diff passes successfully (RGO-002)', async () => {
    // Create base reviewed package
    const reviewedPkg = JSON.parse(JSON.stringify(validSamplePackage));
    reviewedPkg.authorship.reviewStatus = 'draft';
    reviewedPkg.authorship.publicationStatus = 'draft';
    const reviewedBytes = Buffer.from(JSON.stringify(reviewedPkg, null, 2), 'utf8');
    const oldReviewedHash = sha256(reviewedBytes);

    const reviewedFile = path.join(tempDir, 'COMP-A00-G02-01_reviewed.json');
    await writeFile(reviewedFile, reviewedBytes);

    // Target package has only administrative metadata changes
    const targetPkg = JSON.parse(JSON.stringify(reviewedPkg));
    targetPkg.authorship.reviewStatus = 'homologated';
    targetPkg.authorship.publicationStatus = 'product_ready';
    targetPkg.authorship.approvedSha256 = oldReviewedHash;

    const targetBytes = Buffer.from(JSON.stringify(targetPkg, null, 2), 'utf8');
    const actualHash = sha256(targetBytes);
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), targetBytes);

    await writeFile(
      path.join(reviewsDir, 'COMP-A00-G02-01_review.md'),
      `# Relatório de Revisão\nHash SHA-256: ${oldReviewedHash}\nFinal verdict: PASS\n`,
      'utf8'
    );

    const authenticReconciliationFile = path.join(tempDir, 'COMP-A00-G02-01_reconciliation.json');
    const changedPaths = [
      'authorship.approvedSha256',
      'authorship.publicationStatus',
      'authorship.reviewStatus',
    ];
    await writeFile(
      authenticReconciliationFile,
      JSON.stringify({
        schemaVersion: 'pbl-reconciliation/1.0.0',
        competencyRef: 'COMP-A00-G02-01',
        packageId: 'PKG-COMP-A00-G02-01',
        reviewedSha256: oldReviewedHash,
        targetSha256: actualHash,
        comparisonArtifact: authenticReconciliationFile,
        comparisonResult: 'MATCH_VERIFIED',
        changedPaths,
        deltaSummary: 'Metadata delta verified. Zero modification to pedagogical content.',
        deltaClassification: 'metadata_only',
        pedagogicalContentIntegrity: true,
        authorizedBy: 'PBL Independent Reviewer',
        authorizedAt: '2026-09-07T12:00:00Z',
        reviewedVersionFile: reviewedFile,
      }, null, 2),
      'utf8'
    );

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: actualHash,
          preApprovalSha256: oldReviewedHash,
          reconciliation: {
            reviewedSha256: oldReviewedHash,
            targetSha256: actualHash,
            comparisonArtifact: authenticReconciliationFile,
            comparisonResult: 'MATCH_VERIFIED',
            changedPaths,
            deltaSummary: 'Metadata delta verified. Zero modification to pedagogical content.',
            deltaClassification: 'metadata_only',
            pedagogicalContentIntegrity: true,
            authorizedBy: 'PBL Independent Reviewer',
            authorizedAt: '2026-09-07T12:00:00Z',
            reviewedVersionFile: reviewedFile,
          },
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    const result = await publishPackages({
      ledgerPath,
      packagesDir,
      reviewsDir,
      targetFile,
      batch: ['COMP-A00-G02-01'],
    });
    expect(result.published).toBe(1);

    const publishedContent = JSON.parse(await readFile(targetFile, 'utf8'));
    const publishedPkg = publishedContent.find((p: any) => p.competencyRef === 'COMP-A00-G02-01');
    expect(publishedPkg).toBeDefined();
    expect(publishedPkg.authorship.reviewStatus).toBe('homologated');
    expect(publishedPkg.authorship.publicationStatus).toBe('product_ready');
  });

  it('Scenario 19: Audit Case 2 — Reconciled publication with undeclared real modification fails fail-closed (RGO-002)', async () => {
    const reviewedPkg = JSON.parse(JSON.stringify(validSamplePackage));
    reviewedPkg.authorship.reviewStatus = 'draft';
    const reviewedBytes = Buffer.from(JSON.stringify(reviewedPkg, null, 2), 'utf8');
    const oldReviewedHash = sha256(reviewedBytes);

    const reviewedFile = path.join(tempDir, 'COMP-A00-G02-01_reviewed.json');
    await writeFile(reviewedFile, reviewedBytes);

    // Target package modifies takeaway in interventions (pedagogical) AND metadata
    const targetPkg = JSON.parse(JSON.stringify(reviewedPkg));
    targetPkg.authorship.reviewStatus = 'homologated';
    targetPkg.interventions[0].takeaway = 'Síntese modificada sorrateiramente';

    const targetBytes = Buffer.from(JSON.stringify(targetPkg, null, 2), 'utf8');
    const actualHash = sha256(targetBytes);
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), targetBytes);

    await writeFile(
      path.join(reviewsDir, 'COMP-A00-G02-01_review.md'),
      `# Relatório de Revisão\nHash: ${oldReviewedHash}\n`,
      'utf8'
    );

    // Artifact declares ONLY metadata change, omitting interventions[0].takeaway!
    const undeclaredArtifact = path.join(tempDir, 'undeclared_reconciliation.json');
    await writeFile(
      undeclaredArtifact,
      JSON.stringify({
        schemaVersion: 'pbl-reconciliation/1.0.0',
        competencyRef: 'COMP-A00-G02-01',
        packageId: 'PKG-COMP-A00-G02-01',
        reviewedSha256: oldReviewedHash,
        targetSha256: actualHash,
        comparisonArtifact: undeclaredArtifact,
        comparisonResult: 'MATCH_VERIFIED',
        changedPaths: ['authorship.reviewStatus'], // Omits interventions[0].takeaway!
        deltaSummary: 'Claims only metadata changed',
        deltaClassification: 'metadata_only',
        pedagogicalContentIntegrity: true,
        authorizedBy: 'PBL Independent Reviewer',
        authorizedAt: '2026-09-07T12:00:00Z',
        reviewedVersionFile: reviewedFile,
      }, null, 2),
      'utf8'
    );

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: actualHash,
          preApprovalSha256: oldReviewedHash,
          reconciliation: {
            reviewedSha256: oldReviewedHash,
            targetSha256: actualHash,
            comparisonArtifact: undeclaredArtifact,
            comparisonResult: 'MATCH_VERIFIED',
            changedPaths: ['authorship.reviewStatus'],
            deltaSummary: 'Claims only metadata changed',
            deltaClassification: 'metadata_only',
            pedagogicalContentIntegrity: true,
            authorizedBy: 'PBL Independent Reviewer',
            authorizedAt: '2026-09-07T12:00:00Z',
            reviewedVersionFile: reviewedFile,
          },
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/(?:Alteração não autorizada detectada.*não é metadado administrativo|Alteração pedagógica não autorizada|não foi declarado)/);
  });

  it('Scenario 20: Audit Case 3 — Reconciled publication with declared pedagogical change fails fail-closed (RGO-002)', async () => {
    const reviewedPkg = JSON.parse(JSON.stringify(validSamplePackage));
    reviewedPkg.authorship.reviewStatus = 'draft';
    const reviewedBytes = Buffer.from(JSON.stringify(reviewedPkg, null, 2), 'utf8');
    const oldReviewedHash = sha256(reviewedBytes);

    const reviewedFile = path.join(tempDir, 'COMP-A00-G02-01_reviewed.json');
    await writeFile(reviewedFile, reviewedBytes);

    const targetPkg = JSON.parse(JSON.stringify(reviewedPkg));
    targetPkg.authorship.reviewStatus = 'homologated';
    targetPkg.interventions[0].hint = ['Novo hint'];

    const targetBytes = Buffer.from(JSON.stringify(targetPkg, null, 2), 'utf8');
    const actualHash = sha256(targetBytes);
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), targetBytes);

    await writeFile(
      path.join(reviewsDir, 'COMP-A00-G02-01_review.md'),
      `# Relatório\nHash: ${oldReviewedHash}\n`,
      'utf8'
    );

    // Artifact openly declares changedPaths including interventions[0].hint
    const hostilePedagogicalArtifact = path.join(tempDir, 'hostile_pedagogical_reconciliation.json');
    const declaredPaths = ['authorship.reviewStatus', 'interventions[0].hint'];
    await writeFile(
      hostilePedagogicalArtifact,
      JSON.stringify({
        schemaVersion: 'pbl-reconciliation/1.0.0',
        competencyRef: 'COMP-A00-G02-01',
        packageId: 'PKG-COMP-A00-G02-01',
        reviewedSha256: oldReviewedHash,
        targetSha256: actualHash,
        comparisonArtifact: hostilePedagogicalArtifact,
        comparisonResult: 'MATCH_VERIFIED',
        changedPaths: declaredPaths,
        deltaSummary: 'Altered hint under the guise of metadata',
        deltaClassification: 'metadata_only',
        pedagogicalContentIntegrity: true,
        authorizedBy: 'PBL Independent Reviewer',
        authorizedAt: '2026-09-07T12:00:00Z',
        reviewedVersionFile: reviewedFile,
      }, null, 2),
      'utf8'
    );

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: actualHash,
          preApprovalSha256: oldReviewedHash,
          reconciliation: {
            reviewedSha256: oldReviewedHash,
            targetSha256: actualHash,
            comparisonArtifact: hostilePedagogicalArtifact,
            comparisonResult: 'MATCH_VERIFIED',
            changedPaths: declaredPaths,
            deltaSummary: 'Altered hint under the guise of metadata',
            deltaClassification: 'metadata_only',
            pedagogicalContentIntegrity: true,
            authorizedBy: 'PBL Independent Reviewer',
            authorizedAt: '2026-09-07T12:00:00Z',
            reviewedVersionFile: reviewedFile,
          },
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/(?:não é metadado administrativo permitido|Alteração pedagógica não autorizada)/);
  });

  it('Scenario 21: Audit Case 4 — Reconciled publication with comparisonResult !== MATCH_VERIFIED fails fail-closed (RGO-002)', async () => {
    const reviewedPkg = JSON.parse(JSON.stringify(validSamplePackage));
    reviewedPkg.authorship.reviewStatus = 'draft';
    const reviewedBytes = Buffer.from(JSON.stringify(reviewedPkg, null, 2), 'utf8');
    const oldReviewedHash = sha256(reviewedBytes);

    const reviewedFile = path.join(tempDir, 'COMP-A00-G02-01_reviewed.json');
    await writeFile(reviewedFile, reviewedBytes);

    const targetPkg = JSON.parse(JSON.stringify(reviewedPkg));
    targetPkg.authorship.reviewStatus = 'homologated';

    const targetBytes = Buffer.from(JSON.stringify(targetPkg, null, 2), 'utf8');
    const actualHash = sha256(targetBytes);
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), targetBytes);

    await writeFile(
      path.join(reviewsDir, 'COMP-A00-G02-01_review.md'),
      `# Relatório\nHash: ${oldReviewedHash}\n`,
      'utf8'
    );

    const failArtifact = path.join(tempDir, 'fail_reconciliation.json');
    await writeFile(
      failArtifact,
      JSON.stringify({
        schemaVersion: 'pbl-reconciliation/1.0.0',
        competencyRef: 'COMP-A00-G02-01',
        packageId: 'PKG-COMP-A00-G02-01',
        reviewedSha256: oldReviewedHash,
        targetSha256: actualHash,
        comparisonArtifact: failArtifact,
        comparisonResult: 'FAIL', // Comparison failed!
        changedPaths: ['authorship.reviewStatus'],
        deltaSummary: 'Comparison detected unresolved discrepancy',
        deltaClassification: 'metadata_only',
        pedagogicalContentIntegrity: true,
        authorizedBy: 'PBL Independent Reviewer',
        authorizedAt: '2026-09-07T12:00:00Z',
        reviewedVersionFile: reviewedFile,
      }, null, 2),
      'utf8'
    );

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: actualHash,
          preApprovalSha256: oldReviewedHash,
          reconciliation: {
            reviewedSha256: oldReviewedHash,
            targetSha256: actualHash,
            comparisonArtifact: failArtifact,
            comparisonResult: 'FAIL',
            changedPaths: ['authorship.reviewStatus'],
            deltaSummary: 'Comparison detected unresolved discrepancy',
            deltaClassification: 'metadata_only',
            pedagogicalContentIntegrity: true,
            authorizedBy: 'PBL Independent Reviewer',
            authorizedAt: '2026-09-07T12:00:00Z',
            reviewedVersionFile: reviewedFile,
          },
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/(?:possui comparisonResult inválido: 'FAIL'|'FAIL' is not one of \['MATCH_VERIFIED'\])/);
  });

  it('Scenario 22: Reconciled publication with structural_formatting_only but real semantic difference fails fail-closed (RGO-002)', async () => {
    const reviewedPkg = JSON.parse(JSON.stringify(validSamplePackage));
    reviewedPkg.authorship.reviewStatus = 'draft';
    const reviewedBytes = Buffer.from(JSON.stringify(reviewedPkg, null, 2), 'utf8');
    const oldReviewedHash = sha256(reviewedBytes);

    const reviewedFile = path.join(tempDir, 'COMP-A00-G02-01_reviewed.json');
    await writeFile(reviewedFile, reviewedBytes);

    // Target package actually changed reviewStatus, but claimed structural_formatting_only!
    const targetPkg = JSON.parse(JSON.stringify(reviewedPkg));
    targetPkg.authorship.reviewStatus = 'homologated';

    const targetBytes = Buffer.from(JSON.stringify(targetPkg, null, 2), 'utf8');
    const actualHash = sha256(targetBytes);
    await writeFile(path.join(packagesDir, 'COMP-A00-G02-01.json'), targetBytes);

    await writeFile(
      path.join(reviewsDir, 'COMP-A00-G02-01_review.md'),
      `# Relatório\nHash: ${oldReviewedHash}\n`,
      'utf8'
    );

    const formattingArtifact = path.join(tempDir, 'formatting_reconciliation.json');
    await writeFile(
      formattingArtifact,
      JSON.stringify({
        schemaVersion: 'pbl-reconciliation/1.0.0',
        competencyRef: 'COMP-A00-G02-01',
        packageId: 'PKG-COMP-A00-G02-01',
        reviewedSha256: oldReviewedHash,
        targetSha256: actualHash,
        comparisonArtifact: formattingArtifact,
        comparisonResult: 'MATCH_VERIFIED',
        changedPaths: [],
        deltaSummary: 'Claimed only whitespace or formatting changed',
        deltaClassification: 'structural_formatting_only',
        pedagogicalContentIntegrity: true,
        authorizedBy: 'PBL Independent Reviewer',
        authorizedAt: '2026-09-07T12:00:00Z',
        reviewedVersionFile: reviewedFile,
      }, null, 2),
      'utf8'
    );

    const ledger = {
      packages: [
        makeLedgerEntry({
          reviewedSha256: actualHash,
          preApprovalSha256: oldReviewedHash,
          reconciliation: {
            reviewedSha256: oldReviewedHash,
            targetSha256: actualHash,
            comparisonArtifact: formattingArtifact,
            comparisonResult: 'MATCH_VERIFIED',
            changedPaths: [],
            deltaSummary: 'Claimed only whitespace or formatting changed',
            deltaClassification: 'structural_formatting_only',
            pedagogicalContentIntegrity: true,
            authorizedBy: 'PBL Independent Reviewer',
            authorizedAt: '2026-09-07T12:00:00Z',
            reviewedVersionFile: reviewedFile,
          },
        }),
      ],
    };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

    await expect(
      publishPackages({
        ledgerPath,
        packagesDir,
        reviewsDir,
        targetFile,
        batch: ['COMP-A00-G02-01'],
      })
    ).rejects.toThrow(/declarou 'structural_formatting_only', mas há diferenças semânticas reais/);
  });
});
