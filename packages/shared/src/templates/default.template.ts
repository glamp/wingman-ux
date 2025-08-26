/**
 * Default template for Claude Code formatting
 * This template mirrors the optimized format from format-claude.ts
 */

import type { AnnotationTemplate } from './types.js';

export const defaultTemplate: AnnotationTemplate = {
  id: 'default-claude-optimized',
  name: 'Claude Code Optimized',
  description: 'Optimized format for Claude Code with emphasis on user feedback and screenshot analysis',
  builtIn: true,
  tags: ['claude', 'default', 'optimized'],
  
  template: `# 🎯 UI Feedback Request

{{#if userNote}}
## 📝 User Feedback

> **{{userNote}}**

---

{{/if}}
## 🖼️ Screenshot Analysis Required

**IMPORTANT**: Please carefully examine the screenshot below to understand the visual context of the UI issue.

![Wingman Screenshot - Click to view full size]({{screenshotUrl}})

*The screenshot above shows the exact area where the user is reporting an issue.*

---

## 🎨 Visual Context

{{#if targetRect}}
- **Selected Area:** {{targetRectWidth}}×{{targetRectHeight}} pixels at position ({{targetRectX}}, {{targetRectY}})
{{/if}}
- **Selection Mode:** {{selectionModeText}}
{{#if targetSelector}}
- **CSS Selector:** \`{{targetSelector}}\`
{{/if}}

---

## 📍 Page Information

- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}
- **Viewport:** {{viewportWidth}}×{{viewportHeight}} (DPR: {{viewportDpr}})
- **Captured:** {{capturedAt}}

## 🔧 Technical Details

{{#if hasReact}}
### React Component Info

- **Component:** {{reactComponentName}}
- **Data Source:** {{reactDataSource}}

**Props:**
\`\`\`json
{{reactPropsJson}}
\`\`\`

**State:**
\`\`\`json
{{reactStateJson}}
\`\`\`

{{/if}}
{{#if hasErrors}}
### ⚠️ JavaScript Errors ({{errorCount}})

{{#each errors}}
{{index}}. **[{{timestamp}}]** {{message}}
   {{stack}}
{{/each}}

{{/if}}
{{#if hasConsole}}
### Console Logs ({{consoleCount}})

{{#each consoleLogs}}
{{index}}. **[{{level}}]** {{timestamp}}: {{args}}
{{/each}}

{{/if}}
{{#if hasNetwork}}
### Network Activity ({{networkCount}} requests)

{{#each networkRequests}}
{{index}}. **{{url}}**
   - Status: {{status}}
   - Duration: {{duration}}ms
   - Type: {{initiatorType}}
{{/each}}

{{/if}}
### Browser Info

- **User Agent:** {{userAgent}}
- **Annotation ID:** {{annotationId}}

---

## 💡 Action Request

Please review the **screenshot** and **user feedback** above to understand and address the reported UI issue. Focus on the visual elements shown in the screenshot and how they relate to the user's feedback.
`,

  variables: [
    {
      key: 'userNote',
      path: 'note',
      required: false,
      description: 'User feedback or note about the issue'
    },
    {
      key: 'screenshotUrl',
      path: 'id',
      formatter: (id: string) => `http://localhost:8787/annotations/${id}/screenshot`,
      required: true,
      description: 'URL to the screenshot image'
    },
    {
      key: 'targetRect',
      path: 'target.rect',
      required: false,
      description: 'Rectangle coordinates of selected area'
    },
    {
      key: 'targetRectWidth',
      path: 'target.rect.width',
      required: false,
      description: 'Width of selected area'
    },
    {
      key: 'targetRectHeight',
      path: 'target.rect.height',
      required: false,
      description: 'Height of selected area'
    },
    {
      key: 'targetRectX',
      path: 'target.rect.x',
      required: false,
      description: 'X coordinate of selected area'
    },
    {
      key: 'targetRectY',
      path: 'target.rect.y',
      required: false,
      description: 'Y coordinate of selected area'
    },
    {
      key: 'selectionModeText',
      path: 'target.mode',
      formatter: (mode: string) => mode === 'element' ? 'Specific Element' : 'Region Selection',
      required: true,
      description: 'Human-readable selection mode'
    },
    {
      key: 'targetSelector',
      path: 'target.selector',
      required: false,
      description: 'CSS selector for the target element'
    },
    {
      key: 'pageUrl',
      path: 'page.url',
      required: true,
      description: 'URL of the page'
    },
    {
      key: 'pageTitle',
      path: 'page.title',
      required: true,
      description: 'Title of the page'
    },
    {
      key: 'viewportWidth',
      path: 'page.viewport.w',
      required: true,
      description: 'Viewport width'
    },
    {
      key: 'viewportHeight',
      path: 'page.viewport.h',
      required: true,
      description: 'Viewport height'
    },
    {
      key: 'viewportDpr',
      path: 'page.viewport.dpr',
      required: true,
      description: 'Device pixel ratio'
    },
    {
      key: 'capturedAt',
      path: 'createdAt',
      formatter: (value: string) => new Date(value).toLocaleString(),
      required: true,
      description: 'When the annotation was captured'
    },
    {
      key: 'hasReact',
      path: 'react',
      formatter: (value: any) => String(!!value),
      required: false,
      description: 'Whether React info is available'
    },
    {
      key: 'reactComponentName',
      path: 'react.componentName',
      required: false,
      description: 'React component name'
    },
    {
      key: 'reactDataSource',
      path: 'react.obtainedVia',
      required: false,
      description: 'How React data was obtained'
    },
    {
      key: 'reactPropsJson',
      path: 'react.props',
      formatter: (value: any) => JSON.stringify(value, null, 2),
      required: false,
      description: 'React props as JSON'
    },
    {
      key: 'reactStateJson',
      path: 'react.state',
      formatter: (value: any) => JSON.stringify(value, null, 2),
      required: false,
      description: 'React state as JSON'
    },
    {
      key: 'hasErrors',
      path: 'errors',
      formatter: (value: any[]) => String(value && value.length > 0),
      required: false,
      description: 'Whether there are JavaScript errors'
    },
    {
      key: 'errorCount',
      path: 'errors',
      formatter: (value: any[]) => String(value?.length || 0),
      required: false,
      description: 'Number of JavaScript errors'
    },
    {
      key: 'errors',
      path: 'errors',
      required: false,
      description: 'JavaScript errors array'
    },
    {
      key: 'hasConsole',
      path: 'console',
      formatter: (value: any[]) => String(value && value.length > 0),
      required: false,
      description: 'Whether there are console logs'
    },
    {
      key: 'consoleCount',
      path: 'console',
      formatter: (value: any[]) => String(value?.length || 0),
      required: false,
      description: 'Number of console logs'
    },
    {
      key: 'consoleLogs',
      path: 'console',
      required: false,
      description: 'Console logs array'
    },
    {
      key: 'hasNetwork',
      path: 'network',
      formatter: (value: any[]) => String(value && value.length > 0),
      required: false,
      description: 'Whether there are network requests'
    },
    {
      key: 'networkCount',
      path: 'network',
      formatter: (value: any[]) => String(value?.length || 0),
      required: false,
      description: 'Number of network requests'
    },
    {
      key: 'networkRequests',
      path: 'network',
      required: false,
      description: 'Network requests array'
    },
    {
      key: 'userAgent',
      path: 'page.ua',
      required: true,
      description: 'User agent string'
    },
    {
      key: 'annotationId',
      path: 'id',
      required: true,
      description: 'Unique annotation ID'
    }
  ]
};