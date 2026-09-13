import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          // Keep expensive libraries out of the application entry. Chunks
          // referenced only by lazy study tools (charts/AI) are fetched only
          // after the learner opens that tool.
          manualChunks(id) {
            // Generated curriculum data is versioned content that only changes
            // across editorial releases. Isolating it in stable chunks keeps
            // the app entry small and lets browsers cache data across deploys
            // that only touch application code.
            if (id.includes('/src/data/') && id.endsWith('.generated.ts')) {
              if (id.includes('/src/data/pedagogicalKnowledge.part-')) return 'knowledge-parts';
              if (id.includes('/src/data/pedagogicalKnowledgeIndex.generated')) return 'knowledge-index';
              if (id.includes('/src/data/modules.generated')) return 'curriculum-modules';
              if (id.includes('/src/data/editorialFlashcards.generated')) return 'flashcards';
              if (id.includes('/src/data/pedagogicalMacroCatalog.generated')) return 'macro-catalog';
              return 'generated-data';
            }
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/node_modules/recharts/') || id.includes('/node_modules/victory-vendor/')) {
              return 'charts';
            }
            if (id.includes('/node_modules/@google/genai/')) return 'gemini';
            if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
              return 'firebase';
            }
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
      clearMocks: true,
      restoreMocks: true,
      testTimeout: 15000,
    },
  };
});
