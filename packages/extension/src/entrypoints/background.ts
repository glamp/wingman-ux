import { TunnelManager } from '../background/tunnel-manager';
import { ScreenshotHandler } from '../background/screenshot-handler';
import { createTemplateEngine, defaultTemplate, builtInTemplates, getBuiltInTemplate } from '@wingman/shared';
import type { WingmanAnnotation, AnnotationTemplate } from '@wingman/shared';

// Global tunnel manager instance
const tunnelManager = new TunnelManager();

// Template engine for formatting annotations
const templateEngine = createTemplateEngine();

// Screenshot handler for clipboard mode
const screenshotHandler = new ScreenshotHandler(templateEngine);

export default defineBackground(() => {
  console.log('Background script started with WXT!');

  // Extension icon click handler
  chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked');
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
        .catch((error) => console.error('Failed to send message:', error));
    }
  });

  // Keyboard shortcut handler
  chrome.commands.onCommand.addListener((command) => {
    console.log('Keyboard shortcut pressed:', command);
    if (command === 'activate-overlay') {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
            .catch((error) => console.error('Failed to send message:', error));
        }
      });
    }
  });

  // Message handler for communication with popup and content scripts
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.type);

    // Handle ACTIVATE_OVERLAY from popup or content script
    if (request.type === 'ACTIVATE_OVERLAY') {
      // If it's from a tab (content script), send it back to that tab
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'ACTIVATE_OVERLAY' })
          .then((response) => sendResponse(response))
          .catch((error) => {
            console.error('Failed to activate overlay:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      } else {
        // It's from the popup - send to the active tab
        chrome.tabs.query({ active: true, currentWindow: true })
          .then(([activeTab]) => {
            if (!activeTab?.id) {
              throw new Error('No active tab found');
            }

            // Check if URL is valid for content scripts
            const url = activeTab.url || '';
            if (url.startsWith('chrome://') ||
                url.startsWith('chrome-extension://') ||
                url.startsWith('edge://') ||
                url.startsWith('about:') ||
                url === '' ||
                url === 'chrome://newtab/') {
              throw new Error('Cannot capture feedback on browser system pages');
            }

            // Try to send message to content script
            return chrome.tabs.sendMessage(activeTab.id, { type: 'ACTIVATE_OVERLAY' });
          })
          .then((response) => {
            sendResponse({ success: true, ...response });
          })
          .catch((error) => {
            console.error('Failed to activate overlay:', error);

            // Try injecting content script if it doesn't exist
            chrome.tabs.query({ active: true, currentWindow: true })
              .then(([activeTab]) => {
                if (activeTab?.id) {
                  // Try to inject the content script
                  return chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['content-scripts/content.js']
                  });
                }
              })
              .then(() => {
                // Try sending message again after injection
                return chrome.tabs.query({ active: true, currentWindow: true });
              })
              .then(([activeTab]) => {
                if (activeTab?.id) {
                  return chrome.tabs.sendMessage(activeTab.id, { type: 'ACTIVATE_OVERLAY' });
                }
              })
              .then((response) => {
                sendResponse({ success: true, ...response });
              })
              .catch((finalError) => {
                sendResponse({ success: false, error: finalError.message || 'Failed to activate overlay' });
              });
          });
        return true;
      }
    }

    // Handle annotation processing
    if (request.type === 'PROCESS_ANNOTATION') {
      processAnnotation(request.annotation, request.relayUrl, request.screenshot, request.templateId)
        .then((result) => sendResponse(result))
        .catch((error) => {
          console.error('Failed to process annotation:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    // Handle screenshot capture
    if (request.type === 'CAPTURE_SCREENSHOT') {
      chrome.tabs.captureVisibleTab({ format: 'png' })
        .then((dataUrl) => {
          sendResponse(dataUrl);
        })
        .catch((error) => {
          console.error('Screenshot failed:', error);
          sendResponse(null);
        });
      return true; // Will respond asynchronously
    }

    // Handle screenshot capture only (for pre-capture before dialog)
    if (request.type === 'CAPTURE_SCREENSHOT_ONLY') {
      chrome.tabs.captureVisibleTab({ format: 'png' })
        .then((dataUrl) => {
          console.log('Screenshot pre-captured successfully');
          sendResponse({ success: true, screenshot: dataUrl });
        })
        .catch((error) => {
          console.error('Screenshot pre-capture failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Will respond asynchronously
    }

    // Handle tunnel messages
    if (request.type === 'TUNNEL_CREATE') {
      console.log('Tunnel create request received with port:', request.targetPort);

      if (!request.targetPort) {
        console.error('TUNNEL_CREATE: No target port provided');
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
            finalRelayUrl = 'https://api.wingmanux.com';
            console.log('Skipping clipboard mode for tunnel, using:', finalRelayUrl);
          } else {
            finalRelayUrl = relayUrl || 'https://api.wingmanux.com';
          }
          console.log('Using relay URL for tunnel:', finalRelayUrl);

          return tunnelManager.createTunnel(request.targetPort, finalRelayUrl);
        })
        .then((tunnel) => {
          console.log('Tunnel created successfully:', tunnel);
          sendResponse({ success: true, tunnel });
        })
        .catch((error) => {
          console.error('Failed to create tunnel:', error);
          sendResponse({
            success: false,
            error: error.message || 'Failed to create tunnel',
          });
        });
      return true; // Will respond asynchronously
    }

    if (request.type === 'TUNNEL_STOP') {
      console.log('Tunnel stop request received');

      try {
        tunnelManager.stopTunnel();
        console.log('Tunnel stopped successfully');
        sendResponse({ success: true });
      } catch (error: any) {
        console.error('Failed to stop tunnel:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to stop tunnel',
        });
      }
      return false; // Synchronous response
    }

    if (request.type === 'TUNNEL_STATUS') {
      console.log('Tunnel status request received');

      try {
        const tunnel = tunnelManager.getCurrentTunnel();
        console.log('Current tunnel status:', tunnel);
        sendResponse({ success: true, tunnel });
      } catch (error: any) {
        console.error('Failed to get tunnel status:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to get tunnel status',
        });
      }
      return false; // Synchronous response
    }

    return false;
  });

  // Process annotation with screenshot and template formatting
  async function processAnnotation(annotation: any, relayUrl: string, preCapturedScreenshot?: string, templateId?: string) {
    try {
      console.log('Processing annotation:', { relayUrl, hasPreCapturedScreenshot: !!preCapturedScreenshot, templateId });

      // Use pre-captured screenshot if available, otherwise capture now
      let screenshotDataUrl = '';
      if (preCapturedScreenshot) {
        screenshotDataUrl = preCapturedScreenshot;
        console.log('Using pre-captured screenshot');
      } else {
        // Fallback to capturing now (for backward compatibility)
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
          screenshotDataUrl = dataUrl;
          console.log('Screenshot captured successfully (fallback)');
        } catch (error) {
          console.error('Screenshot capture failed:', error);
        }
      }

      // Add screenshot to annotation structure (matching WingmanAnnotation type)
      const annotationWithScreenshot = {
        ...annotation,
        media: {
          screenshot: {
            dataUrl: screenshotDataUrl,
            timestamp: Date.now()
          }
        }
      };

      if (relayUrl === 'clipboard') {
        // CLIPBOARD MODE: Download screenshot and use local file path

        // Get the selected template or use default
        let selectedTemplate: AnnotationTemplate = defaultTemplate;

        if (templateId) {
          // Try to find built-in template first
          const builtIn = getBuiltInTemplate(templateId);
          if (builtIn) {
            selectedTemplate = builtIn;
          } else {
            // Try to get custom template from storage
            try {
              const storage = await chrome.storage.local.get(['wingman-templates']);
              if (storage['wingman-templates']) {
                const templateState = JSON.parse(storage['wingman-templates']);
                const customTemplates = templateState.state?.customTemplates || [];
                const custom = customTemplates.find((t: any) => t.id === templateId);
                if (custom) {
                  selectedTemplate = custom;
                }
              }
            } catch (error) {
              console.error('Failed to load custom template:', error);
            }
          }
        }

        console.log('Using template:', selectedTemplate.name);

        // Process screenshot for clipboard mode
        const { content, localPath } = await screenshotHandler.processForClipboard(
          annotationWithScreenshot,
          selectedTemplate,
          relayUrl
        );

        console.log('Annotation formatted for clipboard', {
          hasLocalPath: !!localPath
        });

        return {
          success: true,
          mode: 'clipboard',
          text: content,
          screenshotPath: localPath
        };

      } else {
        // SERVER MODE: Send to remote or local server
        // Include screenshot as base64 in the payload
        const response = await fetch(`${relayUrl}/annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(annotationWithScreenshot)
        });

        if (response.ok) {
          console.log('Annotation sent to server successfully');
          return {
            success: true,
            mode: 'server',
            previewUrl: `${relayUrl}/share/${annotation.id}`
          };
        } else {
          throw new Error(`Server responded with ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Annotation processing failed:', error);
      throw error;
    }
  }

});