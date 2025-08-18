import type { ReactIntrospector } from './react-introspector';

export function setupMessageHandler(introspector: ReactIntrospector, debug: boolean) {
  const handleMessage = (event: MessageEvent) => {
    // Only respond to messages from our extension
    if (event.source !== window) return;
    if (!event.data?.type?.startsWith('WINGMAN_')) return;

    if (debug) {
      console.log('[Wingman SDK] Received message:', event.data);
    }

    switch (event.data.type) {
      case 'WINGMAN_GET_REACT_DATA': {
        const element = event.data.element;
        if (!element) break;

        const reactData = introspector.getReactData(element);
        
        window.postMessage({
          type: 'WINGMAN_REACT_DATA_RESPONSE',
          requestId: event.data.requestId,
          data: reactData,
        }, '*');
        break;
      }

      case 'WINGMAN_GET_SELECTOR': {
        const element = event.data.element;
        if (!element) break;

        const selector = generateRobustSelector(element);
        
        window.postMessage({
          type: 'WINGMAN_SELECTOR_RESPONSE',
          requestId: event.data.requestId,
          selector,
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

function generateRobustSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    // Prefer ID if available
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break;
    }
    
    // Use data attributes if available
    const dataAttrs = Array.from(current.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => `[${attr.name}="${CSS.escape(attr.value)}"]`)
      .join('');
    
    if (dataAttrs) {
      selector += dataAttrs;
    } else if (current.className) {
      // Use classes as fallback
      const classes = Array.from(current.classList)
        .filter(c => !c.startsWith('wingman-'))
        .map(c => `.${CSS.escape(c)}`)
        .join('');
      if (classes) {
        selector += classes;
      }
    }
    
    // Add nth-child if needed for uniqueness
    const siblings = Array.from(current.parentNode?.children || []);
    const sameTagSiblings = siblings.filter(
      s => s.tagName === current!.tagName
    );
    
    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}