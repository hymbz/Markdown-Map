import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

import { solidSvg } from './src/rollup-solid-svg';

export default defineConfig({
  plugins: [solidSvg(), solidPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: { target: 'esnext' },
});
