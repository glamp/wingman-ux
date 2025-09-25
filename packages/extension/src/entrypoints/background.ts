import { TunnelManager } from '../background/tunnel-manager';

// Global tunnel manager instance
const tunnelManager = new TunnelManager();

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

    // Route ACTIVATE_OVERLAY from content script back to content script
    if (request.type === 'ACTIVATE_OVERLAY' && sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'ACTIVATE_OVERLAY' })
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error('Failed to activate overlay:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    // Handle annotation processing
    if (request.type === 'PROCESS_ANNOTATION') {
      processAnnotation(request.annotation, request.relayUrl, request.templateId)
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
  async function processAnnotation(annotation: any, relayUrl: string, templateId: string) {
    try {
      console.log('Processing annotation:', { relayUrl, templateId });

      // Capture screenshot
      let screenshotUrl = '';
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
        screenshotUrl = dataUrl;
        console.log('Screenshot captured successfully');
      } catch (error) {
        console.error('Screenshot capture failed:', error);
      }

      // Add screenshot to annotation
      const annotationWithScreenshot = {
        ...annotation,
        screenshotUrl
      };

      if (relayUrl === 'clipboard') {
        // Format annotation for clipboard
        const formattedText = await formatAnnotation(annotationWithScreenshot, templateId);
        console.log('Annotation formatted for clipboard');
        return { success: true, mode: 'clipboard', text: formattedText };
      } else {
        // Send to server
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

  // Format annotation for clipboard
  async function formatAnnotation(annotation: any, templateId: string) {
    // Get template from storage
    const settings = await chrome.storage.local.get(['customTemplates']);
    const customTemplates = settings.customTemplates || [];

    // Find template (built-in templates would need to be imported here)
    let template = customTemplates.find((t: any) => t.id === templateId);

    // Fallback to simple format if template not found
    return template?.content || formatAnnotationSimple(annotation);
  }

  // Simple annotation formatter (fallback)
  function formatAnnotationSimple(annotation: any): string {
    return `# UI Feedback

**Note**: ${annotation.note}

**Page**: ${annotation.page.title}
**URL**: ${annotation.page.url}

**Captured**: ${new Date(annotation.createdAt).toLocaleString()}`;
  }
});