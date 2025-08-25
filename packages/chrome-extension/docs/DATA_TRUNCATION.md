# Data Truncation Configuration

Wingman Chrome Extension now supports configurable data limits for both capture and template output to manage performance and readability.

## Configuration Levels

### 1. Capture Limits (`maxEntries`)
Controls how many items are stored in memory during browsing:
- **Console**: Default 100 entries (dev), 50 (prod)
- **Network**: Default 50 entries (dev), 25 (prod)
- **Errors**: Default 100 entries (dev), 50 (prod)

### 2. Template Output Limits (`templateLimit`)
Controls how many items appear in the final Claude Code template:
- **Console**: Default 20 entries (dev), 10 (prod)
- **Network**: Default 15 entries (dev), 8 (prod)  
- **Errors**: Default 10 entries (dev), 5 (prod)

## Configuration Files

Settings are defined in environment-specific config files:

### Development (`config/development.json`)
```json
{
  "dataCapture": {
    "console": {
      "maxEntries": 100,
      "templateLimit": 20,
      "description": "Most recent console logs to include in template output"
    },
    "network": {
      "maxEntries": 50,
      "templateLimit": 15,
      "description": "Most recent network requests to include in template output"
    },
    "errors": {
      "maxEntries": 100,
      "templateLimit": 10,
      "description": "Most recent errors to include in template output"
    }
  }
}
```

### Production (`config/production.json`)
Production uses smaller limits for better performance:
- Console: 50 max entries, 10 in template
- Network: 25 max entries, 8 in template
- Errors: 50 max entries, 5 in template

## How It Works

### 1. Data Capture
- Console and network capture classes read configuration on initialization
- Use circular buffer behavior - oldest entries are removed when limits are exceeded
- Configuration is accessed via `globalThis.__WINGMAN_CONFIG__`

### 2. Template Rendering
- **Background script**: Template engine receives truncation config during initialization
- **Content script**: Format function checks config and truncates arrays before rendering
- Template output shows "X most recent of Y total" when truncation occurs

### 3. Visual Indicators
When data is truncated in templates, users see clear indicators:
- "Console Logs (20 most recent of 156)" 
- "Network Activity (15 most recent of 43 requests)"
- "JavaScript Errors (10 most recent of 23)"

## Benefits

1. **Performance**: Prevents memory issues with long-running pages
2. **Readability**: Focuses Claude Code on most recent/relevant data
3. **Configurable**: Different limits per environment (dev vs prod)
4. **Transparent**: Clear indication when truncation occurs
5. **Backward Compatible**: Gracefully handles missing configuration

## Customization

To adjust limits:
1. Edit the appropriate config file (`config/development.json`, `config/production.json`)
2. Rebuild the extension: `npm run build:dev` or `npm run build`
3. Reload the extension in Chrome

The extension will use default values if configuration is missing or invalid.