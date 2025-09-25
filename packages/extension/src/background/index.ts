import type { WingmanAnnotation } from '@wingman/shared';
/**
 * Background scripts CAN use ES modules and imports from @wingman/shared
 * because they run as service workers in Manifest V3.
 *
 * Content scripts CANNOT use ES modules, so they must use the local duplicate
 * in src/utils/format-claude.ts instead.
 *
 * Now using the template engine for improved formatting with selected templates.
 */
import type { AnnotationTemplate, TemplateVariable } from '@wingman/shared';
import { createLogger, createTemplateEngine, defaultTemplate } from '@wingman/shared';
import type { EnvironmentConfig } from '../types/env';
import { getEnvironmentConfig } from '../utils/config';
import { ScreenshotHandler } from './screenshot-handler';
import { TunnelManager } from './tunnel-manager';

// Remote API URL constant
const REMOTE_API_URL = 'https://api.wingmanux.com';

interface Template {
  id: string;
  name: string;
  content: string;
  builtin: boolean;
  icon?: string;
}

// Global config reference
let extensionConfig: EnvironmentConfig | null = null;

// Create logger instance for background script
const logger = createLogger('Wingman:Background');

// Global tunnel manager instance
const tunnelManager = new TunnelManager();

// Template engine instance (will be initialized with config)
let templateEngine: any;

// Screenshot handler instance
let screenshotHandler: ScreenshotHandler;

// Get standard template variables (reuse from defaultTemplate)
function getStandardVariables(): TemplateVariable[] {
  return defaultTemplate.variables;
}

// Simple template mapping - just use the existing defaultTemplate for all
function getTemplateForId(templateId: string): AnnotationTemplate {
  const variables = getStandardVariables();

  switch (templateId) {
    case 'claude-code':
      return {
        ...defaultTemplate,
        id: 'claude-code',
        name: 'Claude Code',
      };

    case 'cursor':
      return {
        id: 'cursor',
        name: 'Cursor',
        description: 'Concise format for Cursor AI',
        builtIn: true,
        template: `## UI Issue Report

![Screenshot]({{screenshotUrl}})

{{#if userNote}}
### Issue Description
{{userNote}}
{{/if}}

### Element Details
{{#if targetSelector}}
- **Element:** \`{{targetSelector}}\`
{{/if}}
{{#if targetRect}}
- **Position:** {{targetRectX}},{{targetRectY}} ({{targetRectWidth}}×{{targetRectHeight}})
{{/if}}

### Page Context
- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}

{{#if hasReact}}
### Component Info
- **Component:** {{reactComponentName}}
- **Props:** \`{{reactPropsJson}}\`
- **State:** \`{{reactStateJson}}\`
{{/if}}

{{#if hasErrors}}
### Errors
{{#each errors}}
- {{message}}
{{/each}}
{{/if}}

**Fix this UI issue with specific code changes.**`,
        variables,
      };

    case 'github-copilot':
      return {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        description: 'GitHub issue format for Copilot',
        builtIn: true,
        template: `# UI Issue Report

## Description
{{#if userNote}}
{{userNote}}
{{/if}}

## Screenshot
![UI Issue]({{screenshotUrl}})

## Technical Details

### Element Information
{{#if targetSelector}}
- **CSS Selector:** \`{{targetSelector}}\`
{{/if}}
{{#if targetRect}}
- **Dimensions:** {{targetRectWidth}} × {{targetRectHeight}}
- **Position:** ({{targetRectX}}, {{targetRectY}})
{{/if}}

### Page Information
- **URL:** \`{{pageUrl}}\`
- **Title:** {{pageTitle}}
- **Viewport:** {{viewportWidth}} × {{viewportHeight}}

{{#if hasReact}}
### React Component
\`\`\`javascript
// Component: {{reactComponentName}}
// Props: {{reactPropsJson}}
// State: {{reactStateJson}}
\`\`\`
{{/if}}

{{#if hasErrors}}
### JavaScript Errors
\`\`\`
{{#each errors}}
{{message}}
{{stack}}
{{/each}}
\`\`\`
{{/if}}

## Expected Behavior
<!-- Describe what should happen -->

## Actual Behavior
<!-- Describe what currently happens -->

## Reproduction Steps
1. Navigate to {{pageUrl}}
2. <!-- Add steps to reproduce -->

---
**Environment:** {{userAgent}}
**Timestamp:** {{capturedAt}}`,
        variables,
      };

    case 'short':
      return {
        id: 'short',
        name: 'Short',
        description: 'Minimal format - just feedback and screenshot',
        builtIn: true,
        template: `{{#if userNote}}
**Feedback:** {{userNote}}
{{/if}}

![Screenshot]({{screenshotUrl}})`,
        variables,
      };

    case 'medium':
      return {
        id: 'medium',
        name: 'Medium',
        description: 'Balanced format with essential details',
        builtIn: true,
        template: `# UI Feedback

{{#if userNote}}
**User Comment:** {{userNote}}
{{/if}}

![Screenshot]({{screenshotUrl}})

## Element Details
{{#if targetSelector}}
- **Selector:** \`{{targetSelector}}\`
{{/if}}
{{#if targetRect}}
- **Size:** {{targetRectWidth}}×{{targetRectHeight}}
{{/if}}

{{#if hasReact}}
## React Component: {{reactComponentName}}
**Props:** \`{{reactPropsJson}}\`
**State:** \`{{reactStateJson}}\`
{{/if}}

## Page Info
- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}
- **Viewport:** {{viewportWidth}}×{{viewportHeight}}
- **Browser:** {{userAgent}}

{{#if hasErrors}}
## Errors ({{errorCount}})
{{#each errors}}
- {{message}}
{{/each}}
{{/if}}`,
        variables,
      };

    default:
      return defaultTemplate;
  }
}

// Initialize extension with environment-specific settings
async function initializeExtension() {
  try {
    extensionConfig = getEnvironmentConfig();

    // Initialize template engine with truncation configuration
    templateEngine = createTemplateEngine({
      truncationConfig: extensionConfig.dataCapture
        ? {
            console: { templateLimit: extensionConfig.dataCapture.console.templateLimit },
            network: { templateLimit: extensionConfig.dataCapture.network.templateLimit },
            errors: { templateLimit: extensionConfig.dataCapture.errors.templateLimit },
          }
        : undefined,
    });

    // Initialize screenshot handler
    screenshotHandler = new ScreenshotHandler(templateEngine);

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

    // Set up hot reload in development mode
    if (extensionConfig.environment === 'development' && extensionConfig.features.hotReload) {
      setupHotReload();
    }

    // Log initialization
    logger.info(`Service worker started - ${extensionConfig.environmentName} mode`);
    logger.debug('Config:', extensionConfig);
  } catch (error) {
    logger.error('Failed to initialize:', error);
  }
}

// Hot reload functionality for development
function setupHotReload() {
  let lastReloadTime = 0;
  let wsConnected = false;

  // Try WebSocket connection for HMR (port 9012)
  const HMR_PORT = 9012;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;

  function connectWebSocket() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      logger.debug('Max WebSocket reconnect attempts reached, falling back to file polling');
      return;
    }

    try {
      const ws = new WebSocket(`ws://localhost:${HMR_PORT}`);

      ws.onopen = () => {
        wsConnected = true;
        reconnectAttempts = 0;
        logger.info(`HMR WebSocket connected on port ${HMR_PORT}`);
      };

      ws.onmessage = (event) => {
        if (event.data === 'file-change') {
          logger.info('HMR: File change detected, reloading extension...');
          chrome.runtime.reload();
        }
      };

      ws.onerror = (error) => {
        logger.debug('HMR WebSocket error, will use file polling fallback');
      };

      ws.onclose = () => {
        wsConnected = false;
        logger.debug('HMR WebSocket disconnected');
        // Try to reconnect after a delay
        reconnectAttempts++;
        if (reconnectAttempts < maxReconnectAttempts) {
          setTimeout(connectWebSocket, 2000);
        }
      };
    } catch (error) {
      logger.debug('Failed to create WebSocket connection:', error);
    }
  }

  // Try WebSocket first
  connectWebSocket();

  // Fallback: Poll for reload trigger file changes
  setInterval(async () => {
    // Skip file polling if WebSocket is connected
    if (wsConnected) return;

    try {
      const response = await fetch(chrome.runtime.getURL('.reload'));
      const text = await response.text();
      const reloadTime = parseInt(text, 10);

      if (reloadTime > lastReloadTime) {
        lastReloadTime = reloadTime;
        logger.info('Hot reload triggered via file polling, reloading extension...');
        chrome.runtime.reload();
      }
    } catch (error) {
      // Silently ignore - file might not exist yet
    }
  }, 2000); // Check every 2 seconds instead of 1 to reduce overhead

  logger.info('Hot reload enabled - WebSocket on port 9012 with file polling fallback');
}

// Call initialization
initializeExtension();

// Inject console wrapper early on tab navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Inject when navigation starts (earliest possible moment)
  if (changeInfo.status === 'loading' && tab.url) {
    // Skip chrome:// and extension pages
    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('https://chrome.google.com/webstore')
    ) {
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['page-console-injector.js'],
        world: 'MAIN' as chrome.scripting.ExecutionWorld,
        injectImmediately: true,
      });
      logger.debug(`Injected console wrapper into tab ${tabId} at ${tab.url}`);
    } catch (error) {
      // This is expected for restricted pages
      logger.debug(`Could not inject console wrapper into tab ${tabId}:`, error);
    }
  }
});

interface MessageRequest {
  type:
    | 'CAPTURE_SCREENSHOT'
    | 'SUBMIT_ANNOTATION'
    | 'ACTIVATE_WINGMAN'
    | 'TUNNEL_CREATE'
    | 'TUNNEL_STOP'
    | 'TUNNEL_STATUS';
  payload?: any;
  targetPort?: number;
}

chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
  logger.debug('Message received:', request.type, request);

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

  // Handle tunnel messages
  if (request.type === 'TUNNEL_CREATE') {
    logger.info('Tunnel create request received with port:', request.targetPort);

    if (!request.targetPort) {
      logger.error('TUNNEL_CREATE: No target port provided');
      sendResponse({ success: false, error: 'No target port provided' });
      return false;
    }

    // Get relay URL from storage to pass to tunnel manager
    chrome.storage.local
      .get(['relayUrl'])
      .then(({ relayUrl }) => {
        // For tunnels, never use clipboard mode - always use actual server
        let finalRelayUrl = relayUrl;
        if (relayUrl === 'clipboard') {
          finalRelayUrl = extensionConfig?.relayUrl || 'https://api.wingmanux.com';
          logger.debug('Skipping clipboard mode for tunnel, using:', finalRelayUrl);
        } else {
          finalRelayUrl = relayUrl || extensionConfig?.relayUrl || 'https://api.wingmanux.com';
        }
        logger.debug('Using relay URL for tunnel:', finalRelayUrl);

        return tunnelManager.createTunnel(request.targetPort, finalRelayUrl);
      })
      .then((tunnel) => {
        logger.info('Tunnel created successfully:', tunnel);
        sendResponse({ success: true, tunnel });
      })
      .catch((error) => {
        logger.error('Failed to create tunnel:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to create tunnel',
        });
      });
    return true; // Will respond asynchronously
  }

  if (request.type === 'TUNNEL_STOP') {
    logger.info('Tunnel stop request received');

    try {
      tunnelManager.stopTunnel();
      logger.info('Tunnel stopped successfully');
      sendResponse({ success: true });
    } catch (error: any) {
      logger.error('Failed to stop tunnel:', error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to stop tunnel',
      });
    }
    return false; // Synchronous response
  }

  if (request.type === 'TUNNEL_STATUS') {
    logger.debug('Tunnel status request received');

    try {
      const tunnel = tunnelManager.getCurrentTunnel();
      logger.debug('Current tunnel status:', tunnel);
      sendResponse({ success: true, tunnel });
    } catch (error: any) {
      logger.error('Failed to get tunnel status:', error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to get tunnel status',
      });
    }
    return false; // Synchronous response
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
    // 1. Get settings from storage (there's always a selection)
    const stored = await chrome.storage.local.get(['relayUrl', 'selectedTemplateId']);
    const relayUrl = stored.relayUrl || 'https://api.wingmanux.com';
    const templateId = stored.selectedTemplateId || 'claude-code';

    logger.info('Submitting annotation with mode:', relayUrl);

    // 2. Handle based on mode
    if (relayUrl === 'clipboard') {
      // CLIPBOARD MODE: Save locally and copy to clipboard

      // a. Try to save screenshot to Downloads folder
      let screenshotPath: string | null = null;
      if (annotation.media?.screenshot?.dataUrl) {
        screenshotPath = await screenshotHandler.saveToDownloads(annotation.media.screenshot.dataUrl);
        logger.info('Screenshot save result:', screenshotPath);
      }

      // b. Determine the screenshot URL for the template
      let screenshotUrl: string;
      if (screenshotPath) {
        // Use local file path
        screenshotUrl = `file://${screenshotPath}`;
        logger.info('Using local file for screenshot:', screenshotUrl);
      } else {
        // Fall back to base64 data URL
        screenshotUrl = annotation.media?.screenshot?.dataUrl || '';
        logger.warn('Using base64 fallback for screenshot');
      }

      // c. Render the template with the correct screenshot URL
      const template = getTemplateForId(templateId);
      const contextOverride = {
        relayUrl: '', // Not needed for clipboard mode
        screenshotUrl: screenshotUrl // Override the screenshot URL directly
      };
      const content = templateEngine.render(annotation, template, contextOverride);

      // d. Return for clipboard copy
      return {
        success: true,
        message: screenshotPath
          ? 'Screenshot saved to Downloads folder and copied to clipboard'
          : 'Copied to clipboard',
        clipboardContent: content,
        screenshotPath: screenshotPath
      };

    } else {
      // SERVER MODE: Submit to remote or local server
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
    }
  } catch (error) {
    logger.error('Failed to submit annotation:', error);
    throw error;
  }
}
