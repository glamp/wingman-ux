#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the environment (default to production)
const env = process.env.WINGMAN_ENV || 'production';
const distDir = path.join(__dirname, '..', 'dist', env);
const outputDir = path.join(__dirname, '..', '..', 'webapp', 'public');
const outputFile = path.join(outputDir, 'wingman-chrome-extension.zip');

console.log(`📦 Packaging Chrome extension from ${env} build...`);

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error(`❌ Build directory not found: ${distDir}`);
  console.error(`   Run 'npm run build' first to create the ${env} build.`);
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Remove old zip if it exists
if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
  console.log('🗑️  Removed old extension package');
}

// Create zip file
try {
  // Create zip with contents at root level (no subdirectories)
  const zipCommand = `cd "${distDir}" && zip -r "${outputFile}" . -x "*.DS_Store" -x "__MACOSX/*"`;
  execSync(zipCommand, { stdio: 'inherit' });
  
  // Get file size
  const stats = fs.statSync(outputFile);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ Extension packaged successfully!`);
  console.log(`📁 Output: ${outputFile}`);
  console.log(`📊 Size: ${fileSizeInMB} MB`);
  
  // Create a version file with metadata
  const versionInfo = {
    version: require('../manifest.json').version,
    buildDate: new Date().toISOString(),
    environment: env,
    fileSize: stats.size,
    fileSizeMB: fileSizeInMB
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'extension-info.json'),
    JSON.stringify(versionInfo, null, 2)
  );
  
  console.log(`📄 Version info saved to extension-info.json`);
} catch (error) {
  console.error('❌ Failed to package extension:', error.message);
  process.exit(1);
}