# Wingman  v1&#x20;

**Description**: Wingman is a lightweight UX feedback assistant. It lets developers or testers select a part of the screen or element, add a note, capture a screenshot plus context (console logs, network timings, optional React metadata), and send everything to a local relay. The relay formats the payload for Claude Code so issues can be explained and fixed quickly.

**Goal**: Ship a Chrome Extension +  Web SDK that sends rich, reproducible UX feedback (note + target + screenshot + minimal context) to a local relay for Claude Code.

## 0) Tech

* Build everything in 1 repo
* Use a very strict Typescript for all packages
* **Use a shared types across all project**. We will not have duplicate types implemented in multiple packages within the same project. For example, the payload for the Web SDK, Chrome Extension, and Local Relay Server will leverage the exact same type.
* I want to build this from the "demo up". To start, we'll make a demo react project with create-react-app (or whatever is d'jour). Then we'll build Wingman into this demo and gradually add functionality.
* Keep the code as simple as possible

---

## 1) Scope

* **Chrome Extension (core)**: element/region picker overlay, visible-tab screenshot, console/error capture, minimal network timings, payload POST to configurable endpoint.
* **Web SDK (optional)**: robust selector for the clicked element; best-effort React metadata when available via DevTools hook. Graceful degradation when absent.
* **Local Relay Server (Node)**: receives payload, builds Markdown summary, forwards to Claude API with image + text.

**Explicitly not in v1**: full-page stitch, session replay, desktop app, cross-origin iframe DOM access, request/response bodies, screenshot blur/masking (placeholder config only).

---

## 2) Architecture Overview

```
[user] -> [Chrome Ext overlay]
          ├─ captureVisibleTab() → screenshot (PNG data URL)
          ├─ console/error buffer
          ├─ PerformanceObserver(resource) → network timings
          ├─ (optional) message → Web SDK → selector + react metadata
          └─ POST /annotations (http://localhost:8787/annotations)

[Local Relay Server]
  ├─ parse payload + extract image base64
  ├─ compose Markdown summary for Claude
  └─ call Anthropic Messages API (image + text) → return response
```

---

## 3) UX

1. Invoke via toolbar icon or keyboard shortcut.
2. Choose **Element** (hover highlight)&#x20;
3. Type **note** → **Send**.
4. Extension captures screenshot + context, optionally asks SDK for selector/react, POSTs to relay.

Style: minimal, monochrome, keyboard-first. Something like the OpenAI Canvas suggestion toolbar.

---

## 4) Extension (Core)

### 4.1 Permissions (manifest v3)

* `activeTab`
* `scripting`
* `tabs`
* `storage`
* Optional host permissions if we later need webRequest (not in v1).

### 4.2 Content Script Overlay

* Element picker (hover outline + click to select target element).
* Region picker (drag to select arbitrary rectangle).
* Small inline textarea + Send/Cancel.

### 4.3 Screenshot Strategy

* `chrome.tabs.captureVisibleTab({format: 'png'})` → data URL (PNG).
* v1 is visible area only (no stitch).

### 4.4 Console & Error Capture

* Wrap `console.*` to buffer entries during the current page lifetime.
* Listen to `window.onerror` and `unhandledrejection` via injected script.

### 4.5 Network Timings (Minimal)

* `PerformanceObserver('resource')` (buffered=true) to collect URL, duration, initiatorType; include status when available (best-effort).

### 4.6 Post to Destination

* Configurable destination (default `http://localhost:8787/annotations`).
* JSON payload with data URL image (PNG) and context.

---

## 5) Web SDK (Optional, Shallow)

### 5.1 Install & Wrap

```tsx
import { WingmanProvider } from '@wingman/sdk';

<WingmanProvider
  config={{
    enabled: process.env.NODE_ENV !== 'production',
  }}
>
  <App />
</WingmanProvider>
```

### 5.2 Responsibilities

* **Selector**: compute a robust CSS selector for the chosen element.
* **React Metadata (best-effort)**: if `__REACT_DEVTOOLS_GLOBAL_HOOK__` is present, grab component displayName + sanitized props/state.
* **Graceful Degrade**: if SDK absent or hook missing, omit `react` and `selector` (region-only still works).

---

### 5.3 React Introspection Details (explicit)

* **Feature-detect only**: attempt React details *only* when `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` exists and a renderer is attached; otherwise skip. This is the primary integration path used by React DevTools (non-public, best-effort).
* **Stability**: treat the hook as **unsupported/internal**. It is the current way DevTools talks to React, and maintainers have indicated no plans to remove it, but it is not a public API. Guard by React version; degrade gracefully if shapes change.
* **What to read**: map DOM node → Fiber → component displayName; snapshot shallow **props/state/contexts**.
* **Sanitization**: before adding to the payload, drop functions, large objects, and fields matching privacy rules; truncate long strings; mask obvious secrets (e.g., tokens/emails via regex rules).
* **Performance**: do not traverse entire Fiber trees; resolve *only* the targeted node’s path.
* **Provenance**: set `react.obtainedVia = 'devtools-hook' | 'none'`.

---

## 6) Payload Schema

```ts
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
    props?: any;   // sanitized
    state?: any;   // sanitized
    obtainedVia: 'devtools-hook' | 'none';
  };
}
```

---

## 7) Local Relay Server (Node) — Minimal Contract

### 7.1 Endpoint

* `POST /annotations` — accepts JSON body of `WingmanAnnotation`.
* Body size limit ≥ 25MB for screenshots.

### 7.2 Behavior

* Extract screenshot base64 + payload fields.
* Build Markdown summary optimized for Claude: URL, selector, note, viewport, errors, network count, react component name.

---

### 7.3 API Surface&#x20;

#### Example for last submission

**GET /annotations/last** → Fetch the most recently received annotation.

* **Res**: `200 OK` with the latest annotation payload.
* **404 Not Found** if no annotations exist.

Example:

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "wxyz9999",
  "receivedAt": "2025-08-17T14:30:12.111Z",
  "annotation": { /* payload */ }
}
```

* **POST /annotations** → Create a new annotation.

  * **Req**: `WingmanAnnotation` JSON.
  * **Res**: `201 Created` with `{ id, receivedAt }`.
  * **Errors**: `400` (invalid JSON), `413` (payload too large), `415` (unsupported media), `422` (schema mismatch), `500` (server error).
  * **Idempotency (optional)**: clients may send `Idempotency-Key` header; server returns the first result for repeats.
* **GET /annotations/\*\*\*\*:id** → Fetch one.

  * **Res**: `200 OK` with full stored payload; `404` if not found.
* **GET /annotations?limit=50\&since=...** → List recent.

  * **Res**: `200 OK` with `{ items: [...], nextCursor? }`.
* **DELETE /annotations/\*\*\*\*:id** (optional, dev-only) → Remove one.

  * **Res**: `204 No Content`.
* **GET /health** → Health check (`200 OK`).

**Error shape** (consistent): `{ error: string, code?: string, details?: any }`.

---

### Example Responses

#### POST /annotations

**201 Created**

```
HTTP/1.1 201 Created
Content-Type: application/json
Location: https://relay.local/annotations/abcd1234

{
  "id": "abcd1234",
  "receivedAt": "2025-08-17T14:23:45.678Z"
}
```

**400 Bad Request**

```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Invalid JSON payload",
  "code": "INVALID_JSON"
}
```

**413 Payload Too Large**

```
HTTP/1.1 413 Payload Too Large
Content-Type: application/json

{
  "error": "Payload exceeds maximum allowed size",
  "code": "PAYLOAD_TOO_LARGE"
}
```

**422 Unprocessable Entity**

```
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": "Schema validation failed",
  "code": "SCHEMA_ERROR",
  "details": {
    "missing": ["annotation.text"],
    "invalidType": ["annotation.timestamp"]
  }
}
```

**500 Internal Server Error**

```
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Unexpected server error",
  "code": "INTERNAL_ERROR"
}
```

#### GET /annotations/\:id

**200 OK**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "abcd1234",
  "receivedAt": "2025-08-17T14:23:45.678Z",
  "annotation": { /* full payload details from POST */ }
}
```

**404 Not Found**

```
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Annotation not found",
  "code": "NOT_FOUND"
}
```

#### GET /annotations?limit=50\&since=...

**200 OK (Paginated)**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "items": [
    { "id": "abcd1234", "receivedAt": "2025-08-17T14:23:45.678Z" },
    { "id": "efgh5678", "receivedAt": "2025-08-17T14:22:12.345Z" }
  ],
  "nextCursor": "cursor123"
}
```

