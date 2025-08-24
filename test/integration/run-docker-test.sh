#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🐳 Building Docker test image..."
docker build -t wingman-test "$SCRIPT_DIR"

echo ""
echo "🧪 Running integration test..."
docker run --rm wingman-test

echo ""
echo "✅ Docker integration test completed successfully!"