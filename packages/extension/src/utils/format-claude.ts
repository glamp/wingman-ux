import type { WingmanAnnotation } from './types';

/**
 * IMPORTANT: This function mirrors the optimized template from packages/shared/src/templates/default.template.ts
 * 
 * This duplication is INTENTIONAL and NECESSARY because:
 * - Chrome content scripts cannot use ES modules (no import/export)
 * - Content scripts must be self-contained bundles without external imports
 * - This file is used by content script components (SuccessNotification)
 * 
 * If you modify the template, you MUST also update this function to match:
 * - packages/shared/src/templates/default.template.ts (the canonical template)
 * 
 * Background scripts use the template engine directly via the shared package.
 * This function should produce the same output as the optimized template.
 * 
 * Formats a Wingman annotation as markdown for Claude Code using the optimized template format
 */
export function formatAnnotationForClaude(annotation: WingmanAnnotation): string {
  let output = `# 🎯 UI Feedback Request\n\n`;

  // MOST IMPORTANT: User's feedback at the very top
  if (annotation.note) {
    output += `## 📝 User Feedback\n\n`;
    output += `> **${annotation.note}**\n\n`;
    output += `---\n\n`;
  }

  // Claude 2025 vision optimized: Image first with URL
  output += `![Screenshot](http://localhost:8787/annotations/${annotation.id}/screenshot)\n\n`;

  // Visual context about the selected area
  output += `## 🎨 Visual Context\n\n`;
  if (annotation.target.rect) {
    output += `- **Selected Area:** ${annotation.target.rect.width}×${annotation.target.rect.height} pixels`;
    output += ` at position (${annotation.target.rect.x}, ${annotation.target.rect.y})\n`;
  }
  output += `- **Selection Mode:** ${annotation.target.mode === 'element' ? 'Specific Element' : 'Region Selection'}\n`;
  if (annotation.target.selector) {
    output += `- **CSS Selector:** \`${annotation.target.selector}\`\n`;
  }
  output += '\n---\n\n';

  // Page information for context
  output += `## 📍 Page Information\n\n`;
  output += `- **URL:** ${annotation.page.url}\n`;
  output += `- **Title:** ${annotation.page.title}\n`;
  output += `- **Viewport:** ${annotation.page.viewport.w}×${annotation.page.viewport.h} (DPR: ${annotation.page.viewport.dpr})\n`;
  output += `- **Captured:** ${new Date(annotation.createdAt).toLocaleString()}\n`;
  output += '\n';

  // Technical details in collapsible sections
  output += `## 🔧 Technical Details\n\n`;

  // React Information
  if (annotation.react) {
    output += `<details>\n<summary><strong>React Component Info</strong></summary>\n\n`;
    if (annotation.react.componentName) {
      output += `- **Component:** ${annotation.react.componentName}\n`;
    }
    output += `- **Data Source:** ${annotation.react.obtainedVia}\n`;

    if (annotation.react.props) {
      output += `\n**Props:**\n\`\`\`json\n${JSON.stringify(annotation.react.props, null, 2)}\n\`\`\`\n`;
    }

    if (annotation.react.state) {
      output += `\n**State:**\n\`\`\`json\n${JSON.stringify(annotation.react.state, null, 2)}\n\`\`\`\n`;
    }
    output += `\n</details>\n\n`;
  }

  // JavaScript Errors (show most recent entries based on config, as they're likely important)
  if (annotation.errors && annotation.errors.length > 0) {
    // Try to get template limit from config, default to showing all
    let errorEntries = annotation.errors;
    try {
      const config = (globalThis as any).__WINGMAN_CONFIG__;
      const limit = config?.dataCapture?.errors?.templateLimit;
      if (limit && errorEntries.length > limit) {
        errorEntries = errorEntries.slice(-limit);
        output += `<details open>\n<summary><strong>⚠️ JavaScript Errors (${limit} most recent of ${annotation.errors.length})</strong></summary>\n\n`;
      } else {
        output += `<details open>\n<summary><strong>⚠️ JavaScript Errors (${errorEntries.length})</strong></summary>\n\n`;
      }
    } catch {
      output += `<details open>\n<summary><strong>⚠️ JavaScript Errors (${errorEntries.length})</strong></summary>\n\n`;
    }
    
    errorEntries.forEach((error, index) => {
      const timestamp = new Date(error.ts).toLocaleTimeString();
      output += `${index + 1}. **[${timestamp}]** ${error.message}\n`;
      if (error.stack) {
        output += `\`\`\`\n${error.stack}\n\`\`\`\n`;
      }
    });
    output += `\n</details>\n\n`;
  }

  // Console Logs (show most recent entries based on config)
  if (annotation.console && annotation.console.length > 0) {
    // Try to get template limit from config, default to showing all
    let consoleEntries = annotation.console;
    try {
      const config = (globalThis as any).__WINGMAN_CONFIG__;
      const limit = config?.dataCapture?.console?.templateLimit;
      if (limit && consoleEntries.length > limit) {
        consoleEntries = consoleEntries.slice(-limit);
        output += `<details>\n<summary><strong>Console Logs (${limit} most recent of ${annotation.console.length})</strong></summary>\n\n`;
      } else {
        output += `<details>\n<summary><strong>Console Logs (${consoleEntries.length})</strong></summary>\n\n`;
      }
    } catch {
      output += `<details>\n<summary><strong>Console Logs (${consoleEntries.length})</strong></summary>\n\n`;
    }
    
    consoleEntries.forEach((log, index) => {
      const timestamp = new Date(log.ts).toLocaleTimeString();
      const level = log.level.toUpperCase();
      const args = log.args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ');

      output += `${index + 1}. **[${level}]** ${timestamp}: ${args}\n`;
    });
    output += `\n</details>\n\n`;
  }

  // Network Requests (show most recent entries based on config)
  if (annotation.network && annotation.network.length > 0) {
    // Try to get template limit from config, default to showing all
    let networkEntries = annotation.network;
    try {
      const config = (globalThis as any).__WINGMAN_CONFIG__;
      const limit = config?.dataCapture?.network?.templateLimit;
      if (limit && networkEntries.length > limit) {
        networkEntries = networkEntries.slice(-limit);
        output += `<details>\n<summary><strong>Network Activity (${limit} most recent of ${annotation.network.length} requests)</strong></summary>\n\n`;
      } else {
        output += `<details>\n<summary><strong>Network Activity (${networkEntries.length} requests)</strong></summary>\n\n`;
      }
    } catch {
      output += `<details>\n<summary><strong>Network Activity (${networkEntries.length} requests)</strong></summary>\n\n`;
    }
    
    networkEntries.forEach((request, index) => {
      output += `${index + 1}. **${request.url}**\n`;
      if (request.status) output += `   - Status: ${request.status}\n`;
      if (request.duration) output += `   - Duration: ${request.duration}ms\n`;
      if (request.initiatorType) output += `   - Type: ${request.initiatorType}\n`;
    });
    output += `\n</details>\n\n`;
  }

  // Browser Info
  output += `<details>\n<summary><strong>Browser Info</strong></summary>\n\n`;
  output += `- **User Agent:** ${annotation.page.ua}\n`;
  output += `- **Annotation ID:** ${annotation.id}\n`;
  output += `\n</details>\n\n`;

  // Action request footer
  output += `---\n\n`;
  output += `## 💡 Action Request\n\n`;
  output += `Please review the **screenshot** and **user feedback** above to understand and address the reported UI issue. `;
  output += `Focus on the visual elements shown in the screenshot and how they relate to the user's feedback.\n\n`;

  return output;
}