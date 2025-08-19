import { CenterFocusStrong, ZoomIn, ZoomOut } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import type { WingmanAnnotation } from '@wingman/shared';
import { useEffect, useRef, useState } from 'react';
import { applyExpansion, getExpansionRecommendation } from '../utils/selectorParser';

interface ScreenshotViewerProps {
  annotation: WingmanAnnotation;
}

function ScreenshotViewer({ annotation }: ScreenshotViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();

    img.onload = () => {
      console.log('Screenshot image loaded successfully', {
        width: img.naturalWidth,
        height: img.naturalHeight,
        src: img.src.substring(0, 50) + '...',
      });
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      setImageError(null);

      // Account for device pixel ratio when calculating scale
      const dpr = annotation.page.viewport.dpr || 1;
      const viewportWidth = img.naturalWidth / dpr;
      const viewportHeight = img.naturalHeight / dpr;
      
      // Use a simple max width approach for consistent sizing
      const maxDisplayWidth = 800;
      const scale = Math.min(maxDisplayWidth / viewportWidth, 1); // Only scale down, never up

      const displayWidth = viewportWidth * scale;
      const displayHeight = viewportHeight * scale;

      // Set canvas size to display size
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the screenshot scaled to fit canvas
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Draw target rectangle overlay with scaled coordinates
      const { rect, selector } = annotation.target;

      // Use smart detection to expand rectangle if needed
      let adjustedRect = { ...rect };

      if (selector) {
        const recommendation = getExpansionRecommendation(selector, rect);
        adjustedRect = applyExpansion(rect, recommendation);

        // Log expansion for debugging
        if (recommendation.shouldExpand) {
          console.log('Smart expansion applied:', {
            pattern: recommendation.pattern,
            confidence: recommendation.confidence,
            original: rect,
            expanded: adjustedRect,
          });
        }
      }

      const scaledRect = {
        x: adjustedRect.x * scale,
        y: adjustedRect.y * scale,
        width: adjustedRect.width * scale,
        height: adjustedRect.height * scale,
      };

      console.log('Target rectangle scaling:', {
        originalRect: rect,
        dpr: dpr,
        viewportSize: { width: viewportWidth, height: viewportHeight },
        scale: scale,
        scaledRect: scaledRect,
        canvasSize: { width: canvas.width, height: canvas.height },
      });

      // Semi-transparent overlay over entire image
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear the target area (make it visible)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height);

      // Reset composite operation and draw target border
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height);

      // Add a solid border inside
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
    };

    img.onerror = () => {
      setImageLoaded(false);
      setImageError('Failed to load screenshot image');
    };

    img.src = annotation.media.screenshot.dataUrl;
  }, [annotation]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.5, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const canvasStyle = {
    transform: `scale(${zoom})`,
    transformOrigin: '0 0',
    height: 'auto',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
  };

  if (imageError) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error.main">{imageError}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, fontSize: '0.875rem' }}>
          Data URL length: {annotation.media.screenshot.dataUrl.length} bytes
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {!imageLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10,
            borderRadius: 1,
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <Typography>Loading screenshot...</Typography>
            <Typography variant="caption">
              Image size: {annotation.media.screenshot.dataUrl.length} bytes
            </Typography>
          </Box>
        </Box>
      )}

      {/* Zoom Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          display: 'flex',
          gap: 0.5,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          boxShadow: 2,
        }}
      >
        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={handleZoomIn}>
            <ZoomIn />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset Zoom">
          <IconButton size="small" onClick={handleResetZoom}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <ZoomOut />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Zoom Level Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 1,
          backgroundColor: 'background.paper',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          {Math.round(zoom * 100)}%
        </Typography>
      </Box>

      {/* Canvas Container */}
      <Box
        ref={containerRef}
        sx={{
          overflow: 'auto',
          maxHeight: '70vh',
          position: 'relative',
          paddingTop: '56px', // Space for zoom controls
        }}
      >
        <canvas ref={canvasRef} style={canvasStyle} />
      </Box>

      {/* Info Panel */}
      <Box
        sx={{
          mt: 1,
          p: 1,
          backgroundColor: 'action.hover',
          borderRadius: 1,
          fontSize: '0.75rem',
        }}
      >
        <Typography variant="caption" sx={{ display: 'block' }}>
          <strong>Image:</strong> {imageDimensions.width}×{imageDimensions.height}px
        </Typography>
        <Typography variant="caption" sx={{ display: 'block' }}>
          <strong>Target:</strong> {annotation.target.rect.width}×{annotation.target.rect.height}px
          at ({annotation.target.rect.x}, {annotation.target.rect.y})
        </Typography>
        {annotation.target.selector && (
          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
            <strong>Selector:</strong> {annotation.target.selector}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default ScreenshotViewer;
