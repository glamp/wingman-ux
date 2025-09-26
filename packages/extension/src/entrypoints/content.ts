import { mountReactOverlay, mountSuccessNotification } from '@/content-ui/overlay';
import type { WingmanAnnotation } from '@wingman/shared';
import { ulid } from 'ulid';
import { ConsoleCapture } from '@/content/console-capture';
import { NetworkCapture } from '@/content/network-capture';
import { SDKBridge } from '@/content/sdk-bridge';

// Helper function for safe method calls with optional logging
const safeExtract = <T>(fn: () => T, fallback: T, context?: string): T => {
  try {
    return fn() || fallback;
  } catch (err) {
    if (context) console.warn(`Failed to extract ${context}:`, err);
    return fallback;
  }
};

// Async version of safeExtract
const safeExtractAsync = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: string
): Promise<T> => {
  try {
    return (await fn()) || fallback;
  } catch (err) {
    if (context) console.warn(`Failed to extract ${context}:`, err);
    return fallback;
  }
};

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('WXT Content script loaded on:', window.location.href);

    // Initialize capture systems
    let consoleCapture: ConsoleCapture | null = null;
    let networkCapture: NetworkCapture | null = null;
    let sdkBridge: SDKBridge | null = null;

    try {
      consoleCapture = new ConsoleCapture();
      networkCapture = new NetworkCapture();
      sdkBridge = new SDKBridge({ debug: false });
      console.log('Capture systems initialized successfully');
    } catch (error) {
      console.error('Failed to initialize capture systems:', error);
    }

    let overlayActive = false;
    let currentOverlayCleanup: (() => void) | null = null;

    // Listen for messages from background/popup scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request);

      if (request.type === 'ACTIVATE_OVERLAY') {
        // If overlay is already active, clean it up first
        if (overlayActive && currentOverlayCleanup) {
          console.log('Cleaning up existing overlay before re-activation...');
          currentOverlayCleanup();
          currentOverlayCleanup = null;
          overlayActive = false;
          // Small delay to ensure DOM cleanup
          setTimeout(() => {
            chrome.runtime.sendMessage({ type: 'ACTIVATE_OVERLAY' });
          }, 100);
          sendResponse({ success: true, reactivating: true });
          return true;
        }

        console.log('Activating React overlay...');
        overlayActive = true;

        // Mount React overlay with Shadow DOM
        currentOverlayCleanup = mountReactOverlay({
          onSubmit: async (note: string, target: any, element?: HTMLElement) => {
            try {
              console.log('Processing overlay submission:', { note, target });

              // Get settings from storage
              const settings = await chrome.storage.local.get(['relayUrl']);
              const relayUrl = settings.relayUrl || 'clipboard';

              // Extract React data safely
              const reactData = await safeExtractAsync(
                async () => element && sdkBridge ? sdkBridge.getReactData(element) : null,
                null,
                'React data'
              );

              // Create annotation with safe extraction
              const annotation: WingmanAnnotation = {
                id: ulid(),
                note,
                target,
                page: {
                  url: window.location.href,
                  title: document.title,
                  viewport: {
                    w: window.innerWidth,
                    h: window.innerHeight,
                    dpr: window.devicePixelRatio
                  },
                  ua: navigator.userAgent
                },
                react: reactData,
                errors: safeExtract(() => consoleCapture?.getErrors(), [], 'errors'),
                console: safeExtract(() => consoleCapture?.getEntries(), [], 'console logs'),
                network: safeExtract(() => networkCapture?.getEntries(), [], 'network requests'),
                createdAt: new Date().toISOString()
              };

              // Clean up overlay first
              if (currentOverlayCleanup) {
                currentOverlayCleanup();
                currentOverlayCleanup = null;
              }
              overlayActive = false;

              // Send to background for processing and wait for response
              chrome.runtime.sendMessage(
                {
                  type: 'PROCESS_ANNOTATION',
                  annotation,
                  relayUrl
                },
                async (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('Failed to process annotation:', chrome.runtime.lastError);
                    return;
                  }

                  if (response?.success) {
                    console.log('Annotation submitted successfully:', response);

                    // Show success notification based on mode
                    let notificationCleanup: (() => void) | null = null;

                    if (response.mode === 'clipboard') {
                      // Copy formatted text to clipboard
                      try {
                        if (response.text) {
                          await navigator.clipboard.writeText(response.text);
                          console.log('Annotation copied to clipboard');
                        }
                      } catch (error) {
                        console.error('Clipboard copy failed:', error);
                        // Fallback method using textarea
                        const textarea = document.createElement('textarea');
                        textarea.value = response.text || '';
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                      }

                      // Show clipboard success notification
                      notificationCleanup = mountSuccessNotification({
                        mode: 'clipboard',
                        annotation,
                        onClose: () => {
                          console.log('Clipboard notification closed');
                          if (notificationCleanup) {
                            notificationCleanup();
                          }
                        }
                      });
                    } else if (response.mode === 'server' && response.previewUrl) {
                      // Show server success notification with preview URL
                      notificationCleanup = mountSuccessNotification({
                        mode: 'server',
                        previewUrl: response.previewUrl,
                        annotation,
                        onClose: () => {
                          console.log('Server notification closed');
                          if (notificationCleanup) {
                            notificationCleanup();
                          }
                        }
                      });
                    }

                    // Auto-dismiss notification after 5 seconds
                    if (notificationCleanup) {
                      setTimeout(() => {
                        notificationCleanup();
                      }, 5000);
                    }
                  } else {
                    console.error('Annotation processing failed:', response?.error || 'Unknown error');
                  }
                }
              );
            } catch (error) {
              console.error('Failed to process annotation:', error);
              // Clean up overlay on error
              if (currentOverlayCleanup) {
                currentOverlayCleanup();
                currentOverlayCleanup = null;
              }
              overlayActive = false;
            }
          },
          onCancel: () => {
            console.log('Overlay cancelled');
            if (currentOverlayCleanup) {
              currentOverlayCleanup();
              currentOverlayCleanup = null;
            }
            overlayActive = false;
          }
        });

        sendResponse({ success: true });
        return true;
      }

      return false;
    });

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isShortcut = isMac
        ? (event.metaKey && event.shiftKey && event.key === 'K')
        : (event.altKey && event.shiftKey && event.key === 'K');

      if (isShortcut && !overlayActive) {
        event.preventDefault();
        event.stopPropagation();

        // Trigger overlay activation
        chrome.runtime.sendMessage({ type: 'ACTIVATE_OVERLAY' }).then(() => {
          // Message sent to background, which will route back to this content script
        });
      }

      // ESC to cancel overlay
      if (event.key === 'Escape' && overlayActive) {
        if (currentOverlayCleanup) {
          currentOverlayCleanup();
          currentOverlayCleanup = null;
        }
        overlayActive = false;
      }
    });
  },
});