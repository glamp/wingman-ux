import type { WingmanAnnotation } from '@wingman/shared';
import { getEnvironmentConfig, shouldShowLogs } from '../utils/config';
import type { EnvironmentConfig } from '../types/env';

// Global config reference
let extensionConfig: EnvironmentConfig | null = null;

// Initialize extension with environment-specific settings
async function initializeExtension() {
  try {
    extensionConfig = getEnvironmentConfig();
    
    // Set up environment badge
    if (extensionConfig.badge.text) {
      await chrome.action.setBadgeText({ text: extensionConfig.badge.text });
      await chrome.action.setBadgeBackgroundColor({ color: extensionConfig.badge.color });
    } else {
      // Clear badge for production
      await chrome.action.setBadgeText({ text: '' });
    }
    
    // Log initialization
    if (shouldShowLogs(extensionConfig)) {
      console.log(`[Wingman Background] Service worker started - ${extensionConfig.environmentName} mode`);
      console.log('[Wingman Background] Config:', extensionConfig);
    }
    
  } catch (error) {
    console.error('[Wingman Background] Failed to initialize:', error);
  }
}

// Call initialization
initializeExtension();

interface MessageRequest {
  type: 'CAPTURE_SCREENSHOT' | 'SUBMIT_ANNOTATION' | 'ACTIVATE_WINGMAN';
  payload?: any;
}

chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
  if (extensionConfig && shouldShowLogs(extensionConfig)) {
    console.log('[Wingman Background] Message received:', request.type);
  }

  if (request.type === 'CAPTURE_SCREENSHOT') {
    if (extensionConfig && shouldShowLogs(extensionConfig)) {
      console.log('[Wingman Background] Capturing screenshot...');
    }
    captureScreenshot()
      .then((dataUrl) => {
        if (extensionConfig && shouldShowLogs(extensionConfig)) {
          console.log('[Wingman Background] Screenshot captured');
        }
        sendResponse(dataUrl);
      })
      .catch((error) => {
        console.error('[Wingman Background] Screenshot failed:', error);
        sendResponse(null);
      });
    return true; // Will respond asynchronously
  }

  if (request.type === 'SUBMIT_ANNOTATION') {
    if (extensionConfig && shouldShowLogs(extensionConfig)) {
      console.log('[Wingman Background] Submitting annotation...');
    }
    submitAnnotation(request.payload)
      .then((result) => {
        if (extensionConfig && shouldShowLogs(extensionConfig)) {
          console.log('[Wingman Background] Annotation submitted:', result);
        }
        sendResponse(result);
      })
      .catch((error) => {
        console.error('[Wingman Background] Submission failed:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (extensionConfig && shouldShowLogs(extensionConfig)) {
    console.log('[Wingman Background] Extension icon clicked');
  }
  if (tab.id) {
    if (extensionConfig && shouldShowLogs(extensionConfig)) {
      console.log('[Wingman Background] Sending activate message to tab:', tab.id);
    }
    chrome.tabs
      .sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
      .catch((error) => console.error('[Wingman Background] Failed to send message:', error));
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (extensionConfig && shouldShowLogs(extensionConfig)) {
    console.log('[Wingman Background] Keyboard shortcut pressed:', command);
  }
  if (command === 'activate-overlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        if (extensionConfig && shouldShowLogs(extensionConfig)) {
          console.log('[Wingman Background] Sending activate message via shortcut to tab:', tab.id);
        }
        chrome.tabs
          .sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
          .catch((error) => console.error('[Wingman Background] Failed to send message:', error));
      }
    });
  }
});

async function captureScreenshot(): Promise<string> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    return dataUrl;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    throw error;
  }
}

async function submitAnnotation(annotation: WingmanAnnotation): Promise<any> {
  try {
    // Get relay URL from config first, then fall back to storage, then default
    let relayUrl = extensionConfig?.relayUrl || 'http://localhost:8787';
    const { relayUrl: storedRelayUrl, copyFormat = 'claude' } = await chrome.storage.local.get(['relayUrl', 'copyFormat']);
    if (storedRelayUrl) {
      relayUrl = storedRelayUrl;
    }

    // Handle clipboard mode
    if (relayUrl === 'clipboard') {
      const formattedContent = formatAnnotationForClipboard(annotation, copyFormat);
      await navigator.clipboard.writeText(formattedContent);
      return { success: true, message: 'Copied to clipboard' };
    }

    const response = await fetch(`${relayUrl}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(annotation),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to submit annotation:', error);
    throw error;
  }
}

function formatAnnotationForClipboard(annotation: WingmanAnnotation, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(annotation, null, 2);
    
    case 'markdown':
      return formatAsMarkdown(annotation);
    
    case 'claude':
    default:
      return formatForClaudeCode(annotation);
  }
}

function formatAsMarkdown(annotation: WingmanAnnotation): string {
  const lines = [
    '# Wingman Feedback',
    '',
    `**URL:** ${annotation.url}`,
    `**Timestamp:** ${new Date(annotation.timestamp).toLocaleString()}`,
    `**User Agent:** ${annotation.userAgent}`,
    ''
  ];

  if (annotation.note) {
    lines.push('## User Feedback');
    lines.push(annotation.note);
    lines.push('');
  }

  if (annotation.target) {
    lines.push('## Target Element');
    if (annotation.target.selector) {
      lines.push(`**Selector:** \`${annotation.target.selector}\``);
    }
    if (annotation.target.rect) {
      const rect = annotation.target.rect;
      lines.push(`**Position:** x:${rect.x}, y:${rect.y}, width:${rect.width}, height:${rect.height}`);
    }
    lines.push('');
  }

  if (annotation.screenshot) {
    lines.push('## Screenshot');
    lines.push('*Screenshot data attached as base64*');
    lines.push('');
  }

  return lines.join('\n');
}

function formatForClaudeCode(annotation: WingmanAnnotation): string {
  const lines = [
    'I have some UX feedback for this webpage:',
    '',
    `URL: ${annotation.url}`,
    `Timestamp: ${new Date(annotation.timestamp).toLocaleString()}`,
    ''
  ];

  if (annotation.note) {
    lines.push('## Feedback:');
    lines.push(annotation.note);
    lines.push('');
  }

  if (annotation.target) {
    lines.push('## Target Element:');
    if (annotation.target.selector) {
      lines.push(`CSS Selector: \`${annotation.target.selector}\``);
    }
    if (annotation.target.rect) {
      const rect = annotation.target.rect;
      lines.push(`Screen Position: x:${rect.x}, y:${rect.y} (${rect.width}x${rect.height})`);
    }
    lines.push('');
  }

  if (annotation.viewport) {
    lines.push(`Viewport: ${annotation.viewport.width}x${annotation.viewport.height}`);
    lines.push('');
  }

  if (annotation.screenshot) {
    lines.push('## Screenshot:');
    lines.push(`![Screenshot](${annotation.screenshot})`);
    lines.push('');
  }

  lines.push('---');
  lines.push('Generated by Wingman UX Feedback Extension');

  return lines.join('\n');
}
