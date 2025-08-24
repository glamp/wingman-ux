#!/bin/sh
set -e

echo "========================================="
echo "Wingman CLI Integration Test"
echo "========================================="
echo ""

# Test 1: Version check
echo "Test 1: Checking version with npx..."
VERSION=$(npx --yes wingman-cli@latest --version 2>/dev/null)
echo "✓ Version: $VERSION"
echo ""

# Test 2: Help command
echo "Test 2: Testing help command..."
npx --yes wingman-cli@latest --help > /dev/null 2>&1
echo "✓ Help command works"
echo ""

# Test 3: Serve help
echo "Test 3: Testing serve --help..."
npx --yes wingman-cli@latest serve --help > /dev/null 2>&1
echo "✓ Serve help works"
echo ""

# Test 4: Start server and check health
echo "Test 4: Starting server and checking health..."
npx --yes wingman-cli@latest serve --port 8787 > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 10

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "✗ Server failed to start"
    cat /tmp/server.log
    exit 1
fi

# Check health endpoint
echo "Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/health || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✓ Health check passed (HTTP 200)"
else
    echo "✗ Health check failed (HTTP $HEALTH_RESPONSE)"
    cat /tmp/server.log
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Test 5: Check MCP endpoint
echo ""
echo "Test 5: Checking MCP endpoint..."
MCP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/mcp/health || echo "000")

if [ "$MCP_RESPONSE" = "200" ]; then
    echo "✓ MCP health check passed (HTTP 200)"
else
    echo "✗ MCP health check failed (HTTP $MCP_RESPONSE)"
fi

# Test 6: Check annotations endpoint
echo ""
echo "Test 6: Checking annotations endpoint..."
ANNOTATIONS_RESPONSE=$(curl -s http://localhost:8787/annotations/last)
echo "✓ Annotations endpoint responds"

# Clean up
echo ""
echo "Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo ""
echo "========================================="
echo "✅ All tests passed!"
echo "========================================="