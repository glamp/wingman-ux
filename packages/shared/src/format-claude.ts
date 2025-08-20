import type { WingmanAnnotation } from './types';

/**
 * Formats a Wingman annotation as markdown for Claude Code
 * This is shared between the Chrome extension and preview UI
 */
export function formatAnnotationForClaude(annotation: WingmanAnnotation): string {
  let output = `# Wingman Annotation\n\n`;

  // Basic Info
  output += `**Annotation ID:** ${annotation.id}\n`;
  output += `**Created:** ${new Date(annotation.createdAt).toLocaleString()}\n`;
  output += `**Page:** ${annotation.page.title}\n`;
  output += `**URL:** ${annotation.page.url}\n\n`;

  // User Note
  if (annotation.note) {
    output += `## User Note\n${annotation.note}\n\n`;
  }

  // Target Information
  output += `## Target Information\n`;
  output += `- **Mode:** ${annotation.target.mode}\n`;
  output += `- **Position:** ${annotation.target.rect.width}×${annotation.target.rect.height} at (${annotation.target.rect.x}, ${annotation.target.rect.y})\n`;
  if (annotation.target.selector) {
    output += `- **CSS Selector:** \`${annotation.target.selector}\`\n`;
  }
  output += '\n';

  // React Information
  if (annotation.react) {
    output += `## React Component\n`;
    if (annotation.react.componentName) {
      output += `- **Component:** ${annotation.react.componentName}\n`;
    }
    output += `- **Data Source:** ${annotation.react.obtainedVia}\n`;

    if (annotation.react.props) {
      output += `- **Props:**\n\`\`\`json\n${JSON.stringify(annotation.react.props, null, 2)}\n\`\`\`\n`;
    }

    if (annotation.react.state) {
      output += `- **State:**\n\`\`\`json\n${JSON.stringify(annotation.react.state, null, 2)}\n\`\`\`\n`;
    }
    output += '\n';
  }

  // Console Logs
  if (annotation.console && annotation.console.length > 0) {
    output += `## Console Logs (${annotation.console.length})\n`;
    annotation.console.forEach((log, index) => {
      const timestamp = new Date(log.ts).toLocaleTimeString();
      const level = log.level.toUpperCase();
      const args = log.args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ');

      output += `${index + 1}. **[${level}]** ${timestamp}\n   ${args}\n\n`;
    });
  }

  // Network Requests
  if (annotation.network && annotation.network.length > 0) {
    output += `## Network Requests (${annotation.network.length})\n`;
    annotation.network.forEach((request, index) => {
      output += `${index + 1}. **${request.url}**\n`;
      if (request.status) output += `   - Status: ${request.status}\n`;
      if (request.duration) output += `   - Duration: ${request.duration}ms\n`;
      if (request.initiatorType) output += `   - Type: ${request.initiatorType}\n`;
      output += '\n';
    });
  }

  // JavaScript Errors
  if (annotation.errors && annotation.errors.length > 0) {
    output += `## JavaScript Errors (${annotation.errors.length})\n`;
    annotation.errors.forEach((error, index) => {
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
  output += `- **User Agent:** ${annotation.page.ua}\n`;
  output += `- **Viewport:** ${annotation.page.viewport.w}×${annotation.page.viewport.h} (DPR: ${annotation.page.viewport.dpr})\n\n`;

  // Reference the screenshot via URL
  output += `## Screenshot\n\n`;
  output += `![Wingman Screenshot](http://localhost:8787/annotations/${annotation.id}/screenshot)\n\n`;

  return output;
}