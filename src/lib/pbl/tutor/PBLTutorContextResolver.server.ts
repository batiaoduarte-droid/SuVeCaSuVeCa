import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { PBLTutorQuestionContext, PBLTutorCompetencyVariant } from '../../../types/pblTutor';

interface ShardDescriptor {
  part: number;
  file: string;
  recordCount: number;
  bytes: number;
  sha256: string;
  firstQuestionRef: string;
  lastQuestionRef: string;
}

interface AuditedCorrection {
  questionRef: string;
  label: string;
  rule: string;
  reason: string;
  originalRefutation: string;
  correctedRefutation: string;
}

interface PBLTutorManifest {
  schemaVersion: string;
  kind: string;
  generatedAt: string;
  policy: string;
  totalCompetencies: number;
  totalQuestions: number;
  maximumShardBytes: number;
  auditedCorrections: AuditedCorrection[];
  shards: ShardDescriptor[];
}

const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');

const fileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const knowledgeCandidates = () => {
  const cwd = process.cwd();
  const executableDirectory = path.dirname(path.resolve(process.argv[1] || '.'));
  const entries = [
    ...(process.env.SUVECA_KNOWLEDGE_DIR
      ? [{ directory: path.resolve(process.env.SUVECA_KNOWLEDGE_DIR), label: 'configured/knowledge' }]
      : []),
    { directory: path.join(cwd, 'public', 'knowledge'), label: 'public/knowledge' },
    { directory: path.join(cwd, 'dist', 'knowledge'), label: 'dist/knowledge' },
    { directory: path.join(cwd, 'applet', 'public', 'knowledge'), label: 'applet/public/knowledge' },
    { directory: path.join(cwd, 'applet', 'dist', 'knowledge'), label: 'applet/dist/knowledge' },
    { directory: path.join(executableDirectory, 'knowledge'), label: 'runtime/knowledge' },
    { directory: path.resolve(executableDirectory, '..', 'public', 'knowledge'), label: 'runtime/../public/knowledge' },
    { directory: path.resolve(executableDirectory, '..', 'dist', 'knowledge'), label: 'runtime/../dist/knowledge' },
  ];
  return entries.filter(
    (entry, index) => entries.findIndex((candidate) => candidate.directory === entry.directory) === index
  );
};

class PBLTutorContextResolver {
  private baseDirectory: string | null = null;
  private manifest: PBLTutorManifest | null = null;
  private questionToShardMap = new Map<string, ShardDescriptor>();
  private loadedShards = new Map<number, Map<string, PBLTutorQuestionContext>>();
  private initPromise: Promise<void> | null = null;

  private async resolveTutorDirectory(): Promise<string> {
    if (this.baseDirectory) return this.baseDirectory;

    const checked: string[] = [];
    for (const candidate of knowledgeCandidates()) {
      const tutorDir = path.join(candidate.directory, 'pbl', 'tutor');
      const manifestPath = path.join(tutorDir, 'pbl_tutor_manifest.json');
      checked.push(manifestPath);
      if (await fileExists(manifestPath)) {
        this.baseDirectory = tutorDir;
        return tutorDir;
      }
    }
    throw new Error(
      `Manifest do tutor PBL indisponível. Locais verificados: ${checked.join(', ')}.`
    );
  }

  private async initialize(): Promise<void> {
    if (this.manifest) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const tutorDir = await this.resolveTutorDirectory();
      const manifestPath = path.join(tutorDir, 'pbl_tutor_manifest.json');
      const rawManifest = await readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(rawManifest) as PBLTutorManifest;
      this.manifest = manifest;

      // Index questions to shards.
      // We can scan or load shards on demand. Because questionRefs in shards are lexicographically ordered:
      // shard.firstQuestionRef <= questionRef <= shard.lastQuestionRef.
    })();

    return this.initPromise;
  }

  private safePath(relativeFile: string): string {
    if (!this.baseDirectory) throw new Error('Diretório base do tutor não inicializado.');
    const resolved = path.resolve(this.baseDirectory, relativeFile);
    if (!resolved.startsWith(`${path.resolve(this.baseDirectory)}${path.sep}`)) {
      throw new Error(`Caminho de shard inválido: ${relativeFile}`);
    }
    return resolved;
  }

  private async loadShard(descriptor: ShardDescriptor): Promise<Map<string, PBLTutorQuestionContext>> {
    const cached = this.loadedShards.get(descriptor.part);
    if (cached) return cached;

    const filePath = this.safePath(descriptor.file);
    const buffer = await readFile(filePath);
    if (buffer.length !== descriptor.bytes) {
      throw new Error(`Tamanho divergente no shard do tutor: ${descriptor.file}`);
    }
    if (sha256(buffer) !== descriptor.sha256) {
      throw new Error(`SHA-256 divergente no shard do tutor: ${descriptor.file}`);
    }

    const raw = JSON.parse(buffer.toString('utf8')) as Record<string, PBLTutorQuestionContext>;
    const map = new Map<string, PBLTutorQuestionContext>();
    for (const [key, val] of Object.entries(raw)) {
      if (val.criteria && val.pedagogy && !val.pedagogy.rules) {
        val.pedagogy.rules = val.criteria.rules;
        val.pedagogy.procedures = val.criteria.procedures;
        val.pedagogy.contrasts = val.criteria.contrasts;
      }
      map.set(key, val);
      this.questionToShardMap.set(key, descriptor);
    }

    this.loadedShards.set(descriptor.part, map);
    return map;
  }

  public async getManifest(): Promise<PBLTutorManifest> {
    await this.initialize();
    return this.manifest!;
  }

  public async getTutorQuestionContext(
    questionRef: string,
    competencyRef?: string
  ): Promise<PBLTutorQuestionContext | null> {
    await this.initialize();

    if (questionRef.includes('::')) {
      const [baseRef, explicitComp] = questionRef.split('::');
      return this.getTutorQuestionContext(baseRef, competencyRef || explicitComp);
    }

    const manifest = this.manifest!;

    // 2. Look up base question context
    let baseContext: PBLTutorQuestionContext | null = null;
    const knownShard = this.questionToShardMap.get(questionRef);
    if (knownShard) {
      const shardMap = await this.loadShard(knownShard);
      const found = shardMap.get(questionRef);
      if (found) baseContext = found;
    }

    if (!baseContext) {
      // Range check
      const candidateShards = manifest.shards.filter(
        (s) => questionRef >= s.firstQuestionRef && questionRef <= s.lastQuestionRef
      );

      for (const descriptor of candidateShards) {
        const shardMap = await this.loadShard(descriptor);
        const found = shardMap.get(questionRef);
        if (found) {
          baseContext = found;
          break;
        }
      }

      if (!baseContext) {
        for (const descriptor of manifest.shards) {
          if (candidateShards.includes(descriptor)) continue;
          const shardMap = await this.loadShard(descriptor);
          const found = shardMap.get(questionRef);
          if (found) {
            baseContext = found;
            break;
          }
        }
      }
    }

    if (!baseContext) return null;

    // 3. Competency resolution and validation
    if (competencyRef) {
      const isPrimary = baseContext.primaryCompetencyRef === competencyRef;
      const isSecondary = baseContext.competencyRefs?.includes(competencyRef);
      const hasVariant = Boolean(baseContext.competencyVariants?.[competencyRef]);
      const isUnit = baseContext.unitRefs?.includes(competencyRef);

      if (!isPrimary && !isSecondary && !hasVariant && !isUnit) {
        console.warn(
          `[PBLTutorContextResolver] Competência '${competencyRef}' não autorizada para a questão '${questionRef}'. Relação curricular inexistente.`
        );
        return null;
      }

      if (hasVariant) {
        const variant = baseContext.competencyVariants![competencyRef];
        const mergedPedagogy = {
          ...baseContext.pedagogy,
          ...(variant.pedagogy || {}),
          learningObjectives:
            variant.pedagogy?.learningObjectives && variant.pedagogy.learningObjectives.length > 0
              ? variant.pedagogy.learningObjectives
              : baseContext.pedagogy?.learningObjectives || [],
          testedConcepts:
            variant.pedagogy?.testedConcepts && variant.pedagogy.testedConcepts.length > 0
              ? variant.pedagogy.testedConcepts
              : baseContext.pedagogy?.testedConcepts || [],
          cognitiveDemand: variant.pedagogy?.cognitiveDemand || baseContext.pedagogy?.cognitiveDemand,
          difficulty: variant.pedagogy?.difficulty || baseContext.pedagogy?.difficulty,
          decisivePoint: variant.pedagogy?.decisivePoint || baseContext.pedagogy?.decisivePoint,
          commonMistake: variant.pedagogy?.commonMistake || baseContext.pedagogy?.commonMistake,
          rules: variant.pedagogy?.rules?.length ? variant.pedagogy.rules : baseContext.pedagogy?.rules,
          procedures: variant.pedagogy?.procedures?.length ? variant.pedagogy.procedures : baseContext.pedagogy?.procedures,
          contrasts: variant.pedagogy?.contrasts?.length ? variant.pedagogy.contrasts : baseContext.pedagogy?.contrasts,
          tables: variant.pedagogy?.tables?.length ? variant.pedagogy.tables : baseContext.pedagogy?.tables,
          boundaries: variant.pedagogy?.boundaries?.length ? variant.pedagogy.boundaries : baseContext.pedagogy?.boundaries,
        };

        const mergedCriteria = {
          rules: variant.criteria?.rules?.length ? variant.criteria.rules : baseContext.criteria?.rules || [],
          procedures: variant.criteria?.procedures?.length ? variant.criteria.procedures : baseContext.criteria?.procedures || [],
          contrasts: variant.criteria?.contrasts?.length ? variant.criteria.contrasts : baseContext.criteria?.contrasts || [],
          tables: variant.criteria?.tables?.length ? variant.criteria.tables : baseContext.criteria?.tables || [],
          boundaries: variant.criteria?.boundaries?.length ? variant.criteria.boundaries : baseContext.criteria?.boundaries || [],
        };

        const resolved: PBLTutorQuestionContext = {
          ...baseContext,
          primaryCompetencyRef: variant.competencyRef,
          competencyTitle: variant.competencyTitle || baseContext.competencyTitle,
          unitRefs: variant.unitRefs || baseContext.unitRefs,
          pedagogy: mergedPedagogy,
          criteria: mergedCriteria,
          solutionStrategy:
            variant.solutionStrategy && variant.solutionStrategy.length > 0
              ? variant.solutionStrategy
              : baseContext.solutionStrategy,
          objectiveOptionAnalyses:
            variant.objectiveOptionAnalyses && variant.objectiveOptionAnalyses.length > 0
              ? variant.objectiveOptionAnalyses
              : baseContext.objectiveOptionAnalyses,
        };
        return this.enrichLoadedContext(resolved);
      }

      if (isSecondary && !isPrimary) {
        // Authorized secondary competency sharing base pedagogy
        const resolved: PBLTutorQuestionContext = {
          ...baseContext,
          primaryCompetencyRef: competencyRef,
        };
        return this.enrichLoadedContext(resolved);
      }
    }

    return this.enrichLoadedContext(baseContext);
  }

  private enrichLoadedContext(context: PBLTutorQuestionContext): PBLTutorQuestionContext {
    if (context.criteria?.rules && (!context.pedagogy?.rules || context.pedagogy.rules.length === 0)) {
      return {
        ...context,
        pedagogy: {
          ...context.pedagogy,
          rules: context.criteria.rules,
          procedures: context.criteria.procedures,
          contrasts: context.criteria.contrasts,
        },
      };
    }
    return context;
  }

  /**
   * Sanitizes question context for the student / frontend if needed,
   * redacting direct answers, worked examples, decisive points and option analyses
   * across base context and all competency variants when an attempt is in progress.
   */
  public filterTutorContextForStudent(
    context: PBLTutorQuestionContext,
    options?: { hideAnswer?: boolean }
  ): PBLTutorQuestionContext {
    if (!options?.hideAnswer) return context;

    const sanitizedVariants: Record<string, PBLTutorCompetencyVariant> | undefined = context.competencyVariants
      ? Object.fromEntries(
          Object.entries(context.competencyVariants).map(([key, v]) => [
            key,
            {
              ...v,
              solutionStrategy: undefined,
              pedagogy: v.pedagogy
                ? {
                    ...v.pedagogy,
                    decisivePoint: undefined,
                    commonMistake: undefined,
                  }
                : undefined,
              objectiveOptionAnalyses: v.objectiveOptionAnalyses?.map((opt) => ({
                ...opt,
                isCorrect: false,
                refutation: 'A análise estará disponível após a conclusão da etapa.',
              })),
            },
          ])
        )
      : undefined;

    return {
      ...context,
      presentation: {
        ...context.presentation,
        officialAnswer: 'REDACTED',
      },
      officialCommentary: undefined,
      solutionStrategy: undefined,
      pedagogy: context.pedagogy
        ? {
            ...context.pedagogy,
            decisivePoint: undefined,
            commonMistake: undefined,
          }
        : undefined,
      objectiveOptionAnalyses: context.objectiveOptionAnalyses?.map((opt) => ({
        ...opt,
        isCorrect: false,
        refutation: 'A análise estará disponível após a conclusão da etapa.',
      })),
      competencyVariants: sanitizedVariants,
    };
  }
}

export const pblTutorContextResolver = new PBLTutorContextResolver();
