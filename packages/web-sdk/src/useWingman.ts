import { useWingmanContext } from './WingmanProvider';

export function useWingman() {
  const { config, introspector } = useWingmanContext();
  
  return {
    isEnabled: config.enabled ?? false,
    debug: config.debug,
    introspector,
    captureElement: (element: HTMLElement) => {
      // This would send a message to the extension
      window.postMessage({
        type: 'WINGMAN_CAPTURE_ELEMENT',
        element: element.tagName,
      }, '*');
    },
  };
}