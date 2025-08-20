import type { WingmanAnnotation, RelayResponse } from '@wingman/shared';
import { ulid } from 'ulid';
import { ConsoleCapture } from './console-capture';
import { NetworkCapture } from './network-capture';
import { createOverlay, createSuccessNotification } from './overlay';
import { SDKBridge } from './sdk-bridge';

console.log('[Wingman] Content script loaded on:', window.location.href);

const consoleCapture = new ConsoleCapture();
const networkCapture = new NetworkCapture();
const sdkBridge = new SDKBridge({ debug: true });
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
      onSubmit: async (note: string, target: any, element?: HTMLElement) => {
        try {
          const screenshot = await captureScreenshot();

          // Get React data if element is provided
          let reactData = undefined;
          if (element) {
            console.log('[Wingman] Extracting React data for element...');
            reactData = await sdkBridge.getReactData(element);

            // Also try to get a robust selector from SDK
            const robustSelector = await sdkBridge.getRobustSelector(element);
            if (robustSelector) {
              target.selector = robustSelector;
            }
          }

          const annotation = buildAnnotation(note, target, screenshot, reactData);

          // Log the annotation payload (with truncated screenshot)
          const logPayload = {
            ...annotation,
            media: {
              ...annotation.media,
              screenshot: {
                ...annotation.media.screenshot,
                dataUrl: annotation.media.screenshot.dataUrl.substring(0, 100) + '...[truncated]',
              },
            },
          };
          console.log('[Wingman] Sending annotation payload:', logPayload);

          const result = await submitAnnotation(annotation);
          console.log('[Wingman] Annotation submitted successfully:', result);
          overlayActive = false;

          // Check if we should show the preview URL
          const { showPreviewUrl = true } = await chrome.storage.local.get('showPreviewUrl');
          
          if (showPreviewUrl && result.previewUrl) {
            createSuccessNotification({
              previewUrl: result.previewUrl,
              onClose: () => {
                console.log('[Wingman] Success notification closed');
              }
            });
          }
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
    chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

async function submitAnnotation(annotation: WingmanAnnotation): Promise<RelayResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'SUBMIT_ANNOTATION', payload: annotation }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

function buildAnnotation(
  note: string,
  target: any,
  screenshot: string,
  reactData?: any
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
    react: reactData,
  };
}

function generateId(): string {
  return ulid();
}
