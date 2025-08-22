import type { WingmanAnnotation } from '@wingman/shared';
/**
 * Background scripts CAN use ES modules and imports from @wingman/shared
 * because they run as service workers in Manifest V3.
 * 
 * Content scripts CANNOT use ES modules, so they must use the local duplicate
 * in src/utils/format-claude.ts instead.
 * 
 * If you modify formatAnnotationForClaude, update BOTH:
 * - packages/shared/src/format-claude.ts (canonical version)
 * - packages/chrome-extension/src/utils/format-claude.ts (content script copy)
 */
import { formatAnnotationForClaude, createLogger } from '@wingman/shared';
import { getEnvironmentConfig } from '../utils/config';
import type { EnvironmentConfig } from '../types/env';

// Global config reference
let extensionConfig: EnvironmentConfig | null = null;

// Create logger instance for background script
const logger = createLogger('Wingman:Background');

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
    
    // Configure logger based on environment
    if (extensionConfig.features.verboseLogging) {
      logger.setLevel('debug');
    }
    
    // Log initialization
    logger.info(`Service worker started - ${extensionConfig.environmentName} mode`);
    logger.debug('Config:', extensionConfig);
    
  } catch (error) {
    logger.error('Failed to initialize:', error);
  }
}

// Call initialization
initializeExtension();

// Inject console wrapper early on tab navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Inject when navigation starts (earliest possible moment)
  if (changeInfo.status === 'loading' && tab.url) {
    // Skip chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('https://chrome.google.com/webstore')) {
      return;
    }
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['page-console-injector.js'],
        world: 'MAIN' as chrome.scripting.ExecutionWorld,
        injectImmediately: true
      });
      logger.debug(`Injected console wrapper into tab ${tabId} at ${tab.url}`);
    } catch (error) {
      // This is expected for restricted pages
      logger.debug(`Could not inject console wrapper into tab ${tabId}:`, error);
    }
  }
});

interface MessageRequest {
  type: 'CAPTURE_SCREENSHOT' | 'SUBMIT_ANNOTATION' | 'ACTIVATE_WINGMAN';
  payload?: any;
}

chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
  logger.debug('Message received:', request.type);

  if (request.type === 'CAPTURE_SCREENSHOT') {
    logger.debug('Capturing screenshot...');
    captureScreenshot()
      .then((dataUrl) => {
        logger.debug('Screenshot captured');
        sendResponse(dataUrl);
      })
      .catch((error) => {
        logger.error('Screenshot failed:', error);
        sendResponse(null);
      });
    return true; // Will respond asynchronously
  }

  if (request.type === 'SUBMIT_ANNOTATION') {
    logger.debug('Submitting annotation...');
    submitAnnotation(request.payload)
      .then((result) => {
        logger.debug('Annotation submitted:', result);
        sendResponse(result);
      })
      .catch((error) => {
        logger.error('Submission failed:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  logger.debug('Extension icon clicked');
  if (tab.id) {
    logger.debug('Sending activate message to tab:', tab.id);
    chrome.tabs
      .sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
      .catch((error) => logger.error('Failed to send message:', error));
  }
});

chrome.commands.onCommand.addListener((command) => {
  logger.debug('Keyboard shortcut pressed:', command);
  if (command === 'activate-overlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        logger.debug('Sending activate message via shortcut to tab:', tab.id);
        chrome.tabs
          .sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
          .catch((error) => logger.error('Failed to send message:', error));
      }
    });
  }
});

async function captureScreenshot(): Promise<string> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    return dataUrl;
  } catch (error) {
    logger.error('Failed to capture screenshot:', error);
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

    // Handle clipboard mode - need to use content script for clipboard access
    if (relayUrl === 'clipboard') {
      const formattedContent = formatAnnotationForClipboard(annotation, copyFormat);
      // Service workers don't have clipboard access, return the formatted content
      // The content script will handle the actual clipboard operation
      return { 
        success: true, 
        message: 'Copied to clipboard',
        clipboardContent: formattedContent 
      };
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
    logger.error('Failed to submit annotation:', error);
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
      return formatAnnotationForClaude(annotation);
  }
}

function formatAsMarkdown(annotation: WingmanAnnotation): string {
  const lines = [
    '# Wingman Feedback',
    '',
    `**URL:** ${annotation.page.url}`,
    `**Timestamp:** ${new Date(annotation.createdAt).toLocaleString()}`,
    `**User Agent:** ${annotation.page.ua}`,
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

  if (annotation.media && annotation.media.screenshot) {
    lines.push('## Screenshot');
    lines.push('*Screenshot data attached as base64*');
    lines.push('');
  }

  return lines.join('\n');
}
