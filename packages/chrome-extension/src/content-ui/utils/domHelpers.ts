/**
 * DOM manipulation utilities for the Chrome extension
 */

/**
 * Generate a CSS selector for an element
 */
export function generateSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    if (current.className) {
      const classes = Array.from(current.classList)
        .filter(c => !c.startsWith('wingman-'))
        .join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    
    const siblings = Array.from(current.parentNode?.children || []);
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Get elements at a specific point, excluding overlay elements
 */
export function getTargetElement(
  x: number, 
  y: number, 
  excludeIds: string[] = []
): HTMLElement | null {
  const elements = document.elementsFromPoint(x, y);
  const element = elements.find(el => {
    const htmlEl = el as HTMLElement;
    // Skip if it's one of our overlay elements
    if (excludeIds.some(id => htmlEl.id === id || htmlEl.closest(`#${id}`))) {
      return false;
    }
    return true;
  });
  
  return element as HTMLElement || null;
}

/**
 * Create a Shadow DOM root with proper styles
 */
export function createShadowRoot(hostId: string): ShadowRoot {
  // Remove existing host if it exists
  const existingHost = document.getElementById(hostId);
  if (existingHost) {
    existingHost.remove();
  }

  // Create new host element
  const host = document.createElement('div');
  host.id = hostId;
  host.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;
  document.body.appendChild(host);

  // Create shadow root
  const shadowRoot = host.attachShadow({ mode: 'open' });
  
  return shadowRoot;
}

/**
 * Inject styles into Shadow DOM
 */
export function injectStyles(shadowRoot: ShadowRoot, styles: string): void {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  shadowRoot.appendChild(styleElement);
}

/**
 * Calculate position for tooltip/panel to keep it in viewport
 */
export function calculatePanelPosition(
  rect: DOMRect,
  panelWidth: number,
  panelHeight: number
): { top: number; left: number } {
  const padding = 20;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Default position: below and to the right of the target
  let top = rect.bottom + padding;
  let left = rect.left;
  
  // Adjust if panel would go off the right edge
  if (left + panelWidth > viewportWidth - padding) {
    left = viewportWidth - panelWidth - padding;
  }
  
  // Adjust if panel would go off the bottom edge
  if (top + panelHeight > viewportHeight - padding) {
    // Try to position above the target
    top = rect.top - panelHeight - padding;
    
    // If still off screen, position at bottom of viewport
    if (top < padding) {
      top = viewportHeight - panelHeight - padding;
    }
  }
  
  // Ensure minimum padding from edges
  top = Math.max(padding, top);
  left = Math.max(padding, left);
  
  return { top, left };
}