// Simple script to create placeholder icons
const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const svgIcon = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#0084ff" rx="24"/>
  <text x="64" y="80" text-anchor="middle" font-family="Arial" font-size="64" font-weight="bold" fill="white">W</text>
</svg>`;

// Convert SVG to data URL for creating PNG placeholders
const sizes = [16, 48, 128];

sizes.forEach(size => {
  // For now, we'll just copy the SVG as placeholder
  // In production, you'd want to properly convert to PNG
  const placeholder = `<!-- Placeholder icon ${size}x${size} - Replace with actual PNG -->
${svgIcon}`;
  
  fs.writeFileSync(
    path.join(__dirname, `public/icons/icon${size}.png`),
    placeholder
  );
});

console.log('Placeholder icons created. Replace with actual PNG icons for production.');