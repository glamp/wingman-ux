const fs = require('fs');
const path = require('path');

// Since we don't have image processing libraries installed,
// we'll use the same image for all sizes temporarily
// In production, you'd want to use sharp or jimp to properly resize

const sourceIcon = path.join(__dirname, '..', '..', '..', 'wingman.png');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
fs.mkdirSync(iconsDir, { recursive: true });

// Read the source icon
const iconBuffer = fs.readFileSync(sourceIcon);

// Create copies for each size (not resized, just copied for now)
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const destPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(destPath, iconBuffer);
  console.log(`Created ${destPath} (using original size)`);
});

console.log('\nNote: Icons are using the original image size.');
console.log('For production, install sharp or jimp to properly resize icons.');