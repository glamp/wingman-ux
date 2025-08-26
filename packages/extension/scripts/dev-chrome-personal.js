#!/usr/bin/env node

/**
 * Personal Chrome Auto-Reload Script for Wingman Extension
 * 
 * This script launches your personal Chrome browser with the Wingman extension
 * automatically loaded for development and testing. It handles Chrome process
 * management and provides a seamless development experience.
 * 
 * Usage:
 *   node scripts/dev-chrome-personal.js [options]
 * 
 * Options:
 *   --build-first    Build the extension before launching Chrome
 *   --fresh-profile  Use a temporary profile instead of personal profile
 *   --watch         Enable file watching for auto-reload
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist', 'development');
const TEMP_PROFILE_PATH = path.join(os.tmpdir(), 'wingman-chrome-dev');

class ChromeDevLauncher {
  constructor(options = {}) {
    this.options = {
      buildFirst: false,
      freshProfile: false,
      watch: false,
      ...options
    };
    
    this.chromeProcess = null;
    this.watching = false;
  }

  /**
   * Main entry point - launch Chrome with extension
   */
  async launch() {
    try {
      console.log('🚀 Launching Chrome with Wingman extension...\n');
      
      // Build extension if requested
      if (this.options.buildFirst) {
        await this.buildExtension();
      }
      
      // Verify extension exists
      if (!this.verifyExtension()) {
        console.error('❌ Extension build not found. Run with --build-first or run npm run build:dev first');
        process.exit(1);
      }
      
      // Close existing Chrome if needed
      await this.closeExistingChrome();
      
      // Launch Chrome with extension
      await this.launchChrome();
      
      // Set up file watching if requested
      if (this.options.watch) {
        this.setupFileWatching();
      }
      
      console.log('\n✅ Chrome launched successfully!');
      console.log('📱 The Wingman extension should now be available in your browser');
      console.log('🔄 Extension loaded from:', EXTENSION_PATH);
      
      if (this.options.watch) {
        console.log('👀 Watching for file changes...');
      }
      
      console.log('\n💡 Press Ctrl+C to stop and close Chrome');
      
    } catch (error) {
      console.error('❌ Failed to launch Chrome:', error.message);
      process.exit(1);
    }
  }

  /**
   * Build the extension using npm script
   */
  async buildExtension() {
    console.log('🔨 Building extension...');
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build:dev'], {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
      
      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Extension built successfully\n');
          resolve();
        } else {
          reject(new Error(`Build failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Verify extension build exists
   */
  verifyExtension() {
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    return fs.existsSync(manifestPath);
  }

  /**
   * Close existing Chrome processes gracefully
   */
  async closeExistingChrome() {
    return new Promise((resolve) => {
      exec('pkill -f "Google Chrome"', (error) => {
        if (error) {
          // No Chrome processes running, which is fine
          resolve();
        } else {
          console.log('🔄 Closed existing Chrome processes');
          // Wait a moment for processes to fully close
          setTimeout(resolve, 2000);
        }
      });
    });
  }

  /**
   * Launch Chrome with the extension loaded
   */
  async launchChrome() {
    const args = [
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-default-browser-check',
      '--disable-web-security', // For development testing
      '--disable-features=TranslateUI',
    ];
    
    // Use fresh profile if requested
    if (this.options.freshProfile) {
      // Clean up temp profile if it exists
      if (fs.existsSync(TEMP_PROFILE_PATH)) {
        fs.rmSync(TEMP_PROFILE_PATH, { recursive: true, force: true });
      }
      args.push(`--user-data-dir=${TEMP_PROFILE_PATH}`);
      console.log('🔄 Using temporary Chrome profile');
    } else {
      console.log('👤 Using your personal Chrome profile');
    }
    
    return new Promise((resolve, reject) => {
      this.chromeProcess = spawn(CHROME_PATH, args, {
        detached: true,
        stdio: 'ignore'
      });
      
      this.chromeProcess.on('error', (error) => {
        reject(new Error(`Failed to start Chrome: ${error.message}`));
      });
      
      // Chrome starts successfully if no immediate error
      setTimeout(() => {
        if (!this.chromeProcess.killed) {
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * Set up file watching for auto-reload
   */
  setupFileWatching() {
    if (this.watching) return;
    
    const srcPath = path.resolve(__dirname, '..', 'src');
    
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(srcPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });
    
    let rebuildTimer = null;
    
    watcher.on('change', (filePath) => {
      console.log(`📝 File changed: ${path.relative(srcPath, filePath)}`);
      
      // Debounce rebuilds
      if (rebuildTimer) {
        clearTimeout(rebuildTimer);
      }
      
      rebuildTimer = setTimeout(async () => {
        try {
          console.log('🔄 Rebuilding extension...');
          await this.buildExtension();
          console.log('✅ Extension rebuilt - please reload in Chrome');
        } catch (error) {
          console.error('❌ Rebuild failed:', error.message);
        }
      }, 500);
    });
    
    this.watching = true;
    
    // Clean up on exit
    process.on('SIGINT', () => {
      watcher.close();
      this.cleanup();
    });
  }

  /**
   * Clean up processes and temp files
   */
  cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.chromeProcess && !this.chromeProcess.killed) {
      this.chromeProcess.kill('SIGTERM');
    }
    
    if (this.options.freshProfile && fs.existsSync(TEMP_PROFILE_PATH)) {
      try {
        fs.rmSync(TEMP_PROFILE_PATH, { recursive: true, force: true });
        console.log('🗑️  Cleaned up temporary profile');
      } catch (error) {
        console.warn('⚠️  Could not clean up temporary profile:', error.message);
      }
    }
    
    console.log('👋 Goodbye!');
    process.exit(0);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    switch (arg) {
      case '--build-first':
        options.buildFirst = true;
        break;
      case '--fresh-profile':
        options.freshProfile = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        console.warn(`Unknown option: ${arg}`);
        break;
    }
  }
  
  return options;
}

function printHelp() {
  console.log(`
Wingman Chrome Extension Personal Development Launcher

Usage: node scripts/dev-chrome-personal.js [options]

Options:
  --build-first    Build the extension before launching Chrome
  --fresh-profile  Use a temporary profile instead of personal profile  
  --watch         Enable file watching for auto-reload
  --help          Show this help message

Examples:
  node scripts/dev-chrome-personal.js --build-first
  node scripts/dev-chrome-personal.js --fresh-profile --watch
  node scripts/dev-chrome-personal.js --build-first --watch

The extension will be loaded from: ${EXTENSION_PATH}
Chrome will be launched from: ${CHROME_PATH}
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const launcher = new ChromeDevLauncher(options);
  
  // Handle process cleanup
  process.on('SIGINT', () => launcher.cleanup());
  process.on('SIGTERM', () => launcher.cleanup());
  
  launcher.launch().catch((error) => {
    console.error('❌ Launch failed:', error.message);
    process.exit(1);
  });
}

module.exports = ChromeDevLauncher;