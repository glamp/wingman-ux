import type { WingmanAnnotation } from '@wingman/shared';
import { ConsoleCapture } from './console-capture';
import { NetworkCapture } from './network-capture';
import { createOverlay } from './overlay';

console.log('[Wingman] Content script loaded on:', window.location.href);

const consoleCapture = new ConsoleCapture();
const networkCapture = new NetworkCapture();
let overlayActive = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Wingman] Message received:', request);
  if (request.type === 'ACTIVATE_OVERLAY') {
    if (!overlayActive) {
      console.log('[Wingman] Activating overlay...');
      activateOverlay();
      sendResponse({ success: true });
    } else {
      console.log('[Wingman] Overlay already active');
      sendResponse({ success: false, reason: 'already_active' });
    }
    return true; // Keep message channel open for async response
  }
});

function activateOverlay() {
  try {
    overlayActive = true;
    console.log('[Wingman] Creating overlay UI...');
    const overlay = createOverlay({
    onSubmit: async (note: string, target: any) => {
      try {
        const screenshot = await captureScreenshot();
        const annotation = buildAnnotation(note, target, screenshot);
        const result = await submitAnnotation(annotation);
        console.log('Annotation submitted:', result);
        overlayActive = false;
      } catch (error) {
        console.error('[Wingman] Failed to submit feedback:', error);
        overlayActive = false;
      }
    },
    onCancel: () => {
      console.log('[Wingman] Overlay cancelled');
      overlayActive = false;
    },
  });
    console.log('[Wingman] Overlay created successfully');
  } catch (error) {
    console.error('[Wingman] Failed to create overlay:', error);
    overlayActive = false;
  }
}

async function captureScreenshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'CAPTURE_SCREENSHOT' },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

async function submitAnnotation(annotation: WingmanAnnotation): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'SUBMIT_ANNOTATION', payload: annotation },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

function buildAnnotation(
  note: string,
  target: any,
  screenshot: string
): WingmanAnnotation {
  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    note,
    page: {
      url: window.location.href,
      title: document.title,
      ua: navigator.userAgent,
      viewport: {
        w: window.innerWidth,
        h: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      },
    },
    target,
    media: {
      screenshot: {
        mime: 'image/png',
        dataUrl: screenshot,
      },
    },
    console: consoleCapture.getEntries(),
    errors: consoleCapture.getErrors(),
    network: networkCapture.getEntries(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}