import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Keep this boundary aligned with .gitignore and .gitattributes: detailed
// documentation remains local, while the root README accompanies the product.
export function isLocalDocumentation(relativePath) {
  const file = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  return file === 'docs' || file.startsWith('docs/')
    || (file.endsWith('.md') && file !== 'README.md')
    || file === 'AI_STUDIO_SYSTEM_INSTRUCTIONS_2026-09-12.txt';
}

export function listProductDeliveryFiles(directory = process.cwd()) {
  const root = path.resolve(directory);
  try {
    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (path.resolve(gitRoot) !== root) throw new Error('Different Git root');
    const candidates = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: root, encoding: 'utf8',
    }).split('\0');
    const files = [...new Set(candidates.filter(file => file && !isLocalDocumentation(file)
      && fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile()))];
    return { files, mode: 'git-candidates' };
  } catch {
    // Imported source archives need no Git metadata. Ignore the same local
    // documentation even if an importer copied it beside the delivered code.
    const ignored = new Set(['.git', 'node_modules', 'dist', 'server-dist', 'release', 'coverage', '.vite', '.firebase', '.auditorias', 'playwright-report', 'test-results', 'scratch', 'qa']);
    const walk = relative => fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
      if (ignored.has(entry.name) || entry.name.startsWith('.tmp-') || entry.name.endsWith('.log')) return [];
      const file = path.posix.join(relative, entry.name);
      if (isLocalDocumentation(file)) return [];
      return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
    });
    return { files: walk(''), mode: 'source-archive' };
  }
}
