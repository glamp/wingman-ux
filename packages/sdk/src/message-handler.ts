import type { ReactIntrospector } from './react-introspector';
import { createLogger } from '@wingman/shared';

const logger = createLogger('Wingman:SDK');

export function setupMessageHandler(introspector: ReactIntrospector, debug: boolean) {
  logger.debug('Setting up message handler, debug:', debug);
  
  const handleMessage = (event: MessageEvent) => {
    // Only respond to messages from our extension
    if (event.source !== window) return;
    if (!event.data?.type?.startsWith('WINGMAN_')) return;

    logger.debug('Received message:', event.data);

    switch (event.data.type) {
      case 'WINGMAN_PING': {
        // Respond to ping with SDK ready
        logger.debug('Responding to PING with SDK_READY');
        window.postMessage({ type: 'WINGMAN_SDK_READY' }, '*');
        break;
      }
      
      case 'WINGMAN_GET_REACT_DATA': {
        const { selector, requestId } = event.data;
        
        if (!selector) {
          logger.debug('No selector provided');
          window.postMessage({
            type: 'WINGMAN_REACT_DATA_RESPONSE',
            requestId,
            data: { obtainedVia: 'none', error: 'No selector provided' },
          }, '*');
          break;
        }

        logger.debug('Finding element with selector:', selector);
        
        // Find element by selector
        let element: HTMLElement | null = null;
        try {
          element = document.querySelector(selector) as HTMLElement;
          
          // If not found, try with a slight delay (DOM might be updating)
          if (!element) {
            logger.debug('Element not found immediately, trying with delay...');
            setTimeout(() => {
              element = document.querySelector(selector) as HTMLElement;
              
              if (element) {
                logger.debug('Found element after delay, extracting React data');
                const reactData = introspector.getReactData(element);
                logger.debug('Extracted React data:', reactData);
                
                window.postMessage({
                  type: 'WINGMAN_REACT_DATA_RESPONSE',
                  requestId,
                  data: reactData,
                }, '*');
              } else {
                logger.debug('Element not found for selector:', selector);
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
          logger.error('Invalid selector:', selector, error);
          window.postMessage({
            type: 'WINGMAN_REACT_DATA_RESPONSE',
            requestId,
            data: { obtainedVia: 'none', error: 'Invalid selector' },
          }, '*');
          break;
        }

        if (element) {
          logger.debug('Found element, extracting React data');
          const reactData = introspector.getReactData(element);
          logger.debug('Extracted React data:', reactData);

          // Enhanced debug logging for state visibility
          if (debug) {
            console.log('[Wingman SDK] 🎯 React data extraction successful!');
            console.log('[Wingman SDK] 📍 Component:', reactData.componentName || 'Unknown');
            console.log('[Wingman SDK] 📊 Has State:', !!reactData.state);
            if (reactData.state) {
              console.log('[Wingman SDK] 🔍 State Details:', reactData.state);
              // Log each state field for clarity
              Object.entries(reactData.state).forEach(([key, value]) => {
                console.log(`[Wingman SDK]   - ${key}:`, value);
              });
            }
            console.log('[Wingman SDK] 🎨 Has Props:', !!reactData.props);
            console.log('[Wingman SDK] 📡 Obtained Via:', reactData.obtainedVia);
          }

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
        logger.debug('GET_SELECTOR is deprecated, selectors are generated in content script');
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