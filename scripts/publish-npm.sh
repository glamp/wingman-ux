#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${BLUE}[PUBLISH]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to check if logged into npm
check_npm_auth() {
    if ! npm whoami &>/dev/null; then
        error "Not logged into npm. Please run 'npm login' first."
        exit 1
    fi
    local npm_user=$(npm whoami)
    success "Logged in as: $npm_user"
}

# Function to check package exists
check_package_exists() {
    local package_name=$1
    if npm view "$package_name" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to publish package
publish_package() {
    local package_dir=$1
    local package_name=$2
    
    log "Publishing $package_name..."
    cd "$package_dir"
    
    # Check if package exists
    if check_package_exists "$package_name"; then
        local current_version=$(npm view "$package_name" version)
        local local_version=$(node -p "require('./package.json').version")
        
        if [ "$current_version" == "$local_version" ]; then
            warn "Package $package_name@$local_version already exists. Skipping."
            return 0
        fi
        
        log "Current version: $current_version, Publishing: $local_version"
    else
        log "Publishing new package: $package_name"
    fi
    
    # Build the package if not already built
    if [ ! -d "dist" ]; then
        log "Building $package_name..."
        npm run build
    else
        log "Using existing build for $package_name"
    fi
    
    # Dry run first
    log "Running dry-run for $package_name..."
    npm publish --dry-run
    
    # Ask for confirmation
    echo -e "${YELLOW}Ready to publish $package_name. Continue? (y/n)${NC}"
    read -r response
    if [[ "$response" != "y" ]]; then
        warn "Skipping $package_name"
        return 0
    fi
    
    # Publish
    npm publish --access public
    success "Published $package_name successfully!"
}

# Main function
main() {
    echo -e "${GREEN}🚀 Publishing Wingman packages to npm...${NC}\n"
    
    # Check npm authentication
    check_npm_auth
    
    # Build everything first
    log "Building all packages..."
    cd "$ROOT_DIR"
    ./scripts/build-release.sh
    
    # Publish packages
    echo -e "\n${BLUE}Publishing packages:${NC}"
    
    # Web SDK
    echo -e "\n${YELLOW}1. Web SDK (wingman-sdk)${NC}"
    publish_package "$ROOT_DIR/release/web-sdk" "wingman-sdk"
    
    # CLI
    echo -e "\n${YELLOW}2. CLI (wingman-cli)${NC}"
    publish_package "$ROOT_DIR/release/cli" "wingman-cli"
    
    echo -e "\n${GREEN}✅ Publishing complete!${NC}"
    echo -e "${YELLOW}📦 Next steps:${NC}"
    echo "  - Test installation: npm install -g wingman-cli"
    echo "  - Test SDK: npm install wingman-sdk"
    echo "  - Upload Chrome Extension to Web Store"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Wingman NPM Publish Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --cli     Publish only the CLI package"
        echo "  --sdk     Publish only the Web SDK package"
        echo "  --help    Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              # Publish all packages"
        echo "  $0 --cli        # Publish only CLI"
        echo "  $0 --sdk        # Publish only SDK"
        exit 0
        ;;
    --cli)
        check_npm_auth
        cd "$ROOT_DIR"
        ./scripts/build-release.sh --cli
        publish_package "$ROOT_DIR/release/cli" "wingman-cli"
        ;;
    --sdk)
        check_npm_auth
        cd "$ROOT_DIR"
        ./scripts/build-release.sh --sdk
        publish_package "$ROOT_DIR/release/web-sdk" "wingman-sdk"
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac