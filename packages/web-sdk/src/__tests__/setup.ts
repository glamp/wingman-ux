// Setup file for React tests
import '@testing-library/react';
import '@testing-library/jest-dom';

// Add global test utilities if needed
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};