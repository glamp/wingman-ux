import { createCanvas, loadImage } from 'canvas';
import type { WingmanAnnotation } from '@wingman/shared';

export class ImageProcessor {
  /**
   * Generate an annotated screenshot with bounding box overlay
   * This mirrors the rendering logic from ScreenshotViewer.tsx in preview-ui
   */
  async generateAnnotatedScreenshot(annotation: WingmanAnnotation): Promise<Buffer> {
    // Load the base screenshot from data URL
    const img = await loadImage(annotation.media.screenshot.dataUrl);
    
    // Account for device pixel ratio
    const dpr = annotation.page.viewport.dpr || 1;
    const viewportWidth = img.naturalWidth / dpr;
    const viewportHeight = img.naturalHeight / dpr;
    
    // Use same scaling logic as preview UI
    const maxDisplayWidth = 800;
    const scale = Math.min(maxDisplayWidth / viewportWidth, 1);
    
    const displayWidth = Math.floor(viewportWidth * scale);
    const displayHeight = Math.floor(viewportHeight * scale);
    
    // Create canvas with display dimensions
    const canvas = createCanvas(displayWidth, displayHeight);
    const ctx = canvas.getContext('2d');
    
    // Draw the screenshot scaled to fit canvas
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    
    // Get target rectangle and apply scaling
    const { rect } = annotation.target;
    const scaledRect = {
      x: rect.x * scale,
      y: rect.y * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    };
    
    // Semi-transparent overlay over entire image
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // Clear the target area (make it visible)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height);
    
    // Reset composite operation and draw target border
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height);
    
    // Add a solid white border inside
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(
      scaledRect.x + 1,
      scaledRect.y + 1,
      scaledRect.width - 2,
      scaledRect.height - 2
    );
    
    // Add corner markers
    const markerSize = 8;
    ctx.fillStyle = '#ff4444';
    
    // Top-left corner
    ctx.fillRect(
      scaledRect.x - markerSize / 2,
      scaledRect.y - markerSize / 2,
      markerSize,
      markerSize
    );
    
    // Top-right corner
    ctx.fillRect(
      scaledRect.x + scaledRect.width - markerSize / 2,
      scaledRect.y - markerSize / 2,
      markerSize,
      markerSize
    );
    
    // Bottom-left corner
    ctx.fillRect(
      scaledRect.x - markerSize / 2,
      scaledRect.y + scaledRect.height - markerSize / 2,
      markerSize,
      markerSize
    );
    
    // Bottom-right corner
    ctx.fillRect(
      scaledRect.x + scaledRect.width - markerSize / 2,
      scaledRect.y + scaledRect.height - markerSize / 2,
      markerSize,
      markerSize
    );
    
    // Return PNG buffer
    return canvas.toBuffer('image/png');
  }
}