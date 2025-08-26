#!/bin/bash
set -e

# Deploy Wingman API to Fly.io
echo "Deploying Wingman API to Fly.io..."

# Ensure we're in the project root
cd "$(dirname "$0")"

# Build and deploy using Fly with correct context
fly deploy \
  --app wingman-tunnel \
  --config packages/wingman-api/fly.toml \
  --dockerfile packages/wingman-api/Dockerfile \
  --build-arg NODE_ENV=production \
  --local-only

echo "Deployment complete!"