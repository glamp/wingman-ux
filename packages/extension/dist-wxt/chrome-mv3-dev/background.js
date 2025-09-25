var background = (function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };
  function getConfig() {
    if (typeof __WINGMAN_CONFIG__ !== "undefined") {
      return __WINGMAN_CONFIG__;
    }
    return {
      environment: "production",
      features: { verboseLogging: false }
    };
  }
  function getDefaultLogLevel() {
    const config = getConfig();
    if (config.features?.verboseLogging) {
      return "debug";
    }
    switch (config.environment) {
      case "development":
        return "debug";
      case "staging":
      case "test":
        return "info";
      case "production":
      default:
        return "error";
    }
  }
  class ContentLogger {
    constructor(config = {}) {
      const wingmanConfig = getConfig();
      this.namespace = config.namespace || "Wingman";
      this.enabled = config.enabled !== false;
      this.environment = wingmanConfig.environment || "production";
      const logLevel = config.level || getDefaultLogLevel();
      this.level = LOG_LEVELS[logLevel];
    }
    shouldLog(level) {
      if (!this.enabled) return false;
      return LOG_LEVELS[level] <= this.level;
    }
    formatMessage(level, message) {
      const prefix = `[${this.namespace}]`;
      if (this.environment === "development") {
        return `${prefix} [${level.toUpperCase()}] ${message}`;
      }
      return `${prefix} ${message}`;
    }
    error(message, ...args) {
      if (this.shouldLog("error")) {
        console.error(this.formatMessage("error", message), ...args);
      }
    }
    warn(message, ...args) {
      if (this.shouldLog("warn")) {
        console.warn(this.formatMessage("warn", message), ...args);
      }
    }
    info(message, ...args) {
      if (this.shouldLog("info")) {
        console.log(this.formatMessage("info", message), ...args);
      }
    }
    debug(message, ...args) {
      if (this.shouldLog("debug")) {
        console.log(this.formatMessage("debug", message), ...args);
      }
    }
    // Create a child logger with a sub-namespace
    child(subNamespace, config) {
      return new ContentLogger({
        ...config,
        namespace: `${this.namespace}:${subNamespace}`,
        level: config?.level || (this.level === 0 ? "error" : this.level === 1 ? "warn" : this.level === 2 ? "info" : "debug"),
        enabled: config?.enabled !== void 0 ? config.enabled : this.enabled
      });
    }
  }
  function createLogger(namespace, config) {
    return new ContentLogger({ ...config, namespace });
  }
  new ContentLogger({ namespace: "Wingman" });
  const logger$1 = createLogger("TunnelManager");
  class TunnelManager {
    constructor() {
      this.ws = null;
      this.currentTunnel = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectTimeout = null;
      this.currentRelayUrl = "";
      this.isLocalRelay = false;
    }
    async createTunnel(targetPort, relayUrl) {
      logger$1.info(`[TunnelManager] createTunnel called with port: ${targetPort}, relay: ${relayUrl}`);
      if (!targetPort || targetPort <= 0 || targetPort > 65535) {
        const errorMsg = `Invalid port number: ${targetPort}. Port must be between 1 and 65535.`;
        logger$1.error(`[TunnelManager] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      try {
        logger$1.debug(`[TunnelManager] Stopping any existing tunnel...`);
        this.stopTunnel();
        logger$1.info(`[TunnelManager] Creating tunnel for port ${targetPort}`);
        this.currentTunnel = {
          sessionId: "",
          tunnelUrl: "",
          targetPort,
          status: "connecting"
        };
        this.updateBadge();
        const baseUrl = relayUrl || "https://api.wingmanux.com";
        const isLocalRelay = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
        this.currentRelayUrl = baseUrl;
        this.isLocalRelay = isLocalRelay;
        const apiUrl = `${baseUrl}/tunnel/create`;
        const requestBody = JSON.stringify({
          targetPort,
          enableP2P: false
        });
        logger$1.debug(`[TunnelManager] Using ${isLocalRelay ? "LOCAL" : "EXTERNAL"} relay`);
        logger$1.debug(`[TunnelManager] Sending POST request to ${apiUrl}`);
        logger$1.debug(`[TunnelManager] Request body: ${requestBody}`);
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: requestBody
        });
        logger$1.debug(`[TunnelManager] Response status: ${response.status}`);
        if (!response.ok) {
          const errorText = await response.text();
          logger$1.error(`[TunnelManager] API error response: ${errorText}`);
          throw new Error(`Failed to create tunnel: ${errorText}`);
        }
        const data = await response.json();
        logger$1.debug(`[TunnelManager] API response data:`, data);
        this.currentTunnel.sessionId = data.sessionId;
        this.currentTunnel.tunnelUrl = data.tunnelUrl;
        logger$1.info(`[TunnelManager] Tunnel created: ${data.tunnelUrl} (session: ${data.sessionId})`);
        logger$1.debug(`[TunnelManager] Connecting WebSocket...`);
        await this.connectWebSocket(baseUrl, isLocalRelay);
        this.currentTunnel.status = "active";
        this.updateBadge();
        logger$1.info(`[TunnelManager] Tunnel successfully activated`);
        return this.currentTunnel;
      } catch (error) {
        logger$1.error(`[TunnelManager] Failed to create tunnel:`, error);
        logger$1.error(`[TunnelManager] Error stack:`, error.stack);
        if (this.currentTunnel) {
          this.currentTunnel.status = "error";
          this.updateBadge();
        }
        throw error;
      }
    }
    async connectWebSocket(relayUrl, isLocalRelay) {
      return new Promise((resolve, reject) => {
        if (!this.currentTunnel) {
          const error = new Error("No tunnel session");
          logger$1.error(`[TunnelManager] WebSocket connect failed: ${error.message}`);
          reject(error);
          return;
        }
        const wsUrl = relayUrl.replace("http://", "ws://").replace("https://", "wss://") + "/ws";
        logger$1.info(`[TunnelManager] Connecting to WebSocket at ${wsUrl}... (${isLocalRelay ? "LOCAL" : "EXTERNAL"})`);
        try {
          this.ws = new WebSocket(wsUrl);
          logger$1.debug(`[TunnelManager] WebSocket object created`);
        } catch (error) {
          logger$1.error(`[TunnelManager] Failed to create WebSocket:`, error);
          reject(error);
          return;
        }
        const timeout = setTimeout(() => {
          logger$1.error(`[TunnelManager] WebSocket connection timeout after 10 seconds`);
          reject(new Error("WebSocket connection timeout"));
        }, 1e4);
        this.ws.onopen = () => {
          clearTimeout(timeout);
          logger$1.info(`[TunnelManager] WebSocket connected successfully`);
          if (this.ws && this.currentTunnel) {
            const registerMessage = JSON.stringify({
              type: "register",
              role: "developer",
              sessionId: this.currentTunnel.sessionId
            });
            logger$1.debug(`[TunnelManager] Sending registration: ${registerMessage}`);
            this.ws.send(registerMessage);
          } else {
            logger$1.error(`[TunnelManager] Cannot register - WebSocket or tunnel missing`);
          }
        };
        this.ws.onmessage = (event) => {
          logger$1.debug(`[TunnelManager] WebSocket message received: ${event.data}`);
          try {
            const message = JSON.parse(event.data);
            if (message.type === "registered" && message.role === "developer") {
              logger$1.info(`[TunnelManager] Successfully registered as developer`);
              this.reconnectAttempts = 0;
              resolve();
            } else if (message.type === "error") {
              logger$1.error(`[TunnelManager] WebSocket error message:`, message.error);
              reject(new Error(message.error));
            } else if (message.type === "request") {
              logger$1.info(`[TunnelManager] Tunnel request: ${message.request?.method} ${message.request?.path}`);
              this.handleTunnelRequest(message);
            } else {
              logger$1.debug(`[TunnelManager] Unhandled message type: ${message.type}`);
            }
          } catch (error) {
            logger$1.error(`[TunnelManager] Error parsing WebSocket message:`, error);
            logger$1.error(`[TunnelManager] Raw message: ${event.data}`);
          }
        };
        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          logger$1.error(`[TunnelManager] WebSocket error event:`, error);
          reject(error);
        };
        this.ws.onclose = (event) => {
          logger$1.info(`[TunnelManager] WebSocket closed - Code: ${event.code}, Reason: ${event.reason}`);
          if (this.currentTunnel && this.currentTunnel.status === "active") {
            logger$1.debug(`[TunnelManager] Will attempt to reconnect...`);
            this.scheduleReconnect();
          }
        };
      });
    }
    /**
     * Handle incoming tunnel requests by forwarding them to localhost
     */
    async handleTunnelRequest(message) {
      const { requestId, request, sessionId } = message;
      if (!this.currentTunnel || !this.ws) {
        logger$1.error("[TunnelManager] Cannot handle request - no active tunnel or WebSocket");
        return;
      }
      try {
        const targetUrl = `http://localhost:${this.currentTunnel.targetPort}${request.path || "/"}`;
        logger$1.debug(`[TunnelManager] Forwarding request to: ${targetUrl}`);
        const headers = {};
        if (request.headers) {
          Object.entries(request.headers).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            if (!["host", "connection", "content-length", "accept-encoding"].includes(lowerKey)) {
              headers[key] = value;
            }
          });
        }
        const fetchOptions = {
          method: request.method || "GET",
          headers
        };
        if (request.body && request.method !== "GET" && request.method !== "HEAD") {
          fetchOptions.body = typeof request.body === "string" ? request.body : JSON.stringify(request.body);
        }
        const response = await fetch(targetUrl, fetchOptions);
        const responseBodyBuffer = await response.arrayBuffer();
        logger$1.debug(`[TunnelManager] Response body: ${responseBodyBuffer.byteLength} bytes, content-type: ${response.headers.get("content-type") || "unknown"}`);
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        const responseMetadata = {
          type: "response",
          requestId,
          sessionId,
          response: {
            statusCode: response.status,
            headers: responseHeaders,
            bodyLength: responseBodyBuffer.byteLength
          }
        };
        logger$1.debug(`[TunnelManager] Sending binary response for request ${requestId}: ${response.status} (${responseBodyBuffer.byteLength} bytes)`);
        this.ws.send(JSON.stringify(responseMetadata));
        if (responseBodyBuffer.byteLength > 0) {
          this.ws.send(responseBodyBuffer);
        }
      } catch (error) {
        logger$1.error(`[TunnelManager] Error forwarding request:`, error);
        const errorBody = JSON.stringify({
          error: "Failed to forward request",
          details: error.message,
          targetPort: this.currentTunnel?.targetPort
        });
        const errorBodyBuffer = new TextEncoder().encode(errorBody);
        const errorMetadata = {
          type: "response",
          requestId,
          sessionId,
          response: {
            statusCode: 502,
            headers: { "Content-Type": "application/json" },
            bodyLength: errorBodyBuffer.byteLength
          }
        };
        this.ws.send(JSON.stringify(errorMetadata));
        this.ws.send(errorBodyBuffer);
      }
    }
    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger$1.error("Max reconnect attempts reached");
        if (this.currentTunnel) {
          this.currentTunnel.status = "error";
          this.updateBadge();
        }
        return;
      }
      const delay = Math.min(1e3 * Math.pow(2, this.reconnectAttempts), 1e4);
      this.reconnectAttempts++;
      logger$1.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
      this.reconnectTimeout = window.setTimeout(() => {
        if (this.currentTunnel) {
          this.connectWebSocket(this.currentRelayUrl, this.isLocalRelay).catch((error) => {
            logger$1.error("Reconnect failed:", error);
            this.scheduleReconnect();
          });
        }
      }, delay);
    }
    stopTunnel() {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.currentTunnel = null;
      this.reconnectAttempts = 0;
      this.updateBadge();
      logger$1.info("Tunnel stopped");
    }
    updateBadge() {
      const status = this.currentTunnel?.status || "inactive";
      const badgeConfig = {
        inactive: { text: "", color: "#8B5CF6" },
        connecting: { text: "●", color: "#F59E0B" },
        active: { text: "●", color: "#10B981" },
        error: { text: "●", color: "#EF4444" }
      };
      const config = badgeConfig[status];
      chrome.action.setBadgeText({ text: config.text });
      chrome.action.setBadgeBackgroundColor({ color: config.color });
    }
    getCurrentTunnel() {
      return this.currentTunnel;
    }
  }
  const tunnelManager = new TunnelManager();
  const definition = defineBackground(() => {
    console.log("Background script started with WXT!");
    chrome.action.onClicked.addListener((tab) => {
      console.log("Extension icon clicked");
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE_OVERLAY" }).catch((error) => console.error("Failed to send message:", error));
      }
    });
    chrome.commands.onCommand.addListener((command) => {
      console.log("Keyboard shortcut pressed:", command);
      if (command === "activate-overlay") {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE_OVERLAY" }).catch((error) => console.error("Failed to send message:", error));
          }
        });
      }
    });
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Background received message:", request.type);
      if (request.type === "ACTIVATE_OVERLAY" && sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: "ACTIVATE_OVERLAY" }).then((response) => sendResponse(response)).catch((error) => {
          console.error("Failed to activate overlay:", error);
          sendResponse({ success: false, error: error.message });
        });
        return true;
      }
      if (request.type === "PROCESS_ANNOTATION") {
        processAnnotation(request.annotation, request.relayUrl, request.templateId).then((result2) => sendResponse(result2)).catch((error) => {
          console.error("Failed to process annotation:", error);
          sendResponse({ success: false, error: error.message });
        });
        return true;
      }
      if (request.type === "CAPTURE_SCREENSHOT") {
        chrome.tabs.captureVisibleTab({ format: "png" }).then((dataUrl) => {
          sendResponse(dataUrl);
        }).catch((error) => {
          console.error("Screenshot failed:", error);
          sendResponse(null);
        });
        return true;
      }
      if (request.type === "TUNNEL_CREATE") {
        console.log("Tunnel create request received with port:", request.targetPort);
        if (!request.targetPort) {
          console.error("TUNNEL_CREATE: No target port provided");
          sendResponse({ success: false, error: "No target port provided" });
          return false;
        }
        chrome.storage.local.get(["relayUrl"]).then(({ relayUrl }) => {
          let finalRelayUrl = relayUrl;
          if (relayUrl === "clipboard") {
            finalRelayUrl = "https://api.wingmanux.com";
            console.log("Skipping clipboard mode for tunnel, using:", finalRelayUrl);
          } else {
            finalRelayUrl = relayUrl || "https://api.wingmanux.com";
          }
          console.log("Using relay URL for tunnel:", finalRelayUrl);
          return tunnelManager.createTunnel(request.targetPort, finalRelayUrl);
        }).then((tunnel) => {
          console.log("Tunnel created successfully:", tunnel);
          sendResponse({ success: true, tunnel });
        }).catch((error) => {
          console.error("Failed to create tunnel:", error);
          sendResponse({
            success: false,
            error: error.message || "Failed to create tunnel"
          });
        });
        return true;
      }
      if (request.type === "TUNNEL_STOP") {
        console.log("Tunnel stop request received");
        try {
          tunnelManager.stopTunnel();
          console.log("Tunnel stopped successfully");
          sendResponse({ success: true });
        } catch (error) {
          console.error("Failed to stop tunnel:", error);
          sendResponse({
            success: false,
            error: error.message || "Failed to stop tunnel"
          });
        }
        return false;
      }
      if (request.type === "TUNNEL_STATUS") {
        console.log("Tunnel status request received");
        try {
          const tunnel = tunnelManager.getCurrentTunnel();
          console.log("Current tunnel status:", tunnel);
          sendResponse({ success: true, tunnel });
        } catch (error) {
          console.error("Failed to get tunnel status:", error);
          sendResponse({
            success: false,
            error: error.message || "Failed to get tunnel status"
          });
        }
        return false;
      }
      return false;
    });
    async function processAnnotation(annotation, relayUrl, templateId) {
      try {
        console.log("Processing annotation:", { relayUrl, templateId });
        let screenshotUrl = "";
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
          screenshotUrl = dataUrl;
          console.log("Screenshot captured successfully");
        } catch (error) {
          console.error("Screenshot capture failed:", error);
        }
        const annotationWithScreenshot = {
          ...annotation,
          screenshotUrl
        };
        if (relayUrl === "clipboard") {
          const formattedText = await formatAnnotation(annotationWithScreenshot, templateId);
          console.log("Annotation formatted for clipboard");
          return { success: true, mode: "clipboard", text: formattedText };
        } else {
          const response = await fetch(`${relayUrl}/annotations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(annotationWithScreenshot)
          });
          if (response.ok) {
            console.log("Annotation sent to server successfully");
            return {
              success: true,
              mode: "server",
              previewUrl: `${relayUrl}/share/${annotation.id}`
            };
          } else {
            throw new Error(`Server responded with ${response.status}`);
          }
        }
      } catch (error) {
        console.error("Annotation processing failed:", error);
        throw error;
      }
    }
    async function formatAnnotation(annotation, templateId) {
      const settings = await chrome.storage.local.get(["customTemplates"]);
      const customTemplates = settings.customTemplates || [];
      let template = customTemplates.find((t) => t.id === templateId);
      return template?.content || formatAnnotationSimple(annotation);
    }
    function formatAnnotationSimple(annotation) {
      return `# UI Feedback

**Note**: ${annotation.note}

**Page**: ${annotation.page.title}
**URL**: ${annotation.page.url}

**Captured**: ${new Date(annotation.createdAt).toLocaleString()}`;
    }
  });
  function initPlugins() {
  }
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "ws://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws?.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([
        {
          ...contentScript,
          id,
          css: contentScript.css ?? []
        }
      ]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([
        {
          ...contentScript,
          id,
          css: contentScript.css ?? []
        }
      ]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      const hasJs = contentScript.js?.find((js) => cs.js?.includes(js));
      const hasCss = contentScript.css?.find((css) => cs.css?.includes(css));
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL3NyYy91dGlscy9sb2dnZXIudHMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC90dW5uZWwtbWFuYWdlci50cyIsIi4uLy4uL3NyYy9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9icm93c2VyLm1qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8qKlxuICogTG9jYWwgbG9nZ2VyIHV0aWxpdHkgZm9yIENocm9tZSBFeHRlbnNpb24gY29udGVudCBzY3JpcHRzXG4gKiBcbiAqIENvbnRlbnQgc2NyaXB0cyBjYW5ub3QgdXNlIEVTIG1vZHVsZXMsIHNvIHRoaXMgaXMgYSBsb2NhbCBjb3B5XG4gKiBvZiB0aGUgbG9nZ2VyIGZ1bmN0aW9uYWxpdHkgZnJvbSBwYWNrYWdlcy9zaGFyZWQvc3JjL2xvZ2dlci50c1xuICogXG4gKiBUaGlzIHZlcnNpb24gaXMgc3BlY2lmaWNhbGx5IGZvciBjb250ZW50IHNjcmlwdHMgYW5kIG90aGVyIHBhcnRzXG4gKiBvZiB0aGUgQ2hyb21lIGV4dGVuc2lvbiB0aGF0IGNhbm5vdCBpbXBvcnQgZnJvbSBAd2luZ21hbi9zaGFyZWQuXG4gKi9cblxuZXhwb3J0IHR5cGUgTG9nTGV2ZWwgPSAnZXJyb3InIHwgJ3dhcm4nIHwgJ2luZm8nIHwgJ2RlYnVnJztcblxuaW50ZXJmYWNlIExvZ2dlckNvbmZpZyB7XG4gIGxldmVsPzogTG9nTGV2ZWw7XG4gIG5hbWVzcGFjZT86IHN0cmluZztcbiAgZW5hYmxlZD86IGJvb2xlYW47XG59XG5cbi8vIExvZyBsZXZlbCBwcmlvcml0eSAoaGlnaGVyIG51bWJlciA9IG1vcmUgdmVyYm9zZSlcbmNvbnN0IExPR19MRVZFTFM6IFJlY29yZDxMb2dMZXZlbCwgbnVtYmVyPiA9IHtcbiAgZXJyb3I6IDAsXG4gIHdhcm46IDEsXG4gIGluZm86IDIsXG4gIGRlYnVnOiAzLFxufTtcblxuLy8gR2V0IGNvbmZpZyBmcm9tIHRoZSBpbmplY3RlZCBidWlsZC10aW1lIGNvbmZpZ1xuZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICBpZiAodHlwZW9mIF9fV0lOR01BTl9DT05GSUdfXyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gX19XSU5HTUFOX0NPTkZJR19fO1xuICB9XG4gIC8vIEZhbGxiYWNrIGNvbmZpZ1xuICByZXR1cm4ge1xuICAgIGVudmlyb25tZW50OiAncHJvZHVjdGlvbicsXG4gICAgZmVhdHVyZXM6IHsgdmVyYm9zZUxvZ2dpbmc6IGZhbHNlIH1cbiAgfTtcbn1cblxuLy8gR2V0IGxvZyBsZXZlbCBmcm9tIGNvbmZpZ1xuZnVuY3Rpb24gZ2V0RGVmYXVsdExvZ0xldmVsKCk6IExvZ0xldmVsIHtcbiAgY29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKCk7XG4gIFxuICAvLyBDaGVjayB2ZXJib3NlIGxvZ2dpbmcgZmxhZ1xuICBpZiAoY29uZmlnLmZlYXR1cmVzPy52ZXJib3NlTG9nZ2luZykge1xuICAgIHJldHVybiAnZGVidWcnO1xuICB9XG4gIFxuICAvLyBFbnZpcm9ubWVudC1iYXNlZCBkZWZhdWx0c1xuICBzd2l0Y2ggKGNvbmZpZy5lbnZpcm9ubWVudCkge1xuICAgIGNhc2UgJ2RldmVsb3BtZW50JzpcbiAgICAgIHJldHVybiAnZGVidWcnO1xuICAgIGNhc2UgJ3N0YWdpbmcnOlxuICAgIGNhc2UgJ3Rlc3QnOlxuICAgICAgcmV0dXJuICdpbmZvJztcbiAgICBjYXNlICdwcm9kdWN0aW9uJzpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICdlcnJvcic7XG4gIH1cbn1cblxuY2xhc3MgQ29udGVudExvZ2dlciB7XG4gIHByaXZhdGUgbGV2ZWw6IG51bWJlcjtcbiAgcHJpdmF0ZSBuYW1lc3BhY2U6IHN0cmluZztcbiAgcHJpdmF0ZSBlbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGVudmlyb25tZW50OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBMb2dnZXJDb25maWcgPSB7fSkge1xuICAgIGNvbnN0IHdpbmdtYW5Db25maWcgPSBnZXRDb25maWcoKTtcbiAgICBcbiAgICB0aGlzLm5hbWVzcGFjZSA9IGNvbmZpZy5uYW1lc3BhY2UgfHwgJ1dpbmdtYW4nO1xuICAgIHRoaXMuZW5hYmxlZCA9IGNvbmZpZy5lbmFibGVkICE9PSBmYWxzZTtcbiAgICB0aGlzLmVudmlyb25tZW50ID0gd2luZ21hbkNvbmZpZy5lbnZpcm9ubWVudCB8fCAncHJvZHVjdGlvbic7XG4gICAgXG4gICAgY29uc3QgbG9nTGV2ZWwgPSBjb25maWcubGV2ZWwgfHwgZ2V0RGVmYXVsdExvZ0xldmVsKCk7XG4gICAgdGhpcy5sZXZlbCA9IExPR19MRVZFTFNbbG9nTGV2ZWxdO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG91bGRMb2cobGV2ZWw6IExvZ0xldmVsKTogYm9vbGVhbiB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gTE9HX0xFVkVMU1tsZXZlbF0gPD0gdGhpcy5sZXZlbDtcbiAgfVxuXG4gIHByaXZhdGUgZm9ybWF0TWVzc2FnZShsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcHJlZml4ID0gYFske3RoaXMubmFtZXNwYWNlfV1gO1xuICAgIFxuICAgIC8vIEluIGRldmVsb3BtZW50LCBpbmNsdWRlIGxldmVsXG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICAgIHJldHVybiBgJHtwcmVmaXh9IFske2xldmVsLnRvVXBwZXJDYXNlKCl9XSAke21lc3NhZ2V9YDtcbiAgICB9XG4gICAgXG4gICAgLy8gSW4gcHJvZHVjdGlvbiwga2VlcCBpdCBzaW1wbGVcbiAgICByZXR1cm4gYCR7cHJlZml4fSAke21lc3NhZ2V9YDtcbiAgfVxuXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zaG91bGRMb2coJ2Vycm9yJykpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy5mb3JtYXRNZXNzYWdlKCdlcnJvcicsIG1lc3NhZ2UpLCAuLi5hcmdzKTtcbiAgICB9XG4gIH1cblxuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zaG91bGRMb2coJ3dhcm4nKSkge1xuICAgICAgY29uc29sZS53YXJuKHRoaXMuZm9ybWF0TWVzc2FnZSgnd2FybicsIG1lc3NhZ2UpLCAuLi5hcmdzKTtcbiAgICB9XG4gIH1cblxuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zaG91bGRMb2coJ2luZm8nKSkge1xuICAgICAgY29uc29sZS5sb2codGhpcy5mb3JtYXRNZXNzYWdlKCdpbmZvJywgbWVzc2FnZSksIC4uLmFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zaG91bGRMb2coJ2RlYnVnJykpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuZm9ybWF0TWVzc2FnZSgnZGVidWcnLCBtZXNzYWdlKSwgLi4uYXJncyk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ3JlYXRlIGEgY2hpbGQgbG9nZ2VyIHdpdGggYSBzdWItbmFtZXNwYWNlXG4gIGNoaWxkKHN1Yk5hbWVzcGFjZTogc3RyaW5nLCBjb25maWc/OiBQYXJ0aWFsPExvZ2dlckNvbmZpZz4pOiBDb250ZW50TG9nZ2VyIHtcbiAgICByZXR1cm4gbmV3IENvbnRlbnRMb2dnZXIoe1xuICAgICAgLi4uY29uZmlnLFxuICAgICAgbmFtZXNwYWNlOiBgJHt0aGlzLm5hbWVzcGFjZX06JHtzdWJOYW1lc3BhY2V9YCxcbiAgICAgIGxldmVsOiBjb25maWc/LmxldmVsIHx8ICh0aGlzLmxldmVsID09PSAwID8gJ2Vycm9yJyA6IHRoaXMubGV2ZWwgPT09IDEgPyAnd2FybicgOiB0aGlzLmxldmVsID09PSAyID8gJ2luZm8nIDogJ2RlYnVnJyksXG4gICAgICBlbmFibGVkOiBjb25maWc/LmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5lbmFibGVkIDogdGhpcy5lbmFibGVkLFxuICAgIH0pO1xuICB9XG59XG5cbi8vIEV4cG9ydCBmYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBsb2dnZXJzXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9nZ2VyKG5hbWVzcGFjZTogc3RyaW5nLCBjb25maWc/OiBQYXJ0aWFsPExvZ2dlckNvbmZpZz4pOiBDb250ZW50TG9nZ2VyIHtcbiAgcmV0dXJuIG5ldyBDb250ZW50TG9nZ2VyKHsgLi4uY29uZmlnLCBuYW1lc3BhY2UgfSk7XG59XG5cbi8vIERlZmF1bHQgbG9nZ2VyIGluc3RhbmNlXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IENvbnRlbnRMb2dnZXIoeyBuYW1lc3BhY2U6ICdXaW5nbWFuJyB9KTsiLCJpbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi91dGlscy9sb2dnZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR1bm5lbFNlc3Npb24ge1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgdHVubmVsVXJsOiBzdHJpbmc7XG4gIHRhcmdldFBvcnQ6IG51bWJlcjtcbiAgc3RhdHVzOiAnY29ubmVjdGluZycgfCAnYWN0aXZlJyB8ICdlcnJvcic7XG59XG5cbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignVHVubmVsTWFuYWdlcicpO1xuXG5leHBvcnQgY2xhc3MgVHVubmVsTWFuYWdlciB7XG4gIHByaXZhdGUgd3M6IFdlYlNvY2tldCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGN1cnJlbnRUdW5uZWw6IFR1bm5lbFNlc3Npb24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWNvbm5lY3RBdHRlbXB0czogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSByZWFkb25seSBtYXhSZWNvbm5lY3RBdHRlbXB0czogbnVtYmVyID0gNTtcbiAgcHJpdmF0ZSByZWNvbm5lY3RUaW1lb3V0OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjdXJyZW50UmVsYXlVcmw6IHN0cmluZyA9ICcnO1xuICBwcml2YXRlIGlzTG9jYWxSZWxheTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIFR1bm5lbE1hbmFnZXIgd2lsbCBiZSB1c2VkIGJ5IHRoZSBtYWluIG1lc3NhZ2UgbGlzdGVuZXJcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVR1bm5lbCh0YXJnZXRQb3J0OiBudW1iZXIsIHJlbGF5VXJsPzogc3RyaW5nKTogUHJvbWlzZTxUdW5uZWxTZXNzaW9uPiB7XG4gICAgbG9nZ2VyLmluZm8oYFtUdW5uZWxNYW5hZ2VyXSBjcmVhdGVUdW5uZWwgY2FsbGVkIHdpdGggcG9ydDogJHt0YXJnZXRQb3J0fSwgcmVsYXk6ICR7cmVsYXlVcmx9YCk7XG4gICAgXG4gICAgLy8gVmFsaWRhdGUgcG9ydCBudW1iZXJcbiAgICBpZiAoIXRhcmdldFBvcnQgfHwgdGFyZ2V0UG9ydCA8PSAwIHx8IHRhcmdldFBvcnQgPiA2NTUzNSkge1xuICAgICAgY29uc3QgZXJyb3JNc2cgPSBgSW52YWxpZCBwb3J0IG51bWJlcjogJHt0YXJnZXRQb3J0fS4gUG9ydCBtdXN0IGJlIGJldHdlZW4gMSBhbmQgNjU1MzUuYDtcbiAgICAgIGxvZ2dlci5lcnJvcihgW1R1bm5lbE1hbmFnZXJdICR7ZXJyb3JNc2d9YCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuICAgIH1cbiAgICBcbiAgICB0cnkge1xuICAgICAgLy8gU3RvcCBleGlzdGluZyB0dW5uZWwgaWYgYW55XG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBTdG9wcGluZyBhbnkgZXhpc3RpbmcgdHVubmVsLi4uYCk7XG4gICAgICB0aGlzLnN0b3BUdW5uZWwoKTtcblxuICAgICAgbG9nZ2VyLmluZm8oYFtUdW5uZWxNYW5hZ2VyXSBDcmVhdGluZyB0dW5uZWwgZm9yIHBvcnQgJHt0YXJnZXRQb3J0fWApO1xuICAgICAgXG4gICAgICAvLyBVcGRhdGUgc3RhdHVzIHRvIGNvbm5lY3RpbmdcbiAgICAgIHRoaXMuY3VycmVudFR1bm5lbCA9IHtcbiAgICAgICAgc2Vzc2lvbklkOiAnJyxcbiAgICAgICAgdHVubmVsVXJsOiAnJyxcbiAgICAgICAgdGFyZ2V0UG9ydCxcbiAgICAgICAgc3RhdHVzOiAnY29ubmVjdGluZydcbiAgICAgIH07XG4gICAgICB0aGlzLnVwZGF0ZUJhZGdlKCk7XG5cbiAgICAgIC8vIERldGVybWluZSB3aGljaCBzZXJ2ZXIgdG8gdXNlXG4gICAgICBjb25zdCBiYXNlVXJsID0gcmVsYXlVcmwgfHwgJ2h0dHBzOi8vYXBpLndpbmdtYW51eC5jb20nO1xuICAgICAgY29uc3QgaXNMb2NhbFJlbGF5ID0gYmFzZVVybC5pbmNsdWRlcygnbG9jYWxob3N0JykgfHwgYmFzZVVybC5pbmNsdWRlcygnMTI3LjAuMC4xJyk7XG4gICAgICBcbiAgICAgIC8vIFN0b3JlIGZvciByZWNvbm5lY3Rpb25cbiAgICAgIHRoaXMuY3VycmVudFJlbGF5VXJsID0gYmFzZVVybDtcbiAgICAgIHRoaXMuaXNMb2NhbFJlbGF5ID0gaXNMb2NhbFJlbGF5O1xuICAgICAgXG4gICAgICAvLyBVc2UgdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwgZm9yIHR1bm5lbCBjcmVhdGlvblxuICAgICAgY29uc3QgYXBpVXJsID0gYCR7YmFzZVVybH0vdHVubmVsL2NyZWF0ZWA7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICB0YXJnZXRQb3J0LFxuICAgICAgICBlbmFibGVQMlA6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgbG9nZ2VyLmRlYnVnKGBbVHVubmVsTWFuYWdlcl0gVXNpbmcgJHtpc0xvY2FsUmVsYXkgPyAnTE9DQUwnIDogJ0VYVEVSTkFMJ30gcmVsYXlgKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgW1R1bm5lbE1hbmFnZXJdIFNlbmRpbmcgUE9TVCByZXF1ZXN0IHRvICR7YXBpVXJsfWApO1xuICAgICAgbG9nZ2VyLmRlYnVnKGBbVHVubmVsTWFuYWdlcl0gUmVxdWVzdCBib2R5OiAke3JlcXVlc3RCb2R5fWApO1xuICAgICAgXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogcmVxdWVzdEJvZHlcbiAgICAgIH0pO1xuXG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBSZXNwb25zZSBzdGF0dXM6ICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgICAgXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gQVBJIGVycm9yIHJlc3BvbnNlOiAke2Vycm9yVGV4dH1gKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIHR1bm5lbDogJHtlcnJvclRleHR9YCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBBUEkgcmVzcG9uc2UgZGF0YTpgLCBkYXRhKTtcbiAgICAgIFxuICAgICAgdGhpcy5jdXJyZW50VHVubmVsLnNlc3Npb25JZCA9IGRhdGEuc2Vzc2lvbklkO1xuICAgICAgdGhpcy5jdXJyZW50VHVubmVsLnR1bm5lbFVybCA9IGRhdGEudHVubmVsVXJsO1xuICAgICAgXG4gICAgICBsb2dnZXIuaW5mbyhgW1R1bm5lbE1hbmFnZXJdIFR1bm5lbCBjcmVhdGVkOiAke2RhdGEudHVubmVsVXJsfSAoc2Vzc2lvbjogJHtkYXRhLnNlc3Npb25JZH0pYCk7XG5cbiAgICAgIC8vIENvbm5lY3QgV2ViU29ja2V0IGZvciBkZXZlbG9wZXIgcmVnaXN0cmF0aW9uXG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBDb25uZWN0aW5nIFdlYlNvY2tldC4uLmApO1xuICAgICAgYXdhaXQgdGhpcy5jb25uZWN0V2ViU29ja2V0KGJhc2VVcmwsIGlzTG9jYWxSZWxheSk7XG4gICAgICBcbiAgICAgIC8vIFVwZGF0ZSBzdGF0dXMgdG8gYWN0aXZlXG4gICAgICB0aGlzLmN1cnJlbnRUdW5uZWwuc3RhdHVzID0gJ2FjdGl2ZSc7XG4gICAgICB0aGlzLnVwZGF0ZUJhZGdlKCk7XG4gICAgICBcbiAgICAgIGxvZ2dlci5pbmZvKGBbVHVubmVsTWFuYWdlcl0gVHVubmVsIHN1Y2Nlc3NmdWxseSBhY3RpdmF0ZWRgKTtcbiAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRUdW5uZWw7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gRmFpbGVkIHRvIGNyZWF0ZSB0dW5uZWw6YCwgZXJyb3IpO1xuICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gRXJyb3Igc3RhY2s6YCwgZXJyb3Iuc3RhY2spO1xuICAgICAgXG4gICAgICBpZiAodGhpcy5jdXJyZW50VHVubmVsKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFR1bm5lbC5zdGF0dXMgPSAnZXJyb3InO1xuICAgICAgICB0aGlzLnVwZGF0ZUJhZGdlKCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbm5lY3RXZWJTb2NrZXQocmVsYXlVcmw6IHN0cmluZywgaXNMb2NhbFJlbGF5OiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGlmICghdGhpcy5jdXJyZW50VHVubmVsKSB7XG4gICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKCdObyB0dW5uZWwgc2Vzc2lvbicpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoYFtUdW5uZWxNYW5hZ2VyXSBXZWJTb2NrZXQgY29ubmVjdCBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBVc2UgdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwgZm9yIFdlYlNvY2tldCBjb25uZWN0aW9uXG4gICAgICBjb25zdCB3c1VybCA9IHJlbGF5VXJsLnJlcGxhY2UoJ2h0dHA6Ly8nLCAnd3M6Ly8nKS5yZXBsYWNlKCdodHRwczovLycsICd3c3M6Ly8nKSArICcvd3MnO1xuICAgICAgXG4gICAgICBsb2dnZXIuaW5mbyhgW1R1bm5lbE1hbmFnZXJdIENvbm5lY3RpbmcgdG8gV2ViU29ja2V0IGF0ICR7d3NVcmx9Li4uICgke2lzTG9jYWxSZWxheSA/ICdMT0NBTCcgOiAnRVhURVJOQUwnfSlgKTtcbiAgICAgIFxuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy53cyA9IG5ldyBXZWJTb2NrZXQod3NVcmwpO1xuICAgICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBXZWJTb2NrZXQgb2JqZWN0IGNyZWF0ZWRgKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gRmFpbGVkIHRvIGNyZWF0ZSBXZWJTb2NrZXQ6YCwgZXJyb3IpO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gV2ViU29ja2V0IGNvbm5lY3Rpb24gdGltZW91dCBhZnRlciAxMCBzZWNvbmRzYCk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1dlYlNvY2tldCBjb25uZWN0aW9uIHRpbWVvdXQnKSk7XG4gICAgICB9LCAxMDAwMCk7XG5cbiAgICAgIHRoaXMud3Mub25vcGVuID0gKCkgPT4ge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBbVHVubmVsTWFuYWdlcl0gV2ViU29ja2V0IGNvbm5lY3RlZCBzdWNjZXNzZnVsbHlgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ2lzdGVyIGFzIGRldmVsb3BlclxuICAgICAgICBpZiAodGhpcy53cyAmJiB0aGlzLmN1cnJlbnRUdW5uZWwpIHtcbiAgICAgICAgICBjb25zdCByZWdpc3Rlck1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICB0eXBlOiAncmVnaXN0ZXInLFxuICAgICAgICAgICAgcm9sZTogJ2RldmVsb3BlcicsXG4gICAgICAgICAgICBzZXNzaW9uSWQ6IHRoaXMuY3VycmVudFR1bm5lbC5zZXNzaW9uSWRcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBTZW5kaW5nIHJlZ2lzdHJhdGlvbjogJHtyZWdpc3Rlck1lc3NhZ2V9YCk7XG4gICAgICAgICAgdGhpcy53cy5zZW5kKHJlZ2lzdGVyTWVzc2FnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gQ2Fubm90IHJlZ2lzdGVyIC0gV2ViU29ja2V0IG9yIHR1bm5lbCBtaXNzaW5nYCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHRoaXMud3Mub25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgW1R1bm5lbE1hbmFnZXJdIFdlYlNvY2tldCBtZXNzYWdlIHJlY2VpdmVkOiAke2V2ZW50LmRhdGF9YCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdyZWdpc3RlcmVkJyAmJiBtZXNzYWdlLnJvbGUgPT09ICdkZXZlbG9wZXInKSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgW1R1bm5lbE1hbmFnZXJdIFN1Y2Nlc3NmdWxseSByZWdpc3RlcmVkIGFzIGRldmVsb3BlcmApO1xuICAgICAgICAgICAgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA9IDA7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgW1R1bm5lbE1hbmFnZXJdIFdlYlNvY2tldCBlcnJvciBtZXNzYWdlOmAsIG1lc3NhZ2UuZXJyb3IpO1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtZXNzYWdlLmVycm9yKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdyZXF1ZXN0Jykge1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtUdW5uZWxNYW5hZ2VyXSBUdW5uZWwgcmVxdWVzdDogJHttZXNzYWdlLnJlcXVlc3Q/Lm1ldGhvZH0gJHttZXNzYWdlLnJlcXVlc3Q/LnBhdGh9YCk7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVR1bm5lbFJlcXVlc3QobWVzc2FnZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhgW1R1bm5lbE1hbmFnZXJdIFVuaGFuZGxlZCBtZXNzYWdlIHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFtUdW5uZWxNYW5hZ2VyXSBFcnJvciBwYXJzaW5nIFdlYlNvY2tldCBtZXNzYWdlOmAsIGVycm9yKTtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFtUdW5uZWxNYW5hZ2VyXSBSYXcgbWVzc2FnZTogJHtldmVudC5kYXRhfWApO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB0aGlzLndzLm9uZXJyb3IgPSAoZXJyb3IpID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoYFtUdW5uZWxNYW5hZ2VyXSBXZWJTb2NrZXQgZXJyb3IgZXZlbnQ6YCwgZXJyb3IpO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy53cy5vbmNsb3NlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBbVHVubmVsTWFuYWdlcl0gV2ViU29ja2V0IGNsb3NlZCAtIENvZGU6ICR7ZXZlbnQuY29kZX0sIFJlYXNvbjogJHtldmVudC5yZWFzb259YCk7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRUdW5uZWwgJiYgdGhpcy5jdXJyZW50VHVubmVsLnN0YXR1cyA9PT0gJ2FjdGl2ZScpIHtcbiAgICAgICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBXaWxsIGF0dGVtcHQgdG8gcmVjb25uZWN0Li4uYCk7XG4gICAgICAgICAgdGhpcy5zY2hlZHVsZVJlY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZSBpbmNvbWluZyB0dW5uZWwgcmVxdWVzdHMgYnkgZm9yd2FyZGluZyB0aGVtIHRvIGxvY2FsaG9zdFxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVUdW5uZWxSZXF1ZXN0KG1lc3NhZ2U6IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgcmVxdWVzdElkLCByZXF1ZXN0LCBzZXNzaW9uSWQgfSA9IG1lc3NhZ2U7XG4gICAgXG4gICAgaWYgKCF0aGlzLmN1cnJlbnRUdW5uZWwgfHwgIXRoaXMud3MpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignW1R1bm5lbE1hbmFnZXJdIENhbm5vdCBoYW5kbGUgcmVxdWVzdCAtIG5vIGFjdGl2ZSB0dW5uZWwgb3IgV2ViU29ja2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIHRyeSB7XG4gICAgICAvLyBCdWlsZCB0YXJnZXQgVVJMIGZvciB1c2VyJ3MgbG9jYWxob3N0XG4gICAgICBjb25zdCB0YXJnZXRVcmwgPSBgaHR0cDovL2xvY2FsaG9zdDoke3RoaXMuY3VycmVudFR1bm5lbC50YXJnZXRQb3J0fSR7cmVxdWVzdC5wYXRoIHx8ICcvJ31gO1xuICAgICAgbG9nZ2VyLmRlYnVnKGBbVHVubmVsTWFuYWdlcl0gRm9yd2FyZGluZyByZXF1ZXN0IHRvOiAke3RhcmdldFVybH1gKTtcbiAgICAgIFxuICAgICAgLy8gRmlsdGVyIG91dCBwcm9ibGVtYXRpYyBoZWFkZXJzIHRoYXQgQ2hyb21lIGV4dGVuc2lvbiBjYW4ndCBzZXRcbiAgICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICAgIGlmIChyZXF1ZXN0LmhlYWRlcnMpIHtcbiAgICAgICAgT2JqZWN0LmVudHJpZXMocmVxdWVzdC5oZWFkZXJzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICBjb25zdCBsb3dlcktleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIC8vIFNraXAgaGVhZGVycyB0aGF0IENocm9tZSBleHRlbnNpb25zIGNhbid0IHNldFxuICAgICAgICAgIGlmICghWydob3N0JywgJ2Nvbm5lY3Rpb24nLCAnY29udGVudC1sZW5ndGgnLCAnYWNjZXB0LWVuY29kaW5nJ10uaW5jbHVkZXMobG93ZXJLZXkpKSB7XG4gICAgICAgICAgICBoZWFkZXJzW2tleV0gPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gUHJlcGFyZSBmZXRjaCBvcHRpb25zXG4gICAgICBjb25zdCBmZXRjaE9wdGlvbnM6IFJlcXVlc3RJbml0ID0ge1xuICAgICAgICBtZXRob2Q6IHJlcXVlc3QubWV0aG9kIHx8ICdHRVQnLFxuICAgICAgICBoZWFkZXJzXG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBBZGQgYm9keSBmb3Igbm9uLUdFVCByZXF1ZXN0c1xuICAgICAgaWYgKHJlcXVlc3QuYm9keSAmJiByZXF1ZXN0Lm1ldGhvZCAhPT0gJ0dFVCcgJiYgcmVxdWVzdC5tZXRob2QgIT09ICdIRUFEJykge1xuICAgICAgICBmZXRjaE9wdGlvbnMuYm9keSA9IHR5cGVvZiByZXF1ZXN0LmJvZHkgPT09ICdzdHJpbmcnIFxuICAgICAgICAgID8gcmVxdWVzdC5ib2R5IFxuICAgICAgICAgIDogSlNPTi5zdHJpbmdpZnkocmVxdWVzdC5ib2R5KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gRm9yd2FyZCByZXF1ZXN0IHRvIGxvY2FsaG9zdFxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh0YXJnZXRVcmwsIGZldGNoT3B0aW9ucyk7XG4gICAgICBcbiAgICAgIC8vIEdldCByZXNwb25zZSBib2R5IGFzIGJpbmFyeSBkYXRhICh3b3JrcyBmb3IgYWxsIGNvbnRlbnQgdHlwZXMpXG4gICAgICBjb25zdCByZXNwb25zZUJvZHlCdWZmZXIgPSBhd2FpdCByZXNwb25zZS5hcnJheUJ1ZmZlcigpO1xuICAgICAgXG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBSZXNwb25zZSBib2R5OiAke3Jlc3BvbnNlQm9keUJ1ZmZlci5ieXRlTGVuZ3RofSBieXRlcywgY29udGVudC10eXBlOiAke3Jlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSB8fCAndW5rbm93bid9YCk7XG4gICAgICBcbiAgICAgIC8vIENvbGxlY3QgcmVzcG9uc2UgaGVhZGVyc1xuICAgICAgY29uc3QgcmVzcG9uc2VIZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgICByZXNwb25zZS5oZWFkZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgcmVzcG9uc2VIZWFkZXJzW2tleV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBTZW5kIHJlc3BvbnNlIG1ldGFkYXRhIGFzIEpTT04gZmlyc3RcbiAgICAgIGNvbnN0IHJlc3BvbnNlTWV0YWRhdGEgPSB7XG4gICAgICAgIHR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHJlcXVlc3RJZCxcbiAgICAgICAgc2Vzc2lvbklkLFxuICAgICAgICByZXNwb25zZToge1xuICAgICAgICAgIHN0YXR1c0NvZGU6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgICAgICBoZWFkZXJzOiByZXNwb25zZUhlYWRlcnMsXG4gICAgICAgICAgYm9keUxlbmd0aDogcmVzcG9uc2VCb2R5QnVmZmVyLmJ5dGVMZW5ndGhcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgbG9nZ2VyLmRlYnVnKGBbVHVubmVsTWFuYWdlcl0gU2VuZGluZyBiaW5hcnkgcmVzcG9uc2UgZm9yIHJlcXVlc3QgJHtyZXF1ZXN0SWR9OiAke3Jlc3BvbnNlLnN0YXR1c30gKCR7cmVzcG9uc2VCb2R5QnVmZmVyLmJ5dGVMZW5ndGh9IGJ5dGVzKWApO1xuICAgICAgXG4gICAgICAvLyBTZW5kIG1ldGFkYXRhIGZpcnN0XG4gICAgICB0aGlzLndzLnNlbmQoSlNPTi5zdHJpbmdpZnkocmVzcG9uc2VNZXRhZGF0YSkpO1xuICAgICAgXG4gICAgICAvLyBTZW5kIHJlc3BvbnNlIGJvZHkgYXMgYmluYXJ5IFdlYlNvY2tldCBmcmFtZVxuICAgICAgaWYgKHJlc3BvbnNlQm9keUJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLndzLnNlbmQocmVzcG9uc2VCb2R5QnVmZmVyKTtcbiAgICAgIH1cbiAgICAgIFxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgW1R1bm5lbE1hbmFnZXJdIEVycm9yIGZvcndhcmRpbmcgcmVxdWVzdDpgLCBlcnJvcik7XG4gICAgICBcbiAgICAgIC8vIFNlbmQgZXJyb3IgcmVzcG9uc2UgYmFjayB0aHJvdWdoIFdlYlNvY2tldCB1c2luZyBuZXcgYmluYXJ5IGZvcm1hdFxuICAgICAgY29uc3QgZXJyb3JCb2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBmb3J3YXJkIHJlcXVlc3QnLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICB0YXJnZXRQb3J0OiB0aGlzLmN1cnJlbnRUdW5uZWw/LnRhcmdldFBvcnRcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBjb25zdCBlcnJvckJvZHlCdWZmZXIgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoZXJyb3JCb2R5KTtcbiAgICAgIFxuICAgICAgY29uc3QgZXJyb3JNZXRhZGF0YSA9IHtcbiAgICAgICAgdHlwZTogJ3Jlc3BvbnNlJyxcbiAgICAgICAgcmVxdWVzdElkLFxuICAgICAgICBzZXNzaW9uSWQsXG4gICAgICAgIHJlc3BvbnNlOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogNTAyLFxuICAgICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgICAgIGJvZHlMZW5ndGg6IGVycm9yQm9keUJ1ZmZlci5ieXRlTGVuZ3RoXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBcbiAgICAgIHRoaXMud3Muc2VuZChKU09OLnN0cmluZ2lmeShlcnJvck1ldGFkYXRhKSk7XG4gICAgICB0aGlzLndzLnNlbmQoZXJyb3JCb2R5QnVmZmVyKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlUmVjb25uZWN0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJlY29ubmVjdEF0dGVtcHRzID49IHRoaXMubWF4UmVjb25uZWN0QXR0ZW1wdHMpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignTWF4IHJlY29ubmVjdCBhdHRlbXB0cyByZWFjaGVkJyk7XG4gICAgICBpZiAodGhpcy5jdXJyZW50VHVubmVsKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFR1bm5lbC5zdGF0dXMgPSAnZXJyb3InO1xuICAgICAgICB0aGlzLnVwZGF0ZUJhZGdlKCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGVsYXkgPSBNYXRoLm1pbigxMDAwICogTWF0aC5wb3coMiwgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyksIDEwMDAwKTtcbiAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzKys7XG4gICAgXG4gICAgbG9nZ2VyLmluZm8oYFNjaGVkdWxpbmcgcmVjb25uZWN0IGF0dGVtcHQgJHt0aGlzLnJlY29ubmVjdEF0dGVtcHRzfSBpbiAke2RlbGF5fW1zYCk7XG4gICAgXG4gICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuY3VycmVudFR1bm5lbCkge1xuICAgICAgICB0aGlzLmNvbm5lY3RXZWJTb2NrZXQodGhpcy5jdXJyZW50UmVsYXlVcmwsIHRoaXMuaXNMb2NhbFJlbGF5KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdSZWNvbm5lY3QgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICB0aGlzLnNjaGVkdWxlUmVjb25uZWN0KCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIGRlbGF5KTtcbiAgfVxuXG4gIHN0b3BUdW5uZWwoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucmVjb25uZWN0VGltZW91dCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVjb25uZWN0VGltZW91dCk7XG4gICAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXQgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICh0aGlzLndzKSB7XG4gICAgICB0aGlzLndzLmNsb3NlKCk7XG4gICAgICB0aGlzLndzID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRUdW5uZWwgPSBudWxsO1xuICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICAgIHRoaXMudXBkYXRlQmFkZ2UoKTtcbiAgICBcbiAgICBsb2dnZXIuaW5mbygnVHVubmVsIHN0b3BwZWQnKTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlQmFkZ2UoKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdHVzID0gdGhpcy5jdXJyZW50VHVubmVsPy5zdGF0dXMgfHwgJ2luYWN0aXZlJztcbiAgICBjb25zdCBiYWRnZUNvbmZpZyA9IHtcbiAgICAgIGluYWN0aXZlOiB7IHRleHQ6ICcnLCBjb2xvcjogJyM4QjVDRjYnIH0sXG4gICAgICBjb25uZWN0aW5nOiB7IHRleHQ6ICfil48nLCBjb2xvcjogJyNGNTlFMEInIH0sXG4gICAgICBhY3RpdmU6IHsgdGV4dDogJ+KXjycsIGNvbG9yOiAnIzEwQjk4MScgfSxcbiAgICAgIGVycm9yOiB7IHRleHQ6ICfil48nLCBjb2xvcjogJyNFRjQ0NDQnIH1cbiAgICB9O1xuXG4gICAgY29uc3QgY29uZmlnID0gYmFkZ2VDb25maWdbc3RhdHVzXTtcbiAgICBjaHJvbWUuYWN0aW9uLnNldEJhZGdlVGV4dCh7IHRleHQ6IGNvbmZpZy50ZXh0IH0pO1xuICAgIGNocm9tZS5hY3Rpb24uc2V0QmFkZ2VCYWNrZ3JvdW5kQ29sb3IoeyBjb2xvcjogY29uZmlnLmNvbG9yIH0pO1xuICB9XG5cbiAgZ2V0Q3VycmVudFR1bm5lbCgpOiBUdW5uZWxTZXNzaW9uIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFR1bm5lbDtcbiAgfVxufSIsImltcG9ydCB7IFR1bm5lbE1hbmFnZXIgfSBmcm9tICcuLi9iYWNrZ3JvdW5kL3R1bm5lbC1tYW5hZ2VyJztcblxuLy8gR2xvYmFsIHR1bm5lbCBtYW5hZ2VyIGluc3RhbmNlXG5jb25zdCB0dW5uZWxNYW5hZ2VyID0gbmV3IFR1bm5lbE1hbmFnZXIoKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQmFja2dyb3VuZCgoKSA9PiB7XG4gIGNvbnNvbGUubG9nKCdCYWNrZ3JvdW5kIHNjcmlwdCBzdGFydGVkIHdpdGggV1hUIScpO1xuXG4gIC8vIEV4dGVuc2lvbiBpY29uIGNsaWNrIGhhbmRsZXJcbiAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKHRhYikgPT4ge1xuICAgIGNvbnNvbGUubG9nKCdFeHRlbnNpb24gaWNvbiBjbGlja2VkJyk7XG4gICAgaWYgKHRhYi5pZCkge1xuICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiLmlkLCB7IHR5cGU6ICdBQ1RJVkFURV9PVkVSTEFZJyB9KVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2VuZCBtZXNzYWdlOicsIGVycm9yKSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBLZXlib2FyZCBzaG9ydGN1dCBoYW5kbGVyXG4gIGNocm9tZS5jb21tYW5kcy5vbkNvbW1hbmQuYWRkTGlzdGVuZXIoKGNvbW1hbmQpID0+IHtcbiAgICBjb25zb2xlLmxvZygnS2V5Ym9hcmQgc2hvcnRjdXQgcHJlc3NlZDonLCBjb21tYW5kKTtcbiAgICBpZiAoY29tbWFuZCA9PT0gJ2FjdGl2YXRlLW92ZXJsYXknKSB7XG4gICAgICBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9LCAoW3RhYl0pID0+IHtcbiAgICAgICAgaWYgKHRhYj8uaWQpIHtcbiAgICAgICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIHsgdHlwZTogJ0FDVElWQVRFX09WRVJMQVknIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2VuZCBtZXNzYWdlOicsIGVycm9yKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gTWVzc2FnZSBoYW5kbGVyIGZvciBjb21tdW5pY2F0aW9uIHdpdGggcG9wdXAgYW5kIGNvbnRlbnQgc2NyaXB0c1xuICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKHJlcXVlc3QsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgY29uc29sZS5sb2coJ0JhY2tncm91bmQgcmVjZWl2ZWQgbWVzc2FnZTonLCByZXF1ZXN0LnR5cGUpO1xuXG4gICAgLy8gUm91dGUgQUNUSVZBVEVfT1ZFUkxBWSBmcm9tIGNvbnRlbnQgc2NyaXB0IGJhY2sgdG8gY29udGVudCBzY3JpcHRcbiAgICBpZiAocmVxdWVzdC50eXBlID09PSAnQUNUSVZBVEVfT1ZFUkxBWScgJiYgc2VuZGVyLnRhYj8uaWQpIHtcbiAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHNlbmRlci50YWIuaWQsIHsgdHlwZTogJ0FDVElWQVRFX09WRVJMQVknIH0pXG4gICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4gc2VuZFJlc3BvbnNlKHJlc3BvbnNlKSlcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBhY3RpdmF0ZSBvdmVybGF5OicsIGVycm9yKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIGFubm90YXRpb24gcHJvY2Vzc2luZ1xuICAgIGlmIChyZXF1ZXN0LnR5cGUgPT09ICdQUk9DRVNTX0FOTk9UQVRJT04nKSB7XG4gICAgICBwcm9jZXNzQW5ub3RhdGlvbihyZXF1ZXN0LmFubm90YXRpb24sIHJlcXVlc3QucmVsYXlVcmwsIHJlcXVlc3QudGVtcGxhdGVJZClcbiAgICAgICAgLnRoZW4oKHJlc3VsdCkgPT4gc2VuZFJlc3BvbnNlKHJlc3VsdCkpXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcHJvY2VzcyBhbm5vdGF0aW9uOicsIGVycm9yKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHNjcmVlbnNob3QgY2FwdHVyZVxuICAgIGlmIChyZXF1ZXN0LnR5cGUgPT09ICdDQVBUVVJFX1NDUkVFTlNIT1QnKSB7XG4gICAgICBjaHJvbWUudGFicy5jYXB0dXJlVmlzaWJsZVRhYih7IGZvcm1hdDogJ3BuZycgfSlcbiAgICAgICAgLnRoZW4oKGRhdGFVcmwpID0+IHtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoZGF0YVVybCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdTY3JlZW5zaG90IGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlOyAvLyBXaWxsIHJlc3BvbmQgYXN5bmNocm9ub3VzbHlcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgdHVubmVsIG1lc3NhZ2VzXG4gICAgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ1RVTk5FTF9DUkVBVEUnKSB7XG4gICAgICBjb25zb2xlLmxvZygnVHVubmVsIGNyZWF0ZSByZXF1ZXN0IHJlY2VpdmVkIHdpdGggcG9ydDonLCByZXF1ZXN0LnRhcmdldFBvcnQpO1xuXG4gICAgICBpZiAoIXJlcXVlc3QudGFyZ2V0UG9ydCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdUVU5ORUxfQ1JFQVRFOiBObyB0YXJnZXQgcG9ydCBwcm92aWRlZCcpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyB0YXJnZXQgcG9ydCBwcm92aWRlZCcgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gR2V0IHJlbGF5IFVSTCBmcm9tIHN0b3JhZ2UgdG8gcGFzcyB0byB0dW5uZWwgbWFuYWdlclxuICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgLmdldChbJ3JlbGF5VXJsJ10pXG4gICAgICAgIC50aGVuKCh7IHJlbGF5VXJsIH0pID0+IHtcbiAgICAgICAgICAvLyBGb3IgdHVubmVscywgbmV2ZXIgdXNlIGNsaXBib2FyZCBtb2RlIC0gYWx3YXlzIHVzZSBhY3R1YWwgc2VydmVyXG4gICAgICAgICAgbGV0IGZpbmFsUmVsYXlVcmwgPSByZWxheVVybDtcbiAgICAgICAgICBpZiAocmVsYXlVcmwgPT09ICdjbGlwYm9hcmQnKSB7XG4gICAgICAgICAgICBmaW5hbFJlbGF5VXJsID0gJ2h0dHBzOi8vYXBpLndpbmdtYW51eC5jb20nO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NraXBwaW5nIGNsaXBib2FyZCBtb2RlIGZvciB0dW5uZWwsIHVzaW5nOicsIGZpbmFsUmVsYXlVcmwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaW5hbFJlbGF5VXJsID0gcmVsYXlVcmwgfHwgJ2h0dHBzOi8vYXBpLndpbmdtYW51eC5jb20nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmxvZygnVXNpbmcgcmVsYXkgVVJMIGZvciB0dW5uZWw6JywgZmluYWxSZWxheVVybCk7XG5cbiAgICAgICAgICByZXR1cm4gdHVubmVsTWFuYWdlci5jcmVhdGVUdW5uZWwocmVxdWVzdC50YXJnZXRQb3J0LCBmaW5hbFJlbGF5VXJsKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKHR1bm5lbCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdUdW5uZWwgY3JlYXRlZCBzdWNjZXNzZnVsbHk6JywgdHVubmVsKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCB0dW5uZWwgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIHR1bm5lbDonLCBlcnJvcik7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBjcmVhdGUgdHVubmVsJyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTsgLy8gV2lsbCByZXNwb25kIGFzeW5jaHJvbm91c2x5XG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ1RVTk5FTF9TVE9QJykge1xuICAgICAgY29uc29sZS5sb2coJ1R1bm5lbCBzdG9wIHJlcXVlc3QgcmVjZWl2ZWQnKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdHVubmVsTWFuYWdlci5zdG9wVHVubmVsKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUdW5uZWwgc3RvcHBlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHN0b3AgdHVubmVsOicsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHN0b3AgdHVubmVsJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7IC8vIFN5bmNocm9ub3VzIHJlc3BvbnNlXG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ1RVTk5FTF9TVEFUVVMnKSB7XG4gICAgICBjb25zb2xlLmxvZygnVHVubmVsIHN0YXR1cyByZXF1ZXN0IHJlY2VpdmVkJyk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHR1bm5lbCA9IHR1bm5lbE1hbmFnZXIuZ2V0Q3VycmVudFR1bm5lbCgpO1xuICAgICAgICBjb25zb2xlLmxvZygnQ3VycmVudCB0dW5uZWwgc3RhdHVzOicsIHR1bm5lbCk7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHR1bm5lbCB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCB0dW5uZWwgc3RhdHVzOicsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGdldCB0dW5uZWwgc3RhdHVzJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7IC8vIFN5bmNocm9ub3VzIHJlc3BvbnNlXG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICAvLyBQcm9jZXNzIGFubm90YXRpb24gd2l0aCBzY3JlZW5zaG90IGFuZCB0ZW1wbGF0ZSBmb3JtYXR0aW5nXG4gIGFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NBbm5vdGF0aW9uKGFubm90YXRpb246IGFueSwgcmVsYXlVcmw6IHN0cmluZywgdGVtcGxhdGVJZDogc3RyaW5nKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnNvbGUubG9nKCdQcm9jZXNzaW5nIGFubm90YXRpb246JywgeyByZWxheVVybCwgdGVtcGxhdGVJZCB9KTtcblxuICAgICAgLy8gQ2FwdHVyZSBzY3JlZW5zaG90XG4gICAgICBsZXQgc2NyZWVuc2hvdFVybCA9ICcnO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGF0YVVybCA9IGF3YWl0IGNocm9tZS50YWJzLmNhcHR1cmVWaXNpYmxlVGFiKHsgZm9ybWF0OiAncG5nJyB9KTtcbiAgICAgICAgc2NyZWVuc2hvdFVybCA9IGRhdGFVcmw7XG4gICAgICAgIGNvbnNvbGUubG9nKCdTY3JlZW5zaG90IGNhcHR1cmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignU2NyZWVuc2hvdCBjYXB0dXJlIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCBzY3JlZW5zaG90IHRvIGFubm90YXRpb25cbiAgICAgIGNvbnN0IGFubm90YXRpb25XaXRoU2NyZWVuc2hvdCA9IHtcbiAgICAgICAgLi4uYW5ub3RhdGlvbixcbiAgICAgICAgc2NyZWVuc2hvdFVybFxuICAgICAgfTtcblxuICAgICAgaWYgKHJlbGF5VXJsID09PSAnY2xpcGJvYXJkJykge1xuICAgICAgICAvLyBGb3JtYXQgYW5ub3RhdGlvbiBmb3IgY2xpcGJvYXJkXG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFRleHQgPSBhd2FpdCBmb3JtYXRBbm5vdGF0aW9uKGFubm90YXRpb25XaXRoU2NyZWVuc2hvdCwgdGVtcGxhdGVJZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdBbm5vdGF0aW9uIGZvcm1hdHRlZCBmb3IgY2xpcGJvYXJkJyk7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1vZGU6ICdjbGlwYm9hcmQnLCB0ZXh0OiBmb3JtYXR0ZWRUZXh0IH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBTZW5kIHRvIHNlcnZlclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3JlbGF5VXJsfS9hbm5vdGF0aW9uc2AsIHtcbiAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShhbm5vdGF0aW9uV2l0aFNjcmVlbnNob3QpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdBbm5vdGF0aW9uIHNlbnQgdG8gc2VydmVyIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbW9kZTogJ3NlcnZlcicsXG4gICAgICAgICAgICBwcmV2aWV3VXJsOiBgJHtyZWxheVVybH0vc2hhcmUvJHthbm5vdGF0aW9uLmlkfWBcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgU2VydmVyIHJlc3BvbmRlZCB3aXRoICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Fubm90YXRpb24gcHJvY2Vzc2luZyBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgLy8gRm9ybWF0IGFubm90YXRpb24gZm9yIGNsaXBib2FyZFxuICBhc3luYyBmdW5jdGlvbiBmb3JtYXRBbm5vdGF0aW9uKGFubm90YXRpb246IGFueSwgdGVtcGxhdGVJZDogc3RyaW5nKSB7XG4gICAgLy8gR2V0IHRlbXBsYXRlIGZyb20gc3RvcmFnZVxuICAgIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsnY3VzdG9tVGVtcGxhdGVzJ10pO1xuICAgIGNvbnN0IGN1c3RvbVRlbXBsYXRlcyA9IHNldHRpbmdzLmN1c3RvbVRlbXBsYXRlcyB8fCBbXTtcblxuICAgIC8vIEZpbmQgdGVtcGxhdGUgKGJ1aWx0LWluIHRlbXBsYXRlcyB3b3VsZCBuZWVkIHRvIGJlIGltcG9ydGVkIGhlcmUpXG4gICAgbGV0IHRlbXBsYXRlID0gY3VzdG9tVGVtcGxhdGVzLmZpbmQoKHQ6IGFueSkgPT4gdC5pZCA9PT0gdGVtcGxhdGVJZCk7XG5cbiAgICAvLyBGYWxsYmFjayB0byBzaW1wbGUgZm9ybWF0IGlmIHRlbXBsYXRlIG5vdCBmb3VuZFxuICAgIHJldHVybiB0ZW1wbGF0ZT8uY29udGVudCB8fCBmb3JtYXRBbm5vdGF0aW9uU2ltcGxlKGFubm90YXRpb24pO1xuICB9XG5cbiAgLy8gU2ltcGxlIGFubm90YXRpb24gZm9ybWF0dGVyIChmYWxsYmFjaylcbiAgZnVuY3Rpb24gZm9ybWF0QW5ub3RhdGlvblNpbXBsZShhbm5vdGF0aW9uOiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgIyBVSSBGZWVkYmFja1xuXG4qKk5vdGUqKjogJHthbm5vdGF0aW9uLm5vdGV9XG5cbioqUGFnZSoqOiAke2Fubm90YXRpb24ucGFnZS50aXRsZX1cbioqVVJMKio6ICR7YW5ub3RhdGlvbi5wYWdlLnVybH1cblxuKipDYXB0dXJlZCoqOiAke25ldyBEYXRlKGFubm90YXRpb24uY3JlYXRlZEF0KS50b0xvY2FsZVN0cmluZygpfWA7XG4gIH1cbn0pOyIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsibG9nZ2VyIiwicmVzdWx0IiwiYnJvd3NlciIsIl9icm93c2VyIl0sIm1hcHBpbmdzIjoiOztBQUFPLFdBQVMsaUJBQWlCLEtBQUs7QUFDcEMsUUFBSSxPQUFPLFFBQVEsT0FBTyxRQUFRLFdBQVksUUFBTyxFQUFFLE1BQU0sSUFBRztBQUNoRSxXQUFPO0FBQUEsRUFDVDtBQ2dCQSxRQUFNLGFBQXVDO0FBQUEsSUFDM0MsT0FBTztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLEVBQ1Q7QUFHQSxXQUFTLFlBQVk7QUFDbkIsUUFBSSxPQUFPLHVCQUF1QixhQUFhO0FBQzdDLGFBQU87QUFBQSxJQUNUO0FBRUEsV0FBTztBQUFBLE1BQ0wsYUFBYTtBQUFBLE1BQ2IsVUFBVSxFQUFFLGdCQUFnQixNQUFBO0FBQUEsSUFBTTtBQUFBLEVBRXRDO0FBR0EsV0FBUyxxQkFBK0I7QUFDdEMsVUFBTSxTQUFTLFVBQUE7QUFHZixRQUFJLE9BQU8sVUFBVSxnQkFBZ0I7QUFDbkMsYUFBTztBQUFBLElBQ1Q7QUFHQSxZQUFRLE9BQU8sYUFBQTtBQUFBLE1BQ2IsS0FBSztBQUNILGVBQU87QUFBQSxNQUNULEtBQUs7QUFBQSxNQUNMLEtBQUs7QUFDSCxlQUFPO0FBQUEsTUFDVCxLQUFLO0FBQUEsTUFDTDtBQUNFLGVBQU87QUFBQSxJQUFBO0FBQUEsRUFFYjtBQUFBLEVBRUEsTUFBTSxjQUFjO0FBQUEsSUFNbEIsWUFBWSxTQUF1QixJQUFJO0FBQ3JDLFlBQU0sZ0JBQWdCLFVBQUE7QUFFdEIsV0FBSyxZQUFZLE9BQU8sYUFBYTtBQUNyQyxXQUFLLFVBQVUsT0FBTyxZQUFZO0FBQ2xDLFdBQUssY0FBYyxjQUFjLGVBQWU7QUFFaEQsWUFBTSxXQUFXLE9BQU8sU0FBUyxtQkFBQTtBQUNqQyxXQUFLLFFBQVEsV0FBVyxRQUFRO0FBQUEsSUFDbEM7QUFBQSxJQUVRLFVBQVUsT0FBMEI7QUFDMUMsVUFBSSxDQUFDLEtBQUssUUFBUyxRQUFPO0FBQzFCLGFBQU8sV0FBVyxLQUFLLEtBQUssS0FBSztBQUFBLElBQ25DO0FBQUEsSUFFUSxjQUFjLE9BQWlCLFNBQXlCO0FBQzlELFlBQU0sU0FBUyxJQUFJLEtBQUssU0FBUztBQUdqQyxVQUFJLEtBQUssZ0JBQWdCLGVBQWU7QUFDdEMsZUFBTyxHQUFHLE1BQU0sS0FBSyxNQUFNLGFBQWEsS0FBSyxPQUFPO0FBQUEsTUFDdEQ7QUFHQSxhQUFPLEdBQUcsTUFBTSxJQUFJLE9BQU87QUFBQSxJQUM3QjtBQUFBLElBRUEsTUFBTSxZQUFvQixNQUFtQjtBQUMzQyxVQUFJLEtBQUssVUFBVSxPQUFPLEdBQUc7QUFDM0IsZ0JBQVEsTUFBTSxLQUFLLGNBQWMsU0FBUyxPQUFPLEdBQUcsR0FBRyxJQUFJO0FBQUEsTUFDN0Q7QUFBQSxJQUNGO0FBQUEsSUFFQSxLQUFLLFlBQW9CLE1BQW1CO0FBQzFDLFVBQUksS0FBSyxVQUFVLE1BQU0sR0FBRztBQUMxQixnQkFBUSxLQUFLLEtBQUssY0FBYyxRQUFRLE9BQU8sR0FBRyxHQUFHLElBQUk7QUFBQSxNQUMzRDtBQUFBLElBQ0Y7QUFBQSxJQUVBLEtBQUssWUFBb0IsTUFBbUI7QUFDMUMsVUFBSSxLQUFLLFVBQVUsTUFBTSxHQUFHO0FBQzFCLGdCQUFRLElBQUksS0FBSyxjQUFjLFFBQVEsT0FBTyxHQUFHLEdBQUcsSUFBSTtBQUFBLE1BQzFEO0FBQUEsSUFDRjtBQUFBLElBRUEsTUFBTSxZQUFvQixNQUFtQjtBQUMzQyxVQUFJLEtBQUssVUFBVSxPQUFPLEdBQUc7QUFDM0IsZ0JBQVEsSUFBSSxLQUFLLGNBQWMsU0FBUyxPQUFPLEdBQUcsR0FBRyxJQUFJO0FBQUEsTUFDM0Q7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUdBLE1BQU0sY0FBc0IsUUFBK0M7QUFDekUsYUFBTyxJQUFJLGNBQWM7QUFBQSxRQUN2QixHQUFHO0FBQUEsUUFDSCxXQUFXLEdBQUcsS0FBSyxTQUFTLElBQUksWUFBWTtBQUFBLFFBQzVDLE9BQU8sUUFBUSxVQUFVLEtBQUssVUFBVSxJQUFJLFVBQVUsS0FBSyxVQUFVLElBQUksU0FBUyxLQUFLLFVBQVUsSUFBSSxTQUFTO0FBQUEsUUFDOUcsU0FBUyxRQUFRLFlBQVksU0FBWSxPQUFPLFVBQVUsS0FBSztBQUFBLE1BQUEsQ0FDaEU7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUdPLFdBQVMsYUFBYSxXQUFtQixRQUErQztBQUM3RixXQUFPLElBQUksY0FBYyxFQUFFLEdBQUcsUUFBUSxXQUFXO0FBQUEsRUFDbkQ7QUFHc0IsTUFBSSxjQUFjLEVBQUUsV0FBVyxXQUFXO0FDOUhoRSxRQUFNQSxXQUFTLGFBQWEsZUFBZTtBQUFBLEVBRXBDLE1BQU0sY0FBYztBQUFBLElBU3pCLGNBQWM7QUFSZCxXQUFRLEtBQXVCO0FBQy9CLFdBQVEsZ0JBQXNDO0FBQzlDLFdBQVEsb0JBQTRCO0FBQ3BDLFdBQWlCLHVCQUErQjtBQUNoRCxXQUFRLG1CQUFrQztBQUMxQyxXQUFRLGtCQUEwQjtBQUNsQyxXQUFRLGVBQXdCO0FBQUEsSUFJaEM7QUFBQSxJQUVBLE1BQU0sYUFBYSxZQUFvQixVQUEyQztBQUNoRkEsZUFBTyxLQUFLLGtEQUFrRCxVQUFVLFlBQVksUUFBUSxFQUFFO0FBRzlGLFVBQUksQ0FBQyxjQUFjLGNBQWMsS0FBSyxhQUFhLE9BQU87QUFDeEQsY0FBTSxXQUFXLHdCQUF3QixVQUFVO0FBQ25EQSxpQkFBTyxNQUFNLG1CQUFtQixRQUFRLEVBQUU7QUFDMUMsY0FBTSxJQUFJLE1BQU0sUUFBUTtBQUFBLE1BQzFCO0FBRUEsVUFBSTtBQUVGQSxpQkFBTyxNQUFNLGlEQUFpRDtBQUM5RCxhQUFLLFdBQUE7QUFFTEEsaUJBQU8sS0FBSyw0Q0FBNEMsVUFBVSxFQUFFO0FBR3BFLGFBQUssZ0JBQWdCO0FBQUEsVUFDbkIsV0FBVztBQUFBLFVBQ1gsV0FBVztBQUFBLFVBQ1g7QUFBQSxVQUNBLFFBQVE7QUFBQSxRQUFBO0FBRVYsYUFBSyxZQUFBO0FBR0wsY0FBTSxVQUFVLFlBQVk7QUFDNUIsY0FBTSxlQUFlLFFBQVEsU0FBUyxXQUFXLEtBQUssUUFBUSxTQUFTLFdBQVc7QUFHbEYsYUFBSyxrQkFBa0I7QUFDdkIsYUFBSyxlQUFlO0FBR3BCLGNBQU0sU0FBUyxHQUFHLE9BQU87QUFFekIsY0FBTSxjQUFjLEtBQUssVUFBVTtBQUFBLFVBQ2pDO0FBQUEsVUFDQSxXQUFXO0FBQUEsUUFBQSxDQUNaO0FBRURBLGlCQUFPLE1BQU0seUJBQXlCLGVBQWUsVUFBVSxVQUFVLFFBQVE7QUFDakZBLGlCQUFPLE1BQU0sMkNBQTJDLE1BQU0sRUFBRTtBQUNoRUEsaUJBQU8sTUFBTSxpQ0FBaUMsV0FBVyxFQUFFO0FBRTNELGNBQU0sV0FBVyxNQUFNLE1BQU0sUUFBUTtBQUFBLFVBQ25DLFFBQVE7QUFBQSxVQUNSLFNBQVM7QUFBQSxZQUNQLGdCQUFnQjtBQUFBLFVBQUE7QUFBQSxVQUVsQixNQUFNO0FBQUEsUUFBQSxDQUNQO0FBRURBLGlCQUFPLE1BQU0sb0NBQW9DLFNBQVMsTUFBTSxFQUFFO0FBRWxFLFlBQUksQ0FBQyxTQUFTLElBQUk7QUFDaEIsZ0JBQU0sWUFBWSxNQUFNLFNBQVMsS0FBQTtBQUNqQ0EsbUJBQU8sTUFBTSx1Q0FBdUMsU0FBUyxFQUFFO0FBQy9ELGdCQUFNLElBQUksTUFBTSw0QkFBNEIsU0FBUyxFQUFFO0FBQUEsUUFDekQ7QUFFQSxjQUFNLE9BQU8sTUFBTSxTQUFTLEtBQUE7QUFDNUJBLGlCQUFPLE1BQU0sc0NBQXNDLElBQUk7QUFFdkQsYUFBSyxjQUFjLFlBQVksS0FBSztBQUNwQyxhQUFLLGNBQWMsWUFBWSxLQUFLO0FBRXBDQSxpQkFBTyxLQUFLLG1DQUFtQyxLQUFLLFNBQVMsY0FBYyxLQUFLLFNBQVMsR0FBRztBQUc1RkEsaUJBQU8sTUFBTSx5Q0FBeUM7QUFDdEQsY0FBTSxLQUFLLGlCQUFpQixTQUFTLFlBQVk7QUFHakQsYUFBSyxjQUFjLFNBQVM7QUFDNUIsYUFBSyxZQUFBO0FBRUxBLGlCQUFPLEtBQUssK0NBQStDO0FBQzNELGVBQU8sS0FBSztBQUFBLE1BQ2QsU0FBUyxPQUFZO0FBQ25CQSxpQkFBTyxNQUFNLDRDQUE0QyxLQUFLO0FBQzlEQSxpQkFBTyxNQUFNLGdDQUFnQyxNQUFNLEtBQUs7QUFFeEQsWUFBSSxLQUFLLGVBQWU7QUFDdEIsZUFBSyxjQUFjLFNBQVM7QUFDNUIsZUFBSyxZQUFBO0FBQUEsUUFDUDtBQUNBLGNBQU07QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUFBLElBRUEsTUFBYyxpQkFBaUIsVUFBa0IsY0FBc0M7QUFDckYsYUFBTyxJQUFJLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFDdEMsWUFBSSxDQUFDLEtBQUssZUFBZTtBQUN2QixnQkFBTSxRQUFRLElBQUksTUFBTSxtQkFBbUI7QUFDM0NBLG1CQUFPLE1BQU0sNkNBQTZDLE1BQU0sT0FBTyxFQUFFO0FBQ3pFLGlCQUFPLEtBQUs7QUFDWjtBQUFBLFFBQ0Y7QUFHQSxjQUFNLFFBQVEsU0FBUyxRQUFRLFdBQVcsT0FBTyxFQUFFLFFBQVEsWUFBWSxRQUFRLElBQUk7QUFFbkZBLGlCQUFPLEtBQUssOENBQThDLEtBQUssUUFBUSxlQUFlLFVBQVUsVUFBVSxHQUFHO0FBRTdHLFlBQUk7QUFDRixlQUFLLEtBQUssSUFBSSxVQUFVLEtBQUs7QUFDN0JBLG1CQUFPLE1BQU0sMENBQTBDO0FBQUEsUUFDekQsU0FBUyxPQUFZO0FBQ25CQSxtQkFBTyxNQUFNLCtDQUErQyxLQUFLO0FBQ2pFLGlCQUFPLEtBQUs7QUFDWjtBQUFBLFFBQ0Y7QUFFQSxjQUFNLFVBQVUsV0FBVyxNQUFNO0FBQy9CQSxtQkFBTyxNQUFNLCtEQUErRDtBQUM1RSxpQkFBTyxJQUFJLE1BQU0sOEJBQThCLENBQUM7QUFBQSxRQUNsRCxHQUFHLEdBQUs7QUFFUixhQUFLLEdBQUcsU0FBUyxNQUFNO0FBQ3JCLHVCQUFhLE9BQU87QUFDcEJBLG1CQUFPLEtBQUssa0RBQWtEO0FBRzlELGNBQUksS0FBSyxNQUFNLEtBQUssZUFBZTtBQUNqQyxrQkFBTSxrQkFBa0IsS0FBSyxVQUFVO0FBQUEsY0FDckMsTUFBTTtBQUFBLGNBQ04sTUFBTTtBQUFBLGNBQ04sV0FBVyxLQUFLLGNBQWM7QUFBQSxZQUFBLENBQy9CO0FBQ0RBLHFCQUFPLE1BQU0seUNBQXlDLGVBQWUsRUFBRTtBQUN2RSxpQkFBSyxHQUFHLEtBQUssZUFBZTtBQUFBLFVBQzlCLE9BQU87QUFDTEEscUJBQU8sTUFBTSwrREFBK0Q7QUFBQSxVQUM5RTtBQUFBLFFBQ0Y7QUFFQSxhQUFLLEdBQUcsWUFBWSxDQUFDLFVBQVU7QUFDN0JBLG1CQUFPLE1BQU0sK0NBQStDLE1BQU0sSUFBSSxFQUFFO0FBRXhFLGNBQUk7QUFDRixrQkFBTSxVQUFVLEtBQUssTUFBTSxNQUFNLElBQUk7QUFFckMsZ0JBQUksUUFBUSxTQUFTLGdCQUFnQixRQUFRLFNBQVMsYUFBYTtBQUNqRUEsdUJBQU8sS0FBSyxzREFBc0Q7QUFDbEUsbUJBQUssb0JBQW9CO0FBQ3pCLHNCQUFBO0FBQUEsWUFDRixXQUFXLFFBQVEsU0FBUyxTQUFTO0FBQ25DQSx1QkFBTyxNQUFNLDRDQUE0QyxRQUFRLEtBQUs7QUFDdEUscUJBQU8sSUFBSSxNQUFNLFFBQVEsS0FBSyxDQUFDO0FBQUEsWUFDakMsV0FBVyxRQUFRLFNBQVMsV0FBVztBQUNyQ0EsdUJBQU8sS0FBSyxtQ0FBbUMsUUFBUSxTQUFTLE1BQU0sSUFBSSxRQUFRLFNBQVMsSUFBSSxFQUFFO0FBQ2pHLG1CQUFLLG9CQUFvQixPQUFPO0FBQUEsWUFDbEMsT0FBTztBQUNMQSx1QkFBTyxNQUFNLDJDQUEyQyxRQUFRLElBQUksRUFBRTtBQUFBLFlBQ3hFO0FBQUEsVUFDRixTQUFTLE9BQU87QUFDZEEscUJBQU8sTUFBTSxvREFBb0QsS0FBSztBQUN0RUEscUJBQU8sTUFBTSxnQ0FBZ0MsTUFBTSxJQUFJLEVBQUU7QUFBQSxVQUMzRDtBQUFBLFFBQ0Y7QUFFQSxhQUFLLEdBQUcsVUFBVSxDQUFDLFVBQVU7QUFDM0IsdUJBQWEsT0FBTztBQUNwQkEsbUJBQU8sTUFBTSwwQ0FBMEMsS0FBSztBQUM1RCxpQkFBTyxLQUFLO0FBQUEsUUFDZDtBQUVBLGFBQUssR0FBRyxVQUFVLENBQUMsVUFBVTtBQUMzQkEsbUJBQU8sS0FBSyw0Q0FBNEMsTUFBTSxJQUFJLGFBQWEsTUFBTSxNQUFNLEVBQUU7QUFDN0YsY0FBSSxLQUFLLGlCQUFpQixLQUFLLGNBQWMsV0FBVyxVQUFVO0FBQ2hFQSxxQkFBTyxNQUFNLDhDQUE4QztBQUMzRCxpQkFBSyxrQkFBQTtBQUFBLFVBQ1A7QUFBQSxRQUNGO0FBQUEsTUFDRixDQUFDO0FBQUEsSUFDSDtBQUFBO0FBQUE7QUFBQTtBQUFBLElBS0EsTUFBYyxvQkFBb0IsU0FBNkI7QUFDN0QsWUFBTSxFQUFFLFdBQVcsU0FBUyxVQUFBLElBQWM7QUFFMUMsVUFBSSxDQUFDLEtBQUssaUJBQWlCLENBQUMsS0FBSyxJQUFJO0FBQ25DQSxpQkFBTyxNQUFNLHVFQUF1RTtBQUNwRjtBQUFBLE1BQ0Y7QUFFQSxVQUFJO0FBRUYsY0FBTSxZQUFZLG9CQUFvQixLQUFLLGNBQWMsVUFBVSxHQUFHLFFBQVEsUUFBUSxHQUFHO0FBQ3pGQSxpQkFBTyxNQUFNLDBDQUEwQyxTQUFTLEVBQUU7QUFHbEUsY0FBTSxVQUFrQyxDQUFBO0FBQ3hDLFlBQUksUUFBUSxTQUFTO0FBQ25CLGlCQUFPLFFBQVEsUUFBUSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsS0FBSyxLQUFLLE1BQU07QUFDeEQsa0JBQU0sV0FBVyxJQUFJLFlBQUE7QUFFckIsZ0JBQUksQ0FBQyxDQUFDLFFBQVEsY0FBYyxrQkFBa0IsaUJBQWlCLEVBQUUsU0FBUyxRQUFRLEdBQUc7QUFDbkYsc0JBQVEsR0FBRyxJQUFJO0FBQUEsWUFDakI7QUFBQSxVQUNGLENBQUM7QUFBQSxRQUNIO0FBR0EsY0FBTSxlQUE0QjtBQUFBLFVBQ2hDLFFBQVEsUUFBUSxVQUFVO0FBQUEsVUFDMUI7QUFBQSxRQUFBO0FBSUYsWUFBSSxRQUFRLFFBQVEsUUFBUSxXQUFXLFNBQVMsUUFBUSxXQUFXLFFBQVE7QUFDekUsdUJBQWEsT0FBTyxPQUFPLFFBQVEsU0FBUyxXQUN4QyxRQUFRLE9BQ1IsS0FBSyxVQUFVLFFBQVEsSUFBSTtBQUFBLFFBQ2pDO0FBR0EsY0FBTSxXQUFXLE1BQU0sTUFBTSxXQUFXLFlBQVk7QUFHcEQsY0FBTSxxQkFBcUIsTUFBTSxTQUFTLFlBQUE7QUFFMUNBLGlCQUFPLE1BQU0sa0NBQWtDLG1CQUFtQixVQUFVLHlCQUF5QixTQUFTLFFBQVEsSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFO0FBR3hKLGNBQU0sa0JBQTBDLENBQUE7QUFDaEQsaUJBQVMsUUFBUSxRQUFRLENBQUMsT0FBTyxRQUFRO0FBQ3ZDLDBCQUFnQixHQUFHLElBQUk7QUFBQSxRQUN6QixDQUFDO0FBR0QsY0FBTSxtQkFBbUI7QUFBQSxVQUN2QixNQUFNO0FBQUEsVUFDTjtBQUFBLFVBQ0E7QUFBQSxVQUNBLFVBQVU7QUFBQSxZQUNSLFlBQVksU0FBUztBQUFBLFlBQ3JCLFNBQVM7QUFBQSxZQUNULFlBQVksbUJBQW1CO0FBQUEsVUFBQTtBQUFBLFFBQ2pDO0FBR0ZBLGlCQUFPLE1BQU0sdURBQXVELFNBQVMsS0FBSyxTQUFTLE1BQU0sS0FBSyxtQkFBbUIsVUFBVSxTQUFTO0FBRzVJLGFBQUssR0FBRyxLQUFLLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQztBQUc3QyxZQUFJLG1CQUFtQixhQUFhLEdBQUc7QUFDckMsZUFBSyxHQUFHLEtBQUssa0JBQWtCO0FBQUEsUUFDakM7QUFBQSxNQUVGLFNBQVMsT0FBWTtBQUNuQkEsaUJBQU8sTUFBTSw2Q0FBNkMsS0FBSztBQUcvRCxjQUFNLFlBQVksS0FBSyxVQUFVO0FBQUEsVUFDL0IsT0FBTztBQUFBLFVBQ1AsU0FBUyxNQUFNO0FBQUEsVUFDZixZQUFZLEtBQUssZUFBZTtBQUFBLFFBQUEsQ0FDakM7QUFFRCxjQUFNLGtCQUFrQixJQUFJLGNBQWMsT0FBTyxTQUFTO0FBRTFELGNBQU0sZ0JBQWdCO0FBQUEsVUFDcEIsTUFBTTtBQUFBLFVBQ047QUFBQSxVQUNBO0FBQUEsVUFDQSxVQUFVO0FBQUEsWUFDUixZQUFZO0FBQUEsWUFDWixTQUFTLEVBQUUsZ0JBQWdCLG1CQUFBO0FBQUEsWUFDM0IsWUFBWSxnQkFBZ0I7QUFBQSxVQUFBO0FBQUEsUUFDOUI7QUFHRixhQUFLLEdBQUcsS0FBSyxLQUFLLFVBQVUsYUFBYSxDQUFDO0FBQzFDLGFBQUssR0FBRyxLQUFLLGVBQWU7QUFBQSxNQUM5QjtBQUFBLElBQ0Y7QUFBQSxJQUVRLG9CQUEwQjtBQUNoQyxVQUFJLEtBQUsscUJBQXFCLEtBQUssc0JBQXNCO0FBQ3ZEQSxpQkFBTyxNQUFNLGdDQUFnQztBQUM3QyxZQUFJLEtBQUssZUFBZTtBQUN0QixlQUFLLGNBQWMsU0FBUztBQUM1QixlQUFLLFlBQUE7QUFBQSxRQUNQO0FBQ0E7QUFBQSxNQUNGO0FBRUEsWUFBTSxRQUFRLEtBQUssSUFBSSxNQUFPLEtBQUssSUFBSSxHQUFHLEtBQUssaUJBQWlCLEdBQUcsR0FBSztBQUN4RSxXQUFLO0FBRUxBLGVBQU8sS0FBSyxnQ0FBZ0MsS0FBSyxpQkFBaUIsT0FBTyxLQUFLLElBQUk7QUFFbEYsV0FBSyxtQkFBbUIsT0FBTyxXQUFXLE1BQU07QUFDOUMsWUFBSSxLQUFLLGVBQWU7QUFDdEIsZUFBSyxpQkFBaUIsS0FBSyxpQkFBaUIsS0FBSyxZQUFZLEVBQUUsTUFBTSxDQUFBLFVBQVM7QUFDNUVBLHFCQUFPLE1BQU0scUJBQXFCLEtBQUs7QUFDdkMsaUJBQUssa0JBQUE7QUFBQSxVQUNQLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRixHQUFHLEtBQUs7QUFBQSxJQUNWO0FBQUEsSUFFQSxhQUFtQjtBQUNqQixVQUFJLEtBQUssa0JBQWtCO0FBQ3pCLHFCQUFhLEtBQUssZ0JBQWdCO0FBQ2xDLGFBQUssbUJBQW1CO0FBQUEsTUFDMUI7QUFFQSxVQUFJLEtBQUssSUFBSTtBQUNYLGFBQUssR0FBRyxNQUFBO0FBQ1IsYUFBSyxLQUFLO0FBQUEsTUFDWjtBQUVBLFdBQUssZ0JBQWdCO0FBQ3JCLFdBQUssb0JBQW9CO0FBQ3pCLFdBQUssWUFBQTtBQUVMQSxlQUFPLEtBQUssZ0JBQWdCO0FBQUEsSUFDOUI7QUFBQSxJQUVRLGNBQW9CO0FBQzFCLFlBQU0sU0FBUyxLQUFLLGVBQWUsVUFBVTtBQUM3QyxZQUFNLGNBQWM7QUFBQSxRQUNsQixVQUFVLEVBQUUsTUFBTSxJQUFJLE9BQU8sVUFBQTtBQUFBLFFBQzdCLFlBQVksRUFBRSxNQUFNLEtBQUssT0FBTyxVQUFBO0FBQUEsUUFDaEMsUUFBUSxFQUFFLE1BQU0sS0FBSyxPQUFPLFVBQUE7QUFBQSxRQUM1QixPQUFPLEVBQUUsTUFBTSxLQUFLLE9BQU8sVUFBQTtBQUFBLE1BQVU7QUFHdkMsWUFBTSxTQUFTLFlBQVksTUFBTTtBQUNqQyxhQUFPLE9BQU8sYUFBYSxFQUFFLE1BQU0sT0FBTyxNQUFNO0FBQ2hELGFBQU8sT0FBTyx3QkFBd0IsRUFBRSxPQUFPLE9BQU8sT0FBTztBQUFBLElBQy9EO0FBQUEsSUFFQSxtQkFBeUM7QUFDdkMsYUFBTyxLQUFLO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUM3V0EsUUFBQSxnQkFBQSxJQUFBLGNBQUE7QUFFQSxRQUFBLGFBQUEsaUJBQUEsTUFBQTtBQUNFLFlBQUEsSUFBQSxxQ0FBQTtBQUdBLFdBQUEsT0FBQSxVQUFBLFlBQUEsQ0FBQSxRQUFBO0FBQ0UsY0FBQSxJQUFBLHdCQUFBO0FBQ0EsVUFBQSxJQUFBLElBQUE7QUFDRSxlQUFBLEtBQUEsWUFBQSxJQUFBLElBQUEsRUFBQSxNQUFBLG1CQUFBLENBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxRQUFBLE1BQUEsMkJBQUEsS0FBQSxDQUFBO0FBQUEsTUFDbUU7QUFBQSxJQUNyRSxDQUFBO0FBSUYsV0FBQSxTQUFBLFVBQUEsWUFBQSxDQUFBLFlBQUE7QUFDRSxjQUFBLElBQUEsOEJBQUEsT0FBQTtBQUNBLFVBQUEsWUFBQSxvQkFBQTtBQUNFLGVBQUEsS0FBQSxNQUFBLEVBQUEsUUFBQSxNQUFBLGVBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLE1BQUE7QUFDRSxjQUFBLEtBQUEsSUFBQTtBQUNFLG1CQUFBLEtBQUEsWUFBQSxJQUFBLElBQUEsRUFBQSxNQUFBLG1CQUFBLENBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxRQUFBLE1BQUEsMkJBQUEsS0FBQSxDQUFBO0FBQUEsVUFDbUU7QUFBQSxRQUNyRSxDQUFBO0FBQUEsTUFDRDtBQUFBLElBQ0gsQ0FBQTtBQUlGLFdBQUEsUUFBQSxVQUFBLFlBQUEsQ0FBQSxTQUFBLFFBQUEsaUJBQUE7QUFDRSxjQUFBLElBQUEsZ0NBQUEsUUFBQSxJQUFBO0FBR0EsVUFBQSxRQUFBLFNBQUEsc0JBQUEsT0FBQSxLQUFBLElBQUE7QUFDRSxlQUFBLEtBQUEsWUFBQSxPQUFBLElBQUEsSUFBQSxFQUFBLE1BQUEsbUJBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxhQUFBLGFBQUEsUUFBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUE7QUFHSSxrQkFBQSxNQUFBLCtCQUFBLEtBQUE7QUFDQSx1QkFBQSxFQUFBLFNBQUEsT0FBQSxPQUFBLE1BQUEsU0FBQTtBQUFBLFFBQXFELENBQUE7QUFFekQsZUFBQTtBQUFBLE1BQU87QUFJVCxVQUFBLFFBQUEsU0FBQSxzQkFBQTtBQUNFLDBCQUFBLFFBQUEsWUFBQSxRQUFBLFVBQUEsUUFBQSxVQUFBLEVBQUEsS0FBQSxDQUFBQyxZQUFBLGFBQUFBLE9BQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBO0FBR0ksa0JBQUEsTUFBQSxpQ0FBQSxLQUFBO0FBQ0EsdUJBQUEsRUFBQSxTQUFBLE9BQUEsT0FBQSxNQUFBLFNBQUE7QUFBQSxRQUFxRCxDQUFBO0FBRXpELGVBQUE7QUFBQSxNQUFPO0FBSVQsVUFBQSxRQUFBLFNBQUEsc0JBQUE7QUFDRSxlQUFBLEtBQUEsa0JBQUEsRUFBQSxRQUFBLE9BQUEsRUFBQSxLQUFBLENBQUEsWUFBQTtBQUVJLHVCQUFBLE9BQUE7QUFBQSxRQUFvQixDQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUE7QUFHcEIsa0JBQUEsTUFBQSxzQkFBQSxLQUFBO0FBQ0EsdUJBQUEsSUFBQTtBQUFBLFFBQWlCLENBQUE7QUFFckIsZUFBQTtBQUFBLE1BQU87QUFJVCxVQUFBLFFBQUEsU0FBQSxpQkFBQTtBQUNFLGdCQUFBLElBQUEsNkNBQUEsUUFBQSxVQUFBO0FBRUEsWUFBQSxDQUFBLFFBQUEsWUFBQTtBQUNFLGtCQUFBLE1BQUEsd0NBQUE7QUFDQSx1QkFBQSxFQUFBLFNBQUEsT0FBQSxPQUFBLDBCQUFBLENBQUE7QUFDQSxpQkFBQTtBQUFBLFFBQU87QUFJVCxlQUFBLFFBQUEsTUFBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsZUFBQTtBQUlJLGNBQUEsZ0JBQUE7QUFDQSxjQUFBLGFBQUEsYUFBQTtBQUNFLDRCQUFBO0FBQ0Esb0JBQUEsSUFBQSw4Q0FBQSxhQUFBO0FBQUEsVUFBdUUsT0FBQTtBQUV2RSw0QkFBQSxZQUFBO0FBQUEsVUFBNEI7QUFFOUIsa0JBQUEsSUFBQSwrQkFBQSxhQUFBO0FBRUEsaUJBQUEsY0FBQSxhQUFBLFFBQUEsWUFBQSxhQUFBO0FBQUEsUUFBbUUsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxXQUFBO0FBR25FLGtCQUFBLElBQUEsZ0NBQUEsTUFBQTtBQUNBLHVCQUFBLEVBQUEsU0FBQSxNQUFBLE9BQUEsQ0FBQTtBQUFBLFFBQXNDLENBQUEsRUFBQSxNQUFBLENBQUEsVUFBQTtBQUd0QyxrQkFBQSxNQUFBLDRCQUFBLEtBQUE7QUFDQSx1QkFBQTtBQUFBLFlBQWEsU0FBQTtBQUFBLFlBQ0YsT0FBQSxNQUFBLFdBQUE7QUFBQSxVQUNlLENBQUE7QUFBQSxRQUN6QixDQUFBO0FBRUwsZUFBQTtBQUFBLE1BQU87QUFHVCxVQUFBLFFBQUEsU0FBQSxlQUFBO0FBQ0UsZ0JBQUEsSUFBQSw4QkFBQTtBQUVBLFlBQUE7QUFDRSx3QkFBQSxXQUFBO0FBQ0Esa0JBQUEsSUFBQSw2QkFBQTtBQUNBLHVCQUFBLEVBQUEsU0FBQSxNQUFBO0FBQUEsUUFBOEIsU0FBQSxPQUFBO0FBRTlCLGtCQUFBLE1BQUEsMEJBQUEsS0FBQTtBQUNBLHVCQUFBO0FBQUEsWUFBYSxTQUFBO0FBQUEsWUFDRixPQUFBLE1BQUEsV0FBQTtBQUFBLFVBQ2UsQ0FBQTtBQUFBLFFBQ3pCO0FBRUgsZUFBQTtBQUFBLE1BQU87QUFHVCxVQUFBLFFBQUEsU0FBQSxpQkFBQTtBQUNFLGdCQUFBLElBQUEsZ0NBQUE7QUFFQSxZQUFBO0FBQ0UsZ0JBQUEsU0FBQSxjQUFBLGlCQUFBO0FBQ0Esa0JBQUEsSUFBQSwwQkFBQSxNQUFBO0FBQ0EsdUJBQUEsRUFBQSxTQUFBLE1BQUEsT0FBQSxDQUFBO0FBQUEsUUFBc0MsU0FBQSxPQUFBO0FBRXRDLGtCQUFBLE1BQUEsZ0NBQUEsS0FBQTtBQUNBLHVCQUFBO0FBQUEsWUFBYSxTQUFBO0FBQUEsWUFDRixPQUFBLE1BQUEsV0FBQTtBQUFBLFVBQ2UsQ0FBQTtBQUFBLFFBQ3pCO0FBRUgsZUFBQTtBQUFBLE1BQU87QUFHVCxhQUFBO0FBQUEsSUFBTyxDQUFBO0FBSVQsbUJBQUEsa0JBQUEsWUFBQSxVQUFBLFlBQUE7QUFDRSxVQUFBO0FBQ0UsZ0JBQUEsSUFBQSwwQkFBQSxFQUFBLFVBQUEsV0FBQSxDQUFBO0FBR0EsWUFBQSxnQkFBQTtBQUNBLFlBQUE7QUFDRSxnQkFBQSxVQUFBLE1BQUEsT0FBQSxLQUFBLGtCQUFBLEVBQUEsUUFBQSxPQUFBO0FBQ0EsMEJBQUE7QUFDQSxrQkFBQSxJQUFBLGtDQUFBO0FBQUEsUUFBOEMsU0FBQSxPQUFBO0FBRTlDLGtCQUFBLE1BQUEsOEJBQUEsS0FBQTtBQUFBLFFBQWlEO0FBSW5ELGNBQUEsMkJBQUE7QUFBQSxVQUFpQyxHQUFBO0FBQUEsVUFDNUI7QUFBQSxRQUNIO0FBR0YsWUFBQSxhQUFBLGFBQUE7QUFFRSxnQkFBQSxnQkFBQSxNQUFBLGlCQUFBLDBCQUFBLFVBQUE7QUFDQSxrQkFBQSxJQUFBLG9DQUFBO0FBQ0EsaUJBQUEsRUFBQSxTQUFBLE1BQUEsTUFBQSxhQUFBLE1BQUEsY0FBQTtBQUFBLFFBQStELE9BQUE7QUFHL0QsZ0JBQUEsV0FBQSxNQUFBLE1BQUEsR0FBQSxRQUFBLGdCQUFBO0FBQUEsWUFBd0QsUUFBQTtBQUFBLFlBQzlDLFNBQUEsRUFBQSxnQkFBQSxtQkFBQTtBQUFBLFlBQ3NDLE1BQUEsS0FBQSxVQUFBLHdCQUFBO0FBQUEsVUFDRCxDQUFBO0FBRy9DLGNBQUEsU0FBQSxJQUFBO0FBQ0Usb0JBQUEsSUFBQSx3Q0FBQTtBQUNBLG1CQUFBO0FBQUEsY0FBTyxTQUFBO0FBQUEsY0FDSSxNQUFBO0FBQUEsY0FDSCxZQUFBLEdBQUEsUUFBQSxVQUFBLFdBQUEsRUFBQTtBQUFBLFlBQ3dDO0FBQUEsVUFDaEQsT0FBQTtBQUVBLGtCQUFBLElBQUEsTUFBQSx5QkFBQSxTQUFBLE1BQUEsRUFBQTtBQUFBLFVBQTBEO0FBQUEsUUFDNUQ7QUFBQSxNQUNGLFNBQUEsT0FBQTtBQUVBLGdCQUFBLE1BQUEsaUNBQUEsS0FBQTtBQUNBLGNBQUE7QUFBQSxNQUFNO0FBQUEsSUFDUjtBQUlGLG1CQUFBLGlCQUFBLFlBQUEsWUFBQTtBQUVFLFlBQUEsV0FBQSxNQUFBLE9BQUEsUUFBQSxNQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBO0FBQ0EsWUFBQSxrQkFBQSxTQUFBLG1CQUFBLENBQUE7QUFHQSxVQUFBLFdBQUEsZ0JBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLFVBQUE7QUFHQSxhQUFBLFVBQUEsV0FBQSx1QkFBQSxVQUFBO0FBQUEsSUFBNkQ7QUFJL0QsYUFBQSx1QkFBQSxZQUFBO0FBQ0UsYUFBQTtBQUFBO0FBQUEsWUFBTyxXQUFBLElBQUE7QUFBQTtBQUFBLFlBRWdCLFdBQUEsS0FBQSxLQUFBO0FBQUEsV0FFTSxXQUFBLEtBQUEsR0FBQTtBQUFBO0FBQUEsZ0JBQ0gsSUFBQSxLQUFBLFdBQUEsU0FBQSxFQUFBLGVBQUEsQ0FBQTtBQUFBLElBRWlDO0FBQUEsRUFFL0QsQ0FBQTs7O0FDNU5PLFFBQU1DLFlBQVUsV0FBVyxTQUFTLFNBQVMsS0FDaEQsV0FBVyxVQUNYLFdBQVc7QUNGUixRQUFNLFVBQVVDO0FDQXZCLE1BQUksZ0JBQWdCLE1BQU07QUFBQSxJQUN4QixZQUFZLGNBQWM7QUFDeEIsVUFBSSxpQkFBaUIsY0FBYztBQUNqQyxhQUFLLFlBQVk7QUFDakIsYUFBSyxrQkFBa0IsQ0FBQyxHQUFHLGNBQWMsU0FBUztBQUNsRCxhQUFLLGdCQUFnQjtBQUNyQixhQUFLLGdCQUFnQjtBQUFBLE1BQ3ZCLE9BQU87QUFDTCxjQUFNLFNBQVMsdUJBQXVCLEtBQUssWUFBWTtBQUN2RCxZQUFJLFVBQVU7QUFDWixnQkFBTSxJQUFJLG9CQUFvQixjQUFjLGtCQUFrQjtBQUNoRSxjQUFNLENBQUMsR0FBRyxVQUFVLFVBQVUsUUFBUSxJQUFJO0FBQzFDLHlCQUFpQixjQUFjLFFBQVE7QUFDdkMseUJBQWlCLGNBQWMsUUFBUTtBQUV2QyxhQUFLLGtCQUFrQixhQUFhLE1BQU0sQ0FBQyxRQUFRLE9BQU8sSUFBSSxDQUFDLFFBQVE7QUFDdkUsYUFBSyxnQkFBZ0I7QUFDckIsYUFBSyxnQkFBZ0I7QUFBQSxNQUN2QjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVMsS0FBSztBQUNaLFVBQUksS0FBSztBQUNQLGVBQU87QUFDVCxZQUFNLElBQUksT0FBTyxRQUFRLFdBQVcsSUFBSSxJQUFJLEdBQUcsSUFBSSxlQUFlLFdBQVcsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJO0FBQ2pHLGFBQU8sQ0FBQyxDQUFDLEtBQUssZ0JBQWdCLEtBQUssQ0FBQyxhQUFhO0FBQy9DLFlBQUksYUFBYTtBQUNmLGlCQUFPLEtBQUssWUFBWSxDQUFDO0FBQzNCLFlBQUksYUFBYTtBQUNmLGlCQUFPLEtBQUssYUFBYSxDQUFDO0FBQzVCLFlBQUksYUFBYTtBQUNmLGlCQUFPLEtBQUssWUFBWSxDQUFDO0FBQzNCLFlBQUksYUFBYTtBQUNmLGlCQUFPLEtBQUssV0FBVyxDQUFDO0FBQzFCLFlBQUksYUFBYTtBQUNmLGlCQUFPLEtBQUssV0FBVyxDQUFDO0FBQUEsTUFDNUIsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFlBQVksS0FBSztBQUNmLGFBQU8sSUFBSSxhQUFhLFdBQVcsS0FBSyxnQkFBZ0IsR0FBRztBQUFBLElBQzdEO0FBQUEsSUFDQSxhQUFhLEtBQUs7QUFDaEIsYUFBTyxJQUFJLGFBQWEsWUFBWSxLQUFLLGdCQUFnQixHQUFHO0FBQUEsSUFDOUQ7QUFBQSxJQUNBLGdCQUFnQixLQUFLO0FBQ25CLFVBQUksQ0FBQyxLQUFLLGlCQUFpQixDQUFDLEtBQUs7QUFDL0IsZUFBTztBQUNULFlBQU0sc0JBQXNCO0FBQUEsUUFDMUIsS0FBSyxzQkFBc0IsS0FBSyxhQUFhO0FBQUEsUUFDN0MsS0FBSyxzQkFBc0IsS0FBSyxjQUFjLFFBQVEsU0FBUyxFQUFFLENBQUM7QUFBQSxNQUN4RTtBQUNJLFlBQU0scUJBQXFCLEtBQUssc0JBQXNCLEtBQUssYUFBYTtBQUN4RSxhQUFPLENBQUMsQ0FBQyxvQkFBb0IsS0FBSyxDQUFDLFVBQVUsTUFBTSxLQUFLLElBQUksUUFBUSxDQUFDLEtBQUssbUJBQW1CLEtBQUssSUFBSSxRQUFRO0FBQUEsSUFDaEg7QUFBQSxJQUNBLFlBQVksS0FBSztBQUNmLFlBQU0sTUFBTSxxRUFBcUU7QUFBQSxJQUNuRjtBQUFBLElBQ0EsV0FBVyxLQUFLO0FBQ2QsWUFBTSxNQUFNLG9FQUFvRTtBQUFBLElBQ2xGO0FBQUEsSUFDQSxXQUFXLEtBQUs7QUFDZCxZQUFNLE1BQU0sb0VBQW9FO0FBQUEsSUFDbEY7QUFBQSxJQUNBLHNCQUFzQixTQUFTO0FBQzdCLFlBQU0sVUFBVSxLQUFLLGVBQWUsT0FBTztBQUMzQyxZQUFNLGdCQUFnQixRQUFRLFFBQVEsU0FBUyxJQUFJO0FBQ25ELGFBQU8sT0FBTyxJQUFJLGFBQWEsR0FBRztBQUFBLElBQ3BDO0FBQUEsSUFDQSxlQUFlLFFBQVE7QUFDckIsYUFBTyxPQUFPLFFBQVEsdUJBQXVCLE1BQU07QUFBQSxJQUNyRDtBQUFBLEVBQ0Y7QUFDQSxNQUFJLGVBQWU7QUFDbkIsZUFBYSxZQUFZLENBQUMsUUFBUSxTQUFTLFFBQVEsT0FBTyxLQUFLO0FBQy9ELE1BQUksc0JBQXNCLGNBQWMsTUFBTTtBQUFBLElBQzVDLFlBQVksY0FBYyxRQUFRO0FBQ2hDLFlBQU0sMEJBQTBCLFlBQVksTUFBTSxNQUFNLEVBQUU7QUFBQSxJQUM1RDtBQUFBLEVBQ0Y7QUFDQSxXQUFTLGlCQUFpQixjQUFjLFVBQVU7QUFDaEQsUUFBSSxDQUFDLGFBQWEsVUFBVSxTQUFTLFFBQVEsS0FBSyxhQUFhO0FBQzdELFlBQU0sSUFBSTtBQUFBLFFBQ1I7QUFBQSxRQUNBLEdBQUcsUUFBUSwwQkFBMEIsYUFBYSxVQUFVLEtBQUssSUFBSSxDQUFDO0FBQUEsTUFDNUU7QUFBQSxFQUNBO0FBQ0EsV0FBUyxpQkFBaUIsY0FBYyxVQUFVO0FBQ2hELFFBQUksU0FBUyxTQUFTLEdBQUc7QUFDdkIsWUFBTSxJQUFJLG9CQUFvQixjQUFjLGdDQUFnQztBQUM5RSxRQUFJLFNBQVMsU0FBUyxHQUFHLEtBQUssU0FBUyxTQUFTLEtBQUssQ0FBQyxTQUFTLFdBQVcsSUFBSTtBQUM1RSxZQUFNLElBQUk7QUFBQSxRQUNSO0FBQUEsUUFDQTtBQUFBLE1BQ047QUFBQSxFQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsNCw1LDZdfQ==
