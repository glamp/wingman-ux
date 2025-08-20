export interface WingmanAnnotation {
  id: string;
  createdAt: string; // ISO 8601
  note: string;

  page: {
    url: string;
    title: string;
    ua: string;
    viewport: { w: number; h: number; dpr: number };
  };

  target: {
    mode: 'element' | 'region';
    rect: { x: number; y: number; width: number; height: number }; // viewport coords
    selector?: string; // robust CSS selector when available
  };

  media: {
    screenshot: { mime: 'image/png' | 'image/jpeg'; dataUrl: string };
  };

  console: Array<{
    level: 'log' | 'info' | 'warn' | 'error';
    args: any[];
    ts: number;
  }>;

  errors: Array<{ message: string; stack?: string; ts: number }>;

  network: Array<{
    url: string;
    status?: number; // best-effort
    startTime?: number;
    duration?: number;
    initiatorType?: string;
  }>;

  react?: {
    // Component Information
    componentName?: string;
    componentType?: 'function' | 'class' | 'memo' | 'forwardRef' | 'lazy' | 'unknown';
    displayName?: string;
    
    // Source Location
    source?: {
      fileName?: string;
      lineNumber?: number;
      columnNumber?: number;
    };
    
    // Component Tree
    componentStack?: Array<{
      name: string;
      props?: any;
      key?: string | number;
    }>;
    parentComponents?: string[]; // Names of parent components up the tree
    
    // Props & State
    props?: any; // sanitized
    state?: any; // sanitized for class components
    
    // Hooks (for function components)
    hooks?: Array<{
      type: 'state' | 'effect' | 'context' | 'reducer' | 'callback' | 'memo' | 'ref' | 'layoutEffect' | 'imperativeHandle' | 'custom';
      name?: string; // For custom hooks
      value?: any; // Current value (sanitized)
      dependencies?: any[]; // For effect/memo/callback
    }>;
    
    // React Context Values
    contexts?: Array<{
      displayName?: string;
      value: any; // sanitized
    }>;
    
    // Render Information
    renderCount?: number;
    lastRenderDuration?: number;
    renderReasons?: string[]; // Why component re-rendered
    
    // Error Boundary
    errorBoundary?: {
      componentName: string;
      error?: string;
      errorInfo?: any;
    };
    
    // Fiber information
    fiberType?: string; // The fiber node type
    effectTags?: string[]; // Current effect tags on the fiber
    
    obtainedVia: 'devtools-hook' | 'fiber-direct' | 'sdk-bridge' | 'none';
  };
}

export interface RelayResponse {
  id: string;
  receivedAt: string;
}

export interface RelayError {
  error: string;
  code?: string;
  details?: any;
}

export interface StoredAnnotation {
  id: string;
  receivedAt: string;
  annotation: WingmanAnnotation;
}