/**
 * Utility functions for parsing CSS selectors and detecting UI patterns
 * to intelligently expand annotation rectangles to show full containers
 */

export interface ExpansionRecommendation {
  shouldExpand: boolean;
  pattern: string;
  confidence: number;
  multipliers: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Common UI patterns that typically contain headings
 */
const CONTAINER_PATTERNS = [
  { pattern: 'counter-section', type: 'section', heightMultiplier: 6.5 },
  { pattern: 'card', type: 'card', heightMultiplier: 5 },
  { pattern: 'panel', type: 'panel', heightMultiplier: 4.5 },
  { pattern: 'box', type: 'box', heightMultiplier: 4 },
  { pattern: 'section', type: 'section', heightMultiplier: 5 },
  { pattern: 'article', type: 'article', heightMultiplier: 6 },
];

/**
 * Check if selector indicates a heading element
 */
export function isHeadingElement(selector: string): boolean {
  return /\bh[1-6]\b/i.test(selector);
}

/**
 * Extract parent container class from selector
 */
export function extractParentContainer(selector: string): string | null {
  // Look for patterns like "section.counter-section > h2"
  const matches = selector.match(/(\w+)\.([a-z-]+)[^>]*>\s*h[1-6]/i);
  if (matches) {
    return matches[2]; // Return the class name
  }
  
  // Look for patterns with multiple classes
  const classMatches = selector.match(/\.([a-z-]+)[^>]*>\s*h[1-6]/i);
  if (classMatches) {
    return classMatches[1];
  }
  
  return null;
}

/**
 * Get expansion recommendation based on selector and element dimensions
 */
export function getExpansionRecommendation(
  selector: string,
  _rect: { x: number; y: number; width: number; height: number }
): ExpansionRecommendation {
  // Default: no expansion
  const defaultRecommendation: ExpansionRecommendation = {
    shouldExpand: false,
    pattern: 'none',
    confidence: 0,
    multipliers: { x: 1, y: 1, width: 1, height: 1 }
  };

  // Check if this is a heading element
  if (!isHeadingElement(selector)) {
    return defaultRecommendation;
  }

  // Extract parent container
  const parentContainer = extractParentContainer(selector);
  if (!parentContainer) {
    return defaultRecommendation;
  }

  // Find matching pattern
  const matchedPattern = CONTAINER_PATTERNS.find(p => 
    parentContainer.includes(p.pattern)
  );

  if (!matchedPattern) {
    return defaultRecommendation;
  }

  // Special handling for counter-section
  if (parentContainer === 'counter-section') {
    return {
      shouldExpand: true,
      pattern: 'counter-section',
      confidence: 0.95,
      multipliers: {
        x: 0.85,  // Move left by 15% of width
        y: 0.82,  // Move up to include padding (32px for typical 36px heading)
        width: 1.3,  // 30% wider
        height: 6.5  // Counter section is ~6.5x heading height
      }
    };
  }

  // Generic card/panel expansion
  return {
    shouldExpand: true,
    pattern: matchedPattern.type,
    confidence: 0.8,
    multipliers: {
      x: 0.95,  // Slight left adjustment
      y: 0.85,  // Move up to include padding
      width: 1.1,  // 10% wider
      height: matchedPattern.heightMultiplier
    }
  };
}

/**
 * Apply expansion recommendation to a rectangle
 */
export function applyExpansion(
  rect: { x: number; y: number; width: number; height: number },
  recommendation: ExpansionRecommendation
): { x: number; y: number; width: number; height: number } {
  if (!recommendation.shouldExpand) {
    return rect;
  }

  const { multipliers } = recommendation;
  
  // Calculate padding adjustments
  const xPadding = rect.width * (1 - multipliers.x);
  const yPadding = rect.height * (1 - multipliers.y) + 32; // Extra padding for card top
  
  return {
    x: Math.max(0, rect.x - xPadding),
    y: Math.max(0, rect.y - yPadding),
    width: rect.width * multipliers.width,
    height: rect.height * multipliers.height
  };
}