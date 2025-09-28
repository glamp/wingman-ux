import React from 'react';
import App from './App';
import { mountReactInShadow, ShadowMountResult } from './utils/shadowMount';
import type { WingmanAnnotation } from '@wingman/shared';

export interface MountOverlayOptions {
  onSubmit: (note: string, target: any, element?: HTMLElement, screenshot?: string) => void;
  onCancel: () => void;
}

export interface MountSuccessNotificationOptions {
  previewUrl?: string;
  annotation?: WingmanAnnotation;
  mode?: 'clipboard' | 'server';
  onClose: () => void;
}

let currentMount: ShadowMountResult | null = null;

/**
 * Mount the React overlay for element selection and note input
 */
export function mountReactOverlay(options: MountOverlayOptions): () => void {
  // Unmount any existing mount
  if (currentMount) {
    currentMount.unmount();
    currentMount = null;
  }

  console.log('[Wingman] Mounting React overlay...');
  
  currentMount = mountReactInShadow({
    hostId: 'wingman-overlay-host',
    component: App,
    props: {
      mode: 'overlay',
      onSubmit: (note: string, target: any, element?: HTMLElement, screenshot?: string) => {
        // Don't unmount here - let the handler do it after screenshot
        // Call the original handler
        options.onSubmit(note, target, element, screenshot);
      },
      onCancel: () => {
        // Clean up the overlay
        if (currentMount) {
          currentMount.unmount();
          currentMount = null;
        }
        // Call the original handler
        options.onCancel();
      },
    },
  });

  // Return cleanup function
  return () => {
    if (currentMount) {
      currentMount.unmount();
      currentMount = null;
    }
  };
}

/**
 * Mount the React success notification
 */
export function mountSuccessNotification(options: MountSuccessNotificationOptions): () => void {
  console.log('[Wingman] Mounting React success notification...');
  
  const mount = mountReactInShadow({
    hostId: 'wingman-success-host',
    component: App,
    props: {
      mode: 'success',
      previewUrl: options.previewUrl,
      annotation: options.annotation,
      notificationMode: options.mode,
      onNotificationClose: () => {
        // Clean up the notification
        mount.unmount();
        // Call the original handler
        options.onClose();
      },
    },
  });

  // Return cleanup function
  return () => {
    mount.unmount();
  };
}

// Export for direct use if needed
export { App, mountReactInShadow };