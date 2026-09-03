import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const safeRenderer = fileURLToPath(new URL('./src/safeWebGLRenderer.js', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'kr3-safe-webgl-entry',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === './WebGLRenderer.js' && importer?.replaceAll('\\', '/').endsWith('/js/main.js')) {
          return safeRenderer;
        }
        return null;
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
