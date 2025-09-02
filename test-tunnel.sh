#!/bin/bash

# Wingman Tunnel E2E Test Suite
# This script tests the tunnel system end-to-end

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚇 Wingman Tunnel E2E Test Suite"
echo "================================"

# Configuration
API_PORT=${API_PORT:-8787}
TUNNEL_SESSION="test-tunnel"
TEST_FAILED=0

# Helper functions
test_start() {
    echo -e "${YELLOW}▶ TEST: $1${NC}"
}

test_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
}

test_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    TEST_FAILED=1
}

cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    # Kill any background processes
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null || true
    fi
    # Clean up test session
    rm -f ./.wingman/sessions/${TUNNEL_SESSION}.json 2>/dev/null || true
}

trap cleanup EXIT

# Test 1: Start API Server
test_start "Starting API server"
cd packages/api
FORCE_WEBSOCKET_TUNNEL=true npm run dev > /tmp/api.log 2>&1 &
API_PID=$!
cd ../..
sleep 5

# Check if server is running
if curl -s http://localhost:${API_PORT}/health | grep -q "healthy"; then
    test_pass "API server is running"
else
    test_fail "API server failed to start"
    cat /tmp/api.log
    exit 1
fi

# Test 2: Create tunnel session
test_start "Creating tunnel session"
RESPONSE=$(curl -s -X POST http://localhost:${API_PORT}/tunnel/create \
    -H "Content-Type: application/json" \
    -d '{"sessionId": "'${TUNNEL_SESSION}'", "targetPort": 3000}')

if echo "$RESPONSE" | grep -q "success.*true"; then
    test_pass "Tunnel session created"
else
    test_fail "Failed to create tunnel session"
    echo "$RESPONSE"
    exit 1
fi

# Test 3: Start tunnel client
test_start "Starting tunnel client"
cd tunnel-client
node client.js > /tmp/client.log 2>&1 &
CLIENT_PID=$!
cd ..
sleep 5

# Check if client connected
if grep -q "Successfully registered as developer" /tmp/client.log; then
    test_pass "Tunnel client connected"
else
    test_fail "Tunnel client failed to connect"
    cat /tmp/client.log
    exit 1
fi

# Test 4: Test HTTP GET request through tunnel
test_start "Testing HTTP GET through tunnel"
RESPONSE=$(curl -s -H "Host: ${TUNNEL_SESSION}.localhost" http://localhost:${API_PORT}/)

if echo "$RESPONSE" | grep -q "Wingman Tunnel Test Application"; then
    test_pass "HTTP GET request successful"
else
    test_fail "HTTP GET request failed"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 5: Test JSON API through tunnel
test_start "Testing JSON API through tunnel"
RESPONSE=$(curl -s -H "Host: ${TUNNEL_SESSION}.localhost" http://localhost:${API_PORT}/api/info)

if echo "$RESPONSE" | jq -e '.server == "wingman-test-app"' > /dev/null 2>&1; then
    test_pass "JSON API request successful"
else
    test_fail "JSON API request failed"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 6: Test POST request through tunnel
test_start "Testing HTTP POST through tunnel"
RESPONSE=$(curl -s -X POST \
    -H "Host: ${TUNNEL_SESSION}.localhost" \
    -H "Content-Type: application/json" \
    -d '{"test": "data", "timestamp": "'$(date +%s)'"}' \
    http://localhost:${API_PORT}/api/echo)

if echo "$RESPONSE" | jq -e '.echo.test == "data"' > /dev/null 2>&1; then
    test_pass "HTTP POST request successful"
else
    test_fail "HTTP POST request failed"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 7: Test large response through tunnel
test_start "Testing large response (>10KB)"
RESPONSE_SIZE=$(curl -s -H "Host: ${TUNNEL_SESSION}.localhost" http://localhost:${API_PORT}/ | wc -c)

if [ $RESPONSE_SIZE -gt 10000 ]; then
    test_pass "Large response handled successfully (${RESPONSE_SIZE} bytes)"
else
    test_fail "Large response test failed (${RESPONSE_SIZE} bytes)"
    exit 1
fi

# Test 8: Test error handling
test_start "Testing error handling (404)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: ${TUNNEL_SESSION}.localhost" http://localhost:${API_PORT}/nonexistent)

if [ "$RESPONSE" = "404" ]; then
    test_pass "Error handling works correctly"
else
    test_fail "Error handling failed (expected 404, got $RESPONSE)"
    exit 1
fi

# Test 9: Test concurrent requests
test_start "Testing concurrent requests"
# Store current request count
BEFORE_COUNT=$(grep -c "Request completed" /tmp/client.log 2>/dev/null || echo 0)

# Send 10 concurrent requests
for i in {1..10}; do
    curl -s -H "Host: ${TUNNEL_SESSION}.localhost" http://localhost:${API_PORT}/api/ping > /dev/null &
done
# Wait for all background jobs
wait

# Give a moment for logs to flush
sleep 1

# Check new request count
AFTER_COUNT=$(grep -c "Request completed" /tmp/client.log 2>/dev/null || echo 0)
NEW_REQUESTS=$((AFTER_COUNT - BEFORE_COUNT))

if [ $NEW_REQUESTS -ge 10 ]; then
    test_pass "Concurrent requests handled successfully ($NEW_REQUESTS new requests)"
else
    test_fail "Concurrent request test failed ($NEW_REQUESTS new requests)"
    exit 1
fi

# Test 10: Test WebSocket endpoint directly
test_start "Testing WebSocket endpoint"
WS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
    http://localhost:${API_PORT}/ws)

if [ "$WS_RESPONSE" = "101" ]; then
    test_pass "WebSocket endpoint responds correctly"
else
    test_fail "WebSocket endpoint test failed (expected 101, got $WS_RESPONSE)"
    exit 1
fi

echo ""
echo "================================"
if [ $TEST_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo "The tunnel system is working correctly!"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo "Please check the output above for details."
    exit 1
fi