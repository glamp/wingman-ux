#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Get the environment (default to production)
const env = process.env.WINGMAN_ENV || 'production';
const distDir = path.join(__dirname, '..', 'dist', env);
const outputDir = path.join(__dirname, '..', 'dist');

console.log(`🔐 Creating .crx file from ${env} build...`);

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

// Generate or use existing private key
const keyPath = path.join(__dirname, '..', 'extension-key.pem');
let privateKey;

if (fs.existsSync(keyPath)) {
  console.log('🔑 Using existing private key');
  privateKey = fs.readFileSync(keyPath);
} else {
  console.log('🔑 Generating new private key');
  // Generate new RSA private key
  execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });
  privateKey = fs.readFileSync(keyPath);
  console.log(`📁 Private key saved to: ${keyPath}`);
  console.log('⚠️  Keep this file secure - it\'s needed for consistent extension IDs!');
}

// Generate extension ID from public key
function generateExtensionId(privateKeyPath) {
  try {
    // Extract public key and generate extension ID
    const publicKey = execSync(`openssl rsa -in "${privateKeyPath}" -pubout -outform DER`, { encoding: 'buffer' });
    const hash = crypto.createHash('sha256').update(publicKey).digest();
    const extensionId = hash.slice(0, 16).toString('hex').split('').map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');
    return extensionId;
  } catch (error) {
    console.error('❌ Failed to generate extension ID:', error.message);
    process.exit(1);
  }
}

// Check if Chrome is available for packaging
function findChrome() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    '/usr/bin/google-chrome-stable', // Ubuntu/Linux
    '/usr/bin/google-chrome', // Some Linux distros
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows 32-bit
  ];

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

try {
  const chromePath = findChrome();

  if (!chromePath) {
    console.error('❌ Google Chrome not found. Please install Chrome or use manual packaging.');
    console.error('   Manual packaging: zip the dist folder and rename to .crx');
    process.exit(1);
  }

  console.log(`🌐 Using Chrome at: ${chromePath}`);

  // Generate extension ID
  const extensionId = generateExtensionId(keyPath);
  console.log(`🆔 Extension ID: ${extensionId}`);

  // Create .crx file using Chrome's built-in packager
  const crxPath = path.join(outputDir, `wingman-chrome-extension-${env}.crx`);

  // Remove old .crx if it exists
  if (fs.existsSync(crxPath)) {
    fs.unlinkSync(crxPath);
    console.log('🗑️  Removed old .crx file');
  }

  // Package extension
  const packCommand = `"${chromePath}" --headless --disable-gpu --pack-extension="${distDir}" --pack-extension-key="${keyPath}"`;
  execSync(packCommand, { stdio: 'inherit' });

  // Chrome creates the .crx file with a specific naming pattern
  const chromeCrxPath = `${distDir}.crx`;
  if (fs.existsSync(chromeCrxPath)) {
    // Move to our desired location
    fs.renameSync(chromeCrxPath, crxPath);
    console.log(`✅ Extension packaged as .crx successfully!`);
    console.log(`📁 Output: ${crxPath}`);

    // Get file size
    const stats = fs.statSync(crxPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);
    console.log(`📊 Size: ${fileSizeInKB} KB`);

    // Save extension metadata
    const metadata = {
      extensionId,
      version: require(path.join(distDir, 'manifest.json')).version,
      buildDate: new Date().toISOString(),
      environment: env,
      filePath: crxPath,
      fileSize: stats.size,
      fileSizeKB: fileSizeInKB
    };

    fs.writeFileSync(
      path.join(outputDir, 'extension-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`📄 Metadata saved to extension-metadata.json`);

  } else {
    console.error('❌ Failed to create .crx file - Chrome packaging failed');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Failed to create .crx file:', error.message);

  // Fallback: create a zip file with .crx extension
  console.log('📦 Falling back to ZIP-based .crx creation...');
  try {
    const crxPath = path.join(outputDir, `wingman-chrome-extension-${env}.crx`);
    const zipCommand = `cd "${distDir}" && zip -r "${crxPath}" . -x "*.DS_Store" -x "__MACOSX/*"`;
    execSync(zipCommand, { stdio: 'inherit' });

    console.log(`✅ Extension packaged as .crx (zip format) successfully!`);
    console.log(`📁 Output: ${crxPath}`);
    console.log(`⚠️  Note: This is a zip file with .crx extension - may need manual installation`);
  } catch (fallbackError) {
    console.error('❌ Fallback packaging also failed:', fallbackError.message);
    process.exit(1);
  }
}