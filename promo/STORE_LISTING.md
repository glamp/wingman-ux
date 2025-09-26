# Chrome Web Store Listing Content

Ready-to-copy content for Chrome Web Store submission.

---

## BASIC INFORMATION

**Extension Name:**

```
Wingman
```

**Category:**

```
Developer Tools
```

**Language:**

```
English (United States)
```

---

## SUMMARY (132 char max)

```
Capture AI ready UI feedback with screenshots, element selection, and rich context. Perfect for designers, developers, and product teams.
```

---

## DETAILED DESCRIPTION

```
Wingman is a lightweight UX feedback assistant that helps designers, developers, and product teams capture and share UI feedback effortlessly.

🎯 One-Click Capture
Press ⌘⇧K (Mac) or Ctrl+Shift+K (Windows/Linux) to instantly activate feedback mode. Click any element on the page to select it and add your feedback.

📸 Smart Screenshots
Automatically captures the visible tab area with your selected element highlighted. No need for external screenshot tools.

🔍 Precise Element Selection
Click any element to generate robust CSS selectors and capture its properties. Works with complex web applications including React, Vue, and Angular.

📝 Rich Context Collection
Captures everything developers need:
• Screenshot with visual markers
• CSS selectors for precise targeting
• Console logs and errors
• Network timing data
• React component metadata (when available)
• Page URL and viewport size

📋 Flexible Output Modes
• Clipboard: Copy formatted feedback instantly
• Local Server: Send to localhost for development
• Remote: Share with your team via secure tunnel

✨ Beautiful Interface
Modern, polished UI with Geist font and gradient themes. Clean animations and thoughtful interactions make feedback capture a pleasure.

Perfect For:
• Designers: Quickly flag visual issues and UX problems
• Developers: Get precise bug reports with full technical context
• Product Teams: Streamline feedback collection and prioritization
• QA Teams: Create detailed, reproducible bug reports

How It Works:
1. Press the keyboard shortcut or click the extension icon
2. Click any element on the page to select it
3. Add your feedback in the annotation panel
4. Generate an AI-ready prompt with full context

Privacy & Data:
Wingman processes all data locally in your browser. Screenshots and feedback are only sent to the destinations you configure (clipboard, localhost, or your specified remote server). No data is collected or transmitted to third parties.

Open Source:
Wingman is open source and MIT licensed. Visit our GitHub repository for documentation, issues, and contributions.
```

---

## VERSION INFORMATION

**Version Number:**

```
1.0.2
```

**What's New:**

```
Initial public release

• Capture UI feedback with one-click screenshot and element selection
• Generate AI-ready prompts with full technical context
• Support for clipboard, local, and remote output modes
• Beautiful Material Design interface with Geist font
• Full React DevTools metadata extraction
• Keyboard shortcuts for quick capture (⌘⇧K / Ctrl+Shift+K)
```

---

## SINGLE PURPOSE STATEMENT

```
Wingman's single purpose is to capture and export web page UI feedback, including screenshots, element context, and technical data, to help teams identify and fix user interface issues.
```

---

## PERMISSION JUSTIFICATIONS

**activeTab**

```
Required to capture screenshots of the current tab when the user activates the feedback tool.
```

**scripting**

```
Required to inject the overlay UI that allows users to select page elements for feedback.
```

**tabs**

```
Required to access tab information (URL, title) and capture visible tab content for screenshots.
```

**storage**

```
Required to persist user preferences including output mode selection and relay server URL.
```

**downloads & downloads.ui**

```
Required to allow users to optionally download captured screenshots to their computer.
```

**host*permissions (http://localhost:*/\_)**

```
Required for integration with local development servers to send feedback directly to localhost endpoints.
```

**host*permissions (https://*/\_)**

```
Required to inject the feedback overlay on any website the user wants to annotate. The extension only activates when the user explicitly triggers it.
```

---

## PROMOTIONAL TEXT (Optional)

**Short Promo (80 chars)**

```
Capture perfect UI feedback with screenshots, selectors, and developer context
```

✓ 79 characters

**Why Choose Wingman? (Elevator Pitch)**

```
Stop sending vague bug reports. Wingman captures everything developers need in one click: pixel-perfect screenshots, precise element selectors, console logs, and React component data. Your feedback becomes actionable instantly.
```

---

## TAGS (for search optimization)

Suggested tags:

- feedback
- screenshot
- bug report
- UI testing
- UX feedback
- developer tools
- React DevTools
- element selector
- annotation
- QA testing
- design review
- user testing

---

## SUPPORT INFORMATION

**Support Email:**

```
[Your email or team email]
```

**Website:**

```
https://github.com/glamp/wingman-ux
```

**Privacy Policy URL:**

```
https://wingmanux.com/privacy
```

---

## CHECKLIST

Before submitting, verify:

- [ ] Extension name is clear and not trademarked
- [ ] Summary is under 132 characters
- [ ] Description is compelling and complete
- [ ] All permissions have justifications
- [ ] Version number matches manifest.json (1.0.2)
- [ ] Category is appropriate (Developer Tools)
- [ ] Support email is valid
- [ ] Privacy policy URL is live (Phase 4)
- [ ] All promotional images uploaded
- [ ] Screenshots show actual extension functionality
