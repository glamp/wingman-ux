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
- **Selected Area:** {{targetRect.width}}×{{targetRect.height}} pixels at position ({{targetRect.x}}, {{targetRect.y}})
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
<details>
<summary><strong>React Component Info</strong></summary>

{{#if reactComponentName}}
- **Component:** {{reactComponentName}}
{{/if}}
- **Data Source:** {{reactDataSource}}
{{#if reactProps}}

**Props:**
\`\`\`json
{{reactPropsJson}}
\`\`\`
{{/if}}
{{#if reactState}}

**State:**
\`\`\`json
{{reactStateJson}}
\`\`\`
{{/if}}

</details>

{{/if}}
{{#if hasErrors}}
<details open>
<summary><strong>⚠️ JavaScript Errors ({{errorCount}})</strong></summary>

{{#each errors}}
{{index}}. **[{{timestamp}}]** {{message}}
{{#if stack}}
\`\`\`
{{stack}}
\`\`\`
{{/if}}
{{/each}}

</details>

{{/if}}
{{#if hasConsole}}
<details>
<summary><strong>Console Logs ({{consoleCount}})</strong></summary>

{{#each consoleLogs}}
{{index}}. **[{{level}}]** {{timestamp}}: {{args}}
{{/each}}

</details>

{{/if}}
{{#if hasNetwork}}
<details>
<summary><strong>Network Activity ({{networkCount}} requests)</strong></summary>

{{#each networkRequests}}
{{index}}. **{{url}}**
{{#if status}}   - Status: {{status}}{{/if}}
{{#if duration}}   - Duration: {{duration}}ms{{/if}}
{{#if initiatorType}}   - Type: {{initiatorType}}{{/if}}
{{/each}}

</details>

{{/if}}
<details>
<summary><strong>Browser Info</strong></summary>

- **User Agent:** {{userAgent}}
- **Annotation ID:** {{annotationId}}

</details>

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