#!/bin/sh
set -e

echo "========================================="
echo "Wingman CLI NPM Package Test"
echo "========================================="
echo ""

# Test 1: Check if package exists on npm
echo "Test 1: Checking if wingman-cli exists on npm..."
npm config set registry https://registry.npmjs.org/
PACKAGE_VERSION=$(npm view wingman-cli version 2>/dev/null || echo "")

if [ -n "$PACKAGE_VERSION" ]; then
    echo "✓ Package found: wingman-cli@$PACKAGE_VERSION"
else
    echo "✗ Package not found on npm"
    echo "Trying alternative check..."
    curl -s https://registry.npmjs.org/wingman-cli | grep -q '"name":"wingman-cli"'
    if [ $? -eq 0 ]; then
        echo "✓ Package exists in registry (via curl)"
    else
        echo "✗ Package not accessible"
        exit 1
    fi
fi
echo ""

# Test 2: Try to download package
echo "Test 2: Downloading package..."
npm pack wingman-cli@latest --dry-run > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Package can be downloaded"
else
    echo "✗ Failed to download package"
    exit 1
fi
echo ""

# Test 3: Install and test locally (faster than npx)
echo "Test 3: Installing package locally..."
npm install wingman-cli@latest --no-save > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Package installed successfully"
else
    echo "✗ Failed to install package"
    exit 1
fi
echo ""

# Test 4: Run version command
echo "Test 4: Testing installed command..."
VERSION=$(./node_modules/.bin/wingman --version 2>/dev/null)
if [ -n "$VERSION" ]; then
    echo "✓ Command works: version $VERSION"
else
    echo "✗ Command failed"
    exit 1
fi
echo ""

# Test 5: Test help command
echo "Test 5: Testing help command..."
./node_modules/.bin/wingman --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ All tests passed!"
echo "========================================="