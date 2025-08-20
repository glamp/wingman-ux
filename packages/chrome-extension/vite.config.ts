import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import hotReloadExtension from 'hot-reload-extension-vite';

// Get environment from WINGMAN_ENV or NODE_ENV, default to development
const environment = process.env.WINGMAN_ENV || process.env.NODE_ENV || 'development';
const isDev = environment === 'development';
const isStaging = environment === 'staging';
const isProd = environment === 'production';

console.log(`Building Chrome Extension for environment: ${environment}`);

// Load environment config
const configPath = resolve(__dirname, `config/${environment}.json`);
const envConfig = fs.existsSync(configPath) 
  ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  : JSON.parse(fs.readFileSync(resolve(__dirname, 'config/development.json'), 'utf-8'));

// Merge manifest files
function mergeManifests() {
  const baseManifest = JSON.parse(
    fs.readFileSync(resolve(__dirname, 'manifests/manifest.base.json'), 'utf-8')
  );
  
  // Map environment names to manifest file names
  const manifestName = environment === 'production' ? 'prod' : 
                      environment === 'development' ? 'dev' : 
                      environment;
  const envManifestPath = resolve(__dirname, `manifests/manifest.${manifestName}.json`);
  const envManifest = fs.existsSync(envManifestPath)
    ? JSON.parse(fs.readFileSync(envManifestPath, 'utf-8'))
    : {};
  
  // Add timestamp to dev version
  if (isDev) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    envManifest.version_name = `${envManifest.version_name || baseManifest.version}-${timestamp}`;
  }
  
  return { ...baseManifest, ...envManifest };
}

export default defineConfig({
  build: {
    outDir: `dist/${environment}`,
    emptyOutDir: true,
    minify: isProd,
    sourcemap: !isProd,
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
  define: {
    'process.env.WINGMAN_ENV': JSON.stringify(environment),
    '__WINGMAN_CONFIG__': JSON.stringify(envConfig),
  },
  plugins: [
    // Hot reload plugin only in development
    ...(isDev && envConfig.features?.hotReload ? [hotReloadExtension({
      log: true,
      backgroundPath: 'src/background/index.ts',
      port: 8081
    })] : []),
    {
      name: 'copy-static-files',
      writeBundle() {
        const distDir = resolve(__dirname, `dist/${environment}`);
        
        // Write merged manifest
        const manifest = mergeManifests();
        fs.writeFileSync(
          resolve(distDir, 'manifest.json'),
          JSON.stringify(manifest, null, 2)
        );
        
        // Copy popup.html
        fs.copyFileSync(
          resolve(__dirname, 'src/popup/popup.html'),
          resolve(distDir, 'popup.html')
        );
        
        // Copy CSS
        fs.copyFileSync(
          resolve(__dirname, 'src/content/content.css'),
          resolve(distDir, 'content.css')
        );
        
        // Copy icons directory - use dev icons for development
        const iconsSourceDir = isDev ? 'public/icons-dev' : 'public/icons';
        const iconsSource = resolve(__dirname, iconsSourceDir);
        const iconsDest = resolve(distDir, 'icons');
        fs.mkdirSync(iconsDest, { recursive: true });
        
        // Use dev icons if they exist, otherwise fall back to regular icons
        const actualIconsSource = fs.existsSync(iconsSource) 
          ? iconsSource 
          : resolve(__dirname, 'public/icons');
        
        // Copy all icon files
        const iconFiles = fs.readdirSync(actualIconsSource);
        iconFiles.forEach(file => {
          fs.copyFileSync(
            resolve(actualIconsSource, file),
            resolve(iconsDest, file)
          );
        });
        
        console.log(`✅ Chrome Extension built for ${environment} environment in dist/${environment}/`);
      },
    },
  ],
});