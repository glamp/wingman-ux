/**
 * Selector Generator Module
 * Generates unique CSS selectors for elements that work across content script and page contexts
 */

/**
 * Generate a unique CSS selector for an element
 * Priority: ID > data attributes > class + position > tag + position
 */
export function generateUniqueSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body && current.parentElement) {
    let selector = current.tagName.toLowerCase();
    
    // Priority 1: ID (most specific, fastest lookup)
    // Skip React's synthetic IDs like :r0:, :r1:
    if (current.id && !current.id.includes(':')) {
      // Use ID and stop here since IDs should be unique
      path.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    
    // Priority 2: Unique data attributes (excluding React internals)
    const dataAttrs = Array.from(current.attributes)
      .filter(attr => 
        attr.name.startsWith('data-') && 
        !attr.name.includes('react') &&
        !attr.name.includes('wingman') // Avoid our own attributes
      )
      .map(attr => `[${attr.name}="${CSS.escape(attr.value)}"]`)
      .slice(0, 2); // Limit to 2 data attributes for readability
    
    if (dataAttrs.length > 0) {
      selector += dataAttrs.join('');
    } else if (current.className) {
      // Priority 3: Classes (if no data attributes)
      // Filter out React/framework-generated classes
      const classes = Array.from(current.classList)
        .filter(c => 
          !c.startsWith('css-') && // Emotion/styled-components
          !c.match(/^[a-z]{2,3}-[0-9]+/) && // Tailwind-like utilities
          c.length < 30 // Avoid generated class names
        )
        .slice(0, 2) // Limit to 2 classes
        .map(c => `.${CSS.escape(c)}`);
      
      if (classes.length > 0) {
        selector += classes.join('');
      }
    }
    
    // Priority 4: Position among siblings (for disambiguation)
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const sameTagSiblings = siblings.filter(s => s.tagName === current!.tagName);
      
      // Only add position if there are multiple siblings with same tag
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  // Build the full selector
  let fullSelector = path.join(' > ');
  
  // Validate the selector
  try {
    const elements = document.querySelectorAll(fullSelector);
    
    if (elements.length === 1 && elements[0] === element) {
      // Perfect! Selector uniquely identifies our element
      console.log('[Wingman Selector] Generated unique selector:', fullSelector);
      return fullSelector;
    } else if (elements.length === 0) {
      // Selector doesn't match anything, might be too specific
      console.warn('[Wingman Selector] Selector matches no elements, using fallback');
      return generateFallbackSelector(element);
    } else {
      // Selector matches multiple elements, need more specificity
      console.warn('[Wingman Selector] Selector matches multiple elements, using fallback');
      return generateFallbackSelector(element);
    }
  } catch (e) {
    // Invalid selector syntax, use fallback
    console.error('[Wingman Selector] Invalid selector generated:', e);
    return generateFallbackSelector(element);
  }
}

/**
 * Generate a fallback selector using position-based approach
 * This is more brittle but guaranteed to work
 */
function generateFallbackSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body && current.parentElement) {
    const parent = current.parentElement;
    const children = Array.from(parent.children);
    const index = children.indexOf(current) + 1;
    
    let selector = current.tagName.toLowerCase();
    
    // Always use nth-child for fallback to ensure uniqueness
    selector += `:nth-child(${index})`;
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  const fallbackSelector = 'body > ' + path.join(' > ');
  console.log('[Wingman Selector] Using fallback selector:', fallbackSelector);
  
  // Final validation
  try {
    const elements = document.querySelectorAll(fallbackSelector);
    if (elements.length === 1 && elements[0] === element) {
      return fallbackSelector;
    }
  } catch (e) {
    console.error('[Wingman Selector] Fallback selector also failed:', e);
  }
  
  // Last resort: use a very specific XPath-like selector
  return generateLastResortSelector(element);
}

/**
 * Last resort: Generate an extremely specific selector
 * Uses multiple attributes and position
 */
function generateLastResortSelector(element: HTMLElement): string {
  // Get element's position in the entire document
  const allElements = document.querySelectorAll('*');
  const index = Array.from(allElements).indexOf(element);
  
  if (index === -1) {
    console.error('[Wingman Selector] Element not found in document!');
    // Return something that won't match
    return 'wingman-element-not-found';
  }
  
  // Use tag name and document position
  const selector = `${element.tagName.toLowerCase()}:nth-of-type(${Math.floor(index / 10)})`;
  
  console.warn('[Wingman Selector] Using last resort selector with document index:', index);
  
  // Store the index as a data attribute temporarily for retrieval
  element.setAttribute('data-wingman-temp-index', index.toString());
  
  return `[data-wingman-temp-index="${index}"]`;
}

/**
 * Validate that a selector returns exactly the target element
 */
export function validateSelector(selector: string, targetElement: HTMLElement): boolean {
  try {
    const elements = document.querySelectorAll(selector);
    return elements.length === 1 && elements[0] === targetElement;
  } catch {
    return false;
  }
}

/**
 * Clean up any temporary attributes we may have added
 */
export function cleanupTempAttributes(): void {
  const elements = document.querySelectorAll('[data-wingman-temp-index]');
  elements.forEach(el => {
    el.removeAttribute('data-wingman-temp-index');
  });
}