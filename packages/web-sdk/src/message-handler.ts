import type { ReactIntrospector } from './react-introspector';

export function setupMessageHandler(introspector: ReactIntrospector, debug: boolean) {
  console.log('[Wingman SDK] Setting up message handler, debug:', debug);
  
  const handleMessage = (event: MessageEvent) => {
    // Only respond to messages from our extension
    if (event.source !== window) return;
    if (!event.data?.type?.startsWith('WINGMAN_')) return;

    console.log('[Wingman SDK] Received message:', event.data);

    switch (event.data.type) {
      case 'WINGMAN_PING': {
        // Respond to ping with SDK ready
        console.log('[Wingman SDK] Responding to PING with SDK_READY');
        window.postMessage({ type: 'WINGMAN_SDK_READY' }, '*');
        break;
      }
      
      case 'WINGMAN_GET_REACT_DATA': {
        const { selector, requestId } = event.data;
        
        if (!selector) {
          console.log('[Wingman SDK] No selector provided');
          window.postMessage({
            type: 'WINGMAN_REACT_DATA_RESPONSE',
            requestId,
            data: { obtainedVia: 'none', error: 'No selector provided' },
          }, '*');
          break;
        }

        console.log('[Wingman SDK] Finding element with selector:', selector);
        
        // Find element by selector
        let element: HTMLElement | null = null;
        try {
          element = document.querySelector(selector) as HTMLElement;
          
          // If not found, try with a slight delay (DOM might be updating)
          if (!element) {
            console.log('[Wingman SDK] Element not found immediately, trying with delay...');
            setTimeout(() => {
              element = document.querySelector(selector) as HTMLElement;
              
              if (element) {
                console.log('[Wingman SDK] Found element after delay, extracting React data');
                const reactData = introspector.getReactData(element);
                console.log('[Wingman SDK] Extracted React data:', reactData);
                
                window.postMessage({
                  type: 'WINGMAN_REACT_DATA_RESPONSE',
                  requestId,
                  data: reactData,
                }, '*');
              } else {
                console.log('[Wingman SDK] Element not found for selector:', selector);
                window.postMessage({
                  type: 'WINGMAN_REACT_DATA_RESPONSE',
                  requestId,
                  data: { obtainedVia: 'none', error: 'Element not found' },
                }, '*');
              }
            }, 10);
            break;
          }
        } catch (error) {
          console.error('[Wingman SDK] Invalid selector:', selector, error);
          window.postMessage({
            type: 'WINGMAN_REACT_DATA_RESPONSE',
            requestId,
            data: { obtainedVia: 'none', error: 'Invalid selector' },
          }, '*');
          break;
        }

        if (element) {
          console.log('[Wingman SDK] Found element, extracting React data');
          const reactData = introspector.getReactData(element);
          console.log('[Wingman SDK] Extracted React data:', reactData);
          
          window.postMessage({
            type: 'WINGMAN_REACT_DATA_RESPONSE',
            requestId,
            data: reactData,
          }, '*');
        } else {
          console.log('[Wingman SDK] Element not found for selector:', selector);
          window.postMessage({
            type: 'WINGMAN_REACT_DATA_RESPONSE',
            requestId,
            data: { obtainedVia: 'none', error: 'Element not found' },
          }, '*');
        }
        break;
      }

      // Selector generation is now handled in content script
      // This case is kept for backwards compatibility but not used
      case 'WINGMAN_GET_SELECTOR': {
        console.log('[Wingman SDK] GET_SELECTOR is deprecated, selectors are generated in content script');
        window.postMessage({
          type: 'WINGMAN_SELECTOR_RESPONSE',
          requestId: event.data.requestId,
          selector: undefined,
        }, '*');
        break;
      }
    }
  };

  window.addEventListener('message', handleMessage);

  // Announce that SDK is ready
  window.postMessage({ type: 'WINGMAN_SDK_READY' }, '*');

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}