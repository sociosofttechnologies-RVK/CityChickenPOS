import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development (npm run dev) the page is served by Vite and the XML
// requests are passed on to server.js, which must be running too.
export default defineConfig({
  plugins: [react()],
  // Fixed file names, so each rebuild replaces the same files in dist/assets.
  // es2015 output so the TV screen also runs in older smart-TV browsers.
  build: { target: 'es2015', rollupOptions: { output: { entryFileNames: 'assets/index.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' } } },
  server: { proxy: { '/api': 'http://127.0.0.1:4310', '/product-images': 'http://127.0.0.1:4310', '/tv-media': 'http://127.0.0.1:4310' } },
});
