import { describe, it, expect } from 'vitest';
import type { WingmanAnnotation, ConsoleEvent, NetworkActivity } from '../types';

describe('WingmanAnnotation type', () => {
  it('should accept valid annotation structure', () => {
    const annotation: WingmanAnnotation = {
      id: 'test-id',
      timestamp: '2024-01-01T00:00:00.000Z',
      url: 'https://example.com',
      screenshot: 'data:image/png;base64,test',
      selectedElement: {
        selector: '.test-class',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        reactInfo: {
          componentName: 'TestComponent',
          props: { test: true },
          state: { count: 0 }
        }
      },
      pageMetadata: {
        title: 'Test Page',
        viewport: { width: 1920, height: 1080 }
      },
      consoleEvents: [{
        type: 'error',
        timestamp: '2024-01-01T00:00:00.000Z',
        message: 'Test error',
        args: ['arg1', 'arg2']
      }],
      networkActivity: [{
        url: 'https://api.example.com',
        method: 'GET',
        status: 200,
        duration: 100,
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'fetch'
      }],
      userComment: 'Test comment'
    };

    expect(annotation).toBeDefined();
    expect(annotation.id).toBe('test-id');
    expect(annotation.screenshot).toContain('data:image/png;base64');
  });

  it('should accept annotation with null optional fields', () => {
    const annotation: WingmanAnnotation = {
      id: 'minimal-test',
      timestamp: '2024-01-01T00:00:00.000Z',
      url: 'https://example.com',
      screenshot: 'data:image/png;base64,test',
      selectedElement: null,
      pageMetadata: {
        title: 'Test Page',
        viewport: { width: 1920, height: 1080 }
      },
      consoleEvents: [],
      networkActivity: [],
      userComment: null
    };

    expect(annotation).toBeDefined();
    expect(annotation.selectedElement).toBeNull();
    expect(annotation.userComment).toBeNull();
  });

  it('should handle selected element without React info', () => {
    const annotation: WingmanAnnotation = {
      id: 'no-react-test',
      timestamp: '2024-01-01T00:00:00.000Z',
      url: 'https://example.com',
      screenshot: 'test',
      selectedElement: {
        selector: '#test-id',
        rect: { x: 10, y: 20, width: 200, height: 150 }
      },
      pageMetadata: {
        title: 'Test',
        viewport: { width: 1920, height: 1080 }
      },
      consoleEvents: [],
      networkActivity: [],
      userComment: null
    };

    expect(annotation.selectedElement).toBeDefined();
    expect(annotation.selectedElement?.reactInfo).toBeUndefined();
  });
});

describe('ConsoleEvent type', () => {
  it('should accept valid console event', () => {
    const consoleEvent: ConsoleEvent = {
      type: 'error',
      timestamp: '2024-01-01T00:00:00.000Z',
      message: 'Error message',
      args: ['arg1', { nested: 'object' }, 123]
    };

    expect(consoleEvent.type).toBe('error');
    expect(consoleEvent.args).toHaveLength(3);
  });

  it('should accept different console types', () => {
    const types: ConsoleEvent['type'][] = ['log', 'warn', 'error', 'info', 'debug'];
    
    types.forEach(type => {
      const event: ConsoleEvent = {
        type,
        timestamp: '2024-01-01T00:00:00.000Z',
        message: `${type} message`,
        args: []
      };
      
      expect(event.type).toBe(type);
    });
  });
});

describe('NetworkActivity type', () => {
  it('should accept valid network activity', () => {
    const activity: NetworkActivity = {
      url: 'https://api.example.com/data',
      method: 'POST',
      status: 201,
      duration: 250,
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'xhr'
    };

    expect(activity.method).toBe('POST');
    expect(activity.status).toBe(201);
    expect(activity.type).toBe('xhr');
  });

  it('should accept different HTTP methods', () => {
    const methods: NetworkActivity['method'][] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    
    methods.forEach(method => {
      const activity: NetworkActivity = {
        url: 'https://example.com',
        method,
        status: 200,
        duration: 100,
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'fetch'
      };
      
      expect(activity.method).toBe(method);
    });
  });

  it('should accept network activity without status', () => {
    const activity: NetworkActivity = {
      url: 'https://example.com',
      method: 'GET',
      status: undefined,
      duration: 100,
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'fetch'
    };

    expect(activity.status).toBeUndefined();
  });
});

describe('Type validation snapshots', () => {
  it('should match full annotation structure snapshot', () => {
    const fullAnnotation: WingmanAnnotation = {
      id: 'snapshot-test',
      timestamp: '2024-01-01T12:00:00.000Z',
      url: 'https://example.com/page',
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      selectedElement: {
        selector: 'button.submit-btn',
        rect: { x: 100, y: 200, width: 150, height: 50 },
        reactInfo: {
          componentName: 'SubmitButton',
          props: { disabled: false, type: 'primary' },
          state: { isLoading: false }
        }
      },
      pageMetadata: {
        title: 'Example Page',
        viewport: { width: 1920, height: 1080 }
      },
      consoleEvents: [
        {
          type: 'warn',
          timestamp: '2024-01-01T11:59:00.000Z',
          message: 'Deprecation warning',
          args: ['Function X is deprecated']
        }
      ],
      networkActivity: [
        {
          url: 'https://api.example.com/users',
          method: 'GET',
          status: 200,
          duration: 150,
          timestamp: '2024-01-01T11:59:30.000Z',
          type: 'fetch'
        }
      ],
      userComment: 'The submit button is not working correctly'
    };

    expect(fullAnnotation).toMatchSnapshot();
  });
});