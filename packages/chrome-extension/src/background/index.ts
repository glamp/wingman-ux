import type { WingmanAnnotation } from '@wingman/shared';

console.log('[Wingman Background] Service worker started');

interface MessageRequest {
  type: 'CAPTURE_SCREENSHOT' | 'SUBMIT_ANNOTATION' | 'ACTIVATE_WINGMAN';
  payload?: any;
}

chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
  console.log('[Wingman Background] Message received:', request.type);
  
  if (request.type === 'CAPTURE_SCREENSHOT') {
    console.log('[Wingman Background] Capturing screenshot...');
    captureScreenshot()
      .then(dataUrl => {
        console.log('[Wingman Background] Screenshot captured');
        sendResponse(dataUrl);
      })
      .catch(error => {
        console.error('[Wingman Background] Screenshot failed:', error);
        sendResponse(null);
      });
    return true; // Will respond asynchronously
  }

  if (request.type === 'SUBMIT_ANNOTATION') {
    console.log('[Wingman Background] Submitting annotation...');
    submitAnnotation(request.payload)
      .then(result => {
        console.log('[Wingman Background] Annotation submitted:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('[Wingman Background] Submission failed:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  console.log('[Wingman Background] Extension icon clicked');
  if (tab.id) {
    console.log('[Wingman Background] Sending activate message to tab:', tab.id);
    chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
      .catch(error => console.error('[Wingman Background] Failed to send message:', error));
  }
});

chrome.commands.onCommand.addListener((command) => {
  console.log('[Wingman Background] Keyboard shortcut pressed:', command);
  if (command === '_execute_action') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        console.log('[Wingman Background] Sending activate message via shortcut to tab:', tab.id);
        chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
          .catch(error => console.error('[Wingman Background] Failed to send message:', error));
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
    const { relayUrl = 'http://localhost:8787' } = await chrome.storage.local.get('relayUrl');
    
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