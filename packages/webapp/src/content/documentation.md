# Wingman Documentation

Learn how to use Wingman and customize it to your workflow.

## Getting Started

### Overview

Wingman is a lightweight Chrome extension that helps developers capture and share UX feedback with AI-ready prompts. It's designed to streamline the process of reporting UI issues and getting them fixed quickly.

**Key Features:**
- Screenshot capture with element selection
- Console log and error collection
- Network activity tracking
- React DevTools integration (enhanced with SDK)
- Customizable prompt templates
- Clipboard mode for easy sharing
- **NEW:** React SDK for deeper integration

### How to Capture Feedback

#### Quick Capture (Keyboard Shortcut)

Press **⌘+Shift+K** (Mac) or **Ctrl+Shift+K** (Windows/Linux) to start capturing feedback.

#### Steps to Capture

1. Press the keyboard shortcut or click "Capture Feedback" in the extension
2. Click on any element on the page or drag to select a region
3. Add your feedback description in the popup
4. Click "Submit" to generate the AI-ready prompt

> **Note:** The extension automatically captures console logs, network requests, and React component information (if available) to provide context for debugging.

### Output Modes

Wingman currently operates in **Clipboard Mode**, making it easy to paste feedback directly into your AI assistant of choice.

- **📋 Clipboard Mode**: Copies the formatted feedback to your clipboard. Screenshots are saved to your Downloads folder and referenced in the prompt.

*Server modes (Local and Remote) are coming soon for team collaboration features.*

## React SDK Integration (wingman-sdk)

### Why Use the SDK?

The Wingman SDK supercharges your React application with enhanced feedback capabilities:

- **Automatic React metadata extraction** - Component names, props, and state
- **OAuth tunnel support** - Seamless development with ngrok/localtunnel
- **Zero configuration** - Drop in and go
- **Privacy-first** - All data stays local

### Installation

Choose your package manager:

```bash
# npm
npm install wingman-sdk

# yarn
yarn add wingman-sdk

# pnpm
pnpm add wingman-sdk

# bun
bun add wingman-sdk
```

### Quick Start

Wrap your React app with the `WingmanProvider`:

```jsx
// main.jsx or App.jsx
import { WingmanProvider } from 'wingman-sdk';

function App() {
  return (
    <WingmanProvider config={{ debug: true }}>
      {/* Your app components */}
    </WingmanProvider>
  );
}

export default App;
```

That's it! The SDK now automatically:
- Connects with the Wingman Chrome Extension
- Extracts React component metadata
- Provides enhanced selectors
- Captures component props and state

### Configuration Options

```jsx
<WingmanProvider
  config={{
    enabled: true,           // Enable/disable SDK
    debug: false,           // Console logging
    endpoint: 'http://localhost:8787/annotations', // Custom endpoint
    oauth: {                // OAuth tunnel support
      routes: ['/auth/*', '/callback'],
      modifyRedirectUri: (uri, tunnelDomain) => {
        return uri.replace(/https?:\/\/[^\/]+/, tunnelDomain);
      }
    }
  }}
>
```

### Using Hooks

Access Wingman functionality in your components:

```jsx
import { useWingman } from 'wingman-sdk';

function MyComponent() {
  const {
    isActive,      // SDK status
    sendFeedback,  // Manual feedback
    config        // Current config
  } = useWingman();

  return (
    <button onClick={() => sendFeedback({ custom: 'data' })}>
      Report Issue
    </button>
  );
}
```

### OAuth Tunnel Support

For local development with OAuth providers:

```jsx
// Automatically handles tunnel detection
<WingmanProvider
  config={{
    oauth: {
      routes: ['/auth/*', '/signin/callback'],
      envOverrides: {
        'VITE_AUTH_REDIRECT': '{tunnelDomain}/callback',
        'NEXT_PUBLIC_REDIRECT_URI': '{tunnelDomain}'
      }
    }
  }}
>
```

The SDK automatically detects when you're using tunnels (ngrok, localtunnel, etc.) and updates OAuth redirect URIs accordingly.

### What Gets Captured?

With the SDK installed, Wingman captures:

```json
{
  "react": {
    "componentName": "UserProfile",
    "displayName": "UserProfileCard",
    "props": {
      "userId": "123",
      "theme": "dark",
      "showAvatar": true
    },
    "state": {
      "isEditing": false,
      "hasUnsavedChanges": true
    },
    "hooks": ["useState", "useEffect", "useContext"],
    "parentComponents": ["Dashboard", "SettingsPage"]
  }
}
```

### Framework Integration

The SDK works with:
- **Create React App** - Zero config
- **Next.js** - App Router & Pages Router
- **Vite** - Full HMR support
- **Remix** - SSR compatible
- **Gatsby** - Static site ready

### Best Practices

1. **Install at the root** - Wrap your app once at the highest level
2. **Enable debug in development** - `config={{ debug: process.env.NODE_ENV === 'development' }}`
3. **Sanitize sensitive data** - The SDK automatically removes functions and large objects
4. **Use with Chrome Extension** - The SDK enhances but doesn't replace the extension

### Troubleshooting SDK Issues

**SDK not detecting components?**
- Ensure you're wrapping at the root level
- Check that React DevTools can see your components
- Try enabling debug mode

**OAuth redirects failing?**
- Verify your OAuth routes match your provider's callback URLs
- Check tunnel domain detection with debug logging
- Ensure envOverrides match your env variable names

**Props/State not captured?**
- React DevTools hook must be available
- Production builds may optimize away component names
- Use displayName for better component identification

## Customizing Prompt Templates

### New Feature Alert! 🎉

You can now customize the prompt template to match your preferred AI assistant's format!

### Accessing the Template Editor

1. Click the Wingman extension icon in Chrome
2. Navigate to the Settings tab (gear icon)
3. Scroll down to the "Prompt Template" section
4. Edit the template using Handlebars-style syntax
5. Click outside the text area to auto-save

### Template Syntax

Templates use Handlebars-style syntax for variables and conditionals:

```handlebars
{{userNote}}                           # Insert a variable
{{#if hasErrors}}...{{/if}}           # Conditional content
{{#each networkRequests}}...{{/each}}  # Loop through arrays
```

### Available Variables

#### Basic Information
- `{{userNote}}` - User's feedback text
- `{{pageUrl}}` - Current page URL
- `{{pageTitle}}` - Page title
- `{{capturedAt}}` - Timestamp of capture
- `{{screenshotUrl}}` - Screenshot URL or file path
- `{{annotationId}}` - Unique annotation ID

#### Selection Details
- `{{targetRectX}}` - X position of selected area
- `{{targetRectY}}` - Y position of selected area
- `{{targetRectWidth}}` - Width of selected area
- `{{targetRectHeight}}` - Height of selected area
- `{{targetSelector}}` - CSS selector of element

#### Viewport Information
- `{{viewportWidth}}` - Browser viewport width
- `{{viewportHeight}}` - Browser viewport height
- `{{viewportDpr}}` - Device pixel ratio

#### Technical Data (Arrays)

Use these with `{{#each}}` loops:

- `{{#each errors}}` - JavaScript errors
  - `{{message}}` - Error message
  - `{{stack}}` - Stack trace
  - `{{timestamp}}` - When it occurred

- `{{#each consoleLogs}}` - Console output
  - `{{level}}` - Log level (log, warn, error)
  - `{{args}}` - Log content
  - `{{timestamp}}` - When logged

- `{{#each networkRequests}}` - Network activity
  - `{{url}}` - Request URL
  - `{{status}}` - HTTP status code
  - `{{duration}}` - Request duration in ms
  - `{{initiatorType}}` - Type of request

#### React Information
- `{{reactComponentName}}` - Component name
- `{{reactPropsJson}}` - Props as JSON
- `{{reactStateJson}}` - State as JSON
- `{{reactDataSource}}` - How data was obtained

#### Conditional Helpers
- `{{#if hasErrors}}` - Check if errors exist
- `{{#if hasConsole}}` - Check if console logs exist
- `{{#if hasNetwork}}` - Check if network requests exist
- `{{#if hasReact}}` - Check if React data exists

### Example Templates

#### Minimal Template

```handlebars
# UI Issue

{{userNote}}

![Screenshot]({{screenshotUrl}})

Page: {{pageUrl}}
```

#### Debug-Focused Template

```handlebars
## Bug Report: {{pageTitle}}

**User Feedback:** {{userNote}}

**Screenshot:** ![]({{screenshotUrl}})

{{#if hasErrors}}
### Errors ({{errorCount}}):
{{#each errors}}
- [{{timestamp}}] {{message}}
{{/each}}
{{/if}}

{{#if hasConsole}}
### Console Output:
{{#each consoleLogs}}
- [{{level}}] {{args}}
{{/each}}
{{/if}}

{{#if hasNetwork}}
### Network Activity:
{{#each networkRequests}}
- {{url}} ({{status}}) - {{duration}}ms
{{/each}}
{{/if}}
```

#### Cursor AI Template

```handlebars
Fix this UI issue:

{{userNote}}

Element: {{targetSelector}}
Position: {{targetRectX}}, {{targetRectY}}

![]({{screenshotUrl}})
```

#### ChatGPT Template

```handlebars
I need help fixing a UI issue on my website.

**Description:**
{{userNote}}

**Page:** {{pageUrl}}
**Element:** {{targetSelector}}

Please analyze the screenshot and provide a solution:
![Screenshot]({{screenshotUrl}})

{{#if hasErrors}}
**Errors detected:**
{{#each errors}}
- {{message}}
{{/each}}
{{/if}}
```

### Template Best Practices

1. **Keep it concise**: AI assistants work better with clear, focused prompts
2. **Screenshot first**: Many AI models now support vision, so lead with the screenshot
3. **Context matters**: Include errors and console logs only when debugging
4. **Test your template**: Try it with different scenarios to ensure it works well
5. **Reset if needed**: Use the "Reset to Default" button if something goes wrong

## Keyboard Shortcuts

- **⌘+Shift+K** (Mac) / **Ctrl+Shift+K** (Windows/Linux) - Start capture
- **Escape** - Cancel capture mode
- **Enter** - Submit feedback (when annotation panel is open)

## Tips and Tricks

### For Best Results

1. **Be specific** in your feedback - describe what's wrong and what should happen
2. **Select the exact element** having issues rather than a large region
3. **Include steps to reproduce** if the issue isn't immediately visible
4. **Check console logs** are enabled in Settings if debugging JavaScript issues

### Common Use Cases

- **Design reviews**: Capture UI inconsistencies and styling issues
- **Bug reports**: Document errors with full technical context
- **Feature requests**: Show exactly where new functionality should go
- **User testing**: Collect feedback from users with screenshots

## Privacy and Data

### What Data is Collected

When you capture feedback, Wingman collects:
- Screenshot of the visible tab
- URL and page title
- Selected element information
- Console logs (last 50 entries)
- Network requests (last 25 entries)
- JavaScript errors
- React component data (if available)

### Data Storage

In **Clipboard Mode**:
- Screenshots are saved locally to your Downloads folder
- All data stays on your device
- Nothing is sent to external servers

### Data Limits

To keep prompts manageable:
- Console logs: Last 50 entries (10 shown in template)
- Network requests: Last 25 entries (8 shown in template)
- Errors: Last 50 entries (5 shown in template)

## Troubleshooting

### Extension Not Working?

1. **Refresh the page** after installing the extension
2. **Check permissions** - the extension needs access to the current tab
3. **Disable conflicting extensions** that might interfere with overlays
4. **Update Chrome** to the latest version

### Screenshot Issues

- **Black screenshots**: Some sites block screenshot capture. Try using region selection instead
- **Missing elements**: Dynamic content might not be captured. Wait for page to fully load
- **Large screenshots**: Files are saved to Downloads folder, check available disk space

### Template Not Updating?

- Changes are auto-saved when you click outside the text area
- Use "Reset to Default" if the template becomes corrupted
- Check for syntax errors in Handlebars expressions

## Coming Soon

### Planned Features

- **🌐 Remote Server Mode**: Share feedback with your team
- **💻 Local Server Mode**: Self-hosted option for privacy
- **🔄 Real-time Sync**: Live collaboration on feedback
- **📊 Analytics Dashboard**: Track feedback patterns
- **🔗 Integrations**: Direct integration with issue trackers
- **📱 Mobile Support**: Capture feedback from mobile browsers

### API Development

When server modes are released, you'll be able to:
- Send annotations to `POST /annotations`
- Retrieve feedback with `GET /annotations/:id`
- Create shareable links
- Use WebSocket connections for real-time updates

## Support

Need help? Here's how to get support:

- **Documentation**: You're reading it!
- **GitHub Issues**: Report bugs and request features
- **Chrome Web Store**: Leave a review and get community help
- **Email**: support@wingmanux.com (coming soon)

## Version History

### v1.0.2 (Current)
- Added customizable prompt templates
- Improved React DevTools integration
- Enhanced clipboard mode with local screenshot saving
- Reduced network request verbosity in templates

### v1.0.1
- Fixed keyboard shortcut conflicts
- Improved element selection accuracy
- Added dark mode support

### v1.0.0
- Initial release
- Basic screenshot capture
- Console and network logging
- Clipboard mode

---

Made with ❤️ by developers, for developers. Wingman is your AI copilot for UX feedback.