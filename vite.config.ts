import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути — чтобы сборка работала на GitHub Pages в подкаталоге
  base: './',
  server: {
    host: true,
    port: 5173,
  },
});
