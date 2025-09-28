import React from 'react';
import Overlay from './components/Overlay';
import SuccessNotification from './components/SuccessNotification';
import type { WingmanAnnotation } from '@wingman/shared';

export interface AppProps {
  mode: 'overlay' | 'success';
  // Overlay props
  onSubmit?: (note: string, target: any, element?: HTMLElement, screenshot?: string) => void;
  onCancel?: () => void;
  // Success notification props
  previewUrl?: string;
  annotation?: WingmanAnnotation;
  notificationMode?: 'clipboard' | 'server';
  onNotificationClose?: () => void;
}

const App: React.FC<AppProps> = ({
  mode,
  onSubmit,
  onCancel,
  previewUrl,
  annotation,
  notificationMode = 'server',
  onNotificationClose,
}) => {
  if (mode === 'overlay') {
    if (!onSubmit || !onCancel) {
      console.error('[Wingman] Overlay mode requires onSubmit and onCancel handlers');
      return null;
    }
    return <Overlay onSubmit={onSubmit} onCancel={onCancel} />;
  }
  
  if (mode === 'success') {
    if (!onNotificationClose) {
      console.error('[Wingman] Success mode requires onNotificationClose handler');
      return null;
    }
    return (
      <SuccessNotification
        previewUrl={previewUrl}
        annotation={annotation}
        mode={notificationMode}
        onClose={onNotificationClose}
      />
    );
  }
  
  return null;
};

export default App;