#!/bin/bash
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${BLUE}[BUILD]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$ROOT_DIR/release"

# Change to root directory
cd "$ROOT_DIR"

# Function to clean build directories
clean_builds() {
    log "Cleaning previous builds..."
    rm -rf packages/*/dist
    rm -rf "$RELEASE_DIR"
    success "Clean complete"
}

# Function to build a package
build_package() {
    local package=$1
    log "Building $package..."
    cd "$ROOT_DIR/packages/$package"
    npm run build
    cd "$ROOT_DIR"
}

# Function to create directory if it doesn't exist
ensure_dir() {
    mkdir -p "$1"
}

# Function to create Chrome extension ZIP
create_chrome_zip() {
    log "Creating Chrome Extension ZIP..."
    local ext_dir="$ROOT_DIR/packages/chrome-extension/dist"
    local release_chrome="$RELEASE_DIR/chrome-extension"
    
    ensure_dir "$release_chrome"
    
    cd "$ext_dir"
    zip -r "$release_chrome/wingman-chrome-extension.zip" . -q
    local zip_size=$(du -h "$release_chrome/wingman-chrome-extension.zip" | cut -f1)
    success "Chrome Extension ZIP created: $zip_size"
    cd "$ROOT_DIR"
}

# Function to package Web SDK
package_web_sdk() {
    log "Packaging Web SDK for release..."
    local sdk_dir="$ROOT_DIR/packages/web-sdk"
    local release_sdk="$RELEASE_DIR/web-sdk"
    
    ensure_dir "$release_sdk"
    
    cp -r "$sdk_dir/dist" "$release_sdk/"
    cp "$sdk_dir/package.json" "$release_sdk/"
    
    # Copy README if it exists
    if [ -f "$sdk_dir/README.md" ]; then
        cp "$sdk_dir/README.md" "$release_sdk/"
    fi
    
    success "Web SDK prepared in release/web-sdk/"
}

# Function to package CLI with embedded dependencies
package_cli() {
    log "Packaging CLI for release..."
    local cli_dir="$ROOT_DIR/packages/cli"
    local release_cli="$RELEASE_DIR/cli"
    
    ensure_dir "$release_cli"
    
    # Copy CLI dist and package.json
    cp -r "$cli_dir/dist" "$release_cli/"
    cp "$cli_dir/package.json" "$release_cli/"
    
    # Create node_modules structure for embedded packages
    ensure_dir "$release_cli/node_modules/@wingman/relay-server"
    ensure_dir "$release_cli/node_modules/@wingman/shared"
    
    # Copy relay-server (with embedded preview-ui)
    cp -r "$ROOT_DIR/packages/relay-server/dist" "$release_cli/node_modules/@wingman/relay-server/"
    cp "$ROOT_DIR/packages/relay-server/package.json" "$release_cli/node_modules/@wingman/relay-server/"
    
    # Copy shared
    cp -r "$ROOT_DIR/packages/shared/dist" "$release_cli/node_modules/@wingman/shared/"
    cp "$ROOT_DIR/packages/shared/package.json" "$release_cli/node_modules/@wingman/shared/"
    
    # Copy README if it exists
    if [ -f "$cli_dir/README.md" ]; then
        cp "$cli_dir/README.md" "$release_cli/"
    fi
    
    success "CLI prepared in release/cli/"
}

# Function to embed preview-ui into relay-server
embed_preview_ui() {
    log "Embedding Preview UI into Relay Server..."
    local preview_dist="$ROOT_DIR/packages/preview-ui/dist"
    local relay_dist="$ROOT_DIR/packages/relay-server/dist/preview-ui"
    
    ensure_dir "$relay_dist"
    cp -r "$preview_dist"/* "$relay_dist/"
    success "Preview UI embedded"
}

# Function to create release README
create_release_readme() {
    log "Creating release README..."
    cat > "$RELEASE_DIR/README.md" << EOF
# Wingman Release Artifacts

## Contents

### Chrome Extension (\`chrome-extension/\`)
- \`wingman-chrome-extension.zip\` - Ready for Chrome Web Store submission
- Load unpacked extension from the extracted ZIP contents

### CLI Package (\`cli/\`)
- Ready for npm publishing with \`npm publish\`
- Includes embedded relay server and preview UI
- Install globally with \`npm install -g wingman-cli\`

### Web SDK (\`web-sdk/\`)
- Ready for npm publishing with \`npm publish\`
- Install in React projects with \`npm install wingman-sdk\`

## Publishing Instructions

### Chrome Extension
1. Go to Chrome Web Store Developer Dashboard
2. Upload \`wingman-chrome-extension.zip\`
3. Fill in store listing details
4. Submit for review

### CLI
\`\`\`bash
cd release/cli
npm publish
\`\`\`

### Web SDK
\`\`\`bash
cd release/web-sdk
npm publish
\`\`\`

## Version: 1.0.0
Built on: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
    success "Release README created"
}

# Main build process
main() {
    echo -e "${GREEN}🚀 Building Wingman Release Artifacts...${NC}\n"
    
    # Clean previous builds
    clean_builds
    
    # Build packages in dependency order
    build_package "shared"
    build_package "web-sdk"
    build_package "preview-ui"
    build_package "relay-server"
    build_package "cli"
    build_package "chrome-extension"
    
    # Create release artifacts
    log "Creating release packages..."
    package_web_sdk
    embed_preview_ui
    package_cli
    create_chrome_zip
    create_release_readme
    
    echo -e "\n${GREEN}✅ Build complete!${NC} Release artifacts are in the ${BLUE}release/${NC} directory"
    echo -e "${YELLOW}📦 Next steps:${NC}"
    echo "  - Chrome Extension: Upload release/chrome-extension/wingman-chrome-extension.zip to Chrome Web Store"
    echo "  - CLI: cd release/cli && npm publish"
    echo "  - Web SDK: cd release/web-sdk && npm publish"
}

# Parse command line arguments
case "${1:-}" in
    --chrome)
        log "Building Chrome Extension only..."
        clean_builds
        build_package "shared"
        build_package "chrome-extension"
        ensure_dir "$RELEASE_DIR"
        create_chrome_zip
        ;;
    --cli)
        log "Building CLI only..."
        clean_builds
        build_package "shared"
        build_package "preview-ui"
        build_package "relay-server"
        build_package "cli"
        ensure_dir "$RELEASE_DIR"
        embed_preview_ui
        package_cli
        ;;
    --sdk)
        log "Building Web SDK only..."
        clean_builds
        build_package "shared"
        build_package "web-sdk"
        ensure_dir "$RELEASE_DIR"
        package_web_sdk
        ;;
    --help|-h)
        echo "Wingman Release Build Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --chrome    Build only Chrome Extension"
        echo "  --cli       Build only CLI package"
        echo "  --sdk       Build only Web SDK"
        echo "  --help      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              # Build everything"
        echo "  $0 --cli        # Build only CLI"
        exit 0
        ;;
    "")
        # No arguments - build everything
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac