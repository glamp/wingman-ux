import type { RelayResponse, WingmanAnnotation } from '@wingman/shared';
import { ulid } from 'ulid';
import { ConsoleCapture } from './console-capture';
import { NetworkCapture } from './network-capture';
import { SDKBridge } from './sdk-bridge';
import { createLogger } from '../utils/logger';
import { mountReactOverlay, mountSuccessNotification } from '../content-ui/overlay';

const logger = createLogger('Wingman:Content');
logger.info('Content script loaded on:', window.location.href);

let consoleCapture: ConsoleCapture | null = null;
let networkCapture: NetworkCapture | null = null;
let sdkBridge: SDKBridge | null = null;

try {
  consoleCapture = new ConsoleCapture();
  logger.debug('ConsoleCapture initialized successfully');
} catch (error) {
  logger.error('Failed to initialize ConsoleCapture:', error);
}

try {
  networkCapture = new NetworkCapture();
  logger.debug('NetworkCapture initialized successfully');
} catch (error) {
  logger.error('Failed to initialize NetworkCapture:', error);
}

try {
  sdkBridge = new SDKBridge({ debug: false }); // Use logger instead of debug flag
  logger.debug('SDKBridge initialized successfully');
} catch (error) {
  logger.error('Failed to initialize SDKBridge:', error);
}
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

async function activateOverlay() {
  try {
    // Clean up any existing overlay first
    if (overlayCleanup) {
      logger.debug('Cleaning up existing overlay...');
      overlayCleanup();
      overlayCleanup = null;
    }

    overlayActive = true;
    logger.debug('Creating React overlay...');

    // Use static import to avoid temporal dead zone in IIFE bundle
    overlayCleanup = mountReactOverlay({
      onSubmit: async (note: string, target: any, element?: HTMLElement) => {
        try {
          // STEP 1: Extract all data while DOM is stable
          logger.debug('Extracting element data before unmounting...');
          let reactData = undefined;
          let robustSelector = undefined;

          if (element) {
            // Get React data from the element
            logger.debug('Extracting React data for element...');
            reactData = sdkBridge ? await sdkBridge.getReactData(element) : null;

            // Get robust selector from SDK
            robustSelector = sdkBridge ? await sdkBridge.getRobustSelector(element) : null;
            if (robustSelector) {
              target.selector = robustSelector;
            }
          }

          // STEP 2: Remove overlay completely from DOM
          logger.debug('Removing overlay from DOM...');

          // Unmount the React component and remove host element
          if (overlayCleanup) {
            overlayCleanup();
            overlayCleanup = null;
            overlayActive = false;
          }

          // Remove any other Wingman elements
          const overlayHost = document.getElementById('wingman-overlay-host');
          if (overlayHost) {
            overlayHost.remove();
          }

          const successHost = document.getElementById('wingman-success-host');
          if (successHost) {
            successHost.remove();
          }

          // STEP 3: Force reflow and wait for DOM to settle
          document.body.offsetHeight; // Force synchronous reflow
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify overlay is actually gone
          const checkHost = document.getElementById('wingman-overlay-host');
          if (checkHost) {
            logger.warn('Overlay host still present after removal, forcing removal...');
            checkHost.remove();
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          // STEP 4: Capture clean screenshot
          logger.debug('Capturing screenshot with clean DOM...');
          const screenshot = await captureScreenshot();

          // STEP 5: Build annotation with pre-extracted data
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
          // Overlay already unmounted before screenshot, no need to clean up again

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
          // Clean up if not already done
          if (overlayCleanup) {
            overlayCleanup();
            overlayCleanup = null;
          }
          overlayActive = false;
        }
      },
      onCancel: () => {
        logger.debug('Overlay cancelled');
        overlayActive = false;
        overlayCleanup = null; // Reset cleanup reference since it's already been called
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
    console: consoleCapture?.getEntries() || [],
    network: networkCapture?.getEntries() || [],
    errors: consoleCapture?.getErrors() || [],
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
