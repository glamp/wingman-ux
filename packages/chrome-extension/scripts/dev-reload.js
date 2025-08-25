#!/usr/bin/env node

/**
 * Simple file watcher that triggers Chrome Extension reload
 * This is more reliable than traditional HMR for Chrome Extensions
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const WATCH_DIRS = [
  path.join(__dirname, '../src'),
  path.join(__dirname, '../manifests'),
  path.join(__dirname, '../config')
];

const DEBOUNCE_MS = 1000;
let reloadTimeout;

console.log('🔄 Chrome Extension Auto-Reload Active');
console.log('Watching for changes in:', WATCH_DIRS.map(d => path.relative(process.cwd(), d)).join(', '));

// Create a reload trigger file that the extension can monitor
const RELOAD_TRIGGER_FILE = path.join(__dirname, '../dist/development/.reload');

function triggerReload() {
  clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    console.log('[' + new Date().toLocaleTimeString() + '] File change detected, triggering reload...');
    
    // Touch the reload trigger file
    fs.writeFileSync(RELOAD_TRIGGER_FILE, Date.now().toString());
    
    // Also try to reload via Chrome DevTools Protocol if available
    // This requires Chrome to be started with --remote-debugging-port=9222
    exec('curl -s http://localhost:9222/json/list', (error, stdout) => {
      if (!error) {
        try {
          const tabs = JSON.parse(stdout);
          const extensionTab = tabs.find(tab => 
            tab.url && tab.url.includes('chrome-extension://')
          );
          if (extensionTab) {
            exec(`curl -s -X POST "${extensionTab.webSocketDebuggerUrl.replace('ws://', 'http://').replace('/devtools/page/', '/json/runtime/evaluate/')}" -d '{"expression":"chrome.runtime.reload()"}'`);
            console.log('✅ Extension reloaded via DevTools Protocol');
          }
        } catch (e) {
          // Silently fail if DevTools Protocol not available
        }
      }
    });
  }, DEBOUNCE_MS);
}

// Watch for file changes
WATCH_DIRS.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.includes('/.') && !filename.includes('node_modules')) {
        triggerReload();
      }
    });
  }
});

// Keep the process running without blocking stdin
setInterval(() => {}, 1000000);

console.log('Press Ctrl+C to stop watching\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping auto-reload watcher');
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});