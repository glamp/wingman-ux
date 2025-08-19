#!/bin/bash

echo "==================================="
echo "Wingman Extension Testing Helper"
echo "==================================="
echo ""

# Check if services are running
echo "1. Checking services..."
echo "   Relay Server: http://localhost:8787/health"
curl -s http://localhost:8787/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Relay server is running"
else
    echo "   ❌ Relay server is NOT running"
    echo "   Run: npm start"
    exit 1
fi

echo ""
echo "   Demo App: http://localhost:5177"
curl -s http://localhost:5177 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Demo app is running"
else
    echo "   ⚠️  Demo app is NOT running on port 5177"
    echo "   It might be on another port - check npm start output"
fi

echo ""
echo "2. Extension Build Status:"
if [ -d "packages/chrome-extension/dist" ]; then
    echo "   ✅ Extension is built"
    echo "   Files in dist:"
    ls -la packages/chrome-extension/dist/*.js | awk '{print "      " $9 " (" $5 " bytes)"}'
else
    echo "   ❌ Extension is NOT built"
    echo "   Run: npm run build:all"
    exit 1
fi

echo ""
echo "3. To load the extension in Chrome:"
echo "   a) Open Chrome and go to: chrome://extensions/"
echo "   b) Enable 'Developer mode' (top right)"
echo "   c) Click 'Load unpacked'"
echo "   d) Select: $(pwd)/packages/chrome-extension/dist"
echo ""
echo "4. To test the extension:"
echo "   a) Navigate to http://localhost:5177 (or the demo app port)"
echo "   b) Press Alt+Shift+F to activate Wingman"
echo "   c) Click on an element to select it"
echo "   d) Add a note and submit"
echo ""
echo "5. To check if data is being sent:"
echo "   a) Open Chrome DevTools (F12)"
echo "   b) Go to the Network tab"
echo "   c) Filter by 'annotations'"
echo "   d) Submit feedback and check for POST request"
echo ""
echo "6. Last annotation received by server:"
LAST_ANNOTATION=$(curl -s http://localhost:8787/annotations/last 2>/dev/null)
if [ -n "$LAST_ANNOTATION" ] && [ "$LAST_ANNOTATION" != "null" ]; then
    echo "$LAST_ANNOTATION" | jq '.annotation | {id, createdAt, note, url: .page.url}'
else
    echo "   No annotations received yet"
fi

echo ""
echo "7. To debug extension issues:"
echo "   a) Check extension service worker logs:"
echo "      - Go to chrome://extensions/"
echo "      - Find Wingman, click 'service worker'"
echo "   b) Check content script logs:"
echo "      - Open DevTools Console on the page"
echo "      - Look for '[Wingman' prefixed messages"
echo ""
echo "==================================="