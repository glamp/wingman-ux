# Wingman Chrome Extension - Release Plan

## Overview
Plan for publishing Wingman v1.0.2 to the Chrome Web Store.

**Status**: Developer account verified ✅
**Target**: Initial public release
**Timeline**: Submit within 1-2 days, review takes 1-3 business days

---

## Phase 1: Build & Package

### 1.1 Build Production Package
- [x] Production build completed (2.81 MB)
- [ ] Create ZIP file for Chrome Web Store submission
  ```bash
  npm run zip
  ```
- [ ] Verify ZIP contents include:
  - manifest.json with correct permissions
  - All production icons (16, 48, 128)
  - Compiled scripts and assets
  - No development artifacts

### 1.2 Verify Production Build
- [ ] Load extension from `dist-wxt/chrome-mv3/` in Chrome
- [ ] Test all core functionality:
  - Screenshot capture works
  - Element selection works
  - Annotation panel opens and closes
  - Keyboard shortcuts work (⌘⇧K / Ctrl+Shift+K)
  - Settings persist across sessions
  - All three output modes work (Clipboard, Local, Remote)
- [ ] Check for console errors
- [ ] Verify no development features are exposed

---

## Phase 2: Store Listing Assets

### 2.1 Screenshots (Required: 1-5 images, 1280x800 or 640x400)
Need to capture:
- [ ] **Screenshot 1**: Extension popup showing main interface with "Capture Feedback" button
- [ ] **Screenshot 2**: Element selection overlay in action on a real website
- [ ] **Screenshot 3**: Annotation panel with feedback being written
- [ ] **Screenshot 4**: Settings tab showing configuration options
- [ ] **Screenshot 5**: Share tab showing tunnel/remote capabilities

**Format**: PNG or JPEG, 1280x800 recommended
**Tool**: Native screenshot on Mac, crop to 1280x800

### 2.2 Promotional Images
- [ ] **Small promo tile** (440x280 PNG) - Required for store listing
  - Simple design with Wingman logo + tagline
  - "Capture UI Feedback Instantly"
- [ ] **Large promo tile** (920x680 PNG) - Optional but recommended
- [ ] **Marquee** (1400x560 PNG) - Optional, featured placement

### 2.3 Store Icon
- [x] 128x128 icon ready at `src/public/icons/icon128.png`
- [ ] Verify icon looks good in store listing preview

---

## Phase 3: Store Listing Content

### 3.1 Basic Information
- **Name**: `Wingman`
- **Category**: `Developer Tools` (alternative: `Productivity`)
- **Language**: English (United States)

### 3.2 Summary (132 characters max)
```
Capture UI feedback with screenshots, element selection, and rich context. Perfect for designers, developers, and product teams.
```
(131 characters)

### 3.3 Detailed Description (minimum 128 characters, recommended ~1000)

```markdown
Wingman is a lightweight UX feedback assistant that helps designers, developers, and product teams capture and share UI feedback effortlessly.

## Key Features

🎯 **One-Click Capture**
Press ⌘⇧K (Mac) or Ctrl+Shift+K (Windows/Linux) to instantly activate feedback mode. Click any element on the page to select it and add your feedback.

📸 **Smart Screenshots**
Automatically captures the visible tab area with your selected element highlighted. No need for external screenshot tools.

🔍 **Precise Element Selection**
Click any element to generate robust CSS selectors and capture its properties. Works with complex web applications.

📝 **Rich Context Collection**
Captures everything developers need:
- Screenshot with visual markers
- CSS selectors for precise targeting
- Console logs and errors
- Network timing data
- React component metadata (when available)
- Page URL and viewport size

📋 **Flexible Output**
- **Clipboard**: Copy formatted feedback instantly
- **Local Server**: Send to localhost for development
- **Remote**: Share with your team via secure tunnel

✨ **Beautiful Interface**
Modern, polished UI built with Material Design. Clean animations and thoughtful interactions make feedback capture a pleasure.

## Perfect For

- **Designers**: Quickly flag visual issues and UX problems
- **Developers**: Get precise bug reports with full technical context
- **Product Teams**: Streamline feedback collection and prioritization
- **QA Teams**: Create detailed, reproducible bug reports

## How It Works

1. Press the keyboard shortcut or click the extension icon
2. Click any element on the page to select it
3. Add your feedback in the annotation panel
4. Submit to clipboard, local server, or remote endpoint

That's it! Wingman handles all the technical details like screenshot capture, selector generation, and context collection.

## Privacy & Data

Wingman processes all data locally in your browser. Screenshots and feedback are only sent to the destinations you configure (clipboard, localhost, or your specified remote server). No data is collected or transmitted to third parties.

## Open Source

Wingman is open source and MIT licensed. Contributions welcome!
```

### 3.4 Version Information
- **Version**: `1.0.2` (matches manifest.json)
- **What's New**: Initial public release

---

## Phase 4: Privacy & Compliance

### 4.1 Privacy Policy (Required for extensions handling user data)
- [ ] Create `PRIVACY.md` or host on website
- [ ] Include:
  - What data is captured (screenshots, DOM data, console logs)
  - How data is processed (locally in browser)
  - Where data is sent (user-configured: clipboard, localhost, or remote)
  - Data retention (not stored by extension)
  - No third-party sharing
- [ ] Host publicly (GitHub Pages or project website)
- [ ] Get URL for store listing

### 4.2 Single Purpose Statement
```
Wingman's single purpose is to capture and export web page UI feedback, including screenshots, element context, and technical data, to help teams identify and fix user interface issues.
```

### 4.3 Permission Justifications
Prepare explanations for Chrome Web Store review:

- **activeTab**: Required to capture screenshots of the current tab
- **scripting**: Required to inject the overlay UI for element selection
- **tabs**: Required to access tab information and capture visible content
- **storage**: Required to persist user settings (relay URL, output mode)
- **downloads**: Required for downloading screenshots (optional feature)
- **downloads.ui**: Required to show download progress (optional feature)
- **host_permissions (localhost:*)**: Required for local development server integration
- **host_permissions (<all_urls>)**: Required to inject overlay on any website user wants to annotate

---

## Phase 5: Submission Checklist

### 5.1 Pre-Submission Verification
- [ ] All store assets created and finalized
- [ ] Store listing copy proofread and finalized
- [ ] Privacy policy published and accessible
- [ ] Production ZIP tested one final time
- [ ] Version number matches across manifest and package.json
- [ ] No console warnings or errors in production build

### 5.2 Chrome Web Store Developer Dashboard
1. [ ] Log in to Chrome Web Store Developer Dashboard
2. [ ] Click "New Item" button
3. [ ] Upload production ZIP file
4. [ ] Wait for automated scan to complete
5. [ ] Fill in "Store Listing" tab:
   - [ ] Product name
   - [ ] Summary
   - [ ] Detailed description
   - [ ] Category
   - [ ] Language
6. [ ] Upload "Graphic Assets":
   - [ ] Icon (128x128)
   - [ ] Screenshots (1-5 images)
   - [ ] Small promo tile (440x280)
7. [ ] Fill in "Privacy" tab:
   - [ ] Privacy policy URL
   - [ ] Permission justifications
   - [ ] Single purpose description
8. [ ] Set "Distribution":
   - [ ] Visibility: Public
   - [ ] Regions: All regions (or specific markets)
9. [ ] Review all tabs for completeness
10. [ ] Click "Submit for Review"

### 5.3 Post-Submission
- [ ] Note submission timestamp
- [ ] Monitor email for review feedback (check spam folder)
- [ ] Typical review time: 1-3 business days
- [ ] Respond promptly to any review questions

---

## Phase 6: Launch Preparation

### 6.1 Documentation
- [ ] Update main README with Chrome Web Store link (after approval)
- [ ] Create user guide or getting started doc
- [ ] Update website with extension info (if applicable)

### 6.2 Announcement Plan
- [ ] Prepare announcement text for:
  - GitHub README
  - Social media (if applicable)
  - Developer community (Hacker News, Reddit, etc.)
- [ ] Screenshot and GIF demos ready
- [ ] Link to Chrome Web Store listing

### 6.3 Support Setup
- [ ] GitHub Issues enabled for bug reports
- [ ] Support email address (if needed)
- [ ] FAQ document for common questions

---

## Phase 7: Post-Launch Monitoring

### 7.1 First Week
- [ ] Monitor Chrome Web Store reviews
- [ ] Watch for crash reports or errors
- [ ] Track install count and uninstall rate
- [ ] Respond to user feedback quickly

### 7.2 Ongoing
- [ ] Set up release cadence (monthly? as-needed?)
- [ ] Plan v1.1 features based on feedback
- [ ] Keep dependencies updated
- [ ] Monitor security advisories

---

## Quick Reference

### Commands
```bash
# Build production
npm run build

# Create submission ZIP
npm run zip

# Verify production build locally
# Load from: dist-wxt/chrome-mv3/
```

### Important Files
- Manifest: `packages/extension/wxt.config.ts` (generated to dist-wxt/chrome-mv3/manifest.json)
- Icons: `packages/extension/src/public/icons/`
- Production build: `packages/extension/dist-wxt/chrome-mv3/`
- ZIP output: `packages/extension/.output/` (after `npm run zip`)

### Links
- Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole/
- Publisher Guidelines: https://developer.chrome.com/docs/webstore/program-policies/
- Review Process: https://developer.chrome.com/docs/webstore/review-process/

---

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Build & Package | 30 minutes | Not started |
| Phase 2: Store Assets | 2-3 hours | Not started |
| Phase 3: Store Content | 1 hour | Not started |
| Phase 4: Privacy & Compliance | 1 hour | Not started |
| Phase 5: Submission | 30 minutes | Not started |
| Phase 6: Launch Prep | 1 hour | Not started |
| **Total prep time** | **6-7 hours** | |
| Chrome review time | 1-3 business days | - |
| **Total to launch** | **1-4 days** | |

---

## Notes

- Chrome Web Store has a one-time $5 developer registration fee (already paid ✅)
- Initial review may be more thorough than updates
- If rejected, address feedback and resubmit quickly
- Can submit as "unlisted" first for testing if desired
- Version updates require new review but typically faster