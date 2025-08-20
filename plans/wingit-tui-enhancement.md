# Wingit TUI Enhancement Plan

## Overview
Replace the existing `scripts/dev-manager.js` with a modern Terminal User Interface (TUI) application called **wingit** that provides real-time monitoring, build tracking, and interactive control of Wingman development services.

## Motivation
- Current dev-manager.js has a basic console table output
- No real-time updates or watch mode
- No build time tracking
- Limited interactivity
- Name `dev-manager.js` is generic and unmemorable

## Implementation Details

### 1. Script Name & Location
- **New**: `scripts/wingit` (executable, no .js extension)
- **Remove**: `scripts/dev-manager.js`
- **Name rationale**: Combines "wing" (wingman) + "git" (dev tool aesthetic) + "wing it" (confidence)

### 2. Dependencies to Add
```json
{
  "devDependencies": {
    "blessed": "^0.1.81",
    "blessed-contrib": "^4.11.0", 
    "chokidar": "^3.6.0",
    "dayjs": "^1.11.10"
  }
}
```

### 3. TUI Interface Design

#### Main Screen Layout
```
╔═══════════════════════════════════════════════════════════════╗
║                    🛩️  Wingman Control Tower                   ║
╠═══════════════════════════════════════════════════════════════╣
║ Service          │ Status │  PID  │ Port │ Last Built        ║
╟──────────────────┼────────┼───────┼──────┼───────────────────╢
║ Relay Server     │ ● UP   │ 51174 │ 8787 │ 2 mins ago        ║
║ Chrome Extension │ ● UP   │ 51236 │  -   │ Building...       ║
║ Preview UI       │ ● UP   │ 51299 │ 3001 │ 5 mins ago        ║
║ Demo App         │ ● UP   │ 51368 │ 5173 │ Just now          ║
╟──────────────────┴────────┴───────┴──────┴───────────────────╢
║ [r]estart [s]top [l]ogs [a]ll [↑/↓]nav [q]uit  │ Watch: ON   ║
╚═══════════════════════════════════════════════════════════════╝
```

#### Status Indicators
- 🟢 `● UP` - Service running (green)
- 🔴 `● DOWN` - Service stopped (red)
- 🟡 `● BUILD` - Service building/restarting (yellow)
- 🔵 `● START` - Service starting (blue)

### 4. Core Features

#### A. Watch Mode (Default On)
Monitor file system for changes and track build times:

**Watched Directories:**
- `packages/relay-server/src/` → Updates when `dist/` changes
- `packages/chrome-extension/src/` → Updates when `dist/` changes
- `packages/preview-ui/src/` → Updates when `dist/` changes
- `demo-app/src/` → Updates when `dist/` changes

**Build Detection:**
- Monitor dist folder creation/modification
- Detect package.json changes
- Track Vite HMR vs full rebuilds
- Show "Building..." status during compilation

#### B. Build Time Tracking
Store build statistics in `.wingman-dev/build-stats.json`:

```json
{
  "relay-server": {
    "lastBuild": "2024-01-20T10:30:00Z",
    "duration": 2340,
    "triggerFile": "src/index.ts",
    "status": "success"
  },
  "chrome-extension": {
    "lastBuild": "2024-01-20T10:32:15Z",
    "duration": 1250,
    "triggerFile": "src/content/overlay.ts",
    "status": "success"
  }
}
```

**Time Display Format:**
- "Just now" (< 1 minute)
- "X mins ago" (< 60 minutes)
- "X hours ago" (< 24 hours)
- "Yesterday at HH:MM"
- "MMM DD at HH:MM"

#### C. Interactive Controls

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate service selection |
| `r` | Restart selected service |
| `s` | Stop selected service |
| `a` | Restart all services |
| `l` | Toggle log viewer for selected service |
| `Space` | Pause/resume watch mode |
| `q` | Quit (with confirmation if services running) |
| `?` | Show help screen |

#### D. Log Viewer Panel
- Collapsible panel showing last 100 lines of service logs
- Auto-scroll to bottom
- Color-coded by log level
- Accessible via `l` key

### 5. Command Line Interface

#### Usage
```bash
# Start TUI with all services (default)
./scripts/wingit

# Start TUI with specific services
./scripts/wingit server extension

# Non-interactive commands (backward compatibility)
./scripts/wingit stop     # Stop all services and exit
./scripts/wingit status   # Print status table and exit
./scripts/wingit restart  # Restart all services then show TUI
```

#### Package.json Scripts Update
```json
{
  "scripts": {
    "dev": "./scripts/wingit",
    "dev:stop": "./scripts/wingit stop",
    "dev:status": "./scripts/wingit status",
    "dev:restart": "./scripts/wingit restart"
  }
}
```

### 6. Technical Implementation

#### File Structure
```
scripts/
  wingit                 # Main TUI script (executable)
.wingman-dev/
  pids/                  # Process ID files (existing)
  build-stats.json       # Build time tracking (new)
  logs/                  # Service log files (existing)
```

#### Key Libraries Usage

**blessed** - TUI framework
- Screen management
- Box widgets for layout
- Table widget for service list
- Text widgets for logs

**blessed-contrib** - Advanced widgets
- Table with scrolling
- Log viewer with formatting
- Sparkline for optional metrics

**chokidar** - File watching
- Monitor dist directories
- Track source file changes
- Detect build completions

**dayjs** - Time formatting
- Relative time ("2 mins ago")
- Timestamp formatting
- Duration calculations

### 7. Implementation Phases

#### Phase 1: Basic TUI
1. Install dependencies
2. Create basic blessed screen
3. Implement service status table
4. Add keyboard navigation

#### Phase 2: Process Management
1. Port existing start/stop logic
2. Add interactive restart/stop
3. Implement service selection

#### Phase 3: Watch Mode & Build Tracking
1. Add chokidar file watching
2. Implement build detection logic
3. Create build-stats.json tracking
4. Add "Last Built" column with relative times

#### Phase 4: Polish & Features
1. Add log viewer panel
2. Implement help screen
3. Add confirmation dialogs
4. Error handling and recovery

### 8. Error Handling

- **Port conflicts**: Show clear message with occupied port
- **Process crashes**: Auto-detect and update status
- **Build failures**: Show in red with error indicator
- **File watch errors**: Graceful degradation, continue without watch
- **Terminal resize**: Responsive layout adjustment

### 9. Future Enhancements (Not in V1)

- CPU/Memory usage graphs
- Network request monitoring
- Build performance metrics
- Service dependency visualization
- Custom color themes
- Configuration file support
- Remote service monitoring

### 10. Benefits Over Current Implementation

| Current (dev-manager.js) | New (wingit) |
|--------------------------|--------------|
| Static output | Live-updating TUI |
| No build tracking | Real-time "Last Built" column |
| Command-line only | Interactive keyboard controls |
| Basic console table | Professional TUI with colors |
| No watch mode | Automatic file watching |
| Generic name | Memorable "wingit" brand |

## Success Criteria

1. ✅ All existing functionality preserved
2. ✅ TUI updates in real-time without flicker
3. ✅ Build times tracked and displayed
4. ✅ Interactive service control works reliably
5. ✅ Watch mode detects changes accurately
6. ✅ Clean, professional appearance
7. ✅ Backward compatible with npm scripts

## Timeline

- **Hour 1**: Setup dependencies, basic TUI structure
- **Hour 2**: Port existing functionality, service management
- **Hour 3**: Implement watch mode and build tracking
- **Hour 4**: Add interactive controls and log viewer
- **Hour 5**: Testing, polish, and documentation

## Conclusion

The **wingit** TUI will transform the development experience from a basic command-line tool to a professional, interactive control center that fits perfectly with the Wingman aviation theme while providing powerful real-time monitoring and control capabilities.