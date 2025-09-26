var background = (function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const LOG_LEVELS$1 = {
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
  function getDefaultLogLevel$1() {
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
      const logLevel = config.level || getDefaultLogLevel$1();
      this.level = LOG_LEVELS$1[logLevel];
    }
    shouldLog(level) {
      if (!this.enabled) return false;
      return LOG_LEVELS$1[level] <= this.level;
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
  function createLogger$1(namespace, config) {
    return new ContentLogger({ ...config, namespace });
  }
  new ContentLogger({ namespace: "Wingman" });
  const logger$2 = createLogger$1("TunnelManager");
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
      logger$2.info(`[TunnelManager] createTunnel called with port: ${targetPort}, relay: ${relayUrl}`);
      if (!targetPort || targetPort <= 0 || targetPort > 65535) {
        const errorMsg = `Invalid port number: ${targetPort}. Port must be between 1 and 65535.`;
        logger$2.error(`[TunnelManager] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      try {
        logger$2.debug(`[TunnelManager] Stopping any existing tunnel...`);
        this.stopTunnel();
        logger$2.info(`[TunnelManager] Creating tunnel for port ${targetPort}`);
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
        logger$2.debug(`[TunnelManager] Using ${isLocalRelay ? "LOCAL" : "EXTERNAL"} relay`);
        logger$2.debug(`[TunnelManager] Sending POST request to ${apiUrl}`);
        logger$2.debug(`[TunnelManager] Request body: ${requestBody}`);
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: requestBody
        });
        logger$2.debug(`[TunnelManager] Response status: ${response.status}`);
        if (!response.ok) {
          const errorText = await response.text();
          logger$2.error(`[TunnelManager] API error response: ${errorText}`);
          throw new Error(`Failed to create tunnel: ${errorText}`);
        }
        const data = await response.json();
        logger$2.debug(`[TunnelManager] API response data:`, data);
        this.currentTunnel.sessionId = data.sessionId;
        this.currentTunnel.tunnelUrl = data.tunnelUrl;
        logger$2.info(`[TunnelManager] Tunnel created: ${data.tunnelUrl} (session: ${data.sessionId})`);
        logger$2.debug(`[TunnelManager] Connecting WebSocket...`);
        await this.connectWebSocket(baseUrl, isLocalRelay);
        this.currentTunnel.status = "active";
        this.updateBadge();
        logger$2.info(`[TunnelManager] Tunnel successfully activated`);
        return this.currentTunnel;
      } catch (error) {
        logger$2.error(`[TunnelManager] Failed to create tunnel:`, error);
        logger$2.error(`[TunnelManager] Error stack:`, error.stack);
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
          logger$2.error(`[TunnelManager] WebSocket connect failed: ${error.message}`);
          reject(error);
          return;
        }
        const wsUrl = relayUrl.replace("http://", "ws://").replace("https://", "wss://") + "/ws";
        logger$2.info(`[TunnelManager] Connecting to WebSocket at ${wsUrl}... (${isLocalRelay ? "LOCAL" : "EXTERNAL"})`);
        try {
          this.ws = new WebSocket(wsUrl);
          logger$2.debug(`[TunnelManager] WebSocket object created`);
        } catch (error) {
          logger$2.error(`[TunnelManager] Failed to create WebSocket:`, error);
          reject(error);
          return;
        }
        const timeout = setTimeout(() => {
          logger$2.error(`[TunnelManager] WebSocket connection timeout after 10 seconds`);
          reject(new Error("WebSocket connection timeout"));
        }, 1e4);
        this.ws.onopen = () => {
          clearTimeout(timeout);
          logger$2.info(`[TunnelManager] WebSocket connected successfully`);
          if (this.ws && this.currentTunnel) {
            const registerMessage = JSON.stringify({
              type: "register",
              role: "developer",
              sessionId: this.currentTunnel.sessionId
            });
            logger$2.debug(`[TunnelManager] Sending registration: ${registerMessage}`);
            this.ws.send(registerMessage);
          } else {
            logger$2.error(`[TunnelManager] Cannot register - WebSocket or tunnel missing`);
          }
        };
        this.ws.onmessage = (event) => {
          logger$2.debug(`[TunnelManager] WebSocket message received: ${event.data}`);
          try {
            const message = JSON.parse(event.data);
            if (message.type === "registered" && message.role === "developer") {
              logger$2.info(`[TunnelManager] Successfully registered as developer`);
              this.reconnectAttempts = 0;
              resolve();
            } else if (message.type === "error") {
              logger$2.error(`[TunnelManager] WebSocket error message:`, message.error);
              reject(new Error(message.error));
            } else if (message.type === "request") {
              logger$2.info(`[TunnelManager] Tunnel request: ${message.request?.method} ${message.request?.path}`);
              this.handleTunnelRequest(message);
            } else {
              logger$2.debug(`[TunnelManager] Unhandled message type: ${message.type}`);
            }
          } catch (error) {
            logger$2.error(`[TunnelManager] Error parsing WebSocket message:`, error);
            logger$2.error(`[TunnelManager] Raw message: ${event.data}`);
          }
        };
        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          logger$2.error(`[TunnelManager] WebSocket error event:`, error);
          reject(error);
        };
        this.ws.onclose = (event) => {
          logger$2.info(`[TunnelManager] WebSocket closed - Code: ${event.code}, Reason: ${event.reason}`);
          if (this.currentTunnel && this.currentTunnel.status === "active") {
            logger$2.debug(`[TunnelManager] Will attempt to reconnect...`);
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
        logger$2.error("[TunnelManager] Cannot handle request - no active tunnel or WebSocket");
        return;
      }
      try {
        const targetUrl = `http://localhost:${this.currentTunnel.targetPort}${request.path || "/"}`;
        logger$2.debug(`[TunnelManager] Forwarding request to: ${targetUrl}`);
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
        logger$2.debug(`[TunnelManager] Response body: ${responseBodyBuffer.byteLength} bytes, content-type: ${response.headers.get("content-type") || "unknown"}`);
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
        logger$2.debug(`[TunnelManager] Sending binary response for request ${requestId}: ${response.status} (${responseBodyBuffer.byteLength} bytes)`);
        this.ws.send(JSON.stringify(responseMetadata));
        if (responseBodyBuffer.byteLength > 0) {
          this.ws.send(responseBodyBuffer);
        }
      } catch (error) {
        logger$2.error(`[TunnelManager] Error forwarding request:`, error);
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
        logger$2.error("Max reconnect attempts reached");
        if (this.currentTunnel) {
          this.currentTunnel.status = "error";
          this.updateBadge();
        }
        return;
      }
      const delay = Math.min(1e3 * Math.pow(2, this.reconnectAttempts), 1e4);
      this.reconnectAttempts++;
      logger$2.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
      this.reconnectTimeout = window.setTimeout(() => {
        if (this.currentTunnel) {
          this.connectWebSocket(this.currentRelayUrl, this.isLocalRelay).catch((error) => {
            logger$2.error("Reconnect failed:", error);
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
      logger$2.info("Tunnel stopped");
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
  const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };
  function detectEnvironment() {
    if (typeof window !== "undefined") {
      if (typeof window.__WINGMAN_CONFIG__ !== "undefined") {
        return window.__WINGMAN_CONFIG__.environment || "production";
      }
    }
    if (typeof process !== "undefined" && process.env) {
      return process.env.WINGMAN_ENV || "development";
    }
    return "production";
  }
  function getDefaultLogLevel() {
    const env = detectEnvironment();
    if (typeof process !== "undefined" && process.env?.LOG_LEVEL) {
      return process.env.LOG_LEVEL;
    }
    switch (env) {
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
  class WingmanLogger {
    constructor(config = {}) {
      this.namespace = config.namespace || "Wingman";
      this.enabled = config.enabled !== false;
      this.environment = config.forceEnvironment || detectEnvironment();
      const logLevel = config.level || getDefaultLogLevel();
      this.level = LOG_LEVELS[logLevel];
    }
    shouldLog(level) {
      if (!this.enabled)
        return false;
      return LOG_LEVELS[level] <= this.level;
    }
    formatMessage(level, message) {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const prefix = `[${this.namespace}]`;
      if (this.environment === "development") {
        return `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}`;
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
      return new WingmanLogger({
        ...config,
        namespace: `${this.namespace}:${subNamespace}`,
        level: config?.level || (this.level === 0 ? "error" : this.level === 1 ? "warn" : this.level === 2 ? "info" : "debug"),
        enabled: config?.enabled !== void 0 ? config.enabled : this.enabled,
        forceEnvironment: this.environment
      });
    }
    // Update log level at runtime
    setLevel(level) {
      this.level = LOG_LEVELS[level];
    }
    // Enable/disable logging at runtime
    setEnabled(enabled) {
      this.enabled = enabled;
    }
    // Get current configuration
    getConfig() {
      const levelName = Object.entries(LOG_LEVELS).find(([_, value]) => value === this.level)?.[0];
      return {
        level: levelName,
        namespace: this.namespace,
        enabled: this.enabled,
        environment: this.environment
      };
    }
  }
  new WingmanLogger();
  function createLogger(namespace, config) {
    return new WingmanLogger({ ...config, namespace });
  }
  var ProtocolErrorCode;
  (function(ProtocolErrorCode2) {
    ProtocolErrorCode2["INVALID_MESSAGE"] = "INVALID_MESSAGE";
    ProtocolErrorCode2["UNKNOWN_SESSION"] = "UNKNOWN_SESSION";
    ProtocolErrorCode2["REQUEST_TIMEOUT"] = "REQUEST_TIMEOUT";
    ProtocolErrorCode2["REQUEST_TOO_LARGE"] = "REQUEST_TOO_LARGE";
    ProtocolErrorCode2["TOO_MANY_REQUESTS"] = "TOO_MANY_REQUESTS";
    ProtocolErrorCode2["CONNECTION_FAILED"] = "CONNECTION_FAILED";
    ProtocolErrorCode2["TUNNEL_NOT_FOUND"] = "TUNNEL_NOT_FOUND";
    ProtocolErrorCode2["PERMISSION_DENIED"] = "PERMISSION_DENIED";
  })(ProtocolErrorCode || (ProtocolErrorCode = {}));
  function getValueByPath(obj, path) {
    if (!obj || !path)
      return void 0;
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
      if (current == null)
        return void 0;
      current = current[key];
    }
    return current;
  }
  class SimpleTemplateEngine {
    constructor(options) {
      this.truncationConfig = options?.truncationConfig;
    }
    /**
     * Render an annotation using a template
     */
    render(annotation, template, context) {
      let result2 = template.template;
      for (const variable of template.variables) {
        let formattedValue;
        if (variable.key === "screenshotUrl" && context && "screenshotUrl" in context && context.screenshotUrl) {
          formattedValue = context.screenshotUrl.toString();
        } else if (context && variable.key in context && context[variable.key] !== "") {
          formattedValue = context[variable.key]?.toString() || "";
        } else {
          const value = this.getValue(annotation, variable.path);
          formattedValue = variable.formatter ? variable.formatter(value, context) : value?.toString() || variable.defaultValue || "";
        }
        const placeholder = `{{${variable.key}}}`;
        result2 = result2.replace(new RegExp(placeholder, "g"), formattedValue);
      }
      result2 = this.processNestedProperties(result2, annotation);
      result2 = this.processConditionals(result2, annotation, template);
      result2 = this.processLoops(result2, annotation, template);
      return result2;
    }
    /**
     * Process nested property access in templates
     * Handles patterns like {{object.property}} and {{object.nested.property}}
     */
    processNestedProperties(template, annotation) {
      const nestedPropRegex = /\{\{([^#/][^}]+\.[^}]+)\}\}/g;
      return template.replace(nestedPropRegex, (match, path) => {
        const trimmedPath = path.trim();
        const value = getValueByPath(annotation, trimmedPath);
        if (!value && trimmedPath.startsWith("target.rect.")) {
          const rectValue = getValueByPath(annotation, "target.rect");
          if (rectValue) {
            const prop = trimmedPath.split(".").pop();
            return rectValue[prop]?.toString() || "";
          }
        }
        return value?.toString() || "";
      });
    }
    /**
     * Process conditional blocks in the template
     * This is a simplified implementation for the foundation
     */
    processConditionals(template, annotation, tmpl) {
      const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
      return template.replace(conditionalRegex, (match, varName, content) => {
        const variable = tmpl.variables.find((v) => v.key === varName);
        if (!variable)
          return "";
        const value = this.getValue(annotation, variable.path);
        const processedValue = variable.formatter ? variable.formatter(value) : value;
        const isTruthy = processedValue && (Array.isArray(processedValue) ? processedValue.length > 0 : true);
        return isTruthy ? content : "";
      });
    }
    /**
     * Process loops in the template
     * This is a simplified implementation for the foundation
     */
    processLoops(template, annotation, tmpl) {
      const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
      return template.replace(loopRegex, (match, varName, content) => {
        const variable = tmpl.variables.find((v) => v.key === varName);
        if (!variable)
          return "";
        const value = this.getValue(annotation, variable.path);
        if (!Array.isArray(value))
          return "";
        return value.map((item, index) => {
          let itemContent = content;
          itemContent = itemContent.replace(/\{\{index\}\}/g, (index + 1).toString());
          const nestedIfRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
          itemContent = itemContent.replace(nestedIfRegex, (ifMatch, propName, ifContent) => {
            const propValue = item[propName];
            return propValue ? ifContent : "";
          });
          if (typeof item === "object" && item !== null) {
            if ("ts" in item && typeof item.ts === "number") {
              const timestamp = new Date(item.ts).toLocaleTimeString();
              itemContent = itemContent.replace(/\{\{timestamp\}\}/g, timestamp);
            }
            for (const [key, val] of Object.entries(item)) {
              const placeholder = `{{${key}}}`;
              let formattedVal = "";
              if (val === void 0 || val === null) {
                formattedVal = "";
              } else if (key === "ts" && typeof val === "number") {
                formattedVal = new Date(val).toLocaleTimeString();
              } else if (key === "level" && typeof val === "string") {
                formattedVal = val.toUpperCase();
              } else if (key === "args" && Array.isArray(val)) {
                formattedVal = val.map((arg) => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
              } else if (key === "timestamp" && typeof val === "number") {
                formattedVal = new Date(val).toLocaleTimeString();
              } else {
                formattedVal = val.toString();
              }
              itemContent = itemContent.replace(new RegExp(placeholder, "g"), formattedVal);
            }
            itemContent = itemContent.replace(/\{\{[^}]+\}\}/g, (match2) => {
              if (match2 === "{{index}}")
                return match2;
              return "";
            });
          }
          return itemContent;
        }).join("");
      });
    }
    /**
     * Validate that a template is well-formed
     */
    validate(template) {
      const errors = [];
      if (!template.id)
        errors.push("Template ID is required");
      if (!template.name)
        errors.push("Template name is required");
      if (!template.template)
        errors.push("Template string is required");
      if (!template.variables || !Array.isArray(template.variables)) {
        errors.push("Template variables must be an array");
      }
      const usedVars = this.extractVariables(template.template);
      const definedVars = new Set(template.variables.map((v) => v.key));
      for (const usedVar of usedVars) {
        if (!definedVars.has(usedVar) && !["index", "timestamp", "message", "stack", "level", "args", "url", "status", "duration", "initiatorType"].includes(usedVar)) {
          errors.push(`Variable '${usedVar}' is used in template but not defined`);
        }
      }
      for (const variable of template.variables) {
        if (variable.required && !usedVars.includes(variable.key)) {
          errors.push(`Required variable '${variable.key}' is not used in template`);
        }
      }
      return {
        valid: errors.length === 0,
        ...errors.length > 0 && { errors }
      };
    }
    /**
     * Extract variables from a template string
     */
    extractVariables(templateString) {
      const variables = /* @__PURE__ */ new Set();
      const simpleVarRegex = /\{\{([^#/][^}]+)\}\}/g;
      let match;
      while ((match = simpleVarRegex.exec(templateString)) !== null) {
        const varName = match[1]?.trim();
        if (varName && !varName.startsWith("#") && !varName.startsWith("/")) {
          variables.add(varName);
        }
      }
      const conditionalRegex = /\{\{#if\s+(\w+)\}\}/g;
      while ((match = conditionalRegex.exec(templateString)) !== null) {
        if (match[1]) {
          variables.add(match[1]);
        }
      }
      const loopRegex = /\{\{#each\s+(\w+)\}\}/g;
      while ((match = loopRegex.exec(templateString)) !== null) {
        if (match[1]) {
          variables.add(match[1]);
        }
      }
      return Array.from(variables);
    }
    /**
     * Get value from annotation using path, applying truncation if configured
     */
    getValue(annotation, path) {
      const value = getValueByPath(annotation, path);
      if (Array.isArray(value) && this.truncationConfig) {
        if (path === "console" && this.truncationConfig.console?.templateLimit) {
          const limit = this.truncationConfig.console.templateLimit;
          return value.slice(-limit);
        }
        if (path === "network" && this.truncationConfig.network?.templateLimit) {
          const limit = this.truncationConfig.network.templateLimit;
          return value.slice(-limit);
        }
        if (path === "errors" && this.truncationConfig.errors?.templateLimit) {
          const limit = this.truncationConfig.errors.templateLimit;
          return value.slice(-limit);
        }
      }
      return value;
    }
  }
  function createTemplateEngine(options) {
    return new SimpleTemplateEngine(options);
  }
  const defaultTemplate = {
    id: "default-claude-optimized",
    name: "Claude Code Optimized",
    description: "Optimized format for Claude Code with emphasis on user feedback and screenshot analysis",
    builtIn: true,
    tags: ["claude", "default", "optimized"],
    template: `# 🎯 UI Feedback Request

{{#if userNote}}
## 📝 User Feedback

> **{{userNote}}**

---

{{/if}}
## 🖼️ Screenshot Analysis Required

**IMPORTANT**: Please carefully examine the screenshot below to understand the visual context of the UI issue.

![Wingman Screenshot - Click to view full size]({{screenshotUrl}})

*The screenshot above shows the exact area where the user is reporting an issue.*

---

## 🎨 Visual Context

{{#if targetRect}}
- **Selected Area:** {{targetRectWidth}}×{{targetRectHeight}} pixels at position ({{targetRectX}}, {{targetRectY}})
{{/if}}
- **Selection Mode:** {{selectionModeText}}
{{#if targetSelector}}
- **CSS Selector:** \`{{targetSelector}}\`
{{/if}}

---

## 📍 Page Information

- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}
- **Viewport:** {{viewportWidth}}×{{viewportHeight}} (DPR: {{viewportDpr}})
- **Captured:** {{capturedAt}}

## 🔧 Technical Details

{{#if hasReact}}
### React Component Info

- **Component:** {{reactComponentName}}
- **Data Source:** {{reactDataSource}}

**Props:**
\`\`\`json
{{reactPropsJson}}
\`\`\`

**State:**
\`\`\`json
{{reactStateJson}}
\`\`\`

{{/if}}
{{#if hasErrors}}
### ⚠️ JavaScript Errors ({{errorCount}})

{{#each errors}}
{{index}}. **[{{timestamp}}]** {{message}}
   {{stack}}
{{/each}}

{{/if}}
{{#if hasConsole}}
### Console Logs ({{consoleCount}})

{{#each consoleLogs}}
{{index}}. **[{{level}}]** {{timestamp}}: {{args}}
{{/each}}

{{/if}}
{{#if hasNetwork}}
### Network Activity ({{networkCount}} requests)

{{#each networkRequests}}
{{index}}. **{{url}}**
   - Status: {{status}}
   - Duration: {{duration}}ms
   - Type: {{initiatorType}}
{{/each}}

{{/if}}
### Browser Info

- **User Agent:** {{userAgent}}
- **Annotation ID:** {{annotationId}}

---

## 💡 Action Request

Please review the **screenshot** and **user feedback** above to understand and address the reported UI issue. Focus on the visual elements shown in the screenshot and how they relate to the user's feedback.
`,
    variables: [
      {
        key: "userNote",
        path: "note",
        required: false,
        description: "User feedback or note about the issue"
      },
      {
        key: "screenshotUrl",
        path: "id",
        formatter: (id, context) => `${context?.relayUrl || "https://api.wingmanux.com"}/annotations/${id}/screenshot`,
        required: true,
        description: "URL to the screenshot image"
      },
      {
        key: "targetRect",
        path: "target.rect",
        required: false,
        description: "Rectangle coordinates of selected area"
      },
      {
        key: "targetRectWidth",
        path: "target.rect.width",
        required: false,
        description: "Width of selected area"
      },
      {
        key: "targetRectHeight",
        path: "target.rect.height",
        required: false,
        description: "Height of selected area"
      },
      {
        key: "targetRectX",
        path: "target.rect.x",
        required: false,
        description: "X coordinate of selected area"
      },
      {
        key: "targetRectY",
        path: "target.rect.y",
        required: false,
        description: "Y coordinate of selected area"
      },
      {
        key: "selectionModeText",
        path: "target.mode",
        formatter: (mode) => mode === "element" ? "Specific Element" : "Region Selection",
        required: true,
        description: "Human-readable selection mode"
      },
      {
        key: "targetSelector",
        path: "target.selector",
        required: false,
        description: "CSS selector for the target element"
      },
      {
        key: "pageUrl",
        path: "page.url",
        required: true,
        description: "URL of the page"
      },
      {
        key: "pageTitle",
        path: "page.title",
        required: true,
        description: "Title of the page"
      },
      {
        key: "viewportWidth",
        path: "page.viewport.w",
        required: true,
        description: "Viewport width"
      },
      {
        key: "viewportHeight",
        path: "page.viewport.h",
        required: true,
        description: "Viewport height"
      },
      {
        key: "viewportDpr",
        path: "page.viewport.dpr",
        required: true,
        description: "Device pixel ratio"
      },
      {
        key: "capturedAt",
        path: "createdAt",
        formatter: (value) => new Date(value).toLocaleString(),
        required: true,
        description: "When the annotation was captured"
      },
      {
        key: "hasReact",
        path: "react",
        formatter: (value) => String(!!value),
        required: false,
        description: "Whether React info is available"
      },
      {
        key: "reactComponentName",
        path: "react.componentName",
        required: false,
        description: "React component name"
      },
      {
        key: "reactDataSource",
        path: "react.obtainedVia",
        required: false,
        description: "How React data was obtained"
      },
      {
        key: "reactPropsJson",
        path: "react.props",
        formatter: (value) => JSON.stringify(value, null, 2),
        required: false,
        description: "React props as JSON"
      },
      {
        key: "reactStateJson",
        path: "react.state",
        formatter: (value) => JSON.stringify(value, null, 2),
        required: false,
        description: "React state as JSON"
      },
      {
        key: "hasErrors",
        path: "errors",
        formatter: (value) => String(value && value.length > 0),
        required: false,
        description: "Whether there are JavaScript errors"
      },
      {
        key: "errorCount",
        path: "errors",
        formatter: (value) => String(value?.length || 0),
        required: false,
        description: "Number of JavaScript errors"
      },
      {
        key: "errors",
        path: "errors",
        required: false,
        description: "JavaScript errors array"
      },
      {
        key: "hasConsole",
        path: "console",
        formatter: (value) => String(value && value.length > 0),
        required: false,
        description: "Whether there are console logs"
      },
      {
        key: "consoleCount",
        path: "console",
        formatter: (value) => String(value?.length || 0),
        required: false,
        description: "Number of console logs"
      },
      {
        key: "consoleLogs",
        path: "console",
        required: false,
        description: "Console logs array"
      },
      {
        key: "hasNetwork",
        path: "network",
        formatter: (value) => String(value && value.length > 0),
        required: false,
        description: "Whether there are network requests"
      },
      {
        key: "networkCount",
        path: "network",
        formatter: (value) => String(value?.length || 0),
        required: false,
        description: "Number of network requests"
      },
      {
        key: "networkRequests",
        path: "network",
        required: false,
        description: "Network requests array"
      },
      {
        key: "userAgent",
        path: "page.ua",
        required: true,
        description: "User agent string"
      },
      {
        key: "annotationId",
        path: "id",
        required: true,
        description: "Unique annotation ID"
      }
    ]
  };
  const logger$1 = createLogger("Wingman:ScreenshotHandler");
  class ScreenshotHandler {
    constructor(templateEngine2) {
      this.templateEngine = templateEngine2;
    }
    /**
     * Main entry point for handling screenshots in clipboard mode
     */
    async processForClipboard(annotation, template, relayUrl) {
      const dataUrl = annotation.media?.screenshot?.dataUrl;
      if (!dataUrl) {
        logger$1.warn("No screenshot data URL available");
        return {
          content: this.templateEngine.render(annotation, template, { relayUrl: relayUrl || "" })
        };
      }
      let localPath = null;
      localPath = await this.saveToDownloads(dataUrl);
      if (!localPath) {
        localPath = await this.saveToStorage(dataUrl);
      }
      const content = localPath ? this.formatWithLocalFile(annotation, template, localPath) : this.formatWithBase64(annotation, template, dataUrl);
      return { content, localPath: localPath || void 0 };
    }
    /**
     * Save screenshot to Downloads folder
     */
    async saveToDownloads(dataUrl) {
      try {
        logger$1.info("Attempting to save screenshot to Downloads folder...");
        const base64Match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) {
          logger$1.error("Invalid data URL format");
          return null;
        }
        const [, imageType] = base64Match;
        const timestamp = Date.now();
        const filename = `wingman-screenshot-${timestamp}.${imageType}`;
        logger$1.debug(`Preparing to download: ${filename}`);
        const downloadId = await this.performDownload(dataUrl, filename);
        if (!downloadId) {
          return null;
        }
        const downloadPath = await this.waitForDownload(downloadId);
        if (downloadPath) {
          logger$1.info(`Screenshot saved successfully to: ${downloadPath}`);
        } else {
          logger$1.warn("Download completed but no path returned");
        }
        return downloadPath;
      } catch (error) {
        logger$1.error("Failed to save screenshot to Downloads:", error);
        if (error instanceof Error) {
          logger$1.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
        return null;
      }
    }
    /**
     * Hide the download shelf temporarily
     */
    async hideDownloadShelf() {
      try {
        if (chrome.downloads.setUiOptions) {
          await chrome.downloads.setUiOptions({ enabled: false });
          logger$1.debug("Download shelf hidden using setUiOptions");
          return true;
        } else if (chrome.downloads.setShelfEnabled) {
          await new Promise((resolve) => {
            chrome.downloads.setShelfEnabled(false);
            resolve();
          });
          logger$1.debug("Download shelf hidden using setShelfEnabled");
          return true;
        }
      } catch (error) {
        logger$1.warn("Failed to hide download shelf:", error);
      }
      return false;
    }
    /**
     * Restore the download shelf
     */
    async restoreDownloadShelf() {
      try {
        if (chrome.downloads.setUiOptions) {
          await chrome.downloads.setUiOptions({ enabled: true });
          logger$1.debug("Download shelf restored using setUiOptions");
        } else if (chrome.downloads.setShelfEnabled) {
          chrome.downloads.setShelfEnabled(true);
          logger$1.debug("Download shelf restored using setShelfEnabled");
        }
      } catch (error) {
        logger$1.warn("Failed to restore download shelf:", error);
      }
    }
    /**
     * Perform the actual download with detailed error handling
     */
    async performDownload(dataUrl, filename) {
      let shelfHidden = false;
      try {
        shelfHidden = await this.hideDownloadShelf();
        const downloadOptions = {
          url: dataUrl,
          // Data URL can be used directly
          filename,
          saveAs: false,
          conflictAction: "uniquify"
        };
        logger$1.debug("Download options:", {
          filename,
          urlLength: dataUrl.length,
          urlPrefix: dataUrl.substring(0, 50) + "...",
          shelfHidden
        });
        const downloadId = await new Promise((resolve) => {
          chrome.downloads.download(downloadOptions, (downloadId2) => {
            if (chrome.runtime.lastError) {
              logger$1.error("Chrome download API error:", chrome.runtime.lastError);
              resolve(null);
            } else if (downloadId2 === void 0) {
              logger$1.error("Download ID is undefined - download was blocked");
              resolve(null);
            } else {
              logger$1.info(`Download initiated with ID: ${downloadId2}`);
              resolve(downloadId2);
            }
          });
        });
        if (shelfHidden) {
          setTimeout(() => {
            this.restoreDownloadShelf();
          }, 500);
        }
        return downloadId;
      } catch (error) {
        if (shelfHidden) {
          await this.restoreDownloadShelf();
        }
        logger$1.error("Exception during download:", error);
        return null;
      }
    }
    /**
     * Wait for download to complete and return the file path
     */
    async waitForDownload(downloadId) {
      return new Promise((resolve) => {
        const maxAttempts = 50;
        let attempts = 0;
        const checkDownload = () => {
          attempts++;
          chrome.downloads.search({ id: downloadId }, (downloads) => {
            if (chrome.runtime.lastError) {
              logger$1.error("Error searching for download:", chrome.runtime.lastError);
              resolve(null);
              return;
            }
            if (!downloads || downloads.length === 0) {
              logger$1.error(`Download ${downloadId} not found`);
              resolve(null);
              return;
            }
            const download = downloads[0];
            logger$1.debug(`Download state: ${download.state}, filename: ${download.filename}`);
            if (download.state === "complete") {
              if (download.filename) {
                logger$1.info(`Download completed: ${download.filename}`);
                resolve(download.filename);
              } else {
                logger$1.warn("Download completed but filename is empty");
                resolve(null);
              }
            } else if (download.state === "interrupted") {
              logger$1.error(`Download interrupted: ${download.error || "Unknown error"}`);
              if (download.error) {
                const errorDetails = {
                  error: download.error,
                  filename: download.filename,
                  mime: download.mime,
                  bytesReceived: download.bytesReceived,
                  totalBytes: download.totalBytes,
                  danger: download.danger,
                  paused: download.paused
                };
                logger$1.error("Download error details:", errorDetails);
              }
              resolve(null);
            } else if (attempts >= maxAttempts) {
              logger$1.error(`Download timeout after ${maxAttempts} attempts`);
              resolve(null);
            } else {
              setTimeout(checkDownload, 100);
            }
          });
        };
        checkDownload();
      });
    }
    /**
     * Save screenshot to chrome.storage.local (fallback strategy)
     */
    async saveToStorage(dataUrl) {
      try {
        logger$1.info("Attempting to save screenshot to chrome.storage.local...");
        const sizeInBytes = new Blob([dataUrl]).size;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        if (sizeInMB > 8) {
          logger$1.warn(`Screenshot too large for storage: ${sizeInMB.toFixed(2)} MB`);
          return null;
        }
        const timestamp = Date.now();
        const storageKey = `screenshot_${timestamp}`;
        await chrome.storage.local.set({ [storageKey]: dataUrl });
        logger$1.info(`Screenshot saved to storage with key: ${storageKey}`);
        return `chrome-storage://${storageKey}`;
      } catch (error) {
        logger$1.error("Failed to save to chrome.storage.local:", error);
        return null;
      }
    }
    /**
     * Format annotation with local file reference
     */
    formatWithLocalFile(annotation, template, localPath) {
      logger$1.debug(`Formatting with local file: ${localPath}`);
      let fileUrl;
      if (localPath.startsWith("chrome-storage://")) {
        fileUrl = localPath;
      } else {
        fileUrl = `file://${localPath}`;
      }
      let content = this.templateEngine.render(annotation, template, {
        relayUrl: fileUrl,
        isLocalFile: true
      });
      content = content.replace(
        /!\[.*?\]\(.*?\/annotations\/.*?\/screenshot\)/g,
        `![Screenshot - Local file](${fileUrl})`
      );
      return content;
    }
    /**
     * Format annotation with embedded base64 image (fallback)
     */
    formatWithBase64(annotation, template, dataUrl) {
      logger$1.warn("Using base64 fallback for screenshot");
      const annotationWithFakeId = {
        ...annotation,
        id: `embedded-${Date.now()}`
      };
      let content = this.templateEngine.render(annotationWithFakeId, template, {
        relayUrl: "",
        isLocalFile: false
      });
      content = content.replace(
        /!\[.*?\]\(.*?\/annotations\/.*?\/screenshot\)/g,
        `![Screenshot](${dataUrl})`
      );
      content = content.replace(
        /!\[.*?\]\(\/annotations\/.*?\/screenshot\)/g,
        `![Screenshot](${dataUrl})`
      );
      return content;
    }
  }
  const tunnelManager = new TunnelManager();
  const templateEngine = createTemplateEngine();
  const screenshotHandler = new ScreenshotHandler(templateEngine);
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
        processAnnotation(request.annotation, request.relayUrl).then((result2) => sendResponse(result2)).catch((error) => {
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
    async function processAnnotation(annotation, relayUrl) {
      try {
        console.log("Processing annotation:", { relayUrl });
        let screenshotDataUrl = "";
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
          screenshotDataUrl = dataUrl;
          console.log("Screenshot captured successfully");
        } catch (error) {
          console.error("Screenshot capture failed:", error);
        }
        const annotationWithScreenshot = {
          ...annotation,
          media: {
            screenshot: {
              dataUrl: screenshotDataUrl,
              timestamp: Date.now()
            }
          }
        };
        if (relayUrl === "clipboard") {
          const { content, localPath } = await screenshotHandler.processForClipboard(
            annotationWithScreenshot,
            defaultTemplate,
            relayUrl
          );
          console.log("Annotation formatted for clipboard", {
            hasLocalPath: !!localPath
          });
          return {
            success: true,
            mode: "clipboard",
            text: content,
            screenshotPath: localPath
          };
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL3NyYy91dGlscy9sb2dnZXIudHMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC90dW5uZWwtbWFuYWdlci50cyIsIi4uLy4uLy4uL3NoYXJlZC9kaXN0L2xvZ2dlci5qcyIsIi4uLy4uLy4uL3NoYXJlZC9kaXN0L3R1bm5lbC1wcm90b2NvbC5qcyIsIi4uLy4uLy4uL3NoYXJlZC9kaXN0L3RlbXBsYXRlcy90ZW1wbGF0ZS1lbmdpbmUuanMiLCIuLi8uLi8uLi9zaGFyZWQvZGlzdC90ZW1wbGF0ZXMvZGVmYXVsdC50ZW1wbGF0ZS5qcyIsIi4uLy4uL3NyYy9iYWNrZ3JvdW5kL3NjcmVlbnNob3QtaGFuZGxlci50cyIsIi4uLy4uL3NyYy9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9icm93c2VyLm1qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8qKlxuICogTG9jYWwgbG9nZ2VyIHV0aWxpdHkgZm9yIENocm9tZSBFeHRlbnNpb24gY29udGVudCBzY3JpcHRzXG4gKiBcbiAqIENvbnRlbnQgc2NyaXB0cyBjYW5ub3QgdXNlIEVTIG1vZHVsZXMsIHNvIHRoaXMgaXMgYSBsb2NhbCBjb3B5XG4gKiBvZiB0aGUgbG9nZ2VyIGZ1bmN0aW9uYWxpdHkgZnJvbSBwYWNrYWdlcy9zaGFyZWQvc3JjL2xvZ2dlci50c1xuICogXG4gKiBUaGlzIHZlcnNpb24gaXMgc3BlY2lmaWNhbGx5IGZvciBjb250ZW50IHNjcmlwdHMgYW5kIG90aGVyIHBhcnRzXG4gKiBvZiB0aGUgQ2hyb21lIGV4dGVuc2lvbiB0aGF0IGNhbm5vdCBpbXBvcnQgZnJvbSBAd2luZ21hbi9zaGFyZWQuXG4gKi9cblxuZXhwb3J0IHR5cGUgTG9nTGV2ZWwgPSAnZXJyb3InIHwgJ3dhcm4nIHwgJ2luZm8nIHwgJ2RlYnVnJztcblxuaW50ZXJmYWNlIExvZ2dlckNvbmZpZyB7XG4gIGxldmVsPzogTG9nTGV2ZWw7XG4gIG5hbWVzcGFjZT86IHN0cmluZztcbiAgZW5hYmxlZD86IGJvb2xlYW47XG59XG5cbi8vIExvZyBsZXZlbCBwcmlvcml0eSAoaGlnaGVyIG51bWJlciA9IG1vcmUgdmVyYm9zZSlcbmNvbnN0IExPR19MRVZFTFM6IFJlY29yZDxMb2dMZXZlbCwgbnVtYmVyPiA9IHtcbiAgZXJyb3I6IDAsXG4gIHdhcm46IDEsXG4gIGluZm86IDIsXG4gIGRlYnVnOiAzLFxufTtcblxuLy8gR2V0IGNvbmZpZyBmcm9tIHRoZSBpbmplY3RlZCBidWlsZC10aW1lIGNvbmZpZ1xuZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICBpZiAodHlwZW9mIF9fV0lOR01BTl9DT05GSUdfXyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gX19XSU5HTUFOX0NPTkZJR19fO1xuICB9XG4gIC8vIEZhbGxiYWNrIGNvbmZpZ1xuICByZXR1cm4ge1xuICAgIGVudmlyb25tZW50OiAncHJvZHVjdGlvbicsXG4gICAgZmVhdHVyZXM6IHsgdmVyYm9zZUxvZ2dpbmc6IGZhbHNlIH1cbiAgfTtcbn1cblxuLy8gR2V0IGxvZyBsZXZlbCBmcm9tIGNvbmZpZ1xuZnVuY3Rpb24gZ2V0RGVmYXVsdExvZ0xldmVsKCk6IExvZ0xldmVsIHtcbiAgY29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKCk7XG4gIFxuICAvLyBDaGVjayB2ZXJib3NlIGxvZ2dpbmcgZmxhZ1xuICBpZiAoY29uZmlnLmZlYXR1cmVzPy52ZXJib3NlTG9nZ2luZykge1xuICAgIHJldHVybiAnZGVidWcnO1xuICB9XG4gIFxuICAvLyBFbnZpcm9ubWVudC1iYXNlZCBkZWZhdWx0c1xuICBzd2l0Y2ggKGNvbmZpZy5lbnZpcm9ubWVudCkge1xuICAgIGNhc2UgJ2RldmVsb3BtZW50JzpcbiAgICAgIHJldHVybiAnZGVidWcnO1xuICAgIGNhc2UgJ3N0YWdpbmcnOlxuICAgIGNhc2UgJ3Rlc3QnOlxuICAgICAgcmV0dXJuICdpbmZvJztcbiAgICBjYXNlICdwcm9kdWN0aW9uJzpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICdlcnJvcic7XG4gIH1cbn1cblxuY2xhc3MgQ29udGVudExvZ2dlciB7XG4gIHByaXZhdGUgbGV2ZWw6IG51bWJlcjtcbiAgcHJpdmF0ZSBuYW1lc3BhY2U6IHN0cmluZztcbiAgcHJpdmF0ZSBlbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGVudmlyb25tZW50OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBMb2dnZXJDb25maWcgPSB7fSkge1xuICAgIGNvbnN0IHdpbmdtYW5Db25maWcgPSBnZXRDb25maWcoKTtcbiAgICBcbiAgICB0aGlzLm5hbWVzcGFjZSA9IGNvbmZpZy5uYW1lc3BhY2UgfHwgJ1dpbmdtYW4nO1xuICAgIHRoaXMuZW5hYmxlZCA9IGNvbmZpZy5lbmFibGVkICE9PSBmYWxzZTtcbiAgICB0aGlzLmVudmlyb25tZW50ID0gd2luZ21hbkNvbmZpZy5lbnZpcm9ubWVudCB8fCAncHJvZHVjdGlvbic7XG4gICAgXG4gICAgY29uc3QgbG9nTGV2ZWwgPSBjb25maWcubGV2ZWwgfHwgZ2V0RGVmYXVsdExvZ0xldmVsKCk7XG4gICAgdGhpcy5sZXZlbCA9IExPR19MRVZFTFNbbG9nTGV2ZWxdO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG91bGRMb2cobGV2ZWw6IExvZ0xldmVsKTogYm9vbGVhbiB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gTE9HX0xFVkVMU1tsZXZlbF0gPD0gdGhpcy5sZXZlbDtcbiAgfVxuXG4gIHByaXZhdGUgZm9ybWF0TWVzc2FnZShsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcHJlZml4ID0gYFske3RoaXMubmFtZXNwYWNlfV1gO1xuICAgIFxuICAgIC8vIEluIGRldmVsb3BtZW50LCBpbmNsdWRlIGxldmVsXG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICAgIHJldHVybiBgJHtwcmVmaXh9IFske2xldmVsLnRvVXBwZXJDYXNlKCl9XSAke21lc3NhZ2V9YDtcbiAgICB9XG4gICAgXG4gICAgLy8gSW4gcHJvZHVjdGlvbiwga2VlcCBpdCBzaW1wbGVcbiAgICByZXR1cm4gYCR7cHJlZml4fSAke21lc3NhZ2V9YDtcbiAgfVxuXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zaG91bGRMb2coJ2Vycm9yJykpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy5mb3JtYXRNZXNzYWdlKCdlcnJvcicsIG1lc3NhZ2UpLCAuLi5hcmdzKTtcbiAgICB9XG4gIH1cblxuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zaG91bGRMb2coJ3dhcm4nKSkge1xuICAgICAgY29uc29sZS53YXJuKHRoaXMuZm9ybWF0TWVzc2FnZSgnd2FybicsIG1lc3NhZ2UpLCAuLi5hcmdzKTtcbiAgICB9XG4gIH1cblxuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zaG91bGRMb2coJ2luZm8nKSkge1xuICAgICAgY29uc29sZS5sb2codGhpcy5mb3JtYXRNZXNzYWdlKCdpbmZvJywgbWVzc2FnZSksIC4uLmFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zaG91bGRMb2coJ2RlYnVnJykpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuZm9ybWF0TWVzc2FnZSgnZGVidWcnLCBtZXNzYWdlKSwgLi4uYXJncyk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ3JlYXRlIGEgY2hpbGQgbG9nZ2VyIHdpdGggYSBzdWItbmFtZXNwYWNlXG4gIGNoaWxkKHN1Yk5hbWVzcGFjZTogc3RyaW5nLCBjb25maWc/OiBQYXJ0aWFsPExvZ2dlckNvbmZpZz4pOiBDb250ZW50TG9nZ2VyIHtcbiAgICByZXR1cm4gbmV3IENvbnRlbnRMb2dnZXIoe1xuICAgICAgLi4uY29uZmlnLFxuICAgICAgbmFtZXNwYWNlOiBgJHt0aGlzLm5hbWVzcGFjZX06JHtzdWJOYW1lc3BhY2V9YCxcbiAgICAgIGxldmVsOiBjb25maWc/LmxldmVsIHx8ICh0aGlzLmxldmVsID09PSAwID8gJ2Vycm9yJyA6IHRoaXMubGV2ZWwgPT09IDEgPyAnd2FybicgOiB0aGlzLmxldmVsID09PSAyID8gJ2luZm8nIDogJ2RlYnVnJyksXG4gICAgICBlbmFibGVkOiBjb25maWc/LmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5lbmFibGVkIDogdGhpcy5lbmFibGVkLFxuICAgIH0pO1xuICB9XG59XG5cbi8vIEV4cG9ydCBmYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBsb2dnZXJzXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9nZ2VyKG5hbWVzcGFjZTogc3RyaW5nLCBjb25maWc/OiBQYXJ0aWFsPExvZ2dlckNvbmZpZz4pOiBDb250ZW50TG9nZ2VyIHtcbiAgcmV0dXJuIG5ldyBDb250ZW50TG9nZ2VyKHsgLi4uY29uZmlnLCBuYW1lc3BhY2UgfSk7XG59XG5cbi8vIERlZmF1bHQgbG9nZ2VyIGluc3RhbmNlXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IENvbnRlbnRMb2dnZXIoeyBuYW1lc3BhY2U6ICdXaW5nbWFuJyB9KTsiLCJpbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi91dGlscy9sb2dnZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR1bm5lbFNlc3Npb24ge1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgdHVubmVsVXJsOiBzdHJpbmc7XG4gIHRhcmdldFBvcnQ6IG51bWJlcjtcbiAgc3RhdHVzOiAnY29ubmVjdGluZycgfCAnYWN0aXZlJyB8ICdlcnJvcic7XG59XG5cbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignVHVubmVsTWFuYWdlcicpO1xuXG5leHBvcnQgY2xhc3MgVHVubmVsTWFuYWdlciB7XG4gIHByaXZhdGUgd3M6IFdlYlNvY2tldCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGN1cnJlbnRUdW5uZWw6IFR1bm5lbFNlc3Npb24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWNvbm5lY3RBdHRlbXB0czogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSByZWFkb25seSBtYXhSZWNvbm5lY3RBdHRlbXB0czogbnVtYmVyID0gNTtcbiAgcHJpdmF0ZSByZWNvbm5lY3RUaW1lb3V0OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjdXJyZW50UmVsYXlVcmw6IHN0cmluZyA9ICcnO1xuICBwcml2YXRlIGlzTG9jYWxSZWxheTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIFR1bm5lbE1hbmFnZXIgd2lsbCBiZSB1c2VkIGJ5IHRoZSBtYWluIG1lc3NhZ2UgbGlzdGVuZXJcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVR1bm5lbCh0YXJnZXRQb3J0OiBudW1iZXIsIHJlbGF5VXJsPzogc3RyaW5nKTogUHJvbWlzZTxUdW5uZWxTZXNzaW9uPiB7XG4gICAgbG9nZ2VyLmluZm8oYFtUdW5uZWxNYW5hZ2VyXSBjcmVhdGVUdW5uZWwgY2FsbGVkIHdpdGggcG9ydDogJHt0YXJnZXRQb3J0fSwgcmVsYXk6ICR7cmVsYXlVcmx9YCk7XG4gICAgXG4gICAgLy8gVmFsaWRhdGUgcG9ydCBudW1iZXJcbiAgICBpZiAoIXRhcmdldFBvcnQgfHwgdGFyZ2V0UG9ydCA8PSAwIHx8IHRhcmdldFBvcnQgPiA2NTUzNSkge1xuICAgICAgY29uc3QgZXJyb3JNc2cgPSBgSW52YWxpZCBwb3J0IG51bWJlcjogJHt0YXJnZXRQb3J0fS4gUG9ydCBtdXN0IGJlIGJldHdlZW4gMSBhbmQgNjU1MzUuYDtcbiAgICAgIGxvZ2dlci5lcnJvcihgW1R1bm5lbE1hbmFnZXJdICR7ZXJyb3JNc2d9YCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuICAgIH1cbiAgICBcbiAgICB0cnkge1xuICAgICAgLy8gU3RvcCBleGlzdGluZyB0dW5uZWwgaWYgYW55XG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBTdG9wcGluZyBhbnkgZXhpc3RpbmcgdHVubmVsLi4uYCk7XG4gICAgICB0aGlzLnN0b3BUdW5uZWwoKTtcblxuICAgICAgbG9nZ2VyLmluZm8oYFtUdW5uZWxNYW5hZ2VyXSBDcmVhdGluZyB0dW5uZWwgZm9yIHBvcnQgJHt0YXJnZXRQb3J0fWApO1xuICAgICAgXG4gICAgICAvLyBVcGRhdGUgc3RhdHVzIHRvIGNvbm5lY3RpbmdcbiAgICAgIHRoaXMuY3VycmVudFR1bm5lbCA9IHtcbiAgICAgICAgc2Vzc2lvbklkOiAnJyxcbiAgICAgICAgdHVubmVsVXJsOiAnJyxcbiAgICAgICAgdGFyZ2V0UG9ydCxcbiAgICAgICAgc3RhdHVzOiAnY29ubmVjdGluZydcbiAgICAgIH07XG4gICAgICB0aGlzLnVwZGF0ZUJhZGdlKCk7XG5cbiAgICAgIC8vIERldGVybWluZSB3aGljaCBzZXJ2ZXIgdG8gdXNlXG4gICAgICBjb25zdCBiYXNlVXJsID0gcmVsYXlVcmwgfHwgJ2h0dHBzOi8vYXBpLndpbmdtYW51eC5jb20nO1xuICAgICAgY29uc3QgaXNMb2NhbFJlbGF5ID0gYmFzZVVybC5pbmNsdWRlcygnbG9jYWxob3N0JykgfHwgYmFzZVVybC5pbmNsdWRlcygnMTI3LjAuMC4xJyk7XG4gICAgICBcbiAgICAgIC8vIFN0b3JlIGZvciByZWNvbm5lY3Rpb25cbiAgICAgIHRoaXMuY3VycmVudFJlbGF5VXJsID0gYmFzZVVybDtcbiAgICAgIHRoaXMuaXNMb2NhbFJlbGF5ID0gaXNMb2NhbFJlbGF5O1xuICAgICAgXG4gICAgICAvLyBVc2UgdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwgZm9yIHR1bm5lbCBjcmVhdGlvblxuICAgICAgY29uc3QgYXBpVXJsID0gYCR7YmFzZVVybH0vdHVubmVsL2NyZWF0ZWA7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICB0YXJnZXRQb3J0LFxuICAgICAgICBlbmFibGVQMlA6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgbG9nZ2VyLmRlYnVnKGBbVHVubmVsTWFuYWdlcl0gVXNpbmcgJHtpc0xvY2FsUmVsYXkgPyAnTE9DQUwnIDogJ0VYVEVSTkFMJ30gcmVsYXlgKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgW1R1bm5lbE1hbmFnZXJdIFNlbmRpbmcgUE9TVCByZXF1ZXN0IHRvICR7YXBpVXJsfWApO1xuICAgICAgbG9nZ2VyLmRlYnVnKGBbVHVubmVsTWFuYWdlcl0gUmVxdWVzdCBib2R5OiAke3JlcXVlc3RCb2R5fWApO1xuICAgICAgXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogcmVxdWVzdEJvZHlcbiAgICAgIH0pO1xuXG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBSZXNwb25zZSBzdGF0dXM6ICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgICAgXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gQVBJIGVycm9yIHJlc3BvbnNlOiAke2Vycm9yVGV4dH1gKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIHR1bm5lbDogJHtlcnJvclRleHR9YCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBBUEkgcmVzcG9uc2UgZGF0YTpgLCBkYXRhKTtcbiAgICAgIFxuICAgICAgdGhpcy5jdXJyZW50VHVubmVsLnNlc3Npb25JZCA9IGRhdGEuc2Vzc2lvbklkO1xuICAgICAgdGhpcy5jdXJyZW50VHVubmVsLnR1bm5lbFVybCA9IGRhdGEudHVubmVsVXJsO1xuICAgICAgXG4gICAgICBsb2dnZXIuaW5mbyhgW1R1bm5lbE1hbmFnZXJdIFR1bm5lbCBjcmVhdGVkOiAke2RhdGEudHVubmVsVXJsfSAoc2Vzc2lvbjogJHtkYXRhLnNlc3Npb25JZH0pYCk7XG5cbiAgICAgIC8vIENvbm5lY3QgV2ViU29ja2V0IGZvciBkZXZlbG9wZXIgcmVnaXN0cmF0aW9uXG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBDb25uZWN0aW5nIFdlYlNvY2tldC4uLmApO1xuICAgICAgYXdhaXQgdGhpcy5jb25uZWN0V2ViU29ja2V0KGJhc2VVcmwsIGlzTG9jYWxSZWxheSk7XG4gICAgICBcbiAgICAgIC8vIFVwZGF0ZSBzdGF0dXMgdG8gYWN0aXZlXG4gICAgICB0aGlzLmN1cnJlbnRUdW5uZWwuc3RhdHVzID0gJ2FjdGl2ZSc7XG4gICAgICB0aGlzLnVwZGF0ZUJhZGdlKCk7XG4gICAgICBcbiAgICAgIGxvZ2dlci5pbmZvKGBbVHVubmVsTWFuYWdlcl0gVHVubmVsIHN1Y2Nlc3NmdWxseSBhY3RpdmF0ZWRgKTtcbiAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRUdW5uZWw7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gRmFpbGVkIHRvIGNyZWF0ZSB0dW5uZWw6YCwgZXJyb3IpO1xuICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gRXJyb3Igc3RhY2s6YCwgZXJyb3Iuc3RhY2spO1xuICAgICAgXG4gICAgICBpZiAodGhpcy5jdXJyZW50VHVubmVsKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFR1bm5lbC5zdGF0dXMgPSAnZXJyb3InO1xuICAgICAgICB0aGlzLnVwZGF0ZUJhZGdlKCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbm5lY3RXZWJTb2NrZXQocmVsYXlVcmw6IHN0cmluZywgaXNMb2NhbFJlbGF5OiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGlmICghdGhpcy5jdXJyZW50VHVubmVsKSB7XG4gICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKCdObyB0dW5uZWwgc2Vzc2lvbicpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoYFtUdW5uZWxNYW5hZ2VyXSBXZWJTb2NrZXQgY29ubmVjdCBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBVc2UgdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwgZm9yIFdlYlNvY2tldCBjb25uZWN0aW9uXG4gICAgICBjb25zdCB3c1VybCA9IHJlbGF5VXJsLnJlcGxhY2UoJ2h0dHA6Ly8nLCAnd3M6Ly8nKS5yZXBsYWNlKCdodHRwczovLycsICd3c3M6Ly8nKSArICcvd3MnO1xuICAgICAgXG4gICAgICBsb2dnZXIuaW5mbyhgW1R1bm5lbE1hbmFnZXJdIENvbm5lY3RpbmcgdG8gV2ViU29ja2V0IGF0ICR7d3NVcmx9Li4uICgke2lzTG9jYWxSZWxheSA/ICdMT0NBTCcgOiAnRVhURVJOQUwnfSlgKTtcbiAgICAgIFxuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy53cyA9IG5ldyBXZWJTb2NrZXQod3NVcmwpO1xuICAgICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBXZWJTb2NrZXQgb2JqZWN0IGNyZWF0ZWRgKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gRmFpbGVkIHRvIGNyZWF0ZSBXZWJTb2NrZXQ6YCwgZXJyb3IpO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gV2ViU29ja2V0IGNvbm5lY3Rpb24gdGltZW91dCBhZnRlciAxMCBzZWNvbmRzYCk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1dlYlNvY2tldCBjb25uZWN0aW9uIHRpbWVvdXQnKSk7XG4gICAgICB9LCAxMDAwMCk7XG5cbiAgICAgIHRoaXMud3Mub25vcGVuID0gKCkgPT4ge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBbVHVubmVsTWFuYWdlcl0gV2ViU29ja2V0IGNvbm5lY3RlZCBzdWNjZXNzZnVsbHlgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ2lzdGVyIGFzIGRldmVsb3BlclxuICAgICAgICBpZiAodGhpcy53cyAmJiB0aGlzLmN1cnJlbnRUdW5uZWwpIHtcbiAgICAgICAgICBjb25zdCByZWdpc3Rlck1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICB0eXBlOiAncmVnaXN0ZXInLFxuICAgICAgICAgICAgcm9sZTogJ2RldmVsb3BlcicsXG4gICAgICAgICAgICBzZXNzaW9uSWQ6IHRoaXMuY3VycmVudFR1bm5lbC5zZXNzaW9uSWRcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBTZW5kaW5nIHJlZ2lzdHJhdGlvbjogJHtyZWdpc3Rlck1lc3NhZ2V9YCk7XG4gICAgICAgICAgdGhpcy53cy5zZW5kKHJlZ2lzdGVyTWVzc2FnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBbVHVubmVsTWFuYWdlcl0gQ2Fubm90IHJlZ2lzdGVyIC0gV2ViU29ja2V0IG9yIHR1bm5lbCBtaXNzaW5nYCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHRoaXMud3Mub25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgW1R1bm5lbE1hbmFnZXJdIFdlYlNvY2tldCBtZXNzYWdlIHJlY2VpdmVkOiAke2V2ZW50LmRhdGF9YCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdyZWdpc3RlcmVkJyAmJiBtZXNzYWdlLnJvbGUgPT09ICdkZXZlbG9wZXInKSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgW1R1bm5lbE1hbmFnZXJdIFN1Y2Nlc3NmdWxseSByZWdpc3RlcmVkIGFzIGRldmVsb3BlcmApO1xuICAgICAgICAgICAgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA9IDA7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgW1R1bm5lbE1hbmFnZXJdIFdlYlNvY2tldCBlcnJvciBtZXNzYWdlOmAsIG1lc3NhZ2UuZXJyb3IpO1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtZXNzYWdlLmVycm9yKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdyZXF1ZXN0Jykge1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtUdW5uZWxNYW5hZ2VyXSBUdW5uZWwgcmVxdWVzdDogJHttZXNzYWdlLnJlcXVlc3Q/Lm1ldGhvZH0gJHttZXNzYWdlLnJlcXVlc3Q/LnBhdGh9YCk7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVR1bm5lbFJlcXVlc3QobWVzc2FnZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhgW1R1bm5lbE1hbmFnZXJdIFVuaGFuZGxlZCBtZXNzYWdlIHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFtUdW5uZWxNYW5hZ2VyXSBFcnJvciBwYXJzaW5nIFdlYlNvY2tldCBtZXNzYWdlOmAsIGVycm9yKTtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFtUdW5uZWxNYW5hZ2VyXSBSYXcgbWVzc2FnZTogJHtldmVudC5kYXRhfWApO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB0aGlzLndzLm9uZXJyb3IgPSAoZXJyb3IpID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoYFtUdW5uZWxNYW5hZ2VyXSBXZWJTb2NrZXQgZXJyb3IgZXZlbnQ6YCwgZXJyb3IpO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy53cy5vbmNsb3NlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBbVHVubmVsTWFuYWdlcl0gV2ViU29ja2V0IGNsb3NlZCAtIENvZGU6ICR7ZXZlbnQuY29kZX0sIFJlYXNvbjogJHtldmVudC5yZWFzb259YCk7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRUdW5uZWwgJiYgdGhpcy5jdXJyZW50VHVubmVsLnN0YXR1cyA9PT0gJ2FjdGl2ZScpIHtcbiAgICAgICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBXaWxsIGF0dGVtcHQgdG8gcmVjb25uZWN0Li4uYCk7XG4gICAgICAgICAgdGhpcy5zY2hlZHVsZVJlY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZSBpbmNvbWluZyB0dW5uZWwgcmVxdWVzdHMgYnkgZm9yd2FyZGluZyB0aGVtIHRvIGxvY2FsaG9zdFxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVUdW5uZWxSZXF1ZXN0KG1lc3NhZ2U6IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgcmVxdWVzdElkLCByZXF1ZXN0LCBzZXNzaW9uSWQgfSA9IG1lc3NhZ2U7XG4gICAgXG4gICAgaWYgKCF0aGlzLmN1cnJlbnRUdW5uZWwgfHwgIXRoaXMud3MpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignW1R1bm5lbE1hbmFnZXJdIENhbm5vdCBoYW5kbGUgcmVxdWVzdCAtIG5vIGFjdGl2ZSB0dW5uZWwgb3IgV2ViU29ja2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIHRyeSB7XG4gICAgICAvLyBCdWlsZCB0YXJnZXQgVVJMIGZvciB1c2VyJ3MgbG9jYWxob3N0XG4gICAgICBjb25zdCB0YXJnZXRVcmwgPSBgaHR0cDovL2xvY2FsaG9zdDoke3RoaXMuY3VycmVudFR1bm5lbC50YXJnZXRQb3J0fSR7cmVxdWVzdC5wYXRoIHx8ICcvJ31gO1xuICAgICAgbG9nZ2VyLmRlYnVnKGBbVHVubmVsTWFuYWdlcl0gRm9yd2FyZGluZyByZXF1ZXN0IHRvOiAke3RhcmdldFVybH1gKTtcbiAgICAgIFxuICAgICAgLy8gRmlsdGVyIG91dCBwcm9ibGVtYXRpYyBoZWFkZXJzIHRoYXQgQ2hyb21lIGV4dGVuc2lvbiBjYW4ndCBzZXRcbiAgICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICAgIGlmIChyZXF1ZXN0LmhlYWRlcnMpIHtcbiAgICAgICAgT2JqZWN0LmVudHJpZXMocmVxdWVzdC5oZWFkZXJzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICBjb25zdCBsb3dlcktleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIC8vIFNraXAgaGVhZGVycyB0aGF0IENocm9tZSBleHRlbnNpb25zIGNhbid0IHNldFxuICAgICAgICAgIGlmICghWydob3N0JywgJ2Nvbm5lY3Rpb24nLCAnY29udGVudC1sZW5ndGgnLCAnYWNjZXB0LWVuY29kaW5nJ10uaW5jbHVkZXMobG93ZXJLZXkpKSB7XG4gICAgICAgICAgICBoZWFkZXJzW2tleV0gPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gUHJlcGFyZSBmZXRjaCBvcHRpb25zXG4gICAgICBjb25zdCBmZXRjaE9wdGlvbnM6IFJlcXVlc3RJbml0ID0ge1xuICAgICAgICBtZXRob2Q6IHJlcXVlc3QubWV0aG9kIHx8ICdHRVQnLFxuICAgICAgICBoZWFkZXJzXG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBBZGQgYm9keSBmb3Igbm9uLUdFVCByZXF1ZXN0c1xuICAgICAgaWYgKHJlcXVlc3QuYm9keSAmJiByZXF1ZXN0Lm1ldGhvZCAhPT0gJ0dFVCcgJiYgcmVxdWVzdC5tZXRob2QgIT09ICdIRUFEJykge1xuICAgICAgICBmZXRjaE9wdGlvbnMuYm9keSA9IHR5cGVvZiByZXF1ZXN0LmJvZHkgPT09ICdzdHJpbmcnIFxuICAgICAgICAgID8gcmVxdWVzdC5ib2R5IFxuICAgICAgICAgIDogSlNPTi5zdHJpbmdpZnkocmVxdWVzdC5ib2R5KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gRm9yd2FyZCByZXF1ZXN0IHRvIGxvY2FsaG9zdFxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh0YXJnZXRVcmwsIGZldGNoT3B0aW9ucyk7XG4gICAgICBcbiAgICAgIC8vIEdldCByZXNwb25zZSBib2R5IGFzIGJpbmFyeSBkYXRhICh3b3JrcyBmb3IgYWxsIGNvbnRlbnQgdHlwZXMpXG4gICAgICBjb25zdCByZXNwb25zZUJvZHlCdWZmZXIgPSBhd2FpdCByZXNwb25zZS5hcnJheUJ1ZmZlcigpO1xuICAgICAgXG4gICAgICBsb2dnZXIuZGVidWcoYFtUdW5uZWxNYW5hZ2VyXSBSZXNwb25zZSBib2R5OiAke3Jlc3BvbnNlQm9keUJ1ZmZlci5ieXRlTGVuZ3RofSBieXRlcywgY29udGVudC10eXBlOiAke3Jlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSB8fCAndW5rbm93bid9YCk7XG4gICAgICBcbiAgICAgIC8vIENvbGxlY3QgcmVzcG9uc2UgaGVhZGVyc1xuICAgICAgY29uc3QgcmVzcG9uc2VIZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgICByZXNwb25zZS5oZWFkZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgcmVzcG9uc2VIZWFkZXJzW2tleV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBTZW5kIHJlc3BvbnNlIG1ldGFkYXRhIGFzIEpTT04gZmlyc3RcbiAgICAgIGNvbnN0IHJlc3BvbnNlTWV0YWRhdGEgPSB7XG4gICAgICAgIHR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHJlcXVlc3RJZCxcbiAgICAgICAgc2Vzc2lvbklkLFxuICAgICAgICByZXNwb25zZToge1xuICAgICAgICAgIHN0YXR1c0NvZGU6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgICAgICBoZWFkZXJzOiByZXNwb25zZUhlYWRlcnMsXG4gICAgICAgICAgYm9keUxlbmd0aDogcmVzcG9uc2VCb2R5QnVmZmVyLmJ5dGVMZW5ndGhcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgbG9nZ2VyLmRlYnVnKGBbVHVubmVsTWFuYWdlcl0gU2VuZGluZyBiaW5hcnkgcmVzcG9uc2UgZm9yIHJlcXVlc3QgJHtyZXF1ZXN0SWR9OiAke3Jlc3BvbnNlLnN0YXR1c30gKCR7cmVzcG9uc2VCb2R5QnVmZmVyLmJ5dGVMZW5ndGh9IGJ5dGVzKWApO1xuICAgICAgXG4gICAgICAvLyBTZW5kIG1ldGFkYXRhIGZpcnN0XG4gICAgICB0aGlzLndzLnNlbmQoSlNPTi5zdHJpbmdpZnkocmVzcG9uc2VNZXRhZGF0YSkpO1xuICAgICAgXG4gICAgICAvLyBTZW5kIHJlc3BvbnNlIGJvZHkgYXMgYmluYXJ5IFdlYlNvY2tldCBmcmFtZVxuICAgICAgaWYgKHJlc3BvbnNlQm9keUJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLndzLnNlbmQocmVzcG9uc2VCb2R5QnVmZmVyKTtcbiAgICAgIH1cbiAgICAgIFxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgW1R1bm5lbE1hbmFnZXJdIEVycm9yIGZvcndhcmRpbmcgcmVxdWVzdDpgLCBlcnJvcik7XG4gICAgICBcbiAgICAgIC8vIFNlbmQgZXJyb3IgcmVzcG9uc2UgYmFjayB0aHJvdWdoIFdlYlNvY2tldCB1c2luZyBuZXcgYmluYXJ5IGZvcm1hdFxuICAgICAgY29uc3QgZXJyb3JCb2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBmb3J3YXJkIHJlcXVlc3QnLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICB0YXJnZXRQb3J0OiB0aGlzLmN1cnJlbnRUdW5uZWw/LnRhcmdldFBvcnRcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBjb25zdCBlcnJvckJvZHlCdWZmZXIgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoZXJyb3JCb2R5KTtcbiAgICAgIFxuICAgICAgY29uc3QgZXJyb3JNZXRhZGF0YSA9IHtcbiAgICAgICAgdHlwZTogJ3Jlc3BvbnNlJyxcbiAgICAgICAgcmVxdWVzdElkLFxuICAgICAgICBzZXNzaW9uSWQsXG4gICAgICAgIHJlc3BvbnNlOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogNTAyLFxuICAgICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgICAgIGJvZHlMZW5ndGg6IGVycm9yQm9keUJ1ZmZlci5ieXRlTGVuZ3RoXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBcbiAgICAgIHRoaXMud3Muc2VuZChKU09OLnN0cmluZ2lmeShlcnJvck1ldGFkYXRhKSk7XG4gICAgICB0aGlzLndzLnNlbmQoZXJyb3JCb2R5QnVmZmVyKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlUmVjb25uZWN0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJlY29ubmVjdEF0dGVtcHRzID49IHRoaXMubWF4UmVjb25uZWN0QXR0ZW1wdHMpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignTWF4IHJlY29ubmVjdCBhdHRlbXB0cyByZWFjaGVkJyk7XG4gICAgICBpZiAodGhpcy5jdXJyZW50VHVubmVsKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFR1bm5lbC5zdGF0dXMgPSAnZXJyb3InO1xuICAgICAgICB0aGlzLnVwZGF0ZUJhZGdlKCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGVsYXkgPSBNYXRoLm1pbigxMDAwICogTWF0aC5wb3coMiwgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyksIDEwMDAwKTtcbiAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzKys7XG4gICAgXG4gICAgbG9nZ2VyLmluZm8oYFNjaGVkdWxpbmcgcmVjb25uZWN0IGF0dGVtcHQgJHt0aGlzLnJlY29ubmVjdEF0dGVtcHRzfSBpbiAke2RlbGF5fW1zYCk7XG4gICAgXG4gICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuY3VycmVudFR1bm5lbCkge1xuICAgICAgICB0aGlzLmNvbm5lY3RXZWJTb2NrZXQodGhpcy5jdXJyZW50UmVsYXlVcmwsIHRoaXMuaXNMb2NhbFJlbGF5KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdSZWNvbm5lY3QgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICB0aGlzLnNjaGVkdWxlUmVjb25uZWN0KCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIGRlbGF5KTtcbiAgfVxuXG4gIHN0b3BUdW5uZWwoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucmVjb25uZWN0VGltZW91dCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVjb25uZWN0VGltZW91dCk7XG4gICAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXQgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICh0aGlzLndzKSB7XG4gICAgICB0aGlzLndzLmNsb3NlKCk7XG4gICAgICB0aGlzLndzID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRUdW5uZWwgPSBudWxsO1xuICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICAgIHRoaXMudXBkYXRlQmFkZ2UoKTtcbiAgICBcbiAgICBsb2dnZXIuaW5mbygnVHVubmVsIHN0b3BwZWQnKTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlQmFkZ2UoKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdHVzID0gdGhpcy5jdXJyZW50VHVubmVsPy5zdGF0dXMgfHwgJ2luYWN0aXZlJztcbiAgICBjb25zdCBiYWRnZUNvbmZpZyA9IHtcbiAgICAgIGluYWN0aXZlOiB7IHRleHQ6ICcnLCBjb2xvcjogJyM4QjVDRjYnIH0sXG4gICAgICBjb25uZWN0aW5nOiB7IHRleHQ6ICfil48nLCBjb2xvcjogJyNGNTlFMEInIH0sXG4gICAgICBhY3RpdmU6IHsgdGV4dDogJ+KXjycsIGNvbG9yOiAnIzEwQjk4MScgfSxcbiAgICAgIGVycm9yOiB7IHRleHQ6ICfil48nLCBjb2xvcjogJyNFRjQ0NDQnIH1cbiAgICB9O1xuXG4gICAgY29uc3QgY29uZmlnID0gYmFkZ2VDb25maWdbc3RhdHVzXTtcbiAgICBjaHJvbWUuYWN0aW9uLnNldEJhZGdlVGV4dCh7IHRleHQ6IGNvbmZpZy50ZXh0IH0pO1xuICAgIGNocm9tZS5hY3Rpb24uc2V0QmFkZ2VCYWNrZ3JvdW5kQ29sb3IoeyBjb2xvcjogY29uZmlnLmNvbG9yIH0pO1xuICB9XG5cbiAgZ2V0Q3VycmVudFR1bm5lbCgpOiBUdW5uZWxTZXNzaW9uIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFR1bm5lbDtcbiAgfVxufSIsIi8qKlxuICogQ2VudHJhbGl6ZWQgbG9nZ2VyIHV0aWxpdHkgZm9yIFdpbmdtYW5cbiAqXG4gKiBQcm92aWRlcyBlbnZpcm9ubWVudC1hd2FyZSBsb2dnaW5nIHdpdGggbmFtZXNwYWNlIHN1cHBvcnQgYW5kIGxvZyBsZXZlbHMuXG4gKiBJbiBwcm9kdWN0aW9uLCBvbmx5IGVycm9ycyBhcmUgbG9nZ2VkIGJ5IGRlZmF1bHQgdG8ga2VlcCB0aGUgY29uc29sZSBjbGVhbi5cbiAqIEluIGRldmVsb3BtZW50LCBhbGwgbG9nIGxldmVscyBhcmUgZW5hYmxlZCBmb3IgZGVidWdnaW5nLlxuICovXG4vLyBMb2cgbGV2ZWwgcHJpb3JpdHkgKGhpZ2hlciBudW1iZXIgPSBtb3JlIHZlcmJvc2UpXG5jb25zdCBMT0dfTEVWRUxTID0ge1xuICAgIGVycm9yOiAwLFxuICAgIHdhcm46IDEsXG4gICAgaW5mbzogMixcbiAgICBkZWJ1ZzogMyxcbn07XG4vLyBEZXRlY3QgZW52aXJvbm1lbnQgZnJvbSB2YXJpb3VzIHNvdXJjZXNcbmZ1bmN0aW9uIGRldGVjdEVudmlyb25tZW50KCkge1xuICAgIC8vIEJyb3dzZXIgZW52aXJvbm1lbnRcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGluamVjdGVkIGNvbmZpZyAoQ2hyb21lIEV4dGVuc2lvbilcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cuX19XSU5HTUFOX0NPTkZJR19fICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy5fX1dJTkdNQU5fQ09ORklHX18uZW52aXJvbm1lbnQgfHwgJ3Byb2R1Y3Rpb24nO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIE5vZGUuanMgZW52aXJvbm1lbnRcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW52KSB7XG4gICAgICAgIHJldHVybiBwcm9jZXNzLmVudi5XSU5HTUFOX0VOViB8fCBwcm9jZXNzLmVudi5OT0RFX0VOViB8fCAncHJvZHVjdGlvbic7XG4gICAgfVxuICAgIHJldHVybiAncHJvZHVjdGlvbic7XG59XG4vLyBHZXQgbG9nIGxldmVsIGZyb20gZW52aXJvbm1lbnRcbmZ1bmN0aW9uIGdldERlZmF1bHRMb2dMZXZlbCgpIHtcbiAgICBjb25zdCBlbnYgPSBkZXRlY3RFbnZpcm9ubWVudCgpO1xuICAgIC8vIENoZWNrIGZvciBleHBsaWNpdCBsb2cgbGV2ZWwgb3ZlcnJpZGVcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW52Py5MT0dfTEVWRUwpIHtcbiAgICAgICAgcmV0dXJuIHByb2Nlc3MuZW52LkxPR19MRVZFTDtcbiAgICB9XG4gICAgLy8gRW52aXJvbm1lbnQtYmFzZWQgZGVmYXVsdHNcbiAgICBzd2l0Y2ggKGVudikge1xuICAgICAgICBjYXNlICdkZXZlbG9wbWVudCc6XG4gICAgICAgICAgICByZXR1cm4gJ2RlYnVnJztcbiAgICAgICAgY2FzZSAnc3RhZ2luZyc6XG4gICAgICAgIGNhc2UgJ3Rlc3QnOlxuICAgICAgICAgICAgcmV0dXJuICdpbmZvJztcbiAgICAgICAgY2FzZSAncHJvZHVjdGlvbic6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gJ2Vycm9yJztcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgV2luZ21hbkxvZ2dlciB7XG4gICAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICAgICAgdGhpcy5uYW1lc3BhY2UgPSBjb25maWcubmFtZXNwYWNlIHx8ICdXaW5nbWFuJztcbiAgICAgICAgdGhpcy5lbmFibGVkID0gY29uZmlnLmVuYWJsZWQgIT09IGZhbHNlO1xuICAgICAgICB0aGlzLmVudmlyb25tZW50ID0gY29uZmlnLmZvcmNlRW52aXJvbm1lbnQgfHwgZGV0ZWN0RW52aXJvbm1lbnQoKTtcbiAgICAgICAgY29uc3QgbG9nTGV2ZWwgPSBjb25maWcubGV2ZWwgfHwgZ2V0RGVmYXVsdExvZ0xldmVsKCk7XG4gICAgICAgIHRoaXMubGV2ZWwgPSBMT0dfTEVWRUxTW2xvZ0xldmVsXTtcbiAgICB9XG4gICAgc2hvdWxkTG9nKGxldmVsKSB7XG4gICAgICAgIGlmICghdGhpcy5lbmFibGVkKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gTE9HX0xFVkVMU1tsZXZlbF0gPD0gdGhpcy5sZXZlbDtcbiAgICB9XG4gICAgZm9ybWF0TWVzc2FnZShsZXZlbCwgbWVzc2FnZSkge1xuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIGNvbnN0IHByZWZpeCA9IGBbJHt0aGlzLm5hbWVzcGFjZX1dYDtcbiAgICAgICAgLy8gSW4gZGV2ZWxvcG1lbnQsIGluY2x1ZGUgdGltZXN0YW1wIGFuZCBsZXZlbFxuICAgICAgICBpZiAodGhpcy5lbnZpcm9ubWVudCA9PT0gJ2RldmVsb3BtZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIGAke3RpbWVzdGFtcH0gJHtwcmVmaXh9IFske2xldmVsLnRvVXBwZXJDYXNlKCl9XSAke21lc3NhZ2V9YDtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbiBwcm9kdWN0aW9uLCBrZWVwIGl0IHNpbXBsZVxuICAgICAgICByZXR1cm4gYCR7cHJlZml4fSAke21lc3NhZ2V9YDtcbiAgICB9XG4gICAgZXJyb3IobWVzc2FnZSwgLi4uYXJncykge1xuICAgICAgICBpZiAodGhpcy5zaG91bGRMb2coJ2Vycm9yJykpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy5mb3JtYXRNZXNzYWdlKCdlcnJvcicsIG1lc3NhZ2UpLCAuLi5hcmdzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB3YXJuKG1lc3NhZ2UsIC4uLmFyZ3MpIHtcbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkTG9nKCd3YXJuJykpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybih0aGlzLmZvcm1hdE1lc3NhZ2UoJ3dhcm4nLCBtZXNzYWdlKSwgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaW5mbyhtZXNzYWdlLCAuLi5hcmdzKSB7XG4gICAgICAgIGlmICh0aGlzLnNob3VsZExvZygnaW5mbycpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmZvcm1hdE1lc3NhZ2UoJ2luZm8nLCBtZXNzYWdlKSwgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVidWcobWVzc2FnZSwgLi4uYXJncykge1xuICAgICAgICBpZiAodGhpcy5zaG91bGRMb2coJ2RlYnVnJykpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZm9ybWF0TWVzc2FnZSgnZGVidWcnLCBtZXNzYWdlKSwgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ3JlYXRlIGEgY2hpbGQgbG9nZ2VyIHdpdGggYSBzdWItbmFtZXNwYWNlXG4gICAgY2hpbGQoc3ViTmFtZXNwYWNlLCBjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXaW5nbWFuTG9nZ2VyKHtcbiAgICAgICAgICAgIC4uLmNvbmZpZyxcbiAgICAgICAgICAgIG5hbWVzcGFjZTogYCR7dGhpcy5uYW1lc3BhY2V9OiR7c3ViTmFtZXNwYWNlfWAsXG4gICAgICAgICAgICBsZXZlbDogY29uZmlnPy5sZXZlbCB8fCAodGhpcy5sZXZlbCA9PT0gMCA/ICdlcnJvcicgOiB0aGlzLmxldmVsID09PSAxID8gJ3dhcm4nIDogdGhpcy5sZXZlbCA9PT0gMiA/ICdpbmZvJyA6ICdkZWJ1ZycpLFxuICAgICAgICAgICAgZW5hYmxlZDogY29uZmlnPy5lbmFibGVkICE9PSB1bmRlZmluZWQgPyBjb25maWcuZW5hYmxlZCA6IHRoaXMuZW5hYmxlZCxcbiAgICAgICAgICAgIGZvcmNlRW52aXJvbm1lbnQ6IHRoaXMuZW52aXJvbm1lbnQsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBVcGRhdGUgbG9nIGxldmVsIGF0IHJ1bnRpbWVcbiAgICBzZXRMZXZlbChsZXZlbCkge1xuICAgICAgICB0aGlzLmxldmVsID0gTE9HX0xFVkVMU1tsZXZlbF07XG4gICAgfVxuICAgIC8vIEVuYWJsZS9kaXNhYmxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgIHNldEVuYWJsZWQoZW5hYmxlZCkge1xuICAgICAgICB0aGlzLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgIH1cbiAgICAvLyBHZXQgY3VycmVudCBjb25maWd1cmF0aW9uXG4gICAgZ2V0Q29uZmlnKCkge1xuICAgICAgICBjb25zdCBsZXZlbE5hbWUgPSBPYmplY3QuZW50cmllcyhMT0dfTEVWRUxTKS5maW5kKChbXywgdmFsdWVdKSA9PiB2YWx1ZSA9PT0gdGhpcy5sZXZlbCk/LlswXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxldmVsOiBsZXZlbE5hbWUsXG4gICAgICAgICAgICBuYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlLFxuICAgICAgICAgICAgZW5hYmxlZDogdGhpcy5lbmFibGVkLFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHRoaXMuZW52aXJvbm1lbnQsXG4gICAgICAgIH07XG4gICAgfVxufVxuLy8gRGVmYXVsdCBsb2dnZXIgaW5zdGFuY2VzIGZvciBjb21tb24gdXNlIGNhc2VzXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IFdpbmdtYW5Mb2dnZXIoKTtcbi8vIENvbnZlbmllbmNlIGZ1bmN0aW9ucyBmb3IgcXVpY2sgbG9nZ2luZ1xuZXhwb3J0IGNvbnN0IGxvZ0Vycm9yID0gKG1lc3NhZ2UsIC4uLmFyZ3MpID0+IGxvZ2dlci5lcnJvcihtZXNzYWdlLCAuLi5hcmdzKTtcbmV4cG9ydCBjb25zdCBsb2dXYXJuID0gKG1lc3NhZ2UsIC4uLmFyZ3MpID0+IGxvZ2dlci53YXJuKG1lc3NhZ2UsIC4uLmFyZ3MpO1xuZXhwb3J0IGNvbnN0IGxvZ0luZm8gPSAobWVzc2FnZSwgLi4uYXJncykgPT4gbG9nZ2VyLmluZm8obWVzc2FnZSwgLi4uYXJncyk7XG5leHBvcnQgY29uc3QgbG9nRGVidWcgPSAobWVzc2FnZSwgLi4uYXJncykgPT4gbG9nZ2VyLmRlYnVnKG1lc3NhZ2UsIC4uLmFyZ3MpO1xuLy8gRXhwb3J0IGEgZnVuY3Rpb24gdG8gY3JlYXRlIG5hbWVzcGFjZS1zcGVjaWZpYyBsb2dnZXJzXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9nZ2VyKG5hbWVzcGFjZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIG5ldyBXaW5nbWFuTG9nZ2VyKHsgLi4uY29uZmlnLCBuYW1lc3BhY2UgfSk7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1sb2dnZXIuanMubWFwIiwiLyoqXG4gKiBUdW5uZWwgUHJvdG9jb2wgU3BlY2lmaWNhdGlvblxuICpcbiAqIERlZmluZXMgdGhlIFdlYlNvY2tldC1iYXNlZCBIVFRQIHR1bm5lbGluZyBwcm90b2NvbCBiZXR3ZWVuIHNlcnZlciBhbmQgQ2hyb21lIGV4dGVuc2lvblxuICogQmFzZWQgb24gcmVzZWFyY2ggb2Ygbmdyb2ssIGxvY2FsdHVubmVsLCBhbmQgb3RoZXIgcHJvdmVuIHR1bm5lbGluZyBzb2x1dGlvbnNcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUFJPVE9DT0xfQ09ORklHID0ge1xuICAgIHJlcXVlc3RUaW1lb3V0TXM6IDMwMDAwLCAvLyAzMCBzZWNvbmRzXG4gICAgaGVhcnRiZWF0SW50ZXJ2YWxNczogMzAwMDAsIC8vIDMwIHNlY29uZHNcbiAgICBtYXhDb25jdXJyZW50UmVxdWVzdHM6IDUwLCAvLyA1MCBzaW11bHRhbmVvdXMgcmVxdWVzdHNcbiAgICBtYXhSZXF1ZXN0Qm9keVNpemU6IDEwICogMTAyNCAqIDEwMjQsIC8vIDEwTUJcbiAgICBjb21wcmVzc2lvbkVuYWJsZWQ6IHRydWVcbn07XG4vLyBQcm90b2NvbCBlcnJvciBjb2Rlc1xuZXhwb3J0IHZhciBQcm90b2NvbEVycm9yQ29kZTtcbihmdW5jdGlvbiAoUHJvdG9jb2xFcnJvckNvZGUpIHtcbiAgICBQcm90b2NvbEVycm9yQ29kZVtcIklOVkFMSURfTUVTU0FHRVwiXSA9IFwiSU5WQUxJRF9NRVNTQUdFXCI7XG4gICAgUHJvdG9jb2xFcnJvckNvZGVbXCJVTktOT1dOX1NFU1NJT05cIl0gPSBcIlVOS05PV05fU0VTU0lPTlwiO1xuICAgIFByb3RvY29sRXJyb3JDb2RlW1wiUkVRVUVTVF9USU1FT1VUXCJdID0gXCJSRVFVRVNUX1RJTUVPVVRcIjtcbiAgICBQcm90b2NvbEVycm9yQ29kZVtcIlJFUVVFU1RfVE9PX0xBUkdFXCJdID0gXCJSRVFVRVNUX1RPT19MQVJHRVwiO1xuICAgIFByb3RvY29sRXJyb3JDb2RlW1wiVE9PX01BTllfUkVRVUVTVFNcIl0gPSBcIlRPT19NQU5ZX1JFUVVFU1RTXCI7XG4gICAgUHJvdG9jb2xFcnJvckNvZGVbXCJDT05ORUNUSU9OX0ZBSUxFRFwiXSA9IFwiQ09OTkVDVElPTl9GQUlMRURcIjtcbiAgICBQcm90b2NvbEVycm9yQ29kZVtcIlRVTk5FTF9OT1RfRk9VTkRcIl0gPSBcIlRVTk5FTF9OT1RfRk9VTkRcIjtcbiAgICBQcm90b2NvbEVycm9yQ29kZVtcIlBFUk1JU1NJT05fREVOSUVEXCJdID0gXCJQRVJNSVNTSU9OX0RFTklFRFwiO1xufSkoUHJvdG9jb2xFcnJvckNvZGUgfHwgKFByb3RvY29sRXJyb3JDb2RlID0ge30pKTtcbi8vIFV0aWxpdHkgZnVuY3Rpb25zIGZvciBwcm90b2NvbCBoYW5kbGluZ1xuZXhwb3J0IGNsYXNzIFByb3RvY29sVXRpbHMge1xuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHVuaXF1ZSByZXF1ZXN0IElEXG4gICAgICovXG4gICAgc3RhdGljIGdlbmVyYXRlUmVxdWVzdElkKCkge1xuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgICAgICBjb25zdCByYW5kb20gPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgICAgIHJldHVybiBgcmVxXyR7dGltZXN0YW1wfV8ke3JhbmRvbX1gO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBtZXNzYWdlIHN0cnVjdHVyZVxuICAgICAqL1xuICAgIHN0YXRpYyB2YWxpZGF0ZU1lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgdHlwZW9mIG1lc3NhZ2UgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtZXNzYWdlLnR5cGUgfHwgdHlwZW9mIG1lc3NhZ2UudHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBWYWxpZGF0ZSBzcGVjaWZpYyBtZXNzYWdlIHR5cGVzXG4gICAgICAgIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdyZXF1ZXN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gISEobWVzc2FnZS5pZCAmJiBtZXNzYWdlLnNlc3Npb25JZCAmJiBtZXNzYWdlLm1ldGhvZCAmJiBtZXNzYWdlLnVybCk7XG4gICAgICAgICAgICBjYXNlICdyZXNwb25zZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhKG1lc3NhZ2UuaWQgJiYgbWVzc2FnZS5zZXNzaW9uSWQgJiYgdHlwZW9mIG1lc3NhZ2Uuc3RhdHVzID09PSAnbnVtYmVyJyk7XG4gICAgICAgICAgICBjYXNlICdyZWdpc3Rlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhKG1lc3NhZ2Uuc2Vzc2lvbklkICYmIG1lc3NhZ2Uucm9sZSk7XG4gICAgICAgICAgICBjYXNlICdyZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gISEobWVzc2FnZS5zZXNzaW9uSWQgJiYgbWVzc2FnZS5yb2xlKTtcbiAgICAgICAgICAgIGNhc2UgJ2hlYXJ0YmVhdCc6XG4gICAgICAgICAgICBjYXNlICdwb25nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gISFtZXNzYWdlLnNlc3Npb25JZDtcbiAgICAgICAgICAgIGNhc2UgJ2Rpc2Nvbm5lY3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiAhIW1lc3NhZ2Uuc2Vzc2lvbklkO1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIHJldHVybiAhIW1lc3NhZ2UubWVzc2FnZTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBlcnJvciBtZXNzYWdlXG4gICAgICovXG4gICAgc3RhdGljIGNyZWF0ZUVycm9yKGNvZGUsIG1lc3NhZ2UsIHNlc3Npb25JZCwgZGV0YWlscykge1xuICAgICAgICBjb25zdCBlcnJvciA9IHtcbiAgICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuICAgICAgICBpZiAoc2Vzc2lvbklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGVycm9yLnNlc3Npb25JZCA9IHNlc3Npb25JZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGV0YWlscyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlcnJvci5kZXRhaWxzID0gZGV0YWlscztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGNvbnRlbnQgc2hvdWxkIGJlIGJhc2U2NCBlbmNvZGVkXG4gICAgICovXG4gICAgc3RhdGljIHNob3VsZEJhc2U2NEVuY29kZShjb250ZW50VHlwZSkge1xuICAgICAgICBjb25zdCB0ZXh0VHlwZXMgPSBbXG4gICAgICAgICAgICAndGV4dC8nLFxuICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL3htbCcsXG4gICAgICAgICAgICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xuICAgICAgICBdO1xuICAgICAgICAvLyBJZiBpdCdzIGEga25vd24gdGV4dCB0eXBlLCBkb24ndCBiYXNlNjQgZW5jb2RlXG4gICAgICAgIGNvbnN0IGlzVGV4dFR5cGUgPSB0ZXh0VHlwZXMuc29tZSh0eXBlID0+IGNvbnRlbnRUeXBlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModHlwZSkpO1xuICAgICAgICByZXR1cm4gIWlzVGV4dFR5cGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuY29kZSBjb250ZW50IGZvciB0cmFuc21pc3Npb25cbiAgICAgKi9cbiAgICBzdGF0aWMgZW5jb2RlQ29udGVudChjb250ZW50LCBjb250ZW50VHlwZSA9ICcnKSB7XG4gICAgICAgIGNvbnN0IHNob3VsZEVuY29kZSA9IHRoaXMuc2hvdWxkQmFzZTY0RW5jb2RlKGNvbnRlbnRUeXBlKTtcbiAgICAgICAgaWYgKHNob3VsZEVuY29kZSkge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmlzQnVmZmVyKGNvbnRlbnQpID8gY29udGVudCA6IEJ1ZmZlci5mcm9tKGNvbnRlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBib2R5OiBidWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpLFxuICAgICAgICAgICAgICAgIGlzQmFzZTY0OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBib2R5OiBjb250ZW50LnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgaXNCYXNlNjQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlY29kZSBjb250ZW50IGZyb20gdHJhbnNtaXNzaW9uXG4gICAgICovXG4gICAgc3RhdGljIGRlY29kZUNvbnRlbnQoYm9keSwgaXNCYXNlNjQpIHtcbiAgICAgICAgaWYgKGlzQmFzZTY0KSB7XG4gICAgICAgICAgICByZXR1cm4gQnVmZmVyLmZyb20oYm9keSwgJ2Jhc2U2NCcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIEJ1ZmZlci5mcm9tKGJvZHksICd1dGY4Jyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgSFRUUCBoZWFkZXJzIGZvciB0cmFuc21pc3Npb25cbiAgICAgKi9cbiAgICBzdGF0aWMgc2FuaXRpemVIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICAgICAgY29uc3Qgc2FuaXRpemVkID0ge307XG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGhlYWRlcnMpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgLy8gU2tpcCBwcm9ibGVtYXRpYyBoZWFkZXJzXG4gICAgICAgICAgICBjb25zdCBsb3dlcktleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKFsnaG9zdCcsICdjb25uZWN0aW9uJywgJ3VwZ3JhZGUnLCAnc2VjLXdlYnNvY2tldC1rZXknXS5pbmNsdWRlcyhsb3dlcktleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBDb252ZXJ0IGFycmF5IHZhbHVlcyB0byBjb21tYS1zZXBhcmF0ZWQgc3RyaW5nc1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgc2FuaXRpemVkW2tleV0gPSB2YWx1ZS5qb2luKCcsICcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc2FuaXRpemVkW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzYW5pdGl6ZWQ7XG4gICAgfVxufVxuLy8gVHlwZSBndWFyZHMgZm9yIG1lc3NhZ2UgdHlwZXNcbmV4cG9ydCBjb25zdCBpc1JlcXVlc3QgPSAobWVzc2FnZSkgPT4gbWVzc2FnZS50eXBlID09PSAncmVxdWVzdCc7XG5leHBvcnQgY29uc3QgaXNSZXNwb25zZSA9IChtZXNzYWdlKSA9PiBtZXNzYWdlLnR5cGUgPT09ICdyZXNwb25zZSc7XG5leHBvcnQgY29uc3QgaXNSZWdpc3RlciA9IChtZXNzYWdlKSA9PiBtZXNzYWdlLnR5cGUgPT09ICdyZWdpc3Rlcic7XG5leHBvcnQgY29uc3QgaXNSZWdpc3RlcmVkID0gKG1lc3NhZ2UpID0+IG1lc3NhZ2UudHlwZSA9PT0gJ3JlZ2lzdGVyZWQnO1xuZXhwb3J0IGNvbnN0IGlzRXJyb3IgPSAobWVzc2FnZSkgPT4gbWVzc2FnZS50eXBlID09PSAnZXJyb3InO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dHVubmVsLXByb3RvY29sLmpzLm1hcCIsIi8qKlxuICogU2ltcGxlIHRlbXBsYXRlIGVuZ2luZSBmb3IgcmVuZGVyaW5nIGFubm90YXRpb24gdGVtcGxhdGVzXG4gKiBUaGlzIGlzIGEgbGlnaHR3ZWlnaHQgaW1wbGVtZW50YXRpb24gdGhhdCB3aWxsIGJlIGVuaGFuY2VkIHdpdGhcbiAqIGEgcHJvcGVyIHRlbXBsYXRlIGxpYnJhcnkgKGxpa2UgSGFuZGxlYmFycykgaW4gdGhlIGZ1dHVyZVxuICovXG4vKipcbiAqIEdldCBhIHZhbHVlIGZyb20gYW4gb2JqZWN0IHVzaW5nIGEgZG90LW5vdGF0aW9uIHBhdGhcbiAqL1xuZnVuY3Rpb24gZ2V0VmFsdWVCeVBhdGgob2JqLCBwYXRoKSB7XG4gICAgaWYgKCFvYmogfHwgIXBhdGgpXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY29uc3Qga2V5cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICBsZXQgY3VycmVudCA9IG9iajtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAgIGlmIChjdXJyZW50ID09IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICBjdXJyZW50ID0gY3VycmVudFtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY3VycmVudDtcbn1cbi8qKlxuICogU2ltcGxlIHRlbXBsYXRlIGVuZ2luZSBpbXBsZW1lbnRhdGlvblxuICogTm90ZTogVGhpcyBpcyBhIGJhc2ljIGltcGxlbWVudGF0aW9uLiBJbiBwcm9kdWN0aW9uLCB3ZSdsbCB1c2VcbiAqIGEgcHJvcGVyIHRlbXBsYXRlIGxpYnJhcnkgbGlrZSBIYW5kbGViYXJzIGZvciBmdWxsIGZ1bmN0aW9uYWxpdHlcbiAqL1xuZXhwb3J0IGNsYXNzIFNpbXBsZVRlbXBsYXRlRW5naW5lIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMudHJ1bmNhdGlvbkNvbmZpZyA9IG9wdGlvbnM/LnRydW5jYXRpb25Db25maWc7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlbmRlciBhbiBhbm5vdGF0aW9uIHVzaW5nIGEgdGVtcGxhdGVcbiAgICAgKi9cbiAgICByZW5kZXIoYW5ub3RhdGlvbiwgdGVtcGxhdGUsIGNvbnRleHQpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHRlbXBsYXRlLnRlbXBsYXRlO1xuICAgICAgICAvLyBQcm9jZXNzIHZhcmlhYmxlc1xuICAgICAgICBmb3IgKGNvbnN0IHZhcmlhYmxlIG9mIHRlbXBsYXRlLnZhcmlhYmxlcykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY29udGV4dCBoYXMgYW4gb3ZlcnJpZGUgZm9yIHRoaXMgdmFyaWFibGVcbiAgICAgICAgICAgIGxldCBmb3JtYXR0ZWRWYWx1ZTtcbiAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIHNjcmVlbnNob3RVcmwgLSBBTFdBWVMgdXNlIGNvbnRleHQgb3ZlcnJpZGUgaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKHZhcmlhYmxlLmtleSA9PT0gJ3NjcmVlbnNob3RVcmwnICYmIGNvbnRleHQgJiYgJ3NjcmVlbnNob3RVcmwnIGluIGNvbnRleHQgJiYgY29udGV4dC5zY3JlZW5zaG90VXJsKSB7XG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkVmFsdWUgPSBjb250ZXh0LnNjcmVlbnNob3RVcmwudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNvbnRleHQgJiYgdmFyaWFibGUua2V5IGluIGNvbnRleHQgJiYgY29udGV4dFt2YXJpYWJsZS5rZXldICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgb3ZlcnJpZGUgZnJvbSBjb250ZXh0IGZvciBvdGhlciB2YXJpYWJsZXNcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRWYWx1ZSA9IGNvbnRleHRbdmFyaWFibGUua2V5XT8udG9TdHJpbmcoKSB8fCAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vcm1hbCBwcm9jZXNzaW5nXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmdldFZhbHVlKGFubm90YXRpb24sIHZhcmlhYmxlLnBhdGgpO1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFZhbHVlID0gdmFyaWFibGUuZm9ybWF0dGVyXG4gICAgICAgICAgICAgICAgICAgID8gdmFyaWFibGUuZm9ybWF0dGVyKHZhbHVlLCBjb250ZXh0KVxuICAgICAgICAgICAgICAgICAgICA6IHZhbHVlPy50b1N0cmluZygpIHx8IHZhcmlhYmxlLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNpbXBsZSByZXBsYWNlbWVudCBmb3Igbm93ICh3aWxsIGJlIGVuaGFuY2VkIHdpdGggSGFuZGxlYmFycylcbiAgICAgICAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYHt7JHt2YXJpYWJsZS5rZXl9fX1gO1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UobmV3IFJlZ0V4cChwbGFjZWhvbGRlciwgJ2cnKSwgZm9ybWF0dGVkVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEhhbmRsZSBuZXN0ZWQgcHJvcGVydHkgYWNjZXNzIChlLmcuLCB7e3RhcmdldFJlY3Qud2lkdGh9fSlcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzTmVzdGVkUHJvcGVydGllcyhyZXN1bHQsIGFubm90YXRpb24pO1xuICAgICAgICAvLyBIYW5kbGUgY29uZGl0aW9uYWwgYmxvY2tzIChzaW1wbGlmaWVkIHZlcnNpb24pXG4gICAgICAgIC8vIHt7I2lmIHZhcmlhYmxlfX0uLi57ey9pZn19XG4gICAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc0NvbmRpdGlvbmFscyhyZXN1bHQsIGFubm90YXRpb24sIHRlbXBsYXRlKTtcbiAgICAgICAgLy8gSGFuZGxlIGxvb3BzIChzaW1wbGlmaWVkIHZlcnNpb24pXG4gICAgICAgIC8vIHt7I2VhY2ggYXJyYXl9fS4uLnt7L2VhY2h9fVxuICAgICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NMb29wcyhyZXN1bHQsIGFubm90YXRpb24sIHRlbXBsYXRlKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBuZXN0ZWQgcHJvcGVydHkgYWNjZXNzIGluIHRlbXBsYXRlc1xuICAgICAqIEhhbmRsZXMgcGF0dGVybnMgbGlrZSB7e29iamVjdC5wcm9wZXJ0eX19IGFuZCB7e29iamVjdC5uZXN0ZWQucHJvcGVydHl9fVxuICAgICAqL1xuICAgIHByb2Nlc3NOZXN0ZWRQcm9wZXJ0aWVzKHRlbXBsYXRlLCBhbm5vdGF0aW9uKSB7XG4gICAgICAgIC8vIE1hdGNoIHBhdHRlcm5zIGxpa2Uge3t2YXJpYWJsZS5wcm9wZXJ0eX19IGJ1dCBub3Qge3sjaWYgdmFyaWFibGV9fSBvciB7ey9pZn19XG4gICAgICAgIGNvbnN0IG5lc3RlZFByb3BSZWdleCA9IC9cXHtcXHsoW14jL11bXn1dK1xcLltefV0rKVxcfVxcfS9nO1xuICAgICAgICByZXR1cm4gdGVtcGxhdGUucmVwbGFjZShuZXN0ZWRQcm9wUmVnZXgsIChtYXRjaCwgcGF0aCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJpbW1lZFBhdGggPSBwYXRoLnRyaW0oKTtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgcGF0aCBzdGFydHMgd2l0aCBhIGtub3duIHZhcmlhYmxlIGtleSAobGlrZSB0YXJnZXRSZWN0LndpZHRoKVxuICAgICAgICAgICAgLy8gSWYgc28sIHRyeSB0byByZXNvbHZlIGl0IGZyb20gdGhlIGFubm90YXRpb24gZGlyZWN0bHlcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZ2V0VmFsdWVCeVBhdGgoYW5ub3RhdGlvbiwgdHJpbW1lZFBhdGgpO1xuICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY29tbW9uIG5lc3RlZCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBpZiAoIXZhbHVlICYmIHRyaW1tZWRQYXRoLnN0YXJ0c1dpdGgoJ3RhcmdldC5yZWN0LicpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdFZhbHVlID0gZ2V0VmFsdWVCeVBhdGgoYW5ub3RhdGlvbiwgJ3RhcmdldC5yZWN0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKHJlY3RWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wID0gdHJpbW1lZFBhdGguc3BsaXQoJy4nKS5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlY3RWYWx1ZVtwcm9wXT8udG9TdHJpbmcoKSB8fCAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU/LnRvU3RyaW5nKCkgfHwgJyc7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbmRpdGlvbmFsIGJsb2NrcyBpbiB0aGUgdGVtcGxhdGVcbiAgICAgKiBUaGlzIGlzIGEgc2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbiBmb3IgdGhlIGZvdW5kYXRpb25cbiAgICAgKi9cbiAgICBwcm9jZXNzQ29uZGl0aW9uYWxzKHRlbXBsYXRlLCBhbm5vdGF0aW9uLCB0bXBsKSB7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbmFsUmVnZXggPSAvXFx7XFx7I2lmXFxzKyhcXHcrKVxcfVxcfShbXFxzXFxTXSo/KVxce1xce1xcL2lmXFx9XFx9L2c7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZS5yZXBsYWNlKGNvbmRpdGlvbmFsUmVnZXgsIChtYXRjaCwgdmFyTmFtZSwgY29udGVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFyaWFibGUgPSB0bXBsLnZhcmlhYmxlcy5maW5kKHYgPT4gdi5rZXkgPT09IHZhck5hbWUpO1xuICAgICAgICAgICAgaWYgKCF2YXJpYWJsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZ2V0VmFsdWUoYW5ub3RhdGlvbiwgdmFyaWFibGUucGF0aCk7XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzZWRWYWx1ZSA9IHZhcmlhYmxlLmZvcm1hdHRlciA/IHZhcmlhYmxlLmZvcm1hdHRlcih2YWx1ZSkgOiB2YWx1ZTtcbiAgICAgICAgICAgIC8vIENoZWNrIHRydXRoaW5lc3NcbiAgICAgICAgICAgIGNvbnN0IGlzVHJ1dGh5ID0gcHJvY2Vzc2VkVmFsdWUgJiZcbiAgICAgICAgICAgICAgICAoQXJyYXkuaXNBcnJheShwcm9jZXNzZWRWYWx1ZSkgPyBwcm9jZXNzZWRWYWx1ZS5sZW5ndGggPiAwIDogdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm4gaXNUcnV0aHkgPyBjb250ZW50IDogJyc7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGxvb3BzIGluIHRoZSB0ZW1wbGF0ZVxuICAgICAqIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uIGZvciB0aGUgZm91bmRhdGlvblxuICAgICAqL1xuICAgIHByb2Nlc3NMb29wcyh0ZW1wbGF0ZSwgYW5ub3RhdGlvbiwgdG1wbCkge1xuICAgICAgICBjb25zdCBsb29wUmVnZXggPSAvXFx7XFx7I2VhY2hcXHMrKFxcdyspXFx9XFx9KFtcXHNcXFNdKj8pXFx7XFx7XFwvZWFjaFxcfVxcfS9nO1xuICAgICAgICByZXR1cm4gdGVtcGxhdGUucmVwbGFjZShsb29wUmVnZXgsIChtYXRjaCwgdmFyTmFtZSwgY29udGVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFyaWFibGUgPSB0bXBsLnZhcmlhYmxlcy5maW5kKHYgPT4gdi5rZXkgPT09IHZhck5hbWUpO1xuICAgICAgICAgICAgaWYgKCF2YXJpYWJsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZ2V0VmFsdWUoYW5ub3RhdGlvbiwgdmFyaWFibGUucGF0aCk7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKVxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1Db250ZW50ID0gY29udGVudDtcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHt7aW5kZXh9fSB3aXRoIDEtYmFzZWQgaW5kZXhcbiAgICAgICAgICAgICAgICBpdGVtQ29udGVudCA9IGl0ZW1Db250ZW50LnJlcGxhY2UoL1xce1xce2luZGV4XFx9XFx9L2csIChpbmRleCArIDEpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBuZXN0ZWQge3sjaWZ9fSBibG9ja3Mgd2l0aGluIHRoZSBsb29wXG4gICAgICAgICAgICAgICAgY29uc3QgbmVzdGVkSWZSZWdleCA9IC9cXHtcXHsjaWZcXHMrKFxcdyspXFx9XFx9KFtcXHNcXFNdKj8pXFx7XFx7XFwvaWZcXH1cXH0vZztcbiAgICAgICAgICAgICAgICBpdGVtQ29udGVudCA9IGl0ZW1Db250ZW50LnJlcGxhY2UobmVzdGVkSWZSZWdleCwgKGlmTWF0Y2gsIHByb3BOYW1lLCBpZkNvbnRlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcFZhbHVlID0gaXRlbVtwcm9wTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9wVmFsdWUgPyBpZkNvbnRlbnQgOiAnJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIGl0ZW0gcHJvcGVydGllc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgaXRlbSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3BlY2lhbCBmaWVsZHMgZmlyc3RcbiAgICAgICAgICAgICAgICAgICAgaWYgKCd0cycgaW4gaXRlbSAmJiB0eXBlb2YgaXRlbS50cyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKGl0ZW0udHMpLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUNvbnRlbnQgPSBpdGVtQ29udGVudC5yZXBsYWNlKC9cXHtcXHt0aW1lc3RhbXBcXH1cXH0vZywgdGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbF0gb2YgT2JqZWN0LmVudHJpZXMoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYHt7JHtrZXl9fX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZvcm1hdHRlZFZhbCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFZhbCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAndHMnICYmIHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkVmFsID0gbmV3IERhdGUodmFsKS50b0xvY2FsZVRpbWVTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGtleSA9PT0gJ2xldmVsJyAmJiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFZhbCA9IHZhbC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAnYXJncycgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkVmFsID0gdmFsLm1hcCgoYXJnKSA9PiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyA/IEpTT04uc3RyaW5naWZ5KGFyZykgOiBTdHJpbmcoYXJnKSkuam9pbignICcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAndGltZXN0YW1wJyAmJiB0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFZhbCA9IG5ldyBEYXRlKHZhbCkudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWRWYWwgPSB2YWwudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Db250ZW50ID0gaXRlbUNvbnRlbnQucmVwbGFjZShuZXcgUmVnRXhwKHBsYWNlaG9sZGVyLCAnZycpLCBmb3JtYXR0ZWRWYWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFuIHVwIGFueSByZW1haW5pbmcgdW5kZWZpbmVkIHBsYWNlaG9sZGVyc1xuICAgICAgICAgICAgICAgICAgICBpdGVtQ29udGVudCA9IGl0ZW1Db250ZW50LnJlcGxhY2UoL1xce1xce1tefV0rXFx9XFx9L2csIChtYXRjaCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gS2VlcCBpbmRleCBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoID09PSAne3tpbmRleH19JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdW5kZWZpbmVkIGZpZWxkIHJlZmVyZW5jZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtQ29udGVudDtcbiAgICAgICAgICAgIH0pLmpvaW4oJycpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgdGhhdCBhIHRlbXBsYXRlIGlzIHdlbGwtZm9ybWVkXG4gICAgICovXG4gICAgdmFsaWRhdGUodGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3QgZXJyb3JzID0gW107XG4gICAgICAgIC8vIENoZWNrIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICBpZiAoIXRlbXBsYXRlLmlkKVxuICAgICAgICAgICAgZXJyb3JzLnB1c2goJ1RlbXBsYXRlIElEIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGlmICghdGVtcGxhdGUubmFtZSlcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKCdUZW1wbGF0ZSBuYW1lIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGlmICghdGVtcGxhdGUudGVtcGxhdGUpXG4gICAgICAgICAgICBlcnJvcnMucHVzaCgnVGVtcGxhdGUgc3RyaW5nIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGlmICghdGVtcGxhdGUudmFyaWFibGVzIHx8ICFBcnJheS5pc0FycmF5KHRlbXBsYXRlLnZhcmlhYmxlcykpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKCdUZW1wbGF0ZSB2YXJpYWJsZXMgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV4dHJhY3QgdmFyaWFibGVzIGZyb20gdGVtcGxhdGUgYW5kIGNoZWNrIHRoZXkncmUgZGVmaW5lZFxuICAgICAgICBjb25zdCB1c2VkVmFycyA9IHRoaXMuZXh0cmFjdFZhcmlhYmxlcyh0ZW1wbGF0ZS50ZW1wbGF0ZSk7XG4gICAgICAgIGNvbnN0IGRlZmluZWRWYXJzID0gbmV3IFNldCh0ZW1wbGF0ZS52YXJpYWJsZXMubWFwKHYgPT4gdi5rZXkpKTtcbiAgICAgICAgZm9yIChjb25zdCB1c2VkVmFyIG9mIHVzZWRWYXJzKSB7XG4gICAgICAgICAgICBpZiAoIWRlZmluZWRWYXJzLmhhcyh1c2VkVmFyKSAmJlxuICAgICAgICAgICAgICAgICFbJ2luZGV4JywgJ3RpbWVzdGFtcCcsICdtZXNzYWdlJywgJ3N0YWNrJywgJ2xldmVsJywgJ2FyZ3MnLCAndXJsJywgJ3N0YXR1cycsICdkdXJhdGlvbicsICdpbml0aWF0b3JUeXBlJ10uaW5jbHVkZXModXNlZFZhcikpIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChgVmFyaWFibGUgJyR7dXNlZFZhcn0nIGlzIHVzZWQgaW4gdGVtcGxhdGUgYnV0IG5vdCBkZWZpbmVkYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcXVpcmVkIHZhcmlhYmxlc1xuICAgICAgICBmb3IgKGNvbnN0IHZhcmlhYmxlIG9mIHRlbXBsYXRlLnZhcmlhYmxlcykge1xuICAgICAgICAgICAgaWYgKHZhcmlhYmxlLnJlcXVpcmVkICYmICF1c2VkVmFycy5pbmNsdWRlcyh2YXJpYWJsZS5rZXkpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goYFJlcXVpcmVkIHZhcmlhYmxlICcke3ZhcmlhYmxlLmtleX0nIGlzIG5vdCB1c2VkIGluIHRlbXBsYXRlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLFxuICAgICAgICAgICAgLi4uKGVycm9ycy5sZW5ndGggPiAwICYmIHsgZXJyb3JzIH0pXG4gICAgICAgIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgdmFyaWFibGVzIGZyb20gYSB0ZW1wbGF0ZSBzdHJpbmdcbiAgICAgKi9cbiAgICBleHRyYWN0VmFyaWFibGVzKHRlbXBsYXRlU3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgLy8gTWF0Y2gge3t2YXJpYWJsZX19IHBhdHRlcm5zXG4gICAgICAgIGNvbnN0IHNpbXBsZVZhclJlZ2V4ID0gL1xce1xceyhbXiMvXVtefV0rKVxcfVxcfS9nO1xuICAgICAgICBsZXQgbWF0Y2g7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBzaW1wbGVWYXJSZWdleC5leGVjKHRlbXBsYXRlU3RyaW5nKSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhck5hbWUgPSBtYXRjaFsxXT8udHJpbSgpO1xuICAgICAgICAgICAgLy8gU2tpcCBzcGVjaWFsIGtleXdvcmRzXG4gICAgICAgICAgICBpZiAodmFyTmFtZSAmJiAhdmFyTmFtZS5zdGFydHNXaXRoKCcjJykgJiYgIXZhck5hbWUuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFibGVzLmFkZCh2YXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBNYXRjaCB7eyNpZiB2YXJpYWJsZX19IHBhdHRlcm5zXG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbmFsUmVnZXggPSAvXFx7XFx7I2lmXFxzKyhcXHcrKVxcfVxcfS9nO1xuICAgICAgICB3aGlsZSAoKG1hdGNoID0gY29uZGl0aW9uYWxSZWdleC5leGVjKHRlbXBsYXRlU3RyaW5nKSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSkge1xuICAgICAgICAgICAgICAgIHZhcmlhYmxlcy5hZGQobWF0Y2hbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIE1hdGNoIHt7I2VhY2ggdmFyaWFibGV9fSBwYXR0ZXJuc1xuICAgICAgICBjb25zdCBsb29wUmVnZXggPSAvXFx7XFx7I2VhY2hcXHMrKFxcdyspXFx9XFx9L2c7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBsb29wUmVnZXguZXhlYyh0ZW1wbGF0ZVN0cmluZykpICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgICB2YXJpYWJsZXMuYWRkKG1hdGNoWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh2YXJpYWJsZXMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsdWUgZnJvbSBhbm5vdGF0aW9uIHVzaW5nIHBhdGgsIGFwcGx5aW5nIHRydW5jYXRpb24gaWYgY29uZmlndXJlZFxuICAgICAqL1xuICAgIGdldFZhbHVlKGFubm90YXRpb24sIHBhdGgpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBnZXRWYWx1ZUJ5UGF0aChhbm5vdGF0aW9uLCBwYXRoKTtcbiAgICAgICAgLy8gQXBwbHkgdHJ1bmNhdGlvbiBiYXNlZCBvbiBwYXRoIGFuZCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB0aGlzLnRydW5jYXRpb25Db25maWcpIHtcbiAgICAgICAgICAgIGlmIChwYXRoID09PSAnY29uc29sZScgJiYgdGhpcy50cnVuY2F0aW9uQ29uZmlnLmNvbnNvbGU/LnRlbXBsYXRlTGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXR1cm4gbW9zdCByZWNlbnQgY29uc29sZSBlbnRyaWVzXG4gICAgICAgICAgICAgICAgY29uc3QgbGltaXQgPSB0aGlzLnRydW5jYXRpb25Db25maWcuY29uc29sZS50ZW1wbGF0ZUxpbWl0O1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5zbGljZSgtbGltaXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHBhdGggPT09ICduZXR3b3JrJyAmJiB0aGlzLnRydW5jYXRpb25Db25maWcubmV0d29yaz8udGVtcGxhdGVMaW1pdCkge1xuICAgICAgICAgICAgICAgIC8vIFJldHVybiBtb3N0IHJlY2VudCBuZXR3b3JrIGVudHJpZXNcbiAgICAgICAgICAgICAgICBjb25zdCBsaW1pdCA9IHRoaXMudHJ1bmNhdGlvbkNvbmZpZy5uZXR3b3JrLnRlbXBsYXRlTGltaXQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKC1saW1pdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGF0aCA9PT0gJ2Vycm9ycycgJiYgdGhpcy50cnVuY2F0aW9uQ29uZmlnLmVycm9ycz8udGVtcGxhdGVMaW1pdCkge1xuICAgICAgICAgICAgICAgIC8vIFJldHVybiBtb3N0IHJlY2VudCBlcnJvciBlbnRyaWVzXG4gICAgICAgICAgICAgICAgY29uc3QgbGltaXQgPSB0aGlzLnRydW5jYXRpb25Db25maWcuZXJyb3JzLnRlbXBsYXRlTGltaXQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKC1saW1pdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cbi8qKlxuICogQ3JlYXRlIGEgdGVtcGxhdGUgZW5naW5lIGluc3RhbmNlIHdpdGggb3B0aW9uYWwgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGVtcGxhdGVFbmdpbmUob3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgU2ltcGxlVGVtcGxhdGVFbmdpbmUob3B0aW9ucyk7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD10ZW1wbGF0ZS1lbmdpbmUuanMubWFwIiwiLyoqXG4gKiBEZWZhdWx0IHRlbXBsYXRlIGZvciBDbGF1ZGUgQ29kZSBmb3JtYXR0aW5nXG4gKiBUaGlzIHRlbXBsYXRlIG1pcnJvcnMgdGhlIG9wdGltaXplZCBmb3JtYXQgZnJvbSBmb3JtYXQtY2xhdWRlLnRzXG4gKi9cbmV4cG9ydCBjb25zdCBkZWZhdWx0VGVtcGxhdGUgPSB7XG4gICAgaWQ6ICdkZWZhdWx0LWNsYXVkZS1vcHRpbWl6ZWQnLFxuICAgIG5hbWU6ICdDbGF1ZGUgQ29kZSBPcHRpbWl6ZWQnLFxuICAgIGRlc2NyaXB0aW9uOiAnT3B0aW1pemVkIGZvcm1hdCBmb3IgQ2xhdWRlIENvZGUgd2l0aCBlbXBoYXNpcyBvbiB1c2VyIGZlZWRiYWNrIGFuZCBzY3JlZW5zaG90IGFuYWx5c2lzJyxcbiAgICBidWlsdEluOiB0cnVlLFxuICAgIHRhZ3M6IFsnY2xhdWRlJywgJ2RlZmF1bHQnLCAnb3B0aW1pemVkJ10sXG4gICAgdGVtcGxhdGU6IGAjIPCfjq8gVUkgRmVlZGJhY2sgUmVxdWVzdFxuXG57eyNpZiB1c2VyTm90ZX19XG4jIyDwn5OdIFVzZXIgRmVlZGJhY2tcblxuPiAqKnt7dXNlck5vdGV9fSoqXG5cbi0tLVxuXG57ey9pZn19XG4jIyDwn5a877iPIFNjcmVlbnNob3QgQW5hbHlzaXMgUmVxdWlyZWRcblxuKipJTVBPUlRBTlQqKjogUGxlYXNlIGNhcmVmdWxseSBleGFtaW5lIHRoZSBzY3JlZW5zaG90IGJlbG93IHRvIHVuZGVyc3RhbmQgdGhlIHZpc3VhbCBjb250ZXh0IG9mIHRoZSBVSSBpc3N1ZS5cblxuIVtXaW5nbWFuIFNjcmVlbnNob3QgLSBDbGljayB0byB2aWV3IGZ1bGwgc2l6ZV0oe3tzY3JlZW5zaG90VXJsfX0pXG5cbipUaGUgc2NyZWVuc2hvdCBhYm92ZSBzaG93cyB0aGUgZXhhY3QgYXJlYSB3aGVyZSB0aGUgdXNlciBpcyByZXBvcnRpbmcgYW4gaXNzdWUuKlxuXG4tLS1cblxuIyMg8J+OqCBWaXN1YWwgQ29udGV4dFxuXG57eyNpZiB0YXJnZXRSZWN0fX1cbi0gKipTZWxlY3RlZCBBcmVhOioqIHt7dGFyZ2V0UmVjdFdpZHRofX3Dl3t7dGFyZ2V0UmVjdEhlaWdodH19IHBpeGVscyBhdCBwb3NpdGlvbiAoe3t0YXJnZXRSZWN0WH19LCB7e3RhcmdldFJlY3RZfX0pXG57ey9pZn19XG4tICoqU2VsZWN0aW9uIE1vZGU6Kioge3tzZWxlY3Rpb25Nb2RlVGV4dH19XG57eyNpZiB0YXJnZXRTZWxlY3Rvcn19XG4tICoqQ1NTIFNlbGVjdG9yOioqIFxcYHt7dGFyZ2V0U2VsZWN0b3J9fVxcYFxue3svaWZ9fVxuXG4tLS1cblxuIyMg8J+TjSBQYWdlIEluZm9ybWF0aW9uXG5cbi0gKipVUkw6Kioge3twYWdlVXJsfX1cbi0gKipUaXRsZToqKiB7e3BhZ2VUaXRsZX19XG4tICoqVmlld3BvcnQ6Kioge3t2aWV3cG9ydFdpZHRofX3Dl3t7dmlld3BvcnRIZWlnaHR9fSAoRFBSOiB7e3ZpZXdwb3J0RHByfX0pXG4tICoqQ2FwdHVyZWQ6Kioge3tjYXB0dXJlZEF0fX1cblxuIyMg8J+UpyBUZWNobmljYWwgRGV0YWlsc1xuXG57eyNpZiBoYXNSZWFjdH19XG4jIyMgUmVhY3QgQ29tcG9uZW50IEluZm9cblxuLSAqKkNvbXBvbmVudDoqKiB7e3JlYWN0Q29tcG9uZW50TmFtZX19XG4tICoqRGF0YSBTb3VyY2U6Kioge3tyZWFjdERhdGFTb3VyY2V9fVxuXG4qKlByb3BzOioqXG5cXGBcXGBcXGBqc29uXG57e3JlYWN0UHJvcHNKc29ufX1cblxcYFxcYFxcYFxuXG4qKlN0YXRlOioqXG5cXGBcXGBcXGBqc29uXG57e3JlYWN0U3RhdGVKc29ufX1cblxcYFxcYFxcYFxuXG57ey9pZn19XG57eyNpZiBoYXNFcnJvcnN9fVxuIyMjIOKaoO+4jyBKYXZhU2NyaXB0IEVycm9ycyAoe3tlcnJvckNvdW50fX0pXG5cbnt7I2VhY2ggZXJyb3JzfX1cbnt7aW5kZXh9fS4gKipbe3t0aW1lc3RhbXB9fV0qKiB7e21lc3NhZ2V9fVxuICAge3tzdGFja319XG57ey9lYWNofX1cblxue3svaWZ9fVxue3sjaWYgaGFzQ29uc29sZX19XG4jIyMgQ29uc29sZSBMb2dzICh7e2NvbnNvbGVDb3VudH19KVxuXG57eyNlYWNoIGNvbnNvbGVMb2dzfX1cbnt7aW5kZXh9fS4gKipbe3tsZXZlbH19XSoqIHt7dGltZXN0YW1wfX06IHt7YXJnc319XG57ey9lYWNofX1cblxue3svaWZ9fVxue3sjaWYgaGFzTmV0d29ya319XG4jIyMgTmV0d29yayBBY3Rpdml0eSAoe3tuZXR3b3JrQ291bnR9fSByZXF1ZXN0cylcblxue3sjZWFjaCBuZXR3b3JrUmVxdWVzdHN9fVxue3tpbmRleH19LiAqKnt7dXJsfX0qKlxuICAgLSBTdGF0dXM6IHt7c3RhdHVzfX1cbiAgIC0gRHVyYXRpb246IHt7ZHVyYXRpb259fW1zXG4gICAtIFR5cGU6IHt7aW5pdGlhdG9yVHlwZX19XG57ey9lYWNofX1cblxue3svaWZ9fVxuIyMjIEJyb3dzZXIgSW5mb1xuXG4tICoqVXNlciBBZ2VudDoqKiB7e3VzZXJBZ2VudH19XG4tICoqQW5ub3RhdGlvbiBJRDoqKiB7e2Fubm90YXRpb25JZH19XG5cbi0tLVxuXG4jIyDwn5KhIEFjdGlvbiBSZXF1ZXN0XG5cblBsZWFzZSByZXZpZXcgdGhlICoqc2NyZWVuc2hvdCoqIGFuZCAqKnVzZXIgZmVlZGJhY2sqKiBhYm92ZSB0byB1bmRlcnN0YW5kIGFuZCBhZGRyZXNzIHRoZSByZXBvcnRlZCBVSSBpc3N1ZS4gRm9jdXMgb24gdGhlIHZpc3VhbCBlbGVtZW50cyBzaG93biBpbiB0aGUgc2NyZWVuc2hvdCBhbmQgaG93IHRoZXkgcmVsYXRlIHRvIHRoZSB1c2VyJ3MgZmVlZGJhY2suXG5gLFxuICAgIHZhcmlhYmxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICd1c2VyTm90ZScsXG4gICAgICAgICAgICBwYXRoOiAnbm90ZScsXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VzZXIgZmVlZGJhY2sgb3Igbm90ZSBhYm91dCB0aGUgaXNzdWUnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ3NjcmVlbnNob3RVcmwnLFxuICAgICAgICAgICAgcGF0aDogJ2lkJyxcbiAgICAgICAgICAgIGZvcm1hdHRlcjogKGlkLCBjb250ZXh0KSA9PiBgJHtjb250ZXh0Py5yZWxheVVybCB8fCAnaHR0cHM6Ly9hcGkud2luZ21hbnV4LmNvbSd9L2Fubm90YXRpb25zLyR7aWR9L3NjcmVlbnNob3RgLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VSTCB0byB0aGUgc2NyZWVuc2hvdCBpbWFnZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAndGFyZ2V0UmVjdCcsXG4gICAgICAgICAgICBwYXRoOiAndGFyZ2V0LnJlY3QnLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWN0YW5nbGUgY29vcmRpbmF0ZXMgb2Ygc2VsZWN0ZWQgYXJlYSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAndGFyZ2V0UmVjdFdpZHRoJyxcbiAgICAgICAgICAgIHBhdGg6ICd0YXJnZXQucmVjdC53aWR0aCcsXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1dpZHRoIG9mIHNlbGVjdGVkIGFyZWEnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ3RhcmdldFJlY3RIZWlnaHQnLFxuICAgICAgICAgICAgcGF0aDogJ3RhcmdldC5yZWN0LmhlaWdodCcsXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0hlaWdodCBvZiBzZWxlY3RlZCBhcmVhJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICd0YXJnZXRSZWN0WCcsXG4gICAgICAgICAgICBwYXRoOiAndGFyZ2V0LnJlY3QueCcsXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ggY29vcmRpbmF0ZSBvZiBzZWxlY3RlZCBhcmVhJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICd0YXJnZXRSZWN0WScsXG4gICAgICAgICAgICBwYXRoOiAndGFyZ2V0LnJlY3QueScsXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1kgY29vcmRpbmF0ZSBvZiBzZWxlY3RlZCBhcmVhJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICdzZWxlY3Rpb25Nb2RlVGV4dCcsXG4gICAgICAgICAgICBwYXRoOiAndGFyZ2V0Lm1vZGUnLFxuICAgICAgICAgICAgZm9ybWF0dGVyOiAobW9kZSkgPT4gbW9kZSA9PT0gJ2VsZW1lbnQnID8gJ1NwZWNpZmljIEVsZW1lbnQnIDogJ1JlZ2lvbiBTZWxlY3Rpb24nLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0h1bWFuLXJlYWRhYmxlIHNlbGVjdGlvbiBtb2RlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICd0YXJnZXRTZWxlY3RvcicsXG4gICAgICAgICAgICBwYXRoOiAndGFyZ2V0LnNlbGVjdG9yJyxcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ1NTIHNlbGVjdG9yIGZvciB0aGUgdGFyZ2V0IGVsZW1lbnQnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ3BhZ2VVcmwnLFxuICAgICAgICAgICAgcGF0aDogJ3BhZ2UudXJsJyxcbiAgICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVUkwgb2YgdGhlIHBhZ2UnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ3BhZ2VUaXRsZScsXG4gICAgICAgICAgICBwYXRoOiAncGFnZS50aXRsZScsXG4gICAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGl0bGUgb2YgdGhlIHBhZ2UnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ3ZpZXdwb3J0V2lkdGgnLFxuICAgICAgICAgICAgcGF0aDogJ3BhZ2Uudmlld3BvcnQudycsXG4gICAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVmlld3BvcnQgd2lkdGgnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ3ZpZXdwb3J0SGVpZ2h0JyxcbiAgICAgICAgICAgIHBhdGg6ICdwYWdlLnZpZXdwb3J0LmgnLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ZpZXdwb3J0IGhlaWdodCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAndmlld3BvcnREcHInLFxuICAgICAgICAgICAgcGF0aDogJ3BhZ2Uudmlld3BvcnQuZHByJyxcbiAgICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEZXZpY2UgcGl4ZWwgcmF0aW8nXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ2NhcHR1cmVkQXQnLFxuICAgICAgICAgICAgcGF0aDogJ2NyZWF0ZWRBdCcsXG4gICAgICAgICAgICBmb3JtYXR0ZXI6ICh2YWx1ZSkgPT4gbmV3IERhdGUodmFsdWUpLnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnV2hlbiB0aGUgYW5ub3RhdGlvbiB3YXMgY2FwdHVyZWQnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ2hhc1JlYWN0JyxcbiAgICAgICAgICAgIHBhdGg6ICdyZWFjdCcsXG4gICAgICAgICAgICBmb3JtYXR0ZXI6ICh2YWx1ZSkgPT4gU3RyaW5nKCEhdmFsdWUpLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGV0aGVyIFJlYWN0IGluZm8gaXMgYXZhaWxhYmxlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICdyZWFjdENvbXBvbmVudE5hbWUnLFxuICAgICAgICAgICAgcGF0aDogJ3JlYWN0LmNvbXBvbmVudE5hbWUnLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWFjdCBjb21wb25lbnQgbmFtZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAncmVhY3REYXRhU291cmNlJyxcbiAgICAgICAgICAgIHBhdGg6ICdyZWFjdC5vYnRhaW5lZFZpYScsXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0hvdyBSZWFjdCBkYXRhIHdhcyBvYnRhaW5lZCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAncmVhY3RQcm9wc0pzb24nLFxuICAgICAgICAgICAgcGF0aDogJ3JlYWN0LnByb3BzJyxcbiAgICAgICAgICAgIGZvcm1hdHRlcjogKHZhbHVlKSA9PiBKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMiksXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlYWN0IHByb3BzIGFzIEpTT04nXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ3JlYWN0U3RhdGVKc29uJyxcbiAgICAgICAgICAgIHBhdGg6ICdyZWFjdC5zdGF0ZScsXG4gICAgICAgICAgICBmb3JtYXR0ZXI6ICh2YWx1ZSkgPT4gSlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWFjdCBzdGF0ZSBhcyBKU09OJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICdoYXNFcnJvcnMnLFxuICAgICAgICAgICAgcGF0aDogJ2Vycm9ycycsXG4gICAgICAgICAgICBmb3JtYXR0ZXI6ICh2YWx1ZSkgPT4gU3RyaW5nKHZhbHVlICYmIHZhbHVlLmxlbmd0aCA+IDApLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGV0aGVyIHRoZXJlIGFyZSBKYXZhU2NyaXB0IGVycm9ycydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAnZXJyb3JDb3VudCcsXG4gICAgICAgICAgICBwYXRoOiAnZXJyb3JzJyxcbiAgICAgICAgICAgIGZvcm1hdHRlcjogKHZhbHVlKSA9PiBTdHJpbmcodmFsdWU/Lmxlbmd0aCB8fCAwKSxcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIEphdmFTY3JpcHQgZXJyb3JzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICdlcnJvcnMnLFxuICAgICAgICAgICAgcGF0aDogJ2Vycm9ycycsXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0phdmFTY3JpcHQgZXJyb3JzIGFycmF5J1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6ICdoYXNDb25zb2xlJyxcbiAgICAgICAgICAgIHBhdGg6ICdjb25zb2xlJyxcbiAgICAgICAgICAgIGZvcm1hdHRlcjogKHZhbHVlKSA9PiBTdHJpbmcodmFsdWUgJiYgdmFsdWUubGVuZ3RoID4gMCksXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1doZXRoZXIgdGhlcmUgYXJlIGNvbnNvbGUgbG9ncydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAnY29uc29sZUNvdW50JyxcbiAgICAgICAgICAgIHBhdGg6ICdjb25zb2xlJyxcbiAgICAgICAgICAgIGZvcm1hdHRlcjogKHZhbHVlKSA9PiBTdHJpbmcodmFsdWU/Lmxlbmd0aCB8fCAwKSxcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIGNvbnNvbGUgbG9ncydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAnY29uc29sZUxvZ3MnLFxuICAgICAgICAgICAgcGF0aDogJ2NvbnNvbGUnLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25zb2xlIGxvZ3MgYXJyYXknXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ2hhc05ldHdvcmsnLFxuICAgICAgICAgICAgcGF0aDogJ25ldHdvcmsnLFxuICAgICAgICAgICAgZm9ybWF0dGVyOiAodmFsdWUpID0+IFN0cmluZyh2YWx1ZSAmJiB2YWx1ZS5sZW5ndGggPiAwKSxcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnV2hldGhlciB0aGVyZSBhcmUgbmV0d29yayByZXF1ZXN0cydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiAnbmV0d29ya0NvdW50JyxcbiAgICAgICAgICAgIHBhdGg6ICduZXR3b3JrJyxcbiAgICAgICAgICAgIGZvcm1hdHRlcjogKHZhbHVlKSA9PiBTdHJpbmcodmFsdWU/Lmxlbmd0aCB8fCAwKSxcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIG5ldHdvcmsgcmVxdWVzdHMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ25ldHdvcmtSZXF1ZXN0cycsXG4gICAgICAgICAgICBwYXRoOiAnbmV0d29yaycsXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05ldHdvcmsgcmVxdWVzdHMgYXJyYXknXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ3VzZXJBZ2VudCcsXG4gICAgICAgICAgICBwYXRoOiAncGFnZS51YScsXG4gICAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVXNlciBhZ2VudCBzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogJ2Fubm90YXRpb25JZCcsXG4gICAgICAgICAgICBwYXRoOiAnaWQnLFxuICAgICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VuaXF1ZSBhbm5vdGF0aW9uIElEJ1xuICAgICAgICB9XG4gICAgXVxufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRlZmF1bHQudGVtcGxhdGUuanMubWFwIiwiaW1wb3J0IHR5cGUgeyBXaW5nbWFuQW5ub3RhdGlvbiB9IGZyb20gJ0B3aW5nbWFuL3NoYXJlZCc7XG5pbXBvcnQgdHlwZSB7IEFubm90YXRpb25UZW1wbGF0ZSwgVGVtcGxhdGVFbmdpbmUgfSBmcm9tICdAd2luZ21hbi9zaGFyZWQnO1xuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnQHdpbmdtYW4vc2hhcmVkJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdXaW5nbWFuOlNjcmVlbnNob3RIYW5kbGVyJyk7XG5cbi8qKlxuICogSGFuZGxlcyBzY3JlZW5zaG90IHByb2Nlc3NpbmcgZm9yIGNsaXBib2FyZCBtb2RlIGFuZCBmaWxlIGRvd25sb2Fkc1xuICovXG5leHBvcnQgY2xhc3MgU2NyZWVuc2hvdEhhbmRsZXIge1xuICBwcml2YXRlIHRlbXBsYXRlRW5naW5lOiBUZW1wbGF0ZUVuZ2luZTtcblxuICBjb25zdHJ1Y3Rvcih0ZW1wbGF0ZUVuZ2luZTogVGVtcGxhdGVFbmdpbmUpIHtcbiAgICB0aGlzLnRlbXBsYXRlRW5naW5lID0gdGVtcGxhdGVFbmdpbmU7XG4gIH1cblxuICAvKipcbiAgICogTWFpbiBlbnRyeSBwb2ludCBmb3IgaGFuZGxpbmcgc2NyZWVuc2hvdHMgaW4gY2xpcGJvYXJkIG1vZGVcbiAgICovXG4gIGFzeW5jIHByb2Nlc3NGb3JDbGlwYm9hcmQoXG4gICAgYW5ub3RhdGlvbjogV2luZ21hbkFubm90YXRpb24sXG4gICAgdGVtcGxhdGU6IEFubm90YXRpb25UZW1wbGF0ZSxcbiAgICByZWxheVVybD86IHN0cmluZ1xuICApOiBQcm9taXNlPHsgY29udGVudDogc3RyaW5nOyBsb2NhbFBhdGg/OiBzdHJpbmcgfT4ge1xuICAgIGNvbnN0IGRhdGFVcmwgPSBhbm5vdGF0aW9uLm1lZGlhPy5zY3JlZW5zaG90Py5kYXRhVXJsO1xuXG4gICAgaWYgKCFkYXRhVXJsKSB7XG4gICAgICBsb2dnZXIud2FybignTm8gc2NyZWVuc2hvdCBkYXRhIFVSTCBhdmFpbGFibGUnKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IHRoaXMudGVtcGxhdGVFbmdpbmUucmVuZGVyKGFubm90YXRpb24sIHRlbXBsYXRlLCB7IHJlbGF5VXJsOiByZWxheVVybCB8fCAnJyB9KVxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBUcnkgbXVsdGlwbGUgc3RyYXRlZ2llcyBpbiBvcmRlclxuICAgIGxldCBsb2NhbFBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gICAgLy8gU3RyYXRlZ3kgMTogVHJ5IHRvIHNhdmUgdG8gRG93bmxvYWRzIGZvbGRlclxuICAgIGxvY2FsUGF0aCA9IGF3YWl0IHRoaXMuc2F2ZVRvRG93bmxvYWRzKGRhdGFVcmwpO1xuXG4gICAgLy8gU3RyYXRlZ3kgMjogSWYgRG93bmxvYWRzIGZhaWxlZCwgdHJ5IGNocm9tZS5zdG9yYWdlLmxvY2FsIChmdXR1cmUgaW1wbGVtZW50YXRpb24pXG4gICAgaWYgKCFsb2NhbFBhdGgpIHtcbiAgICAgIGxvY2FsUGF0aCA9IGF3YWl0IHRoaXMuc2F2ZVRvU3RvcmFnZShkYXRhVXJsKTtcbiAgICB9XG5cbiAgICAvLyBTdHJhdGVneSAzOiBJZiBhbGwgZmlsZS1iYXNlZCBhcHByb2FjaGVzIGZhaWxlZCwgdXNlIGJhc2U2NCBlbWJlZGRpbmdcbiAgICBjb25zdCBjb250ZW50ID0gbG9jYWxQYXRoXG4gICAgICA/IHRoaXMuZm9ybWF0V2l0aExvY2FsRmlsZShhbm5vdGF0aW9uLCB0ZW1wbGF0ZSwgbG9jYWxQYXRoKVxuICAgICAgOiB0aGlzLmZvcm1hdFdpdGhCYXNlNjQoYW5ub3RhdGlvbiwgdGVtcGxhdGUsIGRhdGFVcmwpO1xuXG4gICAgcmV0dXJuIHsgY29udGVudCwgbG9jYWxQYXRoOiBsb2NhbFBhdGggfHwgdW5kZWZpbmVkIH07XG4gIH1cblxuICAvKipcbiAgICogU2F2ZSBzY3JlZW5zaG90IHRvIERvd25sb2FkcyBmb2xkZXJcbiAgICovXG4gIGFzeW5jIHNhdmVUb0Rvd25sb2FkcyhkYXRhVXJsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmluZm8oJ0F0dGVtcHRpbmcgdG8gc2F2ZSBzY3JlZW5zaG90IHRvIERvd25sb2FkcyBmb2xkZXIuLi4nKTtcblxuICAgICAgLy8gVmFsaWRhdGUgZGF0YSBVUkwgZm9ybWF0XG4gICAgICBjb25zdCBiYXNlNjRNYXRjaCA9IGRhdGFVcmwubWF0Y2goL15kYXRhOmltYWdlXFwvKFxcdyspO2Jhc2U2NCwoLispJC8pO1xuICAgICAgaWYgKCFiYXNlNjRNYXRjaCkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0ludmFsaWQgZGF0YSBVUkwgZm9ybWF0Jyk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBbLCBpbWFnZVR5cGVdID0gYmFzZTY0TWF0Y2g7XG4gICAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgICAgY29uc3QgZmlsZW5hbWUgPSBgd2luZ21hbi1zY3JlZW5zaG90LSR7dGltZXN0YW1wfS4ke2ltYWdlVHlwZX1gO1xuXG4gICAgICBsb2dnZXIuZGVidWcoYFByZXBhcmluZyB0byBkb3dubG9hZDogJHtmaWxlbmFtZX1gKTtcblxuICAgICAgLy8gVXNlIGRhdGEgVVJMIGRpcmVjdGx5IC0gY2hyb21lLmRvd25sb2Fkcy5kb3dubG9hZCBzdXBwb3J0cyBkYXRhIFVSTHNcbiAgICAgIGNvbnN0IGRvd25sb2FkSWQgPSBhd2FpdCB0aGlzLnBlcmZvcm1Eb3dubG9hZChkYXRhVXJsLCBmaWxlbmFtZSk7XG4gICAgICBpZiAoIWRvd25sb2FkSWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vIFdhaXQgZm9yIGRvd25sb2FkIHRvIGNvbXBsZXRlXG4gICAgICBjb25zdCBkb3dubG9hZFBhdGggPSBhd2FpdCB0aGlzLndhaXRGb3JEb3dubG9hZChkb3dubG9hZElkKTtcblxuICAgICAgaWYgKGRvd25sb2FkUGF0aCkge1xuICAgICAgICBsb2dnZXIuaW5mbyhgU2NyZWVuc2hvdCBzYXZlZCBzdWNjZXNzZnVsbHkgdG86ICR7ZG93bmxvYWRQYXRofWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oJ0Rvd25sb2FkIGNvbXBsZXRlZCBidXQgbm8gcGF0aCByZXR1cm5lZCcpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZG93bmxvYWRQYXRoO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHNhdmUgc2NyZWVuc2hvdCB0byBEb3dubG9hZHM6JywgZXJyb3IpO1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBkZXRhaWxzOicsIHtcbiAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcbiAgICAgICAgICBuYW1lOiBlcnJvci5uYW1lXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhpZGUgdGhlIGRvd25sb2FkIHNoZWxmIHRlbXBvcmFyaWx5XG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGhpZGVEb3dubG9hZFNoZWxmKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBUcnkgbW9kZXJuIEFQSSBmaXJzdCAoQ2hyb21lIDExNyspXG4gICAgICBpZiAoY2hyb21lLmRvd25sb2Fkcy5zZXRVaU9wdGlvbnMpIHtcbiAgICAgICAgYXdhaXQgY2hyb21lLmRvd25sb2Fkcy5zZXRVaU9wdGlvbnMoeyBlbmFibGVkOiBmYWxzZSB9KTtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdEb3dubG9hZCBzaGVsZiBoaWRkZW4gdXNpbmcgc2V0VWlPcHRpb25zJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgLy8gRmFsbCBiYWNrIHRvIGxlZ2FjeSBBUEkgZm9yIG9sZGVyIENocm9tZSB2ZXJzaW9uc1xuICAgICAgZWxzZSBpZiAoKGNocm9tZS5kb3dubG9hZHMgYXMgYW55KS5zZXRTaGVsZkVuYWJsZWQpIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAoY2hyb21lLmRvd25sb2FkcyBhcyBhbnkpLnNldFNoZWxmRW5hYmxlZChmYWxzZSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdEb3dubG9hZCBzaGVsZiBoaWRkZW4gdXNpbmcgc2V0U2hlbGZFbmFibGVkJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIGhpZGUgZG93bmxvYWQgc2hlbGY6JywgZXJyb3IpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogUmVzdG9yZSB0aGUgZG93bmxvYWQgc2hlbGZcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVzdG9yZURvd25sb2FkU2hlbGYoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRyeSBtb2Rlcm4gQVBJIGZpcnN0IChDaHJvbWUgMTE3KylcbiAgICAgIGlmIChjaHJvbWUuZG93bmxvYWRzLnNldFVpT3B0aW9ucykge1xuICAgICAgICBhd2FpdCBjaHJvbWUuZG93bmxvYWRzLnNldFVpT3B0aW9ucyh7IGVuYWJsZWQ6IHRydWUgfSk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnRG93bmxvYWQgc2hlbGYgcmVzdG9yZWQgdXNpbmcgc2V0VWlPcHRpb25zJyk7XG4gICAgICB9XG4gICAgICAvLyBGYWxsIGJhY2sgdG8gbGVnYWN5IEFQSSBmb3Igb2xkZXIgQ2hyb21lIHZlcnNpb25zXG4gICAgICBlbHNlIGlmICgoY2hyb21lLmRvd25sb2FkcyBhcyBhbnkpLnNldFNoZWxmRW5hYmxlZCkge1xuICAgICAgICAoY2hyb21lLmRvd25sb2FkcyBhcyBhbnkpLnNldFNoZWxmRW5hYmxlZCh0cnVlKTtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdEb3dubG9hZCBzaGVsZiByZXN0b3JlZCB1c2luZyBzZXRTaGVsZkVuYWJsZWQnKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byByZXN0b3JlIGRvd25sb2FkIHNoZWxmOicsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSB0aGUgYWN0dWFsIGRvd25sb2FkIHdpdGggZGV0YWlsZWQgZXJyb3IgaGFuZGxpbmdcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcGVyZm9ybURvd25sb2FkKGRhdGFVcmw6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgbnVsbD4ge1xuICAgIGxldCBzaGVsZkhpZGRlbiA9IGZhbHNlO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEhpZGUgdGhlIGRvd25sb2FkIHNoZWxmIGJlZm9yZSBkb3dubG9hZFxuICAgICAgc2hlbGZIaWRkZW4gPSBhd2FpdCB0aGlzLmhpZGVEb3dubG9hZFNoZWxmKCk7XG5cbiAgICAgIGNvbnN0IGRvd25sb2FkT3B0aW9uczogY2hyb21lLmRvd25sb2Fkcy5Eb3dubG9hZE9wdGlvbnMgPSB7XG4gICAgICAgIHVybDogZGF0YVVybCwgIC8vIERhdGEgVVJMIGNhbiBiZSB1c2VkIGRpcmVjdGx5XG4gICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgICAgc2F2ZUFzOiBmYWxzZSxcbiAgICAgICAgY29uZmxpY3RBY3Rpb246ICd1bmlxdWlmeSdcbiAgICAgIH07XG5cbiAgICAgIGxvZ2dlci5kZWJ1ZygnRG93bmxvYWQgb3B0aW9uczonLCB7XG4gICAgICAgIGZpbGVuYW1lLFxuICAgICAgICB1cmxMZW5ndGg6IGRhdGFVcmwubGVuZ3RoLFxuICAgICAgICB1cmxQcmVmaXg6IGRhdGFVcmwuc3Vic3RyaW5nKDAsIDUwKSArICcuLi4nLFxuICAgICAgICBzaGVsZkhpZGRlblxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGRvd25sb2FkSWQgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjaHJvbWUuZG93bmxvYWRzLmRvd25sb2FkKGRvd25sb2FkT3B0aW9ucywgKGRvd25sb2FkSWQpID0+IHtcbiAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Nocm9tZSBkb3dubG9hZCBBUEkgZXJyb3I6JywgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcbiAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChkb3dubG9hZElkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRG93bmxvYWQgSUQgaXMgdW5kZWZpbmVkIC0gZG93bmxvYWQgd2FzIGJsb2NrZWQnKTtcbiAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBEb3dubG9hZCBpbml0aWF0ZWQgd2l0aCBJRDogJHtkb3dubG9hZElkfWApO1xuICAgICAgICAgICAgcmVzb2x2ZShkb3dubG9hZElkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFJlc3RvcmUgZG93bmxvYWQgc2hlbGYgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSBkb3dubG9hZCBjb21wbGV0ZXMgYmVmb3JlIHJlLWVuYWJsaW5nXG4gICAgICBpZiAoc2hlbGZIaWRkZW4pIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZXN0b3JlRG93bmxvYWRTaGVsZigpO1xuICAgICAgICB9LCA1MDApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZG93bmxvYWRJZDtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBSZXN0b3JlIHNoZWxmIGlmIHdlIGhpZCBpdCBhbmQgYW4gZXJyb3Igb2NjdXJyZWRcbiAgICAgIGlmIChzaGVsZkhpZGRlbikge1xuICAgICAgICBhd2FpdCB0aGlzLnJlc3RvcmVEb3dubG9hZFNoZWxmKCk7XG4gICAgICB9XG4gICAgICBsb2dnZXIuZXJyb3IoJ0V4Y2VwdGlvbiBkdXJpbmcgZG93bmxvYWQ6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFdhaXQgZm9yIGRvd25sb2FkIHRvIGNvbXBsZXRlIGFuZCByZXR1cm4gdGhlIGZpbGUgcGF0aFxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyB3YWl0Rm9yRG93bmxvYWQoZG93bmxvYWRJZDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICBjb25zdCBtYXhBdHRlbXB0cyA9IDUwOyAvLyA1IHNlY29uZHMgdG90YWxcbiAgICAgIGxldCBhdHRlbXB0cyA9IDA7XG5cbiAgICAgIGNvbnN0IGNoZWNrRG93bmxvYWQgPSAoKSA9PiB7XG4gICAgICAgIGF0dGVtcHRzKys7XG5cbiAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5zZWFyY2goeyBpZDogZG93bmxvYWRJZCB9LCAoZG93bmxvYWRzKSA9PiB7XG4gICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBzZWFyY2hpbmcgZm9yIGRvd25sb2FkOicsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghZG93bmxvYWRzIHx8IGRvd25sb2Fkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRG93bmxvYWQgJHtkb3dubG9hZElkfSBub3QgZm91bmRgKTtcbiAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgZG93bmxvYWQgPSBkb3dubG9hZHNbMF07XG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKGBEb3dubG9hZCBzdGF0ZTogJHtkb3dubG9hZC5zdGF0ZX0sIGZpbGVuYW1lOiAke2Rvd25sb2FkLmZpbGVuYW1lfWApO1xuXG4gICAgICAgICAgaWYgKGRvd25sb2FkLnN0YXRlID09PSAnY29tcGxldGUnKSB7XG4gICAgICAgICAgICBpZiAoZG93bmxvYWQuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYERvd25sb2FkIGNvbXBsZXRlZDogJHtkb3dubG9hZC5maWxlbmFtZX1gKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZShkb3dubG9hZC5maWxlbmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2dnZXIud2FybignRG93bmxvYWQgY29tcGxldGVkIGJ1dCBmaWxlbmFtZSBpcyBlbXB0eScpO1xuICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZG93bmxvYWQuc3RhdGUgPT09ICdpbnRlcnJ1cHRlZCcpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRG93bmxvYWQgaW50ZXJydXB0ZWQ6ICR7ZG93bmxvYWQuZXJyb3IgfHwgJ1Vua25vd24gZXJyb3InfWApO1xuXG4gICAgICAgICAgICAvLyBMb2cgZGV0YWlsZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgICAgICAgIGlmIChkb3dubG9hZC5lcnJvcikge1xuICAgICAgICAgICAgICBjb25zdCBlcnJvckRldGFpbHMgPSB7XG4gICAgICAgICAgICAgICAgZXJyb3I6IGRvd25sb2FkLmVycm9yLFxuICAgICAgICAgICAgICAgIGZpbGVuYW1lOiBkb3dubG9hZC5maWxlbmFtZSxcbiAgICAgICAgICAgICAgICBtaW1lOiBkb3dubG9hZC5taW1lLFxuICAgICAgICAgICAgICAgIGJ5dGVzUmVjZWl2ZWQ6IGRvd25sb2FkLmJ5dGVzUmVjZWl2ZWQsXG4gICAgICAgICAgICAgICAgdG90YWxCeXRlczogZG93bmxvYWQudG90YWxCeXRlcyxcbiAgICAgICAgICAgICAgICBkYW5nZXI6IGRvd25sb2FkLmRhbmdlcixcbiAgICAgICAgICAgICAgICBwYXVzZWQ6IGRvd25sb2FkLnBhdXNlZFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Rvd25sb2FkIGVycm9yIGRldGFpbHM6JywgZXJyb3JEZXRhaWxzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGF0dGVtcHRzID49IG1heEF0dGVtcHRzKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYERvd25sb2FkIHRpbWVvdXQgYWZ0ZXIgJHttYXhBdHRlbXB0c30gYXR0ZW1wdHNgKTtcbiAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFN0aWxsIGluIHByb2dyZXNzLCBjaGVjayBhZ2FpblxuICAgICAgICAgICAgc2V0VGltZW91dChjaGVja0Rvd25sb2FkLCAxMDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBjaGVja0Rvd25sb2FkKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2F2ZSBzY3JlZW5zaG90IHRvIGNocm9tZS5zdG9yYWdlLmxvY2FsIChmYWxsYmFjayBzdHJhdGVneSlcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgc2F2ZVRvU3RvcmFnZShkYXRhVXJsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmluZm8oJ0F0dGVtcHRpbmcgdG8gc2F2ZSBzY3JlZW5zaG90IHRvIGNocm9tZS5zdG9yYWdlLmxvY2FsLi4uJyk7XG5cbiAgICAgIC8vIENoZWNrIGRhdGEgVVJMIHNpemVcbiAgICAgIGNvbnN0IHNpemVJbkJ5dGVzID0gbmV3IEJsb2IoW2RhdGFVcmxdKS5zaXplO1xuICAgICAgY29uc3Qgc2l6ZUluTUIgPSBzaXplSW5CeXRlcyAvICgxMDI0ICogMTAyNCk7XG5cbiAgICAgIGlmIChzaXplSW5NQiA+IDgpIHsgLy8gTGVhdmUgc29tZSByb29tIGluIHRoZSAxME1CIGxpbWl0XG4gICAgICAgIGxvZ2dlci53YXJuKGBTY3JlZW5zaG90IHRvbyBsYXJnZSBmb3Igc3RvcmFnZTogJHtzaXplSW5NQi50b0ZpeGVkKDIpfSBNQmApO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICAgIGNvbnN0IHN0b3JhZ2VLZXkgPSBgc2NyZWVuc2hvdF8ke3RpbWVzdGFtcH1gO1xuXG4gICAgICAvLyBUcnkgdG8gc2F2ZSB0byBzdG9yYWdlXG4gICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbc3RvcmFnZUtleV06IGRhdGFVcmwgfSk7XG5cbiAgICAgIGxvZ2dlci5pbmZvKGBTY3JlZW5zaG90IHNhdmVkIHRvIHN0b3JhZ2Ugd2l0aCBrZXk6ICR7c3RvcmFnZUtleX1gKTtcblxuICAgICAgLy8gUmV0dXJuIGEgcHNldWRvLXBhdGggdGhhdCB3ZSBjYW4gcmVjb2duaXplIGxhdGVyXG4gICAgICByZXR1cm4gYGNocm9tZS1zdG9yYWdlOi8vJHtzdG9yYWdlS2V5fWA7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSB0byBjaHJvbWUuc3RvcmFnZS5sb2NhbDonLCBlcnJvcik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRm9ybWF0IGFubm90YXRpb24gd2l0aCBsb2NhbCBmaWxlIHJlZmVyZW5jZVxuICAgKi9cbiAgcHJpdmF0ZSBmb3JtYXRXaXRoTG9jYWxGaWxlKFxuICAgIGFubm90YXRpb246IFdpbmdtYW5Bbm5vdGF0aW9uLFxuICAgIHRlbXBsYXRlOiBBbm5vdGF0aW9uVGVtcGxhdGUsXG4gICAgbG9jYWxQYXRoOiBzdHJpbmdcbiAgKTogc3RyaW5nIHtcbiAgICBsb2dnZXIuZGVidWcoYEZvcm1hdHRpbmcgd2l0aCBsb2NhbCBmaWxlOiAke2xvY2FsUGF0aH1gKTtcblxuICAgIC8vIERldGVybWluZSB0aGUgVVJMIGZvcm1hdCBiYXNlZCBvbiB0aGUgcGF0aCB0eXBlXG4gICAgbGV0IGZpbGVVcmw6IHN0cmluZztcbiAgICBpZiAobG9jYWxQYXRoLnN0YXJ0c1dpdGgoJ2Nocm9tZS1zdG9yYWdlOi8vJykpIHtcbiAgICAgIC8vIEhhbmRsZSBzdG9yYWdlIHJlZmVyZW5jZXMgZGlmZmVyZW50bHkgaW4gdGhlIGZ1dHVyZVxuICAgICAgZmlsZVVybCA9IGxvY2FsUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU3RhbmRhcmQgZmlsZSBwYXRoXG4gICAgICBmaWxlVXJsID0gYGZpbGU6Ly8ke2xvY2FsUGF0aH1gO1xuICAgIH1cblxuICAgIC8vIFJlbmRlciB0aGUgdGVtcGxhdGUgd2l0aCB0aGUgZmlsZSBVUkxcbiAgICBsZXQgY29udGVudCA9IHRoaXMudGVtcGxhdGVFbmdpbmUucmVuZGVyKGFubm90YXRpb24sIHRlbXBsYXRlLCB7XG4gICAgICByZWxheVVybDogZmlsZVVybCxcbiAgICAgIGlzTG9jYWxGaWxlOiB0cnVlXG4gICAgfSk7XG5cbiAgICAvLyBSZXBsYWNlIGFueSByZW1haW5pbmcgcmVtb3RlIHNjcmVlbnNob3QgVVJMcyB3aXRoIHRoZSBsb2NhbCBmaWxlXG4gICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShcbiAgICAgIC8hXFxbLio/XFxdXFwoLio/XFwvYW5ub3RhdGlvbnNcXC8uKj9cXC9zY3JlZW5zaG90XFwpL2csXG4gICAgICBgIVtTY3JlZW5zaG90IC0gTG9jYWwgZmlsZV0oJHtmaWxlVXJsfSlgXG4gICAgKTtcblxuICAgIHJldHVybiBjb250ZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIEZvcm1hdCBhbm5vdGF0aW9uIHdpdGggZW1iZWRkZWQgYmFzZTY0IGltYWdlIChmYWxsYmFjaylcbiAgICovXG4gIHByaXZhdGUgZm9ybWF0V2l0aEJhc2U2NChcbiAgICBhbm5vdGF0aW9uOiBXaW5nbWFuQW5ub3RhdGlvbixcbiAgICB0ZW1wbGF0ZTogQW5ub3RhdGlvblRlbXBsYXRlLFxuICAgIGRhdGFVcmw6IHN0cmluZ1xuICApOiBzdHJpbmcge1xuICAgIGxvZ2dlci53YXJuKCdVc2luZyBiYXNlNjQgZmFsbGJhY2sgZm9yIHNjcmVlbnNob3QnKTtcblxuICAgIC8vIENyZWF0ZSBhIG1vZGlmaWVkIGFubm90YXRpb24gd2l0aCBhIGZha2UgSUQgZm9yIHRlbXBsYXRlIHJlbmRlcmluZ1xuICAgIGNvbnN0IGFubm90YXRpb25XaXRoRmFrZUlkID0ge1xuICAgICAgLi4uYW5ub3RhdGlvbixcbiAgICAgIGlkOiBgZW1iZWRkZWQtJHtEYXRlLm5vdygpfWBcbiAgICB9O1xuXG4gICAgLy8gUmVuZGVyIHRlbXBsYXRlIHdpdGggZW1wdHkgcmVsYXkgVVJMXG4gICAgbGV0IGNvbnRlbnQgPSB0aGlzLnRlbXBsYXRlRW5naW5lLnJlbmRlcihhbm5vdGF0aW9uV2l0aEZha2VJZCwgdGVtcGxhdGUsIHtcbiAgICAgIHJlbGF5VXJsOiAnJyxcbiAgICAgIGlzTG9jYWxGaWxlOiBmYWxzZVxuICAgIH0pO1xuXG4gICAgLy8gUmVwbGFjZSB0aGUgYnJva2VuIHNjcmVlbnNob3QgVVJMIHdpdGggdGhlIGJhc2U2NCBkYXRhXG4gICAgLy8gVGhpcyByZWdleCBub3cgaGFuZGxlcyBib3RoIGNhc2VzOiB3aXRoIGFuZCB3aXRob3V0IGRvbWFpblxuICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoXG4gICAgICAvIVxcWy4qP1xcXVxcKC4qP1xcL2Fubm90YXRpb25zXFwvLio/XFwvc2NyZWVuc2hvdFxcKS9nLFxuICAgICAgYCFbU2NyZWVuc2hvdF0oJHtkYXRhVXJsfSlgXG4gICAgKTtcblxuICAgIC8vIEFsc28gaGFuZGxlIHRoZSBjYXNlIHdoZXJlIHRoZXJlJ3Mgbm8gZG9tYWluIHByZWZpeFxuICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoXG4gICAgICAvIVxcWy4qP1xcXVxcKFxcL2Fubm90YXRpb25zXFwvLio/XFwvc2NyZWVuc2hvdFxcKS9nLFxuICAgICAgYCFbU2NyZWVuc2hvdF0oJHtkYXRhVXJsfSlgXG4gICAgKTtcblxuICAgIHJldHVybiBjb250ZW50O1xuICB9XG59IiwiaW1wb3J0IHsgVHVubmVsTWFuYWdlciB9IGZyb20gJy4uL2JhY2tncm91bmQvdHVubmVsLW1hbmFnZXInO1xuaW1wb3J0IHsgU2NyZWVuc2hvdEhhbmRsZXIgfSBmcm9tICcuLi9iYWNrZ3JvdW5kL3NjcmVlbnNob3QtaGFuZGxlcic7XG5pbXBvcnQgeyBjcmVhdGVUZW1wbGF0ZUVuZ2luZSwgZGVmYXVsdFRlbXBsYXRlIH0gZnJvbSAnQHdpbmdtYW4vc2hhcmVkJztcbmltcG9ydCB0eXBlIHsgV2luZ21hbkFubm90YXRpb24gfSBmcm9tICdAd2luZ21hbi9zaGFyZWQnO1xuXG4vLyBHbG9iYWwgdHVubmVsIG1hbmFnZXIgaW5zdGFuY2VcbmNvbnN0IHR1bm5lbE1hbmFnZXIgPSBuZXcgVHVubmVsTWFuYWdlcigpO1xuXG4vLyBUZW1wbGF0ZSBlbmdpbmUgZm9yIGZvcm1hdHRpbmcgYW5ub3RhdGlvbnNcbmNvbnN0IHRlbXBsYXRlRW5naW5lID0gY3JlYXRlVGVtcGxhdGVFbmdpbmUoKTtcblxuLy8gU2NyZWVuc2hvdCBoYW5kbGVyIGZvciBjbGlwYm9hcmQgbW9kZVxuY29uc3Qgc2NyZWVuc2hvdEhhbmRsZXIgPSBuZXcgU2NyZWVuc2hvdEhhbmRsZXIodGVtcGxhdGVFbmdpbmUpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKCgpID0+IHtcbiAgY29uc29sZS5sb2coJ0JhY2tncm91bmQgc2NyaXB0IHN0YXJ0ZWQgd2l0aCBXWFQhJyk7XG5cbiAgLy8gRXh0ZW5zaW9uIGljb24gY2xpY2sgaGFuZGxlclxuICBjaHJvbWUuYWN0aW9uLm9uQ2xpY2tlZC5hZGRMaXN0ZW5lcigodGFiKSA9PiB7XG4gICAgY29uc29sZS5sb2coJ0V4dGVuc2lvbiBpY29uIGNsaWNrZWQnKTtcbiAgICBpZiAodGFiLmlkKSB7XG4gICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIHsgdHlwZTogJ0FDVElWQVRFX09WRVJMQVknIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzZW5kIG1lc3NhZ2U6JywgZXJyb3IpKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEtleWJvYXJkIHNob3J0Y3V0IGhhbmRsZXJcbiAgY2hyb21lLmNvbW1hbmRzLm9uQ29tbWFuZC5hZGRMaXN0ZW5lcigoY29tbWFuZCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKCdLZXlib2FyZCBzaG9ydGN1dCBwcmVzc2VkOicsIGNvbW1hbmQpO1xuICAgIGlmIChjb21tYW5kID09PSAnYWN0aXZhdGUtb3ZlcmxheScpIHtcbiAgICAgIGNocm9tZS50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0sIChbdGFiXSkgPT4ge1xuICAgICAgICBpZiAodGFiPy5pZCkge1xuICAgICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwgeyB0eXBlOiAnQUNUSVZBVEVfT1ZFUkxBWScgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzZW5kIG1lc3NhZ2U6JywgZXJyb3IpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBNZXNzYWdlIGhhbmRsZXIgZm9yIGNvbW11bmljYXRpb24gd2l0aCBwb3B1cCBhbmQgY29udGVudCBzY3JpcHRzXG4gIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICBjb25zb2xlLmxvZygnQmFja2dyb3VuZCByZWNlaXZlZCBtZXNzYWdlOicsIHJlcXVlc3QudHlwZSk7XG5cbiAgICAvLyBSb3V0ZSBBQ1RJVkFURV9PVkVSTEFZIGZyb20gY29udGVudCBzY3JpcHQgYmFjayB0byBjb250ZW50IHNjcmlwdFxuICAgIGlmIChyZXF1ZXN0LnR5cGUgPT09ICdBQ1RJVkFURV9PVkVSTEFZJyAmJiBzZW5kZXIudGFiPy5pZCkge1xuICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2Uoc2VuZGVyLnRhYi5pZCwgeyB0eXBlOiAnQUNUSVZBVEVfT1ZFUkxBWScgfSlcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiBzZW5kUmVzcG9uc2UocmVzcG9uc2UpKVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGFjdGl2YXRlIG92ZXJsYXk6JywgZXJyb3IpO1xuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgYW5ub3RhdGlvbiBwcm9jZXNzaW5nXG4gICAgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ1BST0NFU1NfQU5OT1RBVElPTicpIHtcbiAgICAgIHByb2Nlc3NBbm5vdGF0aW9uKHJlcXVlc3QuYW5ub3RhdGlvbiwgcmVxdWVzdC5yZWxheVVybClcbiAgICAgICAgLnRoZW4oKHJlc3VsdCkgPT4gc2VuZFJlc3BvbnNlKHJlc3VsdCkpXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcHJvY2VzcyBhbm5vdGF0aW9uOicsIGVycm9yKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHNjcmVlbnNob3QgY2FwdHVyZVxuICAgIGlmIChyZXF1ZXN0LnR5cGUgPT09ICdDQVBUVVJFX1NDUkVFTlNIT1QnKSB7XG4gICAgICBjaHJvbWUudGFicy5jYXB0dXJlVmlzaWJsZVRhYih7IGZvcm1hdDogJ3BuZycgfSlcbiAgICAgICAgLnRoZW4oKGRhdGFVcmwpID0+IHtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoZGF0YVVybCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdTY3JlZW5zaG90IGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlOyAvLyBXaWxsIHJlc3BvbmQgYXN5bmNocm9ub3VzbHlcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgdHVubmVsIG1lc3NhZ2VzXG4gICAgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ1RVTk5FTF9DUkVBVEUnKSB7XG4gICAgICBjb25zb2xlLmxvZygnVHVubmVsIGNyZWF0ZSByZXF1ZXN0IHJlY2VpdmVkIHdpdGggcG9ydDonLCByZXF1ZXN0LnRhcmdldFBvcnQpO1xuXG4gICAgICBpZiAoIXJlcXVlc3QudGFyZ2V0UG9ydCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdUVU5ORUxfQ1JFQVRFOiBObyB0YXJnZXQgcG9ydCBwcm92aWRlZCcpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyB0YXJnZXQgcG9ydCBwcm92aWRlZCcgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gR2V0IHJlbGF5IFVSTCBmcm9tIHN0b3JhZ2UgdG8gcGFzcyB0byB0dW5uZWwgbWFuYWdlclxuICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgLmdldChbJ3JlbGF5VXJsJ10pXG4gICAgICAgIC50aGVuKCh7IHJlbGF5VXJsIH0pID0+IHtcbiAgICAgICAgICAvLyBGb3IgdHVubmVscywgbmV2ZXIgdXNlIGNsaXBib2FyZCBtb2RlIC0gYWx3YXlzIHVzZSBhY3R1YWwgc2VydmVyXG4gICAgICAgICAgbGV0IGZpbmFsUmVsYXlVcmwgPSByZWxheVVybDtcbiAgICAgICAgICBpZiAocmVsYXlVcmwgPT09ICdjbGlwYm9hcmQnKSB7XG4gICAgICAgICAgICBmaW5hbFJlbGF5VXJsID0gJ2h0dHBzOi8vYXBpLndpbmdtYW51eC5jb20nO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NraXBwaW5nIGNsaXBib2FyZCBtb2RlIGZvciB0dW5uZWwsIHVzaW5nOicsIGZpbmFsUmVsYXlVcmwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaW5hbFJlbGF5VXJsID0gcmVsYXlVcmwgfHwgJ2h0dHBzOi8vYXBpLndpbmdtYW51eC5jb20nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmxvZygnVXNpbmcgcmVsYXkgVVJMIGZvciB0dW5uZWw6JywgZmluYWxSZWxheVVybCk7XG5cbiAgICAgICAgICByZXR1cm4gdHVubmVsTWFuYWdlci5jcmVhdGVUdW5uZWwocmVxdWVzdC50YXJnZXRQb3J0LCBmaW5hbFJlbGF5VXJsKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKHR1bm5lbCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdUdW5uZWwgY3JlYXRlZCBzdWNjZXNzZnVsbHk6JywgdHVubmVsKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCB0dW5uZWwgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIHR1bm5lbDonLCBlcnJvcik7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBjcmVhdGUgdHVubmVsJyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTsgLy8gV2lsbCByZXNwb25kIGFzeW5jaHJvbm91c2x5XG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ1RVTk5FTF9TVE9QJykge1xuICAgICAgY29uc29sZS5sb2coJ1R1bm5lbCBzdG9wIHJlcXVlc3QgcmVjZWl2ZWQnKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdHVubmVsTWFuYWdlci5zdG9wVHVubmVsKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUdW5uZWwgc3RvcHBlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHN0b3AgdHVubmVsOicsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHN0b3AgdHVubmVsJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7IC8vIFN5bmNocm9ub3VzIHJlc3BvbnNlXG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ1RVTk5FTF9TVEFUVVMnKSB7XG4gICAgICBjb25zb2xlLmxvZygnVHVubmVsIHN0YXR1cyByZXF1ZXN0IHJlY2VpdmVkJyk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHR1bm5lbCA9IHR1bm5lbE1hbmFnZXIuZ2V0Q3VycmVudFR1bm5lbCgpO1xuICAgICAgICBjb25zb2xlLmxvZygnQ3VycmVudCB0dW5uZWwgc3RhdHVzOicsIHR1bm5lbCk7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHR1bm5lbCB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCB0dW5uZWwgc3RhdHVzOicsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGdldCB0dW5uZWwgc3RhdHVzJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7IC8vIFN5bmNocm9ub3VzIHJlc3BvbnNlXG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICAvLyBQcm9jZXNzIGFubm90YXRpb24gd2l0aCBzY3JlZW5zaG90IGFuZCB0ZW1wbGF0ZSBmb3JtYXR0aW5nXG4gIGFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NBbm5vdGF0aW9uKGFubm90YXRpb246IGFueSwgcmVsYXlVcmw6IHN0cmluZykge1xuICAgIHRyeSB7XG4gICAgICBjb25zb2xlLmxvZygnUHJvY2Vzc2luZyBhbm5vdGF0aW9uOicsIHsgcmVsYXlVcmwgfSk7XG5cbiAgICAgIC8vIENhcHR1cmUgc2NyZWVuc2hvdFxuICAgICAgbGV0IHNjcmVlbnNob3REYXRhVXJsID0gJyc7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBkYXRhVXJsID0gYXdhaXQgY2hyb21lLnRhYnMuY2FwdHVyZVZpc2libGVUYWIoeyBmb3JtYXQ6ICdwbmcnIH0pO1xuICAgICAgICBzY3JlZW5zaG90RGF0YVVybCA9IGRhdGFVcmw7XG4gICAgICAgIGNvbnNvbGUubG9nKCdTY3JlZW5zaG90IGNhcHR1cmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignU2NyZWVuc2hvdCBjYXB0dXJlIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCBzY3JlZW5zaG90IHRvIGFubm90YXRpb24gc3RydWN0dXJlIChtYXRjaGluZyBXaW5nbWFuQW5ub3RhdGlvbiB0eXBlKVxuICAgICAgY29uc3QgYW5ub3RhdGlvbldpdGhTY3JlZW5zaG90ID0ge1xuICAgICAgICAuLi5hbm5vdGF0aW9uLFxuICAgICAgICBtZWRpYToge1xuICAgICAgICAgIHNjcmVlbnNob3Q6IHtcbiAgICAgICAgICAgIGRhdGFVcmw6IHNjcmVlbnNob3REYXRhVXJsLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpZiAocmVsYXlVcmwgPT09ICdjbGlwYm9hcmQnKSB7XG4gICAgICAgIC8vIENMSVBCT0FSRCBNT0RFOiBEb3dubG9hZCBzY3JlZW5zaG90IGFuZCB1c2UgbG9jYWwgZmlsZSBwYXRoXG5cbiAgICAgICAgLy8gUHJvY2VzcyBzY3JlZW5zaG90IGZvciBjbGlwYm9hcmQgbW9kZVxuICAgICAgICBjb25zdCB7IGNvbnRlbnQsIGxvY2FsUGF0aCB9ID0gYXdhaXQgc2NyZWVuc2hvdEhhbmRsZXIucHJvY2Vzc0ZvckNsaXBib2FyZChcbiAgICAgICAgICBhbm5vdGF0aW9uV2l0aFNjcmVlbnNob3QsXG4gICAgICAgICAgZGVmYXVsdFRlbXBsYXRlLFxuICAgICAgICAgIHJlbGF5VXJsXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ0Fubm90YXRpb24gZm9ybWF0dGVkIGZvciBjbGlwYm9hcmQnLCB7XG4gICAgICAgICAgaGFzTG9jYWxQYXRoOiAhIWxvY2FsUGF0aFxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgbW9kZTogJ2NsaXBib2FyZCcsXG4gICAgICAgICAgdGV4dDogY29udGVudCxcbiAgICAgICAgICBzY3JlZW5zaG90UGF0aDogbG9jYWxQYXRoXG4gICAgICAgIH07XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNFUlZFUiBNT0RFOiBTZW5kIHRvIHJlbW90ZSBvciBsb2NhbCBzZXJ2ZXJcbiAgICAgICAgLy8gSW5jbHVkZSBzY3JlZW5zaG90IGFzIGJhc2U2NCBpbiB0aGUgcGF5bG9hZFxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3JlbGF5VXJsfS9hbm5vdGF0aW9uc2AsIHtcbiAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShhbm5vdGF0aW9uV2l0aFNjcmVlbnNob3QpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdBbm5vdGF0aW9uIHNlbnQgdG8gc2VydmVyIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbW9kZTogJ3NlcnZlcicsXG4gICAgICAgICAgICBwcmV2aWV3VXJsOiBgJHtyZWxheVVybH0vc2hhcmUvJHthbm5vdGF0aW9uLmlkfWBcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgU2VydmVyIHJlc3BvbmRlZCB3aXRoICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Fubm90YXRpb24gcHJvY2Vzc2luZyBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbn0pOyIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsiTE9HX0xFVkVMUyIsImdldERlZmF1bHRMb2dMZXZlbCIsImNyZWF0ZUxvZ2dlciIsImxvZ2dlciIsIlByb3RvY29sRXJyb3JDb2RlIiwicmVzdWx0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YUFBYTtBQUFBLE1BQ3pCO0FBQUEsTUFDUTtBQUFBLFFBQ0ksS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLFFBQ1YsYUFBYTtBQUFBLE1BQ3pCO0FBQUEsTUFDUTtBQUFBLFFBQ0ksS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLFFBQ1YsYUFBYTtBQUFBLE1BQ3pCO0FBQUEsTUFDUTtBQUFBLFFBQ0ksS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLFFBQ1YsYUFBYTtBQUFBLE1BQ3pCO0FBQUEsTUFDUTtBQUFBLFFBQ0ksS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLFFBQ1YsYUFBYTtBQUFBLE1BQ3pCO0FBQUEsTUFDUTtBQUFBLFFBQ0ksS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLFFBQ1YsYUFBYTtBQUFBLE1BQ3pCO0FBQUEsTUFDUTtBQUFBLFFBQ0ksS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sV0FBVyxDQUFDLFNBQVMsU0FBUyxZQUFZLHFCQUFxQjtBQUFBLFFBQy9ELFVBQVU7QUFBQSxRQUNWLGFBQWE7QUFBQSxNQUN6QjtBQUFBLE1BQ1E7QUFBQSxRQUNJLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLGFBQWE7QUFBQSxNQUN6QjtBQUFBLE1BQ1E7QUFBQSxRQUNJLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLGFBQWE7QUFBQSxNQUN6QjtBQUFBLE1BQ1E7QUFBQSxRQUNJLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLGFBQWE7QUFBQSxNQUN6QjtBQUFBLE1BQ1E7QUFBQSxRQUNJLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLGFBQWE7QUFBQSxNQUN6QjtBQUFBLE1BQ1E7QUFBQSxRQUNJLEtBQUs7QUFBQSxR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
