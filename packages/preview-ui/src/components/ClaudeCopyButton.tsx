import { Check, ContentCopy } from '@mui/icons-material';
import { Alert, Button, Snackbar, Tooltip } from '@mui/material';
import type { StoredAnnotation } from '@wingman/shared';
import { useState } from 'react';

interface ClaudeCopyButtonProps {
  annotation: StoredAnnotation;
}

function ClaudeCopyButton({ annotation }: ClaudeCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const formatForClaude = (annotation: StoredAnnotation): string => {
    const { annotation: data } = annotation;

    // Build formatted text for Claude
    let output = `# Wingman Annotation\n\n`;

    // Basic Info
    output += `**Annotation ID:** ${data.id}\n`;
    output += `**Created:** ${new Date(data.createdAt).toLocaleString()}\n`;
    output += `**Page:** ${data.page.title}\n`;
    output += `**URL:** ${data.page.url}\n\n`;

    // User Note
    if (data.note) {
      output += `## User Note\n${data.note}\n\n`;
    }

    // Target Information
    output += `## Target Information\n`;
    output += `- **Mode:** ${data.target.mode}\n`;
    output += `- **Position:** ${data.target.rect.width}×${data.target.rect.height} at (${data.target.rect.x}, ${data.target.rect.y})\n`;
    if (data.target.selector) {
      output += `- **CSS Selector:** \`${data.target.selector}\`\n`;
    }
    output += '\n';

    // React Information
    if (data.react) {
      output += `## React Component\n`;
      if (data.react.componentName) {
        output += `- **Component:** ${data.react.componentName}\n`;
      }
      output += `- **Data Source:** ${data.react.obtainedVia}\n`;

      if (data.react.props) {
        output += `- **Props:**\n\`\`\`json\n${JSON.stringify(data.react.props, null, 2)}\n\`\`\`\n`;
      }

      if (data.react.state) {
        output += `- **State:**\n\`\`\`json\n${JSON.stringify(data.react.state, null, 2)}\n\`\`\`\n`;
      }
      output += '\n';
    }

    // Console Logs
    if (data.console && data.console.length > 0) {
      output += `## Console Logs (${data.console.length})\n`;
      data.console.forEach((log, index) => {
        const timestamp = new Date(log.ts).toLocaleTimeString();
        const level = log.level.toUpperCase();
        const args = log.args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
          .join(' ');

        output += `${index + 1}. **[${level}]** ${timestamp}\n   ${args}\n\n`;
      });
    }

    // Network Requests
    if (data.network && data.network.length > 0) {
      output += `## Network Requests (${data.network.length})\n`;
      data.network.forEach((request, index) => {
        output += `${index + 1}. **${request.url}**\n`;
        if (request.status) output += `   - Status: ${request.status}\n`;
        if (request.duration) output += `   - Duration: ${request.duration}ms\n`;
        if (request.initiatorType) output += `   - Type: ${request.initiatorType}\n`;
        output += '\n';
      });
    }

    // JavaScript Errors
    if (data.errors && data.errors.length > 0) {
      output += `## JavaScript Errors (${data.errors.length})\n`;
      data.errors.forEach((error, index) => {
        const timestamp = new Date(error.ts).toLocaleString();
        output += `${index + 1}. **${timestamp}**\n`;
        output += `   ${error.message}\n`;
        if (error.stack) {
          output += `   \`\`\`\n   ${error.stack}\n   \`\`\`\n`;
        }
        output += '\n';
      });
    }

    // Page Context
    output += `## Page Context\n`;
    output += `- **User Agent:** ${data.page.ua}\n`;
    output += `- **Viewport:** ${data.page.viewport.w}×${data.page.viewport.h} (DPR: ${data.page.viewport.dpr})\n`;
    output += `- **Screenshot:** Attached below\n\n`;

    return output;
  };

  const handleCopy = async () => {
    try {
      const formattedText = formatForClaude(annotation);

      // Try to copy both text and image using modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          // Convert the screenshot dataURL to a blob
          const response = await fetch(annotation.annotation.media.screenshot.dataUrl);
          const imageBlob = await response.blob();

          // Create rich HTML content that includes both text and image
          const htmlContent = `
            <div>
              <pre style="white-space: pre-wrap; font-family: monospace; margin-bottom: 16px;">${formattedText}</pre>
              <img src="${annotation.annotation.media.screenshot.dataUrl}" style="max-width: 100%; border: 1px solid #ccc;" alt="Wingman Screenshot" />
            </div>
          `;

          // Create clipboard item with text, HTML, and image formats
          const clipboardItem = new ClipboardItem({
            'text/plain': new Blob([formattedText], { type: 'text/plain' }),
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'image/png': imageBlob,
          });

          await navigator.clipboard.write([clipboardItem]);

          setCopied(true);
          setShowSnackbar(true);
        } catch (clipboardError) {
          console.warn('Failed to copy image, falling back to text-only:', clipboardError);

          // Fallback to text-only copy
          await navigator.clipboard.writeText(
            formattedText +
              '\n\n[Note: Screenshot could not be copied to clipboard, but is visible above]'
          );

          setCopied(true);
          setShowSnackbar(true);
        }
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // Fallback for browsers that don't support clipboard.write()
        await navigator.clipboard.writeText(
          formattedText +
            "\n\n[Note: Your browser doesn't support image clipboard - screenshot is visible above]"
        );

        setCopied(true);
        setShowSnackbar(true);
      } else {
        throw new Error('Clipboard API not supported');
      }

      // Reset the copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setShowSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  return (
    <>
      <Tooltip
        title={
          copied
            ? 'Copied to clipboard!'
            : 'Copy annotation for Claude Code (includes text and screenshot image)'
        }
      >
        <Button
          variant="contained"
          startIcon={copied ? <Check /> : <ContentCopy />}
          onClick={handleCopy}
          color={copied ? 'success' : 'primary'}
          sx={{
            minWidth: '200px',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {copied ? 'Copied!' : 'Copy for Claude Code'}
        </Button>
      </Tooltip>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={copied ? 'success' : 'error'}
          variant="filled"
        >
          {copied
            ? 'Annotation and screenshot copied to clipboard! You can now paste both into Claude Code.'
            : 'Failed to copy annotation. Please try again.'}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ClaudeCopyButton;
