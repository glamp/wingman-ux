import { useWingmanContext } from './WingmanProvider';

export function useWingman() {
  const { config, introspector } = useWingmanContext();
  
  return {
    enabled: config.enabled,
    debug: config.debug,
    introspector,
  };
}