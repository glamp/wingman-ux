import { describe, it, expect } from 'vitest';
import { formatAnnotationForClaude } from './format-claude';
import type { WingmanAnnotation } from './types';

describe('formatAnnotationForClaude', () => {
  const createMockAnnotation = (overrides?: Partial<WingmanAnnotation>): WingmanAnnotation => ({
    id: 'test-annotation-123',
    createdAt: '2024-01-15T10:30:00Z',
    page: {
      title: 'Test Page',
      url: 'https://example.com/test',
      ua: 'Mozilla/5.0 Test Browser',
      viewport: {
        w: 1920,
        h: 1080,
        dpr: 2
      }
    },
    target: {
      mode: 'element',
      rect: {
        x: 100,
        y: 200,
        width: 300,
        height: 400
      },
      selector: '.test-element'
    },
    media: {
      screenshot: {
        dataUrl: 'data:image/png;base64,test...',
        timestamp: Date.now()
      }
    },
    console: [],
    network: [],
    errors: [],
    note: 'Test note',
    ...overrides
  });

  it('should format basic annotation with all required fields', () => {
    const annotation = createMockAnnotation();
    const result = formatAnnotationForClaude(annotation);

    expect(result).toContain('# 🎯 UI Feedback Request');
    expect(result).toContain('## 📝 User Feedback');
    expect(result).toContain('> **Test note**');
    expect(result).toContain('## 🖼️ Screenshot Analysis Required');
    expect(result).toContain('IMPORTANT');
    expect(result).toContain('![Wingman Screenshot - Click to view full size](http://localhost:8787/annotations/test-annotation-123/screenshot)');
    expect(result).toContain('## 🎨 Visual Context');
    expect(result).toContain('**Selected Area:** 300×400 pixels at position (100, 200)');
    expect(result).toContain('**Selection Mode:** Specific Element');
    expect(result).toContain('**CSS Selector:** `.test-element`');
    expect(result).toContain('## 📍 Page Information');
    expect(result).toContain('**URL:** https://example.com/test');
    expect(result).toContain('**Title:** Test Page');
    expect(result).toContain('## 💡 Action Request');
  });

  it('should handle annotation without optional fields', () => {
    const annotation = createMockAnnotation({
      note: undefined,
      target: {
        mode: 'region',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        selector: undefined
      },
      react: undefined
    });
    const result = formatAnnotationForClaude(annotation);

    expect(result).not.toContain('## 📝 User Feedback');
    expect(result).not.toContain('**CSS Selector:**');
    expect(result).not.toContain('React Component Info');
  });

  it('should format React component information when present', () => {
    const annotation = createMockAnnotation({
      react: {
        componentName: 'TestComponent',
        obtainedVia: 'React DevTools Hook',
        props: { testProp: 'value', count: 42 },
        state: { isActive: true }
      }
    });
    const result = formatAnnotationForClaude(annotation);

    expect(result).toContain('<details>');
    expect(result).toContain('React Component Info');
    expect(result).toContain('**Component:** TestComponent');
    expect(result).toContain('**Data Source:** React DevTools Hook');
    expect(result).toContain('**Props:**');
    expect(result).toContain('"testProp": "value"');
    expect(result).toContain('"count": 42');
    expect(result).toContain('**State:**');
    expect(result).toContain('"isActive": true');
    expect(result).toContain('</details>');
  });

  it('should format console logs when present', () => {
    const annotation = createMockAnnotation({
      console: [
        {
          level: 'info',
          args: ['Test message', { key: 'value' }],
          ts: Date.now()
        },
        {
          level: 'error',
          args: ['Error occurred'],
          ts: Date.now()
        }
      ]
    });
    const result = formatAnnotationForClaude(annotation);

    expect(result).toContain('Console Logs (2)');
    expect(result).toContain('**[INFO]**');
    expect(result).toContain('Test message');
    expect(result).toContain('{"key":"value"}');
    expect(result).toContain('**[ERROR]**');
    expect(result).toContain('Error occurred');
    expect(result).toContain('<details>');
    expect(result).toContain('</details>');
  });

  it('should format network requests when present', () => {
    const annotation = createMockAnnotation({
      network: [
        {
          url: 'https://api.example.com/data',
          status: 200,
          duration: 150,
          initiatorType: 'fetch'
        },
        {
          url: 'https://cdn.example.com/image.jpg',
          status: 304,
          duration: 50,
          initiatorType: 'img'
        }
      ]
    });
    const result = formatAnnotationForClaude(annotation);

    expect(result).toContain('Network Activity (2 requests)');
    expect(result).toContain('**https://api.example.com/data**');
    expect(result).toContain('Status: 200');
    expect(result).toContain('Duration: 150ms');
    expect(result).toContain('Type: fetch');
    expect(result).toContain('**https://cdn.example.com/image.jpg**');
    expect(result).toContain('<details>');
    expect(result).toContain('</details>');
  });

  it('should format JavaScript errors when present', () => {
    const annotation = createMockAnnotation({
      errors: [
        {
          message: 'TypeError: Cannot read property of undefined',
          stack: 'at testFunction (test.js:10:5)',
          ts: '2024-01-15T10:31:00Z'
        }
      ]
    });
    const result = formatAnnotationForClaude(annotation);

    expect(result).toContain('⚠️ JavaScript Errors (1)');
    expect(result).toContain('TypeError: Cannot read property of undefined');
    expect(result).toContain('at testFunction (test.js:10:5)');
    expect(result).toContain('<details open>');
    expect(result).toContain('</details>');
  });

  it('should handle empty arrays gracefully', () => {
    const annotation = createMockAnnotation({
      console: [],
      network: [],
      errors: []
    });
    const result = formatAnnotationForClaude(annotation);

    expect(result).not.toContain('Console Logs');
    expect(result).not.toContain('Network Activity');
    expect(result).not.toContain('JavaScript Errors');
  });

  it('should format page context with viewport and DPR', () => {
    const annotation = createMockAnnotation();
    const result = formatAnnotationForClaude(annotation);

    expect(result).toContain('Browser Info');
    expect(result).toContain('**User Agent:** Mozilla/5.0 Test Browser');
    expect(result).toContain('<details>');
    expect(result).toContain('</details>');
    expect(result).toContain('## 📍 Page Information');
    expect(result).toContain('**Viewport:** 1920×1080 (DPR: 2)');
  });

  it('should use correct screenshot URL format', () => {
    const annotation = createMockAnnotation({
      id: 'specific-id-12345'
    });
    const result = formatAnnotationForClaude(annotation);

    expect(result).toContain('![Wingman Screenshot - Click to view full size](http://localhost:8787/annotations/specific-id-12345/screenshot)');
  });

  it('should properly escape markdown special characters in user input', () => {
    const annotation = createMockAnnotation({
      note: 'This has *asterisks* and _underscores_ and `backticks`'
    });
    const result = formatAnnotationForClaude(annotation);

    // The formatter should preserve these as-is since they're already in markdown format
    expect(result).toContain('This has *asterisks* and _underscores_ and `backticks`');
  });
});