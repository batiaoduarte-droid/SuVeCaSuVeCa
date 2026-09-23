import { build } from 'esbuild';
await build({ entryPoints: ['server.ts'], bundle: true, platform: 'node', target: 'node20', format: 'cjs', packages: 'external', outfile: 'server-dist/server.cjs', sourcemap: false, banner: { js: "process.env.NODE_ENV ??= 'production';" } });
