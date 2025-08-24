#!/bin/sh
set -e

echo "========================================="
echo "Wingman CLI Basic Integration Test"
echo "========================================="
echo ""

# Test 1: Version check
echo "Test 1: Checking version with npx..."
VERSION=$(npx --yes wingman-cli@latest --version 2>/dev/null)
if [ -z "$VERSION" ]; then
    echo "✗ Failed to get version"
    exit 1
fi
echo "✓ Version: $VERSION"
echo ""

# Test 2: Help command
echo "Test 2: Testing help command..."
HELP_OUTPUT=$(npx --yes wingman-cli@latest --help 2>/dev/null)
if echo "$HELP_OUTPUT" | grep -q "wingman"; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi
echo ""

# Test 3: Serve help
echo "Test 3: Testing serve --help..."
SERVE_HELP=$(npx --yes wingman-cli@latest serve --help 2>/dev/null)
if echo "$SERVE_HELP" | grep -q "Start the Wingman relay server"; then
    echo "✓ Serve help works"
else
    echo "✗ Serve help failed"
    exit 1
fi
echo ""

echo "========================================="
echo "✅ All basic tests passed!"
echo "========================================="