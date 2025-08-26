// Setup file for React tests
import '@testing-library/react';
import '@testing-library/jest-dom';

// Add global test utilities if needed
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Ensure window and document are available in test environment
if (typeof window !== 'undefined') {
  // Add any window-specific setup here
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
}