import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSuccessNotification } from '../overlay';

describe('Success Notification', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSuccessNotification', () => {
    it('should create notification with correct structure', () => {
      const onClose = vi.fn();
      const previewUrl = 'http://localhost:8787/preview/?id=test-123';
      
      createSuccessNotification({
        previewUrl,
        onClose
      });

      const notification = document.getElementById('wingman-success-notification');
      expect(notification).toBeTruthy();
      
      // Check for key elements
      expect(notification?.textContent).toContain('Feedback submitted successfully!');
      expect(notification?.textContent).toContain('Preview URL:');
      
      // Check URL input exists and has correct value
      const urlInput = notification?.querySelector('input') as HTMLInputElement;
      expect(urlInput).toBeTruthy();
      expect(urlInput.value).toBe(previewUrl);
      
      // Check buttons exist
      expect(notification?.textContent).toContain('Open Preview');
      expect(notification?.textContent).toContain('Copy for Claude Code');
    });

    it('should handle close button click', () => {
      const onClose = vi.fn();
      
      const { close } = createSuccessNotification({
        previewUrl: 'http://localhost:8787/preview/?id=test',
        onClose
      });

      const closeButton = document.querySelector('button') as HTMLButtonElement;
      expect(closeButton).toBeTruthy();
      
      // Click close button
      closeButton.click();
      
      // Wait for animation
      setTimeout(() => {
        expect(onClose).toHaveBeenCalled();
        expect(document.getElementById('wingman-success-notification')).toBeFalsy();
      }, 350);
    });

    it('should copy URL when copy button is clicked', async () => {
      const previewUrl = 'http://localhost:8787/preview/?id=test-copy';
      
      createSuccessNotification({
        previewUrl,
        onClose: vi.fn()
      });

      // Find the copy button (has 📋 emoji)
      const buttons = Array.from(document.querySelectorAll('button'));
      const copyButton = buttons.find(btn => btn.textContent === '📋');
      expect(copyButton).toBeTruthy();
      
      // Click copy button
      await copyButton?.click();
      
      // Check clipboard was called with correct URL
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(previewUrl);
    });

    it('should open preview in new tab when Open Preview is clicked', () => {
      const previewUrl = 'http://localhost:8787/preview/?id=test-open';
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      
      createSuccessNotification({
        previewUrl,
        onClose: vi.fn()
      });

      // Find the Open Preview button
      const buttons = Array.from(document.querySelectorAll('button'));
      const openButton = buttons.find(btn => btn.textContent === 'Open Preview');
      expect(openButton).toBeTruthy();
      
      // Click open button
      openButton?.click();
      
      // Check window.open was called with correct URL
      expect(windowOpenSpy).toHaveBeenCalledWith(previewUrl, '_blank');
      
      windowOpenSpy.mockRestore();
    });

    it('should copy formatted markdown when annotation is provided', async () => {
      const previewUrl = 'http://localhost:8787/preview/?id=test-claude';
      const mockAnnotation = {
        id: 'test-claude',
        createdAt: '2024-01-15T10:30:00Z',
        page: {
          title: 'Test Page',
          url: 'https://example.com',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element' as const,
          rect: { x: 0, y: 0, width: 100, height: 100 }
        },
        media: {
          screenshot: {
            dataUrl: 'data:image/png;base64,test',
            timestamp: Date.now()
          }
        },
        console: [],
        network: [],
        errors: [],
        note: 'Test note'
      };
      
      createSuccessNotification({
        previewUrl,
        annotation: mockAnnotation,
        onClose: vi.fn()
      });

      // Find the Claude button
      const buttons = Array.from(document.querySelectorAll('button'));
      const claudeButton = buttons.find(btn => btn.textContent === 'Copy for Claude Code');
      expect(claudeButton).toBeTruthy();
      
      // Click Claude button
      await claudeButton?.click();
      
      // Check clipboard was called with formatted markdown
      const clipboardCall = (navigator.clipboard.writeText as any).mock.calls[0][0];
      expect(clipboardCall).toContain('# Wingman Annotation');
      expect(clipboardCall).toContain('**Annotation ID:** test-claude');
      expect(clipboardCall).toContain('Test note');
      expect(clipboardCall).toContain('![Wingman Screenshot](http://localhost:8787/annotations/test-claude/screenshot)');
      
      // Check button text changed to indicate success
      expect(claudeButton?.textContent).toBe('✓ Copied!');
    });

    it('should copy URL when annotation is not provided', async () => {
      const previewUrl = 'http://localhost:8787/preview/?id=test-url-only';
      
      createSuccessNotification({
        previewUrl,
        onClose: vi.fn()
      });

      // Find the Claude button
      const buttons = Array.from(document.querySelectorAll('button'));
      const claudeButton = buttons.find(btn => btn.textContent === 'Copy for Claude Code');
      expect(claudeButton).toBeTruthy();
      
      // Click Claude button
      await claudeButton?.click();
      
      // Check clipboard was called with just the URL
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(previewUrl);
      
      // Check button text changed to indicate success
      expect(claudeButton?.textContent).toBe('✓ Copied!');
    });

    it('should auto-dismiss after 4 seconds', () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      
      createSuccessNotification({
        previewUrl: 'http://localhost:8787/preview/?id=test',
        onClose
      });

      const notification = document.getElementById('wingman-success-notification');
      expect(notification).toBeTruthy();
      
      // Fast-forward 4 seconds (actual timeout in code)
      vi.advanceTimersByTime(4000);
      
      // Wait for close animation
      vi.advanceTimersByTime(300);
      
      expect(onClose).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should pause auto-dismiss on hover', () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      
      createSuccessNotification({
        previewUrl: 'http://localhost:8787/preview/?id=test',
        onClose
      });

      const notification = document.getElementById('wingman-success-notification');
      expect(notification).toBeTruthy();
      
      // Simulate mouse enter before auto-dismiss (within 4 seconds)
      vi.advanceTimersByTime(2000);
      const mouseEnter = new MouseEvent('mouseenter');
      notification!.dispatchEvent(mouseEnter);
      
      // Fast-forward another 5 seconds (should not close while hovering)
      vi.advanceTimersByTime(5000);
      
      expect(onClose).not.toHaveBeenCalled();
      
      // Simulate mouse leave
      const mouseLeave = new MouseEvent('mouseleave');
      notification!.dispatchEvent(mouseLeave);
      
      // Now it should close after 4 seconds from mouse leave
      vi.advanceTimersByTime(4000);
      vi.advanceTimersByTime(300); // animation time
      
      expect(onClose).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should handle clipboard API failure gracefully', async () => {
      // Mock clipboard to reject
      navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Clipboard failed'));
      
      // Mock document.execCommand as fallback
      document.execCommand = vi.fn().mockReturnValue(true);
      
      const previewUrl = 'http://localhost:8787/preview/?id=test-fallback';
      const mockAnnotation = {
        id: 'test-fallback',
        createdAt: '2024-01-15T10:30:00Z',
        page: {
          title: 'Test Page',
          url: 'https://example.com',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element' as const,
          rect: { x: 0, y: 0, width: 100, height: 100 }
        },
        media: {
          screenshot: {
            dataUrl: 'data:image/png;base64,test',
            timestamp: Date.now()
          }
        },
        console: [],
        network: [],
        errors: [],
        note: 'Test note'
      };
      
      createSuccessNotification({
        previewUrl,
        annotation: mockAnnotation,
        onClose: vi.fn()
      });

      // Find the Claude button (not the URL copy button)
      const buttons = Array.from(document.querySelectorAll('button'));
      const claudeButton = buttons.find(btn => btn.textContent === 'Copy for Claude Code');
      
      // Click Claude button
      await claudeButton?.click();
      
      // Wait for promise to reject and fallback to execute
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check fallback was used with a textarea
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      
      // Verify button text changed to indicate success
      expect(claudeButton?.textContent).toBe('✓ Copied!');
    });

    it('should create valid snapshot of notification HTML', () => {
      createSuccessNotification({
        previewUrl: 'http://localhost:8787/preview/?id=snapshot-test',
        onClose: vi.fn()
      });

      const notification = document.getElementById('wingman-success-notification');
      
      // Create a cleaner snapshot by removing dynamic styles
      const clone = notification?.cloneNode(true) as HTMLElement;
      if (clone) {
        // Remove inline styles for cleaner snapshot
        clone.removeAttribute('style');
        // Remove all button hover handlers
        clone.querySelectorAll('button').forEach(btn => {
          btn.removeAttribute('style');
        });
      }
      
      expect(clone?.outerHTML).toMatchSnapshot();
    });
  });
});