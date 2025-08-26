import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountReactOverlay, mountSuccessNotification } from '../index';
import { JSDOM } from 'jsdom';

describe('React Content UI Integration', () => {
  let dom: JSDOM;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    // Set up global window and document
    global.window = dom.window as any;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    
    // Mock Chrome API
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ showPreviewUrl: true }),
        },
      },
    } as any;
  });

  afterEach(() => {
    // Clean up any mounted components
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    
    // Clean up DOM
    dom.window.close();
    vi.clearAllMocks();
  });

  describe('mountReactOverlay', () => {
    it('should mount the overlay without errors', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();
      
      expect(() => {
        cleanup = mountReactOverlay({
          onSubmit,
          onCancel,
        });
      }).not.toThrow();
      
      // Check that the host element is created
      const host = document.getElementById('wingman-overlay-host');
      expect(host).toBeTruthy();
      expect(host?.shadowRoot).toBeTruthy();
    });

    it('should unmount cleanly when cleanup is called', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();
      
      cleanup = mountReactOverlay({
        onSubmit,
        onCancel,
      });
      
      // Verify host exists
      expect(document.getElementById('wingman-overlay-host')).toBeTruthy();
      
      // Clean up
      cleanup();
      cleanup = null;
      
      // Verify host is removed
      expect(document.getElementById('wingman-overlay-host')).toBeFalsy();
    });

    it('should handle multiple mount/unmount cycles', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();
      
      // First mount
      let cleanup1 = mountReactOverlay({ onSubmit, onCancel });
      expect(document.getElementById('wingman-overlay-host')).toBeTruthy();
      
      // Second mount (should replace first)
      let cleanup2 = mountReactOverlay({ onSubmit, onCancel });
      expect(document.getElementById('wingman-overlay-host')).toBeTruthy();
      
      // Clean up
      cleanup2();
      expect(document.getElementById('wingman-overlay-host')).toBeFalsy();
    });
  });

  describe('mountSuccessNotification', () => {
    it('should mount the success notification without errors', () => {
      const onClose = vi.fn();
      
      expect(() => {
        cleanup = mountSuccessNotification({
          mode: 'clipboard',
          onClose,
        });
      }).not.toThrow();
      
      // Check that the host element is created
      const host = document.getElementById('wingman-success-host');
      expect(host).toBeTruthy();
      expect(host?.shadowRoot).toBeTruthy();
    });

    it('should handle server mode with preview URL', () => {
      const onClose = vi.fn();
      
      cleanup = mountSuccessNotification({
        mode: 'server',
        previewUrl: 'http://localhost:3000/preview',
        onClose,
      });
      
      const host = document.getElementById('wingman-success-host');
      expect(host).toBeTruthy();
    });

    it('should unmount cleanly when cleanup is called', () => {
      const onClose = vi.fn();
      
      cleanup = mountSuccessNotification({
        mode: 'clipboard',
        onClose,
      });
      
      // Verify host exists
      expect(document.getElementById('wingman-success-host')).toBeTruthy();
      
      // Clean up
      cleanup();
      cleanup = null;
      
      // Verify host is removed
      expect(document.getElementById('wingman-success-host')).toBeFalsy();
    });
  });

  describe('Shadow DOM isolation', () => {
    it('should create isolated shadow roots for each component', () => {
      const overlayCleanup = mountReactOverlay({
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      });
      
      const notificationCleanup = mountSuccessNotification({
        mode: 'clipboard',
        onClose: vi.fn(),
      });
      
      // Check that separate shadow roots are created
      const overlayHost = document.getElementById('wingman-overlay-host');
      const notificationHost = document.getElementById('wingman-success-host');
      
      expect(overlayHost?.shadowRoot).toBeTruthy();
      expect(notificationHost?.shadowRoot).toBeTruthy();
      expect(overlayHost?.shadowRoot).not.toBe(notificationHost?.shadowRoot);
      
      // Clean up
      overlayCleanup();
      notificationCleanup();
    });
  });
});