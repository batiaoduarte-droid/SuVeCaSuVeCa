import fs from 'node:fs';
import path from 'node:path';

const root = fs.realpathSync(process.cwd());
const target = path.resolve(root, 'dist');
if (path.dirname(target) !== root) throw new Error('Invalid build directory');
if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error('Refusing linked build directory');
fs.rmSync(target, { recursive: true, force: true });
