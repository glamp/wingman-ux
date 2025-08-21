const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Build the CLI with all dependencies bundled
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/index.js',
    format: 'cjs',
    external: [
      // Keep these as external since they have native bindings
      'canvas',
      'bufferutil',
      'utf-8-validate'
    ],
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    minify: false, // Keep readable for debugging
    sourcemap: false,
    metafile: true,
    logLevel: 'info'
  });

  // Make the output file executable
  fs.chmodSync('dist/index.js', '755');
  
  console.log('✅ CLI build complete');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});