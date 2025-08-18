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
    rect: { x: number; y: number; width: number; height: number }; // page coords
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
    componentName?: string;
    props?: any; // sanitized
    state?: any; // sanitized
    obtainedVia: 'devtools-hook' | 'none';
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