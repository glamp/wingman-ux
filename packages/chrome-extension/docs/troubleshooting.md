# Troubleshooting Guide

This guide covers common issues and solutions for Chrome extension development using both the Personal Chrome and Playwright MCP workflows.

## Table of Contents

- [Chrome Launch Issues](#chrome-launch-issues)
- [Extension Loading Problems](#extension-loading-problems)
- [Build and Development Issues](#build-and-development-issues)
- [File Watching Problems](#file-watching-problems)
- [Playwright MCP Issues](#playwright-mcp-issues)
- [Network and API Issues](#network-and-api-issues)
- [Performance Problems](#performance-problems)
- [macOS-Specific Issues](#macos-specific-issues)

## Chrome Launch Issues

### Chrome Fails to Start

**Symptoms:**
- Error: "Failed to start Chrome"
- Chrome process exits immediately
- No Chrome window appears

**Solutions:**

1. **Close all Chrome processes:**
   ```bash
   # Force quit all Chrome processes
   pkill -f "Google Chrome"
   
   # Wait a few seconds, then try again
   npm run dev:chrome:personal
   ```

2. **Check Chrome installation:**
   ```bash
   # Verify Chrome is installed at expected location
   ls -la "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   ```

3. **Try with fresh profile:**
   ```bash
   npm run dev:chrome:fresh
   ```

4. **Manual Chrome launch test:**
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version
   ```

### Chrome Launches But Extension Not Loaded

**Symptoms:**
- Chrome opens successfully
- Extension icon not visible in toolbar
- Extension not listed in chrome://extensions/

**Solutions:**

1. **Verify extension build exists:**
   ```bash
   ls -la packages/chrome-extension/dist/development/manifest.json
   ```

2. **Check manifest.json validity:**
   ```bash
   cat packages/chrome-extension/dist/development/manifest.json | json_pp
   ```

3. **Rebuild extension:**
   ```bash
   npm run clean && npm run build:dev
   ```

4. **Check Chrome console for errors:**
   - Open Chrome DevTools (F12)
   - Check Console tab for extension-related errors
   - Check chrome://extensions/ for error messages

## Extension Loading Problems

### Permission Denied Errors

**Symptoms:**
- "Permission denied" when accessing extension files
- Chrome fails to read extension directory

**Solutions:**

1. **Check directory permissions:**
   ```bash
   ls -la packages/chrome-extension/dist/
   chmod -R 755 packages/chrome-extension/dist/
   ```

2. **Verify no file locks:**
   ```bash
   lsof packages/chrome-extension/dist/development/
   ```

3. **Clear Chrome extension cache:**
   - Go to chrome://extensions/
   - Toggle Developer mode off and on
   - Remove and reload the extension

### Extension Shows as Corrupted

**Symptoms:**
- Extension appears with "corrupted" status in chrome://extensions/
- Extension icon shows error indicator

**Solutions:**

1. **Clean and rebuild:**
   ```bash
   npm run clean:all
   npm run build:dev
   ```

2. **Check for build errors:**
   ```bash
   npm run build:dev 2>&1 | tee build.log
   ```

3. **Validate manifest.json:**
   - Ensure all required fields are present
   - Check file paths are correct
   - Verify content script paths exist

## Build and Development Issues

### TypeScript Compilation Errors

**Symptoms:**
- Build fails with TypeScript errors
- "Type checking service" errors

**Solutions:**

1. **Check TypeScript configuration:**
   ```bash
   npx tsc --noEmit
   ```

2. **Clear TypeScript cache:**
   ```bash
   rm -rf node_modules/.cache
   npm run build:dev
   ```

3. **Verify dependencies:**
   ```bash
   npm install
   npm audit fix
   ```

### Vite Build Issues

**Symptoms:**
- "Failed to resolve import" errors
- Build hangs or fails unexpectedly

**Solutions:**

1. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run build:dev
   ```

2. **Check Vite configuration:**
   ```bash
   npx vite --version
   cat vite.config.ts
   ```

3. **Dependency conflicts:**
   ```bash
   npm ls
   npm dedupe
   ```

### Environment Variable Issues

**Symptoms:**
- Wrong build environment used
- Environment-specific features not working

**Solutions:**

1. **Check environment variable:**
   ```bash
   echo $WINGMAN_ENV
   ```

2. **Explicitly set environment:**
   ```bash
   WINGMAN_ENV=development npm run build:dev
   ```

3. **Verify environment detection:**
   ```bash
   node -e "console.log('Environment:', process.env.WINGMAN_ENV || 'undefined')"
   ```

## File Watching Problems

### Auto-reload Not Working

**Symptoms:**
- Changes to source files don't trigger rebuilds
- Extension doesn't reload after changes

**Solutions:**

1. **Check chokidar installation:**
   ```bash
   npm list chokidar
   npm install chokidar --save-dev
   ```

2. **Test file watching manually:**
   ```bash
   node -e "
   const chokidar = require('chokidar');
   chokidar.watch('src').on('change', path => console.log('Changed:', path));
   console.log('Watching...');
   "
   ```

3. **Increase file watch limits (macOS):**
   ```bash
   sudo sysctl -w kern.maxfiles=65536
   sudo sysctl -w kern.maxfilesperproc=65536
   ```

### Performance Issues with File Watching

**Symptoms:**
- High CPU usage when watching files
- Slow response to file changes

**Solutions:**

1. **Add exclusions to file watcher:**
   ```javascript
   // In dev-chrome-personal.js
   const watcher = chokidar.watch(srcPath, {
     ignored: [
       /(^|[\/\\])\../,  // dotfiles
       /node_modules/,   // dependencies
       /dist/,           // build output
       /\.git/           // git files
     ],
     persistent: true
   });
   ```

2. **Reduce debounce time:**
   ```javascript
   // Adjust rebuildTimer setTimeout value
   rebuildTimer = setTimeout(async () => {
     // rebuild logic
   }, 250); // Reduced from 500ms
   ```

## Playwright MCP Issues

### MCP Setup Fails

**Symptoms:**
- `npm run dev:playwright:setup` fails
- Dependency installation errors

**Solutions:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   npm run dev:playwright:setup
   ```

2. **Install dependencies manually:**
   ```bash
   npm install --save-dev @microsoft/playwright-mcp @playwright/test
   npx playwright install
   ```

3. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

### Playwright Tests Fail to Run

**Symptoms:**
- Tests fail with browser launch errors
- "Browser not found" errors

**Solutions:**

1. **Install Playwright browsers:**
   ```bash
   npx playwright install
   npx playwright install-deps
   ```

2. **Check browser installation:**
   ```bash
   npx playwright --version
   ls ~/.cache/ms-playwright/
   ```

3. **Run with verbose output:**
   ```bash
   npx playwright test --reporter=line --verbose
   ```

### MCP Server Won't Start

**Symptoms:**
- MCP server fails to initialize
- Connection refused errors

**Solutions:**

1. **Check MCP server configuration:**
   ```bash
   cat .mcp/server-config.json
   node .mcp/server.js --help
   ```

2. **Test MCP server manually:**
   ```bash
   cd packages/chrome-extension
   node .mcp/server.js
   ```

3. **Check Claude Code MCP settings:**
   - Verify MCP server path is correct
   - Check Claude Code logs for connection errors

## Network and API Issues

### Relay Server Connection Problems

**Symptoms:**
- Extension can't connect to localhost:8787
- Network errors in extension console

**Solutions:**

1. **Verify relay server is running:**
   ```bash
   curl http://localhost:8787/health
   lsof -i :8787
   ```

2. **Start relay server:**
   ```bash
   cd packages/relay-server
   npm run dev
   ```

3. **Check CORS configuration:**
   - Ensure relay server allows extension origin
   - Check browser network tab for CORS errors

### API Request Failures

**Symptoms:**
- POST requests to /annotations fail
- Network timeout errors

**Solutions:**

1. **Test API endpoints manually:**
   ```bash
   curl -X POST http://localhost:8787/annotations \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

2. **Check request payload size:**
   - Screenshots can be large (>25MB limit)
   - Enable request size logging in relay server

3. **Verify endpoint configuration:**
   - Check extension popup settings
   - Confirm API endpoint URLs

## Performance Problems

### Slow Extension Loading

**Symptoms:**
- Extension takes long time to appear
- Chrome startup is slow

**Solutions:**

1. **Optimize extension build:**
   ```bash
   npm run build:prod  # Use production build for testing
   ```

2. **Profile extension performance:**
   - Use Chrome DevTools Performance tab
   - Check extension background page performance

3. **Reduce extension size:**
   - Check dist/ directory size
   - Remove unnecessary dependencies

### High Memory Usage

**Symptoms:**
- Chrome uses excessive memory
- System becomes slow

**Solutions:**

1. **Monitor extension memory:**
   - Open Chrome Task Manager (Shift+Esc)
   - Check extension memory usage

2. **Check for memory leaks:**
   - Use Chrome DevTools Memory tab
   - Profile extension over time

3. **Restart Chrome periodically:**
   ```bash
   pkill -f "Google Chrome"
   npm run dev:chrome:personal
   ```

## macOS-Specific Issues

### Gatekeeper Blocking Chrome Launch

**Symptoms:**
- "App can't be opened" dialogs
- Security warnings about Chrome

**Solutions:**

1. **Allow Chrome in Security settings:**
   - System Preferences > Security & Privacy
   - Allow Chrome to run

2. **Remove quarantine attribute:**
   ```bash
   xattr -rd com.apple.quarantine "/Applications/Google Chrome.app"
   ```

### Path Issues

**Symptoms:**
- Chrome not found at expected path
- Different Chrome installation location

**Solutions:**

1. **Find Chrome installation:**
   ```bash
   find /Applications -name "Google Chrome.app" -type d 2>/dev/null
   which chrome
   ```

2. **Update script paths:**
   - Edit `scripts/dev-chrome-personal.js`
   - Modify `CHROME_PATH` constant

3. **Create symlink:**
   ```bash
   ln -s "/path/to/your/chrome" "/Applications/Google Chrome.app"
   ```

## Getting Help

### Debug Information to Collect

When reporting issues, include:

```bash
# System information
uname -a
node --version
npm --version

# Chrome information
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version

# Extension build status
ls -la packages/chrome-extension/dist/development/

# Process information
ps aux | grep -i chrome
lsof -i :8787

# Recent logs
tail -n 50 build.log
```

### Common Log Locations

- **Extension logs**: Chrome DevTools Console
- **Build logs**: Terminal output from npm commands
- **System logs**: Console.app (macOS)
- **Relay server logs**: Terminal running `npm run dev`

### Useful Chrome URLs

- `chrome://extensions/` - Extension management
- `chrome://inspect/#extensions` - Extension debugging
- `chrome://system/` - Chrome system information
- `chrome://crashes/` - Crash reports

## Recovery Procedures

### Complete Reset

If all else fails, perform a complete reset:

```bash
# 1. Clean everything
npm run clean:all
rm -rf node_modules
rm -rf .mcp

# 2. Reinstall dependencies
npm install

# 3. Rebuild extension
npm run build:dev

# 4. Reconfigure MCP (if needed)
npm run dev:playwright:setup

# 5. Test basic functionality
npm run dev:chrome:personal
```

### Emergency Manual Loading

If automated loading fails completely:

1. Build the extension: `npm run build:dev`
2. Open Chrome manually
3. Go to `chrome://extensions/`
4. Enable Developer mode
5. Click "Load unpacked"
6. Select `packages/chrome-extension/dist/development`

This fallback method always works and can help isolate automation-specific issues.