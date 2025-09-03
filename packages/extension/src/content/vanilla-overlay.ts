// Vanilla JS implementation of the overlay functionality
import type { RelayResponse, WingmanAnnotation } from '@wingman/shared';
import { ulid } from 'ulid';
import { ConsoleCapture } from './console-capture';
import { NetworkCapture } from './network-capture';
import { SDKBridge } from './sdk-bridge';
import { createLogger } from '../utils/logger';

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
  sdkBridge = new SDKBridge({ debug: false });
  logger.debug('SDKBridge initialized successfully');
} catch (error) {
  logger.error('Failed to initialize SDKBridge:', error);
}

let overlayActive = false;
let overlayState: {
  overlay?: HTMLElement;
  selectedElement?: HTMLElement;
  selectedRect?: DOMRect;
  notePanel?: HTMLElement;
} = {};

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
    return true;
  }
}

// Set up listener
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener(handleMessage);
  logger.debug('Message listener registered');
}

function activateOverlay() {
  if (overlayActive) return;
  
  overlayActive = true;
  logger.debug('Creating vanilla overlay...');
  
  createOverlayElements();
  addEventListeners();
  
  logger.debug('Overlay created successfully');
}

function createOverlayElements() {
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'wingman-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    pointer-events: none;
    background: transparent;
  `;
  
  document.body.appendChild(overlay);
  overlayState.overlay = overlay;
  
  // Add instructional text with crystal clear rendering
  const instruction = document.createElement('div');
  instruction.id = 'wingman-instruction';
  instruction.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #0084ff;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.2;
    box-shadow: 0 4px 12px rgba(0, 132, 255, 0.3);
    z-index: 2147483647;
    pointer-events: none;
    transition: opacity 0.3s ease, transform 0.3s ease;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: 'kern' 1;
    transform-origin: center;
  `;
  instruction.textContent = '🎯 Click any element to give feedback • Press Esc to cancel';
  
  overlay.appendChild(instruction);
  
  // Auto-hide instruction after 3 seconds
  setTimeout(() => {
    if (instruction.parentNode) {
      instruction.style.opacity = '0';
      instruction.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => {
        instruction.remove();
      }, 300);
    }
  }, 3000);
}

function addEventListeners() {
  // Mouse move for hover effects
  document.addEventListener('mousemove', handleMouseMove);
  
  // Click to select element
  document.addEventListener('click', handleElementClick, true);
  
  // Escape to cancel
  document.addEventListener('keydown', handleKeyDown);
}

function removeEventListeners() {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleElementClick, true);
  document.removeEventListener('keydown', handleKeyDown);
}

let hoveredElement: HTMLElement | null = null;

function handleMouseMove(e: MouseEvent) {
  if (!overlayActive || overlayState.notePanel) return;
  
  const target = e.target as HTMLElement;
  
  // Skip our overlay elements
  if (target.id === 'wingman-overlay' || target.closest('#wingman-overlay')) {
    return;
  }
  
  // Remove previous highlight
  if (hoveredElement && hoveredElement !== target) {
    removeElementHighlight(hoveredElement);
  }
  
  // Add highlight to new element
  if (target !== hoveredElement) {
    addElementHighlight(target);
    hoveredElement = target;
  }
}

function addElementHighlight(element: HTMLElement) {
  // Remove any existing highlights first
  removeAllHighlights();
  
  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.className = 'wingman-element-highlight';
  highlight.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px dashed #0084ff;
    background: rgba(0, 132, 255, 0.1);
    pointer-events: none;
    z-index: 2147483646;
    border-radius: 4px;
    animation: wingman-march 1s linear infinite;
  `;
  
  // Add marching ants animation
  if (!document.getElementById('wingman-animations')) {
    const style = document.createElement('style');
    style.id = 'wingman-animations';
    style.textContent = `
      @keyframes wingman-march {
        0% { border-offset: 0; }
        100% { border-offset: 12px; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(highlight);
}

function removeElementHighlight(element: HTMLElement) {
  const highlights = document.querySelectorAll('.wingman-element-highlight');
  highlights.forEach(h => h.remove());
}

function removeAllHighlights() {
  const highlights = document.querySelectorAll('.wingman-element-highlight');
  highlights.forEach(h => h.remove());
}

function handleElementClick(e: MouseEvent) {
  if (!overlayActive || overlayState.notePanel) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const target = e.target as HTMLElement;
  
  // Skip our overlay elements
  if (target.id === 'wingman-overlay' || target.closest('#wingman-overlay')) {
    return;
  }
  
  logger.debug('Element selected:', target);
  
  // Store selected element
  overlayState.selectedElement = target;
  overlayState.selectedRect = target.getBoundingClientRect();
  
  // Remove hover highlights
  removeAllHighlights();
  
  // Show note panel
  showNotePanel();
}

function showNotePanel() {
  const notePanel = document.createElement('div');
  notePanel.id = 'wingman-note-panel';
  notePanel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    padding: 24px;
    width: 400px;
    max-width: 90vw;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `;
  
  notePanel.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b;">🎯 Share your feedback</h3>
      <p style="margin: 0; font-size: 13px; color: #64748b;">Describe what you'd like to change about this element.</p>
    </div>
    
    <textarea 
      id="wingman-note-input"
      placeholder="e.g., This button should be larger and more prominent..."
      style="
        width: 100%;
        height: 120px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
      "
    ></textarea>
    
    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
      <button 
        id="wingman-cancel-btn"
        style="
          padding: 8px 16px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
        "
      >Cancel</button>
      <button 
        id="wingman-submit-btn"
        disabled
        style="
          padding: 8px 16px;
          background: #cbd5e1;
          border: none;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          cursor: not-allowed;
          transition: all 0.2s ease;
        "
      >Submit Feedback</button>
    </div>
  `;
  
  document.body.appendChild(notePanel);
  overlayState.notePanel = notePanel;
  
  // Focus the textarea
  const textarea = notePanel.querySelector('#wingman-note-input') as HTMLTextAreaElement;
  setTimeout(() => textarea?.focus(), 100);
  
  // Add button handlers
  const cancelBtn = notePanel.querySelector('#wingman-cancel-btn') as HTMLButtonElement;
  const submitBtn = notePanel.querySelector('#wingman-submit-btn') as HTMLButtonElement;
  
  // Input validation - enable submit only when text is entered
  textarea?.addEventListener('input', () => {
    const hasContent = textarea.value.trim().length > 0;
    
    if (hasContent) {
      submitBtn.disabled = false;
      submitBtn.style.cssText = `
        padding: 8px 16px;
        background: #0084ff;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
    } else {
      submitBtn.disabled = true;
      submitBtn.style.cssText = `
        padding: 8px 16px;
        background: #cbd5e1;
        border: none;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 14px;
        font-weight: 500;
        cursor: not-allowed;
        transition: all 0.2s ease;
      `;
    }
  });
  
  cancelBtn?.addEventListener('click', cancelOverlay);
  submitBtn?.addEventListener('click', submitFeedback);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    cancelOverlay();
  }
}

function cancelOverlay() {
  logger.debug('Overlay cancelled');
  cleanup();
}

async function submitFeedback() {
  const textarea = document.querySelector('#wingman-note-input') as HTMLTextAreaElement;
  const note = textarea?.value?.trim();
  
  if (!note) {
    alert('Please enter some feedback first!');
    return;
  }
  
  if (!overlayState.selectedElement || !overlayState.selectedRect) {
    alert('No element selected!');
    return;
  }
  
  logger.debug('Submitting feedback:', note);
  
  try {
    // Extract React data before cleaning up overlay
    let reactData = undefined;
    if (overlayState.selectedElement && sdkBridge) {
      logger.debug('Extracting React data for element...');
      reactData = await sdkBridge.getReactData(overlayState.selectedElement);
    }
    
    // Build target info
    const target = {
      mode: 'element' as const,
      rect: {
        x: overlayState.selectedRect.left,
        y: overlayState.selectedRect.top,
        width: overlayState.selectedRect.width,
        height: overlayState.selectedRect.height,
      },
      selector: generateSimpleSelector(overlayState.selectedElement),
    };
    
    // Get robust selector if available
    if (overlayState.selectedElement && sdkBridge) {
      const robustSelector = await sdkBridge.getRobustSelector(overlayState.selectedElement);
      if (robustSelector) {
        target.selector = robustSelector;
      }
    }
    
    // Clean up overlay before screenshot
    cleanup();
    
    // Wait for DOM to settle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture screenshot
    const screenshot = await captureScreenshot();
    
    // Build annotation
    const annotation = buildAnnotation(note, target, screenshot, reactData);
    
    // Submit annotation
    const result = await submitAnnotation(annotation);
    logger.info('Annotation submitted successfully:', result);
    
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
    
    // Show success notification
    showSuccessNotification(result, annotation.id);
    
  } catch (error) {
    logger.error('Failed to submit feedback:', error);
    cleanup();
  }
}

function generateSimpleSelector(element: HTMLElement): string {
  // Simple selector generation
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim()).slice(0, 2);
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
  }
  
  return element.tagName.toLowerCase();
}

function cleanup() {
  overlayActive = false;
  
  // Remove overlay elements
  overlayState.overlay?.remove();
  overlayState.notePanel?.remove();
  
  // Remove highlights
  removeAllHighlights();
  
  // Remove event listeners
  removeEventListeners();
  
  // Remove animations style
  document.getElementById('wingman-animations')?.remove();
  
  // Clear state
  overlayState = {};
  hoveredElement = null;
  
  logger.debug('Overlay cleaned up');
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

function showSuccessNotification(result: RelayResponse, annotationId: string) {
  const notification = document.createElement('div');
  notification.id = 'wingman-success-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    z-index: 2147483647;
    max-width: 350px;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  `;
  
  // Determine message based on result
  let message = 'Feedback submitted successfully!';
  let linkHtml = '';
  
  if (result.message === 'Copied to clipboard') {
    message = 'Feedback copied to clipboard!';
  } else {
    message = 'Feedback submitted successfully!';
    // Construct correct webapp dashboard URL
    const dashboardUrl = `https://wingmanux.com/annotations?id=${annotationId}`;
    linkHtml = `<div style="margin-top: 4px; font-size: 12px;"><a href="${dashboardUrl}" target="_blank" style="color: #bfdbfe; text-decoration: underline;">View in Dashboard</a></div>`;
  }
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="font-size: 16px; line-height: 1; display: flex; align-items: center;">✓</div>
      <div style="display: flex; flex-direction: column; justify-content: center;">
        <div style="line-height: 1.2;">${message}</div>
        ${linkHtml}
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Slide in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Auto-hide after 4 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
  
  // Click to dismiss
  notification.addEventListener('click', () => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      notification.remove();
    }, 300);
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