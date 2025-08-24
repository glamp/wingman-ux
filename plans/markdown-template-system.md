# Wingman Markdown Template System Plan

## Overview

This plan outlines the implementation of a customizable template system for formatting Wingman annotations when sending them to Claude Code. The system will allow users to create, edit, and switch between different formatting templates to suit their specific needs and preferences.

## Goals

1. **User Customization**: Allow users to customize how their feedback is formatted for Claude Code
2. **Template Management**: Provide a UI for creating, editing, and managing templates
3. **Preset Templates**: Offer multiple built-in templates for different use cases
4. **Import/Export**: Enable sharing of templates between users
5. **Backward Compatibility**: Maintain compatibility with existing format

## Architecture

### Core Components

#### 1. Template Engine (`packages/shared/src/templates/`)
- **template-engine.ts**: Core rendering engine
  - Initially using a simple custom implementation
  - Future migration to Handlebars for full template support
  - Support for conditionals, loops, and custom helpers
  
- **types.ts**: TypeScript interfaces for templates
  - `AnnotationTemplate`: Template definition
  - `TemplateVariable`: Variable metadata
  - `TemplateEngine`: Engine interface
  - `TemplateStorage`: Storage interface

- **default.template.ts**: Default optimized template
  - Current optimized format as a template
  - Serves as the fallback option

#### 2. Template Storage (`packages/chrome-extension/src/storage/`)
- **template-storage.ts**: Chrome storage integration
  ```typescript
  class ChromeTemplateStorage implements TemplateStorage {
    // Uses chrome.storage.sync for cross-device sync
    // Falls back to chrome.storage.local if sync quota exceeded
    // Caches templates in memory for performance
  }
  ```

#### 3. Template Editor UI (`packages/chrome-extension/src/settings/`)

##### Settings Page Layout
```
┌─────────────────────────────────────────┐
│ 🎨 Template Settings                    │
├─────────────────────────────────────────┤
│ Active Template: [Dropdown v]           │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Template List                       │ │
│ ├─────────────────────────────────────┤ │
│ │ ▶ Claude Code Optimized (default)  │ │
│ │ ▶ Minimal                          │ │
│ │ ▶ Developer Focused                │ │
│ │ ▶ My Custom Template               │ │
│ │                                    │ │
│ │ [+ New Template] [Import] [Export] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Template Editor                     │ │
│ ├─────────────────────────────────────┤ │
│ │ Name: [___________________]        │ │
│ │ Description: [______________]      │ │
│ │                                    │ │
│ │ Template:                          │ │
│ │ ┌─────────────────────────────────┐│ │
│ │ │ # {{title}}                     ││ │
│ │ │                                 ││ │
│ │ │ {{#if userNote}}                ││ │
│ │ │ ## User Feedback                ││ │
│ │ │ {{userNote}}                    ││ │
│ │ │ {{/if}}                         ││ │
│ │ │                                 ││ │
│ │ │ ...                             ││ │
│ │ └─────────────────────────────────┘│ │
│ │                                    │ │
│ │ Variables: (auto-detected)         │ │
│ │ • userNote (optional)              │ │
│ │ • screenshotUrl (required)         │ │
│ │ • pageTitle (required)             │ │
│ │                                    │ │
│ │ [Preview] [Save] [Cancel]          │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

##### Template Editor Features
- **Monaco Editor** integration for syntax highlighting
- **Live preview** with sample annotation data
- **Variable auto-completion** with descriptions
- **Template validation** with error messages
- **Side-by-side** preview mode

#### 4. Chrome Extension Integration

##### Manifest Updates (`manifest.json`)
```json
{
  "permissions": [
    "storage",
    "unlimitedStorage"
  ],
  "options_page": "settings.html",
  "options_ui": {
    "page": "settings.html",
    "open_in_tab": true
  }
}
```

##### Settings Page (`settings.html`)
- React-based SPA for template management
- Material-UI components for consistency
- Monaco Editor for template editing
- Import/Export functionality

## Template System Features

### 1. Variable System

#### Core Variables
```typescript
interface CoreVariables {
  // User Input
  userNote: string;
  
  // Screenshot
  screenshotUrl: string;
  screenshotDataUrl: string;
  
  // Page Info
  pageUrl: string;
  pageTitle: string;
  pageViewport: { width: number; height: number; dpr: number };
  
  // Selection
  targetMode: 'element' | 'region';
  targetRect: { x: number; y: number; width: number; height: number };
  targetSelector: string;
  
  // Technical
  react: ReactInfo | null;
  console: ConsoleLog[];
  errors: JavaScriptError[];
  network: NetworkRequest[];
  
  // Metadata
  annotationId: string;
  createdAt: string;
  userAgent: string;
}
```

#### Custom Formatters
```typescript
const formatters = {
  date: (value: string) => new Date(value).toLocaleDateString(),
  time: (value: string) => new Date(value).toLocaleTimeString(),
  json: (value: any) => JSON.stringify(value, null, 2),
  truncate: (value: string, length: number) => value.substring(0, length) + '...',
  count: (array: any[]) => array?.length || 0,
  yesno: (value: boolean) => value ? 'Yes' : 'No',
};
```

### 2. Preset Templates

#### Minimal Template
```handlebars
# UI Issue

{{userNote}}

![Screenshot]({{screenshotUrl}})

Page: {{pageUrl}}
```

#### Developer Template
```handlebars
# Bug Report

## Description
{{userNote}}

## Screenshot
![Screenshot]({{screenshotUrl}})

## Technical Details
- **URL**: {{pageUrl}}
- **Selector**: `{{targetSelector}}`
- **React Component**: {{react.componentName}}

### Errors ({{errors.length}})
{{#each errors}}
- {{message}}
{{/each}}

### Console ({{console.length}})
{{#each console}}
- [{{level}}] {{args}}
{{/each}}
```

#### QA Template
```handlebars
## Test Case Failure

**Steps to Reproduce:**
{{userNote}}

**Expected:** Working UI
**Actual:** See screenshot

![Evidence]({{screenshotUrl}})

**Environment:**
- URL: {{pageUrl}}
- Browser: {{userAgent}}
- Viewport: {{pageViewport.width}}x{{pageViewport.height}}

{{#if errors}}
**Errors Found:** {{errors.length}}
{{/if}}
```

### 3. Import/Export Format

Templates can be exported as JSON files:
```json
{
  "version": "1.0.0",
  "templates": [
    {
      "id": "custom-template-1",
      "name": "My Custom Template",
      "description": "Custom format for my team",
      "template": "...",
      "variables": [...],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Implementation Phases

### Phase 1: Foundation (Completed ✅)
- [x] Create template type definitions
- [x] Build simple template engine
- [x] Create default template
- [x] Update format-claude.ts to use new structure

### Phase 2: Chrome Extension Storage
- [ ] Implement ChromeTemplateStorage class
- [ ] Add storage migration for existing users
- [ ] Create template management API
- [ ] Add storage quota management

### Phase 3: Settings UI - Basic
- [ ] Create settings page structure
- [ ] Add template list view
- [ ] Implement template switcher
- [ ] Add basic template editor (textarea)

### Phase 4: Settings UI - Advanced
- [ ] Integrate Monaco Editor
- [ ] Add live preview functionality
- [ ] Implement variable auto-completion
- [ ] Add template validation UI

### Phase 5: Template Features
- [ ] Create preset templates
- [ ] Implement import/export
- [ ] Add template sharing URLs
- [ ] Create template marketplace concept

### Phase 6: Handlebars Migration
- [ ] Replace simple engine with Handlebars
- [ ] Add custom Handlebars helpers
- [ ] Migrate existing templates
- [ ] Add advanced template features

## User Stories

### Basic User
"As a user, I want to emphasize certain information when sending feedback to Claude Code"
- Can switch between preset templates
- Can see preview of how feedback will look
- Changes persist across sessions

### Power User
"As a power user, I want to create custom templates for different types of feedback"
- Can create multiple custom templates
- Can use variables and conditionals
- Can import templates from colleagues

### Team Lead
"As a team lead, I want to standardize how my team reports issues"
- Can export team template
- Can share template via URL/file
- Can enforce template via policy (future)

## Technical Considerations

### Performance
- Template rendering < 10ms
- Storage sync throttled to prevent quota issues
- Templates cached in memory
- Lazy load Monaco Editor

### Storage Limits
- chrome.storage.sync: 100KB total, 8KB per item
- chrome.storage.local: 5MB total
- Strategy: Sync active template only, store rest locally

### Security
- Template sanitization to prevent XSS
- No execution of arbitrary JavaScript
- Safe variable interpolation only
- Content Security Policy compliance

### Compatibility
- Backward compatible with existing format
- Graceful degradation if storage fails
- Default template always available
- Export includes version for future migrations

## Testing Strategy

### Unit Tests
- Template engine rendering
- Variable extraction
- Storage operations
- Format migrations

### Integration Tests
- Chrome storage integration
- Settings page functionality
- Template switching
- Import/export

### E2E Tests
- Full template creation flow
- Template editing and saving
- Switching between templates
- Using templates in annotations

## Future Enhancements

### Version 2.0
- Template marketplace/sharing platform
- AI-powered template suggestions
- Template analytics (which parts get edited)
- Team/organization template management
- Template versioning and history

### Version 3.0
- Visual template builder (drag-drop)
- Conditional logic builder UI
- Template inheritance/composition
- API for external template management
- Integration with other tools (Jira, Linear, etc.)

## Migration Path

### From Current Format
1. Current format becomes "Legacy" template
2. Auto-migration to new optimized template
3. User prompted to explore templates
4. Settings tour on first open

### Storage Migration
```typescript
async function migrateToTemplateSystem() {
  // Check for existing format preference
  const existingFormat = await chrome.storage.sync.get('formatType');
  
  if (existingFormat) {
    // Map to new template system
    const templateId = mapFormatToTemplate(existingFormat);
    await setActiveTemplate(templateId);
  } else {
    // Use new optimized default
    await setActiveTemplate('default-claude-optimized');
  }
  
  // Mark migration complete
  await chrome.storage.sync.set({ 'template.migrated': true });
}
```

## Success Metrics

### Adoption
- 50% of users view template settings
- 20% of users try different templates
- 10% of users create custom template

### Quality
- Template rendering errors < 0.1%
- Storage sync success > 99%
- Settings page load < 500ms

### Satisfaction
- User feedback on templates positive
- Support tickets about formatting decrease
- Template sharing increases collaboration

## Conclusion

This template system will transform Wingman from a fixed-format tool to a flexible platform that adapts to different workflows and preferences. By providing both simplicity for basic users and power for advanced users, we can serve a broader audience while maintaining the core value proposition of making UI feedback seamless.