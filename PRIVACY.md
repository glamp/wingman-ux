# Privacy Policy for Wingman Chrome Extension

*Last Updated: September 26, 2024*

## Overview

Wingman ("the Extension") is committed to protecting your privacy. This Privacy Policy explains how we handle information when you use our Chrome extension for capturing UI feedback.

## Information We DO NOT Collect

Wingman operates entirely within your browser. We do not:
- Collect personal information
- Track your browsing history
- Store your data on our servers
- Share data with third parties
- Use analytics or tracking tools
- Require account creation
- Access your data without your explicit action

## Information Processed Locally

When you actively use Wingman to capture feedback, the following information is processed entirely within your browser:

### Screenshot Data
- Visual capture of the current browser tab (only when you initiate capture)
- Element highlighting and selection markers
- The screenshot is only taken when you explicitly activate the extension

### Page Context
- Current page URL and title
- Selected element's CSS selectors and properties
- Console logs and errors (if present)
- Network timing information
- React component metadata (when available and detectable)
- Viewport dimensions

### User Preferences
- Your chosen output mode (Clipboard, Local, or Remote)
- Custom server URL (if configured)
- These preferences are stored locally using Chrome's storage API

## Data Destinations

You control where captured feedback is sent:

### Clipboard Mode
- Data is copied to your system clipboard
- No network transmission occurs
- Data remains entirely on your device

### Local Mode
- Data is sent to a localhost server you specify
- Transmission occurs only within your local machine
- No data leaves your device

### Remote Mode
- Data is sent to a server URL you configure
- You are responsible for the security and privacy of your chosen endpoint
- We recommend using only trusted, secure (HTTPS) servers

## Data Retention

Wingman does not retain any data:
- No data is stored after you close the extension popup
- Screenshots and feedback are not saved unless you explicitly choose to
- Chrome's storage API only retains your preferences (output mode and server URL)

## Third-Party Services

Wingman does not integrate with any third-party services. If you configure the extension to send data to a remote server, that server's privacy policy applies to how your data is handled after transmission.

## Permissions Explained

The extension requires certain Chrome permissions to function:

- **activeTab**: To capture screenshots of the active tab (only when you trigger it)
- **scripting**: To inject the element selection overlay
- **tabs**: To access tab information for context
- **storage**: To save your preferences locally
- **downloads**: To optionally save screenshots to your device
- **host_permissions**: To inject the feedback UI on websites you choose to annotate

These permissions are used only for the core functionality of capturing and exporting feedback.

## Children's Privacy

Wingman is a developer tool not intended for use by children under 13. We do not knowingly collect information from children.

## Security

All data processing occurs locally in your browser. When using Remote mode, we recommend:
- Only sending data to servers you trust
- Using HTTPS endpoints for secure transmission
- Being aware of sensitive information visible in screenshots

## Open Source

Wingman is open source software. You can review our code at:
https://github.com/glamp/wingman-ux

## Changes to This Policy

We may update this Privacy Policy. Changes will be posted to our GitHub repository with an updated revision date.

## Contact

For questions about this Privacy Policy or Wingman's privacy practices:
- Open an issue on GitHub: https://github.com/glamp/wingman-ux/issues
- Review the source code: https://github.com/glamp/wingman-ux

## Consent

By using Wingman, you consent to this Privacy Policy.

---

© 2024 Wingman. MIT Licensed Open Source Software.