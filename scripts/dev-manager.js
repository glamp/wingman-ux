#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { detect } = require('detect-port');

// Chalk v5 is ESM-only, so we need to use dynamic import
let chalk;

// Configuration
const DEV_DIR = path.join(process.cwd(), '.wingman-dev');
const PID_DIR = path.join(DEV_DIR, 'pids');

const SERVICES = {
  server: {
    name: 'Relay Server',
    command: 'cd packages/relay-server && npm run dev',
    defaultPort: 8787,
    pidFile: 'server.pid'
  },
  extension: {
    name: 'Chrome Extension', 
    command: 'cd packages/chrome-extension && npm run dev',
    defaultPort: null,
    pidFile: 'extension.pid'
  },
  demo: {
    name: 'Demo App',
    command: 'cd demo-app && npm run dev',
    defaultPort: 5173,
    pidFile: 'demo.pid'
  }
};

// Ensure directories exist
function ensureDirectories() {
  [DEV_DIR, PID_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Check if a process is running
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

// Read PID from file
function readPidFile(filename) {
  const pidPath = path.join(PID_DIR, filename);
  if (fs.existsSync(pidPath)) {
    const content = fs.readFileSync(pidPath, 'utf8').trim();
    const pid = parseInt(content);
    if (!isNaN(pid)) {
      return pid;
    }
  }
  return null;
}

// Write PID to file
function writePidFile(filename, pid) {
  const pidPath = path.join(PID_DIR, filename);
  fs.writeFileSync(pidPath, pid.toString());
}

// Remove PID file
function removePidFile(filename) {
  const pidPath = path.join(PID_DIR, filename);
  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath);
  }
}

// Get service status
async function getServiceStatus(serviceKey, service) {
  const pid = readPidFile(service.pidFile);
  
  if (pid && isProcessRunning(pid)) {
    let port = service.defaultPort;
    
    // Check if port is actually in use
    if (port) {
      const availablePort = await detect(port);
      if (availablePort !== port) {
        // Port is in use, likely by our service
        return {
          status: 'running',
          pid,
          port
        };
      }
    }
    
    return {
      status: 'running',
      pid,
      port: port || '-'
    };
  } else {
    // Clean up stale PID file
    if (pid) {
      removePidFile(service.pidFile);
    }
    return {
      status: 'stopped',
      pid: '-',
      port: '-'
    };
  }
}

// Print status table
async function printStatus() {
  console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.white.bold('         Wingman Development Services         ') + chalk.cyan('        ║'));
  console.log(chalk.cyan('╠══════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + ' Service        │ Status    │ PID      │ Port        ' + chalk.cyan('║'));
  console.log(chalk.cyan('╠────────────────┼───────────┼──────────┼─────────────╣'));
  
  for (const [key, service] of Object.entries(SERVICES)) {
    const status = await getServiceStatus(key, service);
    const statusIcon = status.status === 'running' ? chalk.green('✅ UP  ') : chalk.red('❌ DOWN');
    const serviceName = service.name.padEnd(14);
    const pid = status.pid.toString().padEnd(8);
    const port = (status.port || '-').toString().padEnd(11);
    
    console.log(
      chalk.cyan('║') + 
      ` ${serviceName} │ ${statusIcon} │ ${pid} │ ${port} ` +
      chalk.cyan('║')
    );
  }
  
  console.log(chalk.cyan('╚════════════════╧═══════════╧══════════╧═════════════╝\n'));
}

// Start a service using nohup
async function startService(serviceKey, service) {
  const existingPid = readPidFile(service.pidFile);
  
  if (existingPid && isProcessRunning(existingPid)) {
    console.log(chalk.yellow(`⚠️  ${service.name} is already running (PID: ${existingPid})`));
    return existingPid;
  }
  
  // Check if port is available
  if (service.defaultPort) {
    const availablePort = await detect(service.defaultPort);
    if (availablePort !== service.defaultPort) {
      console.log(chalk.yellow(`⚠️  Port ${service.defaultPort} is already in use for ${service.name}`));
    }
  }
  
  console.log(chalk.blue(`Starting ${service.name}...`));
  
  // Use nohup to start the process in background
  const logFile = path.join(DEV_DIR, `${serviceKey}.log`);
  const cmd = `nohup sh -c '${service.command}' > ${logFile} 2>&1 & echo $!`;
  
  try {
    const pid = execSync(cmd, { 
      encoding: 'utf8',
      shell: '/bin/sh'
    }).trim();
    
    const pidNum = parseInt(pid);
    if (!isNaN(pidNum)) {
      writePidFile(service.pidFile, pidNum);
      console.log(chalk.green(`✅ ${service.name} started (PID: ${pidNum})`));
      console.log(chalk.gray(`   Logs: ${logFile}`));
      return pidNum;
    } else {
      console.log(chalk.red(`❌ Failed to start ${service.name}: Invalid PID`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Failed to start ${service.name}: ${error.message}`));
  }
  
  return null;
}

// Stop a service
function stopService(serviceKey, service) {
  const pid = readPidFile(service.pidFile);
  
  if (!pid) {
    console.log(chalk.gray(`${service.name} is not running`));
    return;
  }
  
  if (!isProcessRunning(pid)) {
    console.log(chalk.yellow(`${service.name} PID file exists but process is not running (cleaning up)`));
    removePidFile(service.pidFile);
    return;
  }
  
  try {
    // Kill the process and its children
    execSync(`pkill -P ${pid} 2>/dev/null || true`, { encoding: 'utf8' });
    process.kill(pid, 'SIGTERM');
    removePidFile(service.pidFile);
    console.log(chalk.green(`✅ ${service.name} stopped (PID: ${pid})`));
  } catch (error) {
    console.log(chalk.red(`❌ Failed to stop ${service.name}: ${error.message}`));
  }
}

// Start all services
async function startAll() {
  console.log(chalk.bold.blue('\n🚀 Starting Wingman Development Services...\n'));
  
  // Check for already running services first
  let alreadyRunning = [];
  for (const [key, service] of Object.entries(SERVICES)) {
    const status = await getServiceStatus(key, service);
    if (status.status === 'running') {
      alreadyRunning.push(service.name);
    }
  }
  
  if (alreadyRunning.length > 0) {
    console.log(chalk.yellow('⚠️  The following services are already running:'));
    alreadyRunning.forEach(name => console.log(chalk.yellow(`   - ${name}`)));
    console.log(chalk.yellow('\nUse "npm run dev:restart" to restart them, or "npm run dev:status" to see details.\n'));
  }
  
  // Start services sequentially
  for (const [key, service] of Object.entries(SERVICES)) {
    await startService(key, service);
    // Small delay to let services initialize
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log(chalk.bold.green('\n✅ All services started successfully!'));
  console.log(chalk.gray('Use "npm run dev:status" to check service status'));
  console.log(chalk.gray('Use "npm run dev:stop" to stop all services\n'));
}

// Stop all services
function stopAll() {
  console.log(chalk.bold.red('\n🛑 Stopping Wingman Development Services...\n'));
  
  for (const [key, service] of Object.entries(SERVICES)) {
    stopService(key, service);
  }
  
  console.log(chalk.bold.green('\n✅ All services stopped.\n'));
}

// Restart all services
async function restartAll() {
  console.log(chalk.bold.yellow('\n🔄 Restarting Wingman Development Services...\n'));
  stopAll();
  await new Promise(resolve => setTimeout(resolve, 2000));
  await startAll();
}

// Main command handler
async function main() {
  // Load chalk dynamically (ESM module)
  chalk = (await import('chalk')).default;
  
  const command = process.argv[2] || 'start';
  
  ensureDirectories();
  
  switch (command) {
    case 'start':
      await startAll();
      break;
    
    case 'stop':
      stopAll();
      break;
    
    case 'restart':
      await restartAll();
      break;
    
    case 'status':
      await printStatus();
      break;
    
    default:
      console.log(chalk.red(`Unknown command: ${command}`));
      console.log('Usage: node dev-manager.js [start|stop|restart|status]');
      process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});