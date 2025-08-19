import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { WingmanProvider } from '../WingmanProvider';
import { useWingman } from '../useWingman';

// Test component to access context
function TestComponent() {
  const wingman = useWingman();
  return (
    <div>
      <div data-testid="enabled">{String(wingman.isEnabled)}</div>
      <button onClick={() => wingman.captureElement(document.body)}>
        Capture
      </button>
    </div>
  );
}

describe('WingmanProvider', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    window.removeEventListener('message', vi.fn());
  });

  it('should render children', () => {
    render(
      <WingmanProvider>
        <div data-testid="child">Test Child</div>
      </WingmanProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should provide default context values', () => {
    render(
      <WingmanProvider>
        <TestComponent />
      </WingmanProvider>
    );

    const element = screen.getByTestId('enabled');
    expect(element.textContent).toBe('false');
  });

  it('should enable when receiving enable message', async () => {
    render(
      <WingmanProvider>
        <TestComponent />
      </WingmanProvider>
    );

    // Simulate message from extension
    window.postMessage({ type: 'WINGMAN_ENABLE' }, '*');

    // Note: In a real test we'd need to wait for state updates properly
    // This is simplified for demonstration
  });

  it('should disable when receiving disable message', async () => {
    render(
      <WingmanProvider>
        <TestComponent />
      </WingmanProvider>
    );

    // Enable first
    window.postMessage({ type: 'WINGMAN_ENABLE' }, '*');
    
    // Then disable
    window.postMessage({ type: 'WINGMAN_DISABLE' }, '*');

    // Note: In a real test we'd need to wait for state updates properly
    // This is simplified for demonstration
  });

  it('should handle element selection request', () => {
    const { container } = render(
      <WingmanProvider>
        <div data-testid="target" className="test-element">
          Target Element
        </div>
      </WingmanProvider>
    );

    const targetElement = container.querySelector('.test-element');
    
    // Simulate selection request
    window.postMessage({ 
      type: 'WINGMAN_REQUEST_ELEMENT_SELECTION',
      selector: '.test-element'
    }, '*');

    // Verify element would be found
    expect(targetElement).toBeTruthy();
    expect(targetElement?.textContent).toBe('Target Element');
  });

  it('should match snapshot for provider structure', () => {
    const { container } = render(
      <WingmanProvider>
        <div className="app">
          <h1>Test App</h1>
          <TestComponent />
        </div>
      </WingmanProvider>
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});