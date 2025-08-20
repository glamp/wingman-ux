# Wingman Release Artifacts

## Contents

### Chrome Extension (`chrome-extension/`)
- `wingman-chrome-extension.zip` - Ready for Chrome Web Store submission
- Load unpacked extension from the extracted ZIP contents

### CLI Package (`cli/`)
- Ready for npm publishing with `npm publish`
- Includes embedded relay server and preview UI
- Install globally with `npm install -g wingman-cli`

### Web SDK (`web-sdk/`)
- Ready for npm publishing with `npm publish`
- Install in React projects with `npm install wingman-sdk`

## Publishing Instructions

### Chrome Extension
1. Go to Chrome Web Store Developer Dashboard
2. Upload `wingman-chrome-extension.zip`
3. Fill in store listing details
4. Submit for review

### CLI
```bash
cd release/cli
npm publish
```

### Web SDK
```bash
cd release/web-sdk
npm publish
```

## Version: 1.0.0
Built on: 2025-08-20T13:36:28Z
