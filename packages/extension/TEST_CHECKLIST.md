# Wingman Extension Test Checklist

## ✅ Core Functionality Tests

### 1. Extension Installation & Popup
- [ ] Extension installs without errors
- [ ] Popup opens when clicking extension icon
- [ ] All three tabs are visible (Capture, Share, Settings)
- [ ] Tab navigation works smoothly
- [ ] UI renders correctly with MUI components

### 2. Capture Tab Tests
- [ ] "Capture Feedback" button is clickable
- [ ] Output mode indicator shows in bottom-right
- [ ] Keyboard shortcut (Cmd+Shift+K / Alt+Shift+K) activates overlay
- [ ] Last capture time updates after successful capture

### 3. Annotation Overlay Tests
- [ ] Overlay appears on page
- [ ] Element selector highlights elements on hover
- [ ] Click on element opens note panel
- [ ] Selected element stays highlighted
- [ ] ESC key cancels overlay

### 4. Note Panel Tests
- [ ] Text editor autofocuses when panel appears
- [ ] Rich text formatting buttons work (Bold, Italic, Lists, Code)
- [ ] Placeholder text shows "Describe the issue..."
- [ ] Cancel button closes panel and overlay
- [ ] Send button submits annotation
- [ ] Cmd/Ctrl+Enter submits annotation

### 5. Clipboard Mode Tests
- [ ] Select "Clipboard" in Settings
- [ ] Capture annotation
- [ ] Verify success notification appears
- [ ] Check clipboard contains formatted text
- [ ] Notification auto-dismisses after 5 seconds

### 6. Server Mode Tests
- [ ] Select "Remote Server" or "Local Server" in Settings
- [ ] Set appropriate relay URL
- [ ] Capture annotation
- [ ] Verify success notification with preview URL
- [ ] Check server receives annotation

### 7. Share Tab / Tunnel Tests
- [ ] Port auto-detects from current page
- [ ] Port field accepts manual input
- [ ] Start Tunnel button creates tunnel
- [ ] Tunnel URL displays when connected
- [ ] Copy URL button works
- [ ] Stop Tunnel button disconnects
- [ ] Status chip updates (disconnected/connecting/connected)
- [ ] Badge icon updates (green dot when connected)

### 8. Settings Tab Tests
- [ ] Output mode selector works (Clipboard/Local/Remote)
- [ ] Custom relay URL can be set
- [ ] Clear custom URL reverts to default
- [ ] Template selector shows available templates
- [ ] Settings persist after closing popup
- [ ] Settings persist after extension reload

### 9. State Persistence Tests
- [ ] Settings survive popup close/open
- [ ] Settings survive browser restart
- [ ] Tunnel state persists during popup close
- [ ] Last capture time persists

### 10. Error Handling Tests
- [ ] Invalid port number shows error
- [ ] Network failure shows appropriate message
- [ ] Server errors display correctly
- [ ] Extension recovers from errors gracefully

### 11. Cross-Site Tests
- [ ] Works on React apps (localhost:5173)
- [ ] Works on static HTML sites
- [ ] Works on GitHub
- [ ] Works on Google
- [ ] Works on complex SPAs

### 12. Performance Tests
- [ ] Overlay renders quickly
- [ ] No memory leaks during long sessions
- [ ] Multiple captures work without degradation
- [ ] Tunnel maintains stable connection

### 13. Console & Network Capture Tests
- [ ] Console logs are captured
- [ ] Errors are captured
- [ ] Network requests are captured
- [ ] Captured data appears in annotation

### 14. Screenshot Tests
- [ ] Screenshot captures current viewport
- [ ] Screenshot included in clipboard/server payload

### 15. Edge Cases
- [ ] Works with iframes
- [ ] Works with shadow DOM elements
- [ ] Works on pages with CSP
- [ ] Handles very long feedback notes
- [ ] Handles special characters in notes

## 🐛 Issues Found

### Critical Issues
- [ ] (List any blocking issues here)

### Minor Issues
- [ ] (List any non-blocking issues here)

### Improvements
- [ ] (List any UX improvements or nice-to-haves here)

## 📊 Test Summary

**Date**: 2025-09-25
**Version**: 1.0.2
**Tested by**: Claude Code + User

**Results**:
- Core Features: ⚪ Pending
- State Management: ⚪ Pending
- Error Handling: ⚪ Pending
- Performance: ⚪ Pending
- Cross-browser: ⚪ Pending

**Overall Status**: ⚪ Testing in Progress

---

## Test Execution Log

### Test Session 1
**Time**: (timestamp)
**Focus**: Core functionality
**Results**:
- (Document findings here)

### Test Session 2
**Time**: (timestamp)
**Focus**: Tunnel functionality
**Results**:
- (Document findings here)