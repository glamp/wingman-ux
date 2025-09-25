#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ChromeExtension = require('crx');

// Get the environment (default to production)
const env = process.env.WINGMAN_ENV || 'production';
const distDir = path.join(__dirname, '..', 'dist', env);
const outputDir = path.join(__dirname, '..', 'dist');
const keyPath = path.join(__dirname, '..', 'extension-key.pem');

console.log(`🔐 Creating CRX3 file from ${env} build...`);

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error(`❌ Build directory not found: ${distDir}`);
  console.error(`   Run 'npm run build' first to create the ${env} build.`);
  process.exit(1);
}

// Check if private key exists
if (!fs.existsSync(keyPath)) {
  console.error(`❌ Private key not found: ${keyPath}`);
  console.error(`   Run 'npm run create-crx:prod' first to generate the private key.`);
  process.exit(1);
}

async function createCrx3() {
  try {
    const crx = new ChromeExtension({
      privateKey: fs.readFileSync(keyPath),
      codebase: 'https://github.com/glamp/wingman-ux/releases/latest/download/wingman-chrome-extension.crx'
    });

    const crxBuffer = await crx.load(distDir).then(() => crx.pack());
    const outputPath = path.join(outputDir, `wingman-chrome-extension-${env}.crx`);

    fs.writeFileSync(outputPath, crxBuffer);

    console.log(`✅ CRX file created successfully!`);
    console.log(`📁 Output: ${outputPath}`);
    console.log(`📊 Size: ${(crxBuffer.length / 1024).toFixed(2)} KB`);

    // Generate extension ID from the private key
    const crypto = require('crypto');
    const publicKey = require('child_process').execSync(`openssl rsa -in "${keyPath}" -pubout -outform DER`, { encoding: 'buffer' });
    const hash = crypto.createHash('sha256').update(publicKey).digest();
    const extensionId = hash.slice(0, 16).toString('hex').split('').map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');
    console.log(`🆔 Extension ID: ${extensionId}`);

    return outputPath;
  } catch (error) {
    console.error('❌ Failed to create CRX file:', error.message);
    console.log('Full error:', error);
    process.exit(1);
  }
}

createCrx3();