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

## 8) Config & Defaults

**Extension options**

```ts
{
  destination: 'http://localhost:8787/annotations',
  capture: {
    console: true,
    network: 'timings', // 'off' | 'timings'
    react: 'auto'       // uses SDK if present
  }
}
```

**SDK**

```ts
{
  enabled: process.env.NODE_ENV !== 'production',
  privacy: { maskSelectors: [] } // stub; v1 doesn’t blur screenshots
}
```

---

## 9) Tasks

* Manifest v3 skeleton; overlay with element/region selection.
* Visible-tab screenshot; POST to localhost.
* Console + error capture; PerformanceObserver network timings.
* Wire payload schema; options page for destination.
* Web SDK: selector calc + basic React metadata (guarded).
* Minimal Node relay → log and return response.
* README with quickstart.

---

## 11) Quickstart

1. **Run relay**

   * `npm install --save-dev typescript ts-node express node-fetch`
   * `ts-node server.ts` (exposes `http://localhost:8787`)
2. **Load extension**

   * `chrome://extensions` → Developer mode → Load unpacked → `/extension`
   * Set destination to `http://localhost:8787/annotations`.
3. **(Optional) Add SDK to app**

   * `npm i @wingman/sdk`
   * Wrap app with `WingmanProvider`.
4. **Test**

   * Invoke picker → annotate → Send → see server logs + Claude reply.

---

## 12) Test Plan (v1)

* Prioritize making the Wingman installable into the demo application. Use Playwright MCP to make sure that the core functionality works:

  * Open the demo app
  * Verify the Wingman icon is visible
  * Click the Wingman icon. Verify the tool(s) are visible
  * Click the select element tool. Move the mouse over an element on the page. Verify the element has a border/outline indicating it's being hovered over.
  * Click the element. Verify the note input textbox is displayed.
  * Type in a note. Click send. Verify the network call is made.

---

