import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-static-files',
      writeBundle() {
        // Copy manifest.json
        fs.copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );
        // Copy popup.html
        fs.copyFileSync(
          resolve(__dirname, 'src/popup/popup.html'),
          resolve(__dirname, 'dist/popup.html')
        );
        // Copy CSS
        fs.copyFileSync(
          resolve(__dirname, 'src/content/content.css'),
          resolve(__dirname, 'dist/content.css')
        );
        // Copy icons directory
        const iconsSource = resolve(__dirname, 'public/icons');
        const iconsDest = resolve(__dirname, 'dist/icons');
        fs.mkdirSync(iconsDest, { recursive: true });
        
        // Copy all icon files
        const iconFiles = fs.readdirSync(iconsSource);
        iconFiles.forEach(file => {
          fs.copyFileSync(
            resolve(iconsSource, file),
            resolve(iconsDest, file)
          );
        });
      },
    },
  ],
});