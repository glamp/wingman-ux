import type { RelayResponse, WingmanAnnotation } from '@wingman/shared';
import { ulid } from 'ulid';
import { ConsoleCapture } from './console-capture';
import { NetworkCapture } from './network-capture';
import { SDKBridge } from './sdk-bridge';
// Import React components directly
import { mountReactOverlay, mountSuccessNotification } from '../content-ui/index';
import { createLogger } from '../utils/logger';

const logger = createLogger('Wingman:Content');
logger.info('Content script loaded on:', window.location.href);

const consoleCapture = new ConsoleCapture();
const networkCapture = new NetworkCapture();
const sdkBridge = new SDKBridge({ debug: false }); // Use logger instead of debug flag
let overlayActive = false;
let overlayCleanup: (() => void) | null = null;

function handleMessage(request: any, sender: any, sendResponse: any) {
  logger.debug('Message received:', request);
  if (request.type === 'ACTIVATE_OVERLAY') {
    if (!overlayActive) {
      logger.debug('Activating overlay...');
      activateOverlay();
      sendResponse({ success: true });
    } else {
      logger.debug('Overlay already active');
      sendResponse({ success: false, reason: 'already_active' });
    }
    return true; // Keep message channel open for async response
  }
}

// Set up listener if not imported by wrapper
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener(handleMessage);
}

function deactivateOverlay() {
  overlayActive = false;
  if (overlayCleanup) {
    overlayCleanup();
    overlayCleanup = null;
  }
  logger.debug('Overlay deactivated');
}

function activateOverlay() {
  try {
    // Clean up any existing overlay first
    if (overlayCleanup) {
      logger.debug('Cleaning up existing overlay...');
      overlayCleanup();
      overlayCleanup = null;
    }
    
    overlayActive = true;
    logger.debug('Creating React overlay...');
    
    overlayCleanup = mountReactOverlay({
      onSubmit: async (note: string, target: any, element?: HTMLElement) => {
        try {
          const screenshot = await captureScreenshot();

          // Get React data if element is provided
          let reactData = undefined;
          if (element) {
            logger.debug('Extracting React data for element...');
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
          logger.debug('Sending annotation payload:', logPayload);

          const result = await submitAnnotation(annotation);
          logger.info('Annotation submitted successfully:', result);
          overlayActive = false;
          overlayCleanup = null;  // Reset cleanup reference since overlay unmounts itself

          // Show appropriate success notification
          const { showPreviewUrl = true } = await chrome.storage.local.get('showPreviewUrl');
          
          // Handle clipboard mode - copy to clipboard in content script context
          if (result.message === 'Copied to clipboard' && result.clipboardContent) {
            // Use the more reliable textarea method as primary approach
            const textArea = document.createElement('textarea');
            textArea.value = result.clipboardContent;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
              const successful = document.execCommand('copy');
              if (!successful) {
                logger.error('Copy command returned false');
              }
            } catch (err) {
              logger.error('Failed to copy to clipboard:', err);
            }
            
            document.body.removeChild(textArea);
          }
          
          if (result.message === 'Copied to clipboard') {
            // Clipboard mode - always show copy notification
            if (mountSuccessNotification) {
              mountSuccessNotification({
                mode: 'clipboard',
                annotation,
                onClose: () => {
                  logger.debug('Success notification closed');
                },
              });
            }
          } else if (showPreviewUrl && result.previewUrl) {
            // Server mode - show preview URL if enabled
            if (mountSuccessNotification) {
              mountSuccessNotification({
                previewUrl: result.previewUrl,
                annotation,
                mode: 'server',
                onClose: () => {
                  logger.debug('Success notification closed');
                },
              });
            }
          }
        } catch (error) {
          logger.error('Failed to submit feedback:', error);
          overlayActive = false;
          overlayCleanup = null;  // Reset cleanup reference
        }
      },
      onCancel: () => {
        logger.debug('Overlay cancelled');
        overlayActive = false;
        overlayCleanup = null;  // Reset cleanup reference since it's already been called
      },
    });
    
    logger.debug('Overlay created successfully');
  } catch (error) {
    logger.error('Failed to create overlay:', error);
    overlayActive = false;
    overlayCleanup = null;
  }
}

async function captureScreenshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response) {
        resolve(response);
      } else {
        reject(new Error('Failed to capture screenshot'));
      }
    });
  });
}

async function submitAnnotation(annotation: WingmanAnnotation): Promise<RelayResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'SUBMIT_ANNOTATION', payload: annotation }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response.error) {
        reject(new Error(response.error));
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
  const annotation: WingmanAnnotation = {
    id: ulid(),
    createdAt: new Date().toISOString(),
    note,
    target,
    page: {
      url: window.location.href,
      title: document.title,
      ua: navigator.userAgent,
      viewport: {
        w: window.innerWidth,
        h: window.innerHeight,
        dpr: window.devicePixelRatio,
      },
    },
    media: {
      screenshot: {
        dataUrl: screenshot,
        timestamp: new Date().toISOString(),
      },
    },
    console: consoleCapture.getEntries(),
    network: networkCapture.getEntries(),
    errors: [],
  };

  if (reactData) {
    annotation.react = reactData;
  }

  return annotation;
}

// Listen for keyboard shortcut from webpage
document.addEventListener('keydown', (e) => {
  // Option+W (Mac) or Alt+W (Windows/Linux)
  if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Wingman] Keyboard shortcut activated');
    if (!overlayActive) {
      activateOverlay();
    }
  }
});