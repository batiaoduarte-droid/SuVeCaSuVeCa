import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { PBLTutorQuestionContext } from '../../../types/pblTutor';

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

  public async getTutorQuestionContext(questionRef: string): Promise<PBLTutorQuestionContext | null> {
    await this.initialize();
    const manifest = this.manifest!;

    // 1. Check if we already know which shard owns this questionRef
    const knownShard = this.questionToShardMap.get(questionRef);
    if (knownShard) {
      const shardMap = await this.loadShard(knownShard);
      return shardMap.get(questionRef) || null;
    }

    // 2. Identify candidate shards by range: firstQuestionRef <= questionRef <= lastQuestionRef
    // Note: If questionRef falls exactly in range, test candidate shard
    const candidateShards = manifest.shards.filter(
      (s) => questionRef >= s.firstQuestionRef && questionRef <= s.lastQuestionRef
    );

    for (const descriptor of candidateShards) {
      const shardMap = await this.loadShard(descriptor);
      const found = shardMap.get(questionRef);
      if (found) return found;
    }

    // 3. Fallback: If not found in range (rare edge case), search remaining shards
    for (const descriptor of manifest.shards) {
      if (candidateShards.includes(descriptor)) continue;
      const shardMap = await this.loadShard(descriptor);
      const found = shardMap.get(questionRef);
      if (found) return found;
    }

    return null;
  }

  /**
   * Sanitizes question context for the student / frontend if needed,
   * redacting direct answers when an attempt is in progress or on reserved questions.
   */
  public filterTutorContextForStudent(
    context: PBLTutorQuestionContext,
    options?: { hideAnswer?: boolean }
  ): PBLTutorQuestionContext {
    if (!options?.hideAnswer) return context;

    return {
      ...context,
      presentation: {
        ...context.presentation,
        officialAnswer: 'REDACTED',
      },
      officialCommentary: undefined,
      objectiveOptionAnalyses: context.objectiveOptionAnalyses?.map((opt) => ({
        ...opt,
        isCorrect: false,
        refutation: options.hideAnswer ? 'A análise estará disponível após a conclusão da etapa.' : opt.refutation,
      })),
    };
  }
}

export const pblTutorContextResolver = new PBLTutorContextResolver();
