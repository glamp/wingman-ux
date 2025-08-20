#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Try to load canvas library if available
let createCanvas, loadImage;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
  loadImage = canvas.loadImage;
} catch (e) {
  // Canvas not available, will use fallback
}

// This script adds a green "DEV" badge to the existing icons for development builds

async function addDevBadge(inputPath, outputPath, size) {
  try {
    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Load and draw original icon
    const image = await loadImage(inputPath);
    ctx.drawImage(image, 0, 0, size, size);
    
    // Add semi-transparent green overlay for visual distinction
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fillRect(0, 0, size, size);
    
    // Add "DEV" badge in corner for larger icons
    if (size >= 48) {
      const badgeSize = Math.floor(size * 0.4);
      const badgeX = size - badgeSize - 2;
      const badgeY = size - badgeSize - 2;
      
      // Badge background
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize * 0.6, 3);
      ctx.fill();
      
      // Badge text
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.floor(badgeSize * 0.4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DEV', badgeX + badgeSize / 2, badgeY + badgeSize * 0.3);
    }
    
    // Save the modified image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Created dev icon: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to create dev icon ${outputPath}:`, error.message);
    // If canvas library is not available, just copy the original
    fs.copyFileSync(inputPath, outputPath);
    console.log(`📋 Copied original icon to: ${outputPath}`);
  }
}

async function createDevIcons() {
  const iconsDir = path.join(__dirname, '../public/icons');
  const devIconsDir = path.join(__dirname, '../public/icons-dev');
  
  // Create dev icons directory
  if (!fs.existsSync(devIconsDir)) {
    fs.mkdirSync(devIconsDir, { recursive: true });
  }
  
  // Icon sizes
  const sizes = [
    { file: 'icon16.png', size: 16 },
    { file: 'icon48.png', size: 48 },
    { file: 'icon128.png', size: 128 }
  ];
  
  // Check if we have the canvas library
  const canvasAvailable = !!(createCanvas && loadImage);
  
  if (!canvasAvailable) {
    console.log('⚠️  Canvas library not available. Install with: npm install canvas');
    console.log('   Dev icons will be copies of production icons.');
  }
  
  // Process each icon
  for (const { file, size } of sizes) {
    const inputPath = path.join(iconsDir, file);
    const outputPath = path.join(devIconsDir, file);
    
    if (fs.existsSync(inputPath)) {
      if (canvasAvailable) {
        await addDevBadge(inputPath, outputPath, size);
      } else {
        // Just copy if canvas is not available
        fs.copyFileSync(inputPath, outputPath);
        console.log(`📋 Copied ${file} to dev icons`);
      }
    } else {
      console.log(`⚠️  Source icon not found: ${inputPath}`);
    }
  }
  
  // Copy logo as well
  const logoPath = path.join(iconsDir, 'logo.png');
  if (fs.existsSync(logoPath)) {
    fs.copyFileSync(logoPath, path.join(devIconsDir, 'logo.png'));
    console.log('📋 Copied logo.png to dev icons');
  }
  
  console.log('\n✅ Dev icons created successfully!');
  if (!canvasAvailable) {
    console.log('💡 To add visual DEV badges, install canvas: npm install canvas');
  }
}

// Run the script
createDevIcons().catch(console.error);