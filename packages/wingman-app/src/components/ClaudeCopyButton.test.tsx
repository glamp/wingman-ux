import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ClaudeCopyButton from './ClaudeCopyButton';
import type { StoredAnnotation } from '@wingman/shared';

describe.skip('ClaudeCopyButton', () => {
  const createMockStoredAnnotation = (): StoredAnnotation => ({
    id: 'test-stored-123',
    receivedAt: '2024-01-15T10:30:00Z',
    annotation: {
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
      note: 'Test annotation note'
    }
  });

  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Copy for Claude Code button', () => {
    const annotation = createMockStoredAnnotation();
    render(<ClaudeCopyButton annotation={annotation} />);
    
    const button = screen.getByText('Copy for Claude Code');
    expect(button).toBeTruthy();
  });

  it('should copy formatted markdown when button is clicked', async () => {
    const annotation = createMockStoredAnnotation();
    render(<ClaudeCopyButton annotation={annotation} />);
    
    const button = screen.getByText('Copy for Claude Code');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    
    const copiedText = (navigator.clipboard.writeText as any).mock.calls[0][0];
    
    // Verify the markdown content includes key elements
    expect(copiedText).toContain('# Wingman Annotation');
    expect(copiedText).toContain('**Annotation ID:** test-annotation-123');
    expect(copiedText).toContain('**Page:** Test Page');
    expect(copiedText).toContain('**URL:** https://example.com/test');
    expect(copiedText).toContain('## User Note\nTest annotation note');
    expect(copiedText).toContain('![Wingman Screenshot](http://localhost:8787/annotations/test-annotation-123/screenshot)');
  });

  it('should show success state after copying', async () => {
    const annotation = createMockStoredAnnotation();
    render(<ClaudeCopyButton annotation={annotation} />);
    
    const button = screen.getByText('Copy for Claude Code');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeTruthy();
    }, { timeout: 1000 });
    
    // Also check for success snackbar
    await waitFor(() => {
      expect(screen.getByText(/Annotation copied! Paste into Claude Code to see text and screenshot/i)).toBeTruthy();
    }, { timeout: 1000 });
  });

  it('should handle clipboard API failure with fallback', async () => {
    // Mock clipboard to fail
    (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard failed'));
    
    // Mock document.execCommand for fallback
    document.execCommand = vi.fn().mockReturnValue(true);
    
    const annotation = createMockStoredAnnotation();
    render(<ClaudeCopyButton annotation={annotation} />);
    
    const button = screen.getByText('Copy for Claude Code');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    }, { timeout: 500 });
    
    // Should still show success after fallback
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeTruthy();
    }, { timeout: 500 });
  });

  it('should format annotation with React component data when present', async () => {
    const annotation = createMockStoredAnnotation();
    annotation.annotation.react = {
      componentName: 'TestComponent',
      obtainedVia: 'React DevTools Hook',
      props: { testProp: 'value' },
      state: { isActive: true }
    };
    
    render(<ClaudeCopyButton annotation={annotation} />);
    
    const button = screen.getByText('Copy for Claude Code');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    
    const copiedText = (navigator.clipboard.writeText as any).mock.calls[0][0];
    
    expect(copiedText).toContain('## React Component');
    expect(copiedText).toContain('**Component:** TestComponent');
    expect(copiedText).toContain('"testProp": "value"');
    expect(copiedText).toContain('"isActive": true');
  });

  it('should format console logs when present', async () => {
    const annotation = createMockStoredAnnotation();
    annotation.annotation.console = [
      {
        level: 'info',
        args: ['Test log message'],
        ts: Date.now()
      }
    ];
    
    render(<ClaudeCopyButton annotation={annotation} />);
    
    const button = screen.getByText('Copy for Claude Code');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    
    const copiedText = (navigator.clipboard.writeText as any).mock.calls[0][0];
    
    expect(copiedText).toContain('## Console Logs (1)');
    expect(copiedText).toContain('**[INFO]**');
    expect(copiedText).toContain('Test log message');
  });

  it('should reset copied state after timeout', async () => {
    vi.useFakeTimers();
    
    const annotation = createMockStoredAnnotation();
    render(<ClaudeCopyButton annotation={annotation} />);
    
    const button = screen.getByText('Copy for Claude Code');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeTruthy();
    }, { timeout: 500 });
    
    // Fast-forward 3 seconds
    vi.advanceTimersByTime(3000);
    
    expect(screen.getByText('Copy for Claude Code')).toBeTruthy();
    
    vi.useRealTimers();
  });

  it('should show error snackbar when clipboard fails completely', async () => {
    // Mock both clipboard API and fallback to fail
    (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard failed'));
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failed');
    });
    
    const annotation = createMockStoredAnnotation();
    render(<ClaudeCopyButton annotation={annotation} />);
    
    const button = screen.getByText('Copy for Claude Code');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to copy annotation. Please try again./i)).toBeTruthy();
    }, { timeout: 1000 });
  });
});