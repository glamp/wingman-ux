// Type-safe messaging system for Chrome extension contexts

export interface BaseMessage {
  type: string;
  payload?: any;
}

// Message types for different functionality
export interface CaptureScreenshotMessage extends BaseMessage {
  type: 'CAPTURE_SCREENSHOT';
}

export interface ActivateOverlayMessage extends BaseMessage {
  type: 'ACTIVATE_OVERLAY';
}

export interface SubmitAnnotationMessage extends BaseMessage {
  type: 'SUBMIT_ANNOTATION';
  payload: {
    annotation: any; // WingmanAnnotation from shared package
  };
}

export interface TunnelCreateMessage extends BaseMessage {
  type: 'TUNNEL_CREATE';
  payload: {
    targetPort: number;
  };
}

export interface TunnelStopMessage extends BaseMessage {
  type: 'TUNNEL_STOP';
}

export interface TunnelStatusMessage extends BaseMessage {
  type: 'TUNNEL_STATUS';
}

export interface StoreUpdateMessage extends BaseMessage {
  type: 'STORE_UPDATE';
  payload: {
    storeName: string;
    state: any;
  };
}

// Union of all possible messages
export type ExtensionMessage =
  | CaptureScreenshotMessage
  | ActivateOverlayMessage
  | SubmitAnnotationMessage
  | TunnelCreateMessage
  | TunnelStopMessage
  | TunnelStatusMessage
  | StoreUpdateMessage;

// Response types
export interface BaseResponse {
  success: boolean;
  error?: string;
}

export interface CaptureScreenshotResponse extends BaseResponse {
  dataUrl?: string;
}

export interface TunnelResponse extends BaseResponse {
  tunnel?: {
    sessionId: string;
    tunnelUrl: string;
    publicUrl: string;
  };
}

export interface SubmitAnnotationResponse extends BaseResponse {
  message?: string;
  clipboardContent?: string;
  screenshotPath?: string;
}

// Type-safe message sender
export class ExtensionMessenger {
  // Send message to background script
  static async sendToBackground<T extends ExtensionMessage>(
    message: T
  ): Promise<any> {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('Failed to send message to background:', error);
      return { success: false, error: 'Communication failed' };
    }
  }

  // Send message to content script
  static async sendToContent<T extends ExtensionMessage>(
    tabId: number,
    message: T
  ): Promise<any> {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error('Failed to send message to content script:', error);
      return { success: false, error: 'Communication failed' };
    }
  }

  // Send message to all tabs (broadcast)
  static async broadcastToContent<T extends ExtensionMessage>(
    message: T
  ): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      const promises = tabs.map(tab =>
        tab.id ? this.sendToContent(tab.id, message) : Promise.resolve()
      );
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to broadcast to content scripts:', error);
    }
  }

  // Capture screenshot helper
  static async captureScreenshot(): Promise<string | null> {
    const response = await this.sendToBackground<CaptureScreenshotMessage>({
      type: 'CAPTURE_SCREENSHOT',
    });
    return response?.success ? response.dataUrl : null;
  }

  // Activate overlay helper
  static async activateOverlay(tabId?: number): Promise<boolean> {
    if (tabId) {
      const response = await this.sendToContent(tabId, {
        type: 'ACTIVATE_OVERLAY',
      });
      return response?.success || false;
    } else {
      // Send to current active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        const response = await this.sendToContent(activeTab.id, {
          type: 'ACTIVATE_OVERLAY',
        });
        return response?.success || false;
      }
      return false;
    }
  }

  // Submit annotation helper
  static async submitAnnotation(annotation: any): Promise<SubmitAnnotationResponse> {
    return await this.sendToBackground<SubmitAnnotationMessage>({
      type: 'SUBMIT_ANNOTATION',
      payload: { annotation },
    });
  }

  // Tunnel management helpers
  static async createTunnel(targetPort: number): Promise<TunnelResponse> {
    return await this.sendToBackground<TunnelCreateMessage>({
      type: 'TUNNEL_CREATE',
      payload: { targetPort },
    });
  }

  static async stopTunnel(): Promise<BaseResponse> {
    return await this.sendToBackground<TunnelStopMessage>({
      type: 'TUNNEL_STOP',
    });
  }

  static async getTunnelStatus(): Promise<TunnelResponse> {
    return await this.sendToBackground<TunnelStatusMessage>({
      type: 'TUNNEL_STATUS',
    });
  }
}

// Message listener helper with type safety
export class ExtensionMessageListener {
  private static listeners = new Map<string, (message: any, sender: chrome.runtime.MessageSender) => any>();

  static addListener<T extends ExtensionMessage>(
    type: T['type'],
    handler: (message: T, sender: chrome.runtime.MessageSender) => any
  ) {
    this.listeners.set(type, handler);
  }

  static removeListener(type: string) {
    this.listeners.delete(type);
  }

  static setup() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
        const handler = this.listeners.get(message.type);
        if (handler) {
          const result = handler(message, sender);
          if (result instanceof Promise) {
            result.then(sendResponse);
            return true; // Indicates async response
          } else {
            sendResponse(result);
          }
        }
        return false;
      });
    }
  }
}

// Initialize message listener system
if (typeof chrome !== 'undefined') {
  ExtensionMessageListener.setup();
}