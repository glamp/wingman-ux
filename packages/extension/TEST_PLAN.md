# Manual Test Plan: Chrome Extension Environment System

## Pre-Test Setup
1. **Clean Chrome Extensions**
   - Go to `chrome://extensions/`
   - Remove any existing "Wingman" extensions
   - Enable "Developer mode" toggle

## Test 1: Development Environment Build & Load
**Expected**: Green DEV badge, environment banner, colored header

```bash
# Build dev version
cd packages/chrome-extension
npm run build:dev
```

**Chrome Steps**:
1. Load unpacked extension from `dist/` folder
2. **Check extension icon**: Should show green "DEV" badge overlay
3. **Click extension icon**: Popup should open
4. **Verify popup UI**:
   - Green "DEV MODE" banner at top
   - Green header background
   - All functionality works (activate, settings)
5. **Test on web page**: Navigate to any website, click activate, verify overlay works

**Pass Criteria**: ✅ Green visual indicators everywhere, full functionality

## Test 2: Production Environment Build & Load  
**Expected**: Clean appearance, no badges or banners

```bash
# Build prod version (remove dev first)
npm run build:prod
```

**Chrome Steps**:
1. Remove dev extension from `chrome://extensions/`
2. Load unpacked extension from `dist/` folder  
3. **Check extension icon**: Should be clean, no badge overlay
4. **Click extension icon**: Popup should open
5. **Verify popup UI**:
   - No environment banner
   - Standard blue header background  
   - All functionality works normally

**Pass Criteria**: ✅ Clean professional appearance, full functionality

## Test 3: Config Injection Verification
**Expected**: Environment configs properly injected at build time

**Steps**:
1. With prod extension loaded, open Chrome DevTools
2. Go to Extensions → Wingman → background page
3. In console, type: `console.log(__WINGMAN_CONFIG__)`
4. **Should see**: Production config object with `environment: "production"`

**Repeat with dev build**:
1. Load dev extension
2. Check background console  
3. **Should see**: Development config with `environment: "development"`

**Pass Criteria**: ✅ Correct config objects, no fetch() calls for configs

## Test 4: Storage Isolation Test
**Expected**: Dev and prod use separate Chrome storage

**Dev Extension Steps**:
1. Load dev extension
2. Open popup, change relay URL to `http://localhost:9999`
3. Note the setting is saved

**Prod Extension Steps** (same Chrome profile):
1. Remove dev, load prod extension
2. Open popup, check relay URL
3. **Should show**: Default `http://localhost:8787` (not the 9999 from dev)

**Pass Criteria**: ✅ Settings don't leak between environments

## Test 5: Hot Reload Verification (Dev Only)
**Expected**: Changes auto-reload extension in dev mode

```bash
# Start dev server
npm run dev
```

**Steps**:
1. Load dev extension from `dist/`
2. Edit `src/popup/popup.html` - change "Wingman" to "Wingman TEST"
3. **Within 2-3 seconds**: Extension should auto-reload
4. Open popup - should show "Wingman TEST"
5. **Verify**: No manual reload needed

**Pass Criteria**: ✅ Automatic reloading on file changes

## Test 6: Cross-Environment Icon Verification
**Expected**: Visual distinction between environments

**Create test files**:
```bash
# Build all environments
npm run build:dev && cp dist/icons/icon16.png /tmp/dev-icon.png
npm run build:staging && cp dist/icons/icon16.png /tmp/staging-icon.png  
npm run build:prod && cp dist/icons/icon16.png /tmp/prod-icon.png
```

**Visual Check**:
1. Open `/tmp/dev-icon.png` - should have green badge
2. Open `/tmp/staging-icon.png` - should have orange badge
3. Open `/tmp/prod-icon.png` - should be clean, no badge

**Pass Criteria**: ✅ Visually distinct icons for each environment

## Test 7: Error Handling & Fallbacks
**Expected**: Graceful degradation when configs fail

**Steps**:
1. Build dev extension
2. Edit `dist/popup.js` - break the config loading by changing `__WINGMAN_CONFIG__` to `__BROKEN__`
3. Load extension, open popup
4. **Should see**: Popup still works, just no environment styling
5. Check console - should see warning, not crash

**Pass Criteria**: ✅ Extension doesn't crash with config errors

---

## Expected Failure Points to Watch For:
- Icons not showing badges (canvas library issues)
- Config injection failing (build-time vs runtime confusion)
- Storage conflicts between environments
- Hot reload breaking (Vite HMR issues)
- Popup crashes with missing configs
- TypeScript compilation errors

## Test Results Log
Use this section to record actual test results:

### Test 1 - Development Build: [ ] PASS [ ] FAIL
Notes:

### Test 2 - Production Build: [ ] PASS [ ] FAIL
Notes:

### Test 3 - Config Injection: [ ] PASS [ ] FAIL
Notes:

### Test 4 - Storage Isolation: [ ] PASS [ ] FAIL
Notes:

### Test 5 - Hot Reload: [ ] PASS [ ] FAIL
Notes:

### Test 6 - Icon Verification: [ ] PASS [ ] FAIL
Notes:

### Test 7 - Error Handling: [ ] PASS [ ] FAIL
Notes: