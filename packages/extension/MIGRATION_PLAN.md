# Chrome Extension Migration Plan: WXT + MUI + Zustand

## Overview
Migrate the current Chrome extension from custom Vite setup to WXT framework with Material-UI components and Zustand state management.

## Current Issues
- [ ] Duplicate popup implementations (popup.ts: 873 lines, modern-popup.ts: 601 lines)
- [ ] Two overlay systems (vanilla-overlay.ts and unused content-ui React components)
- [ ] Dead code scattered throughout (`src/content/index.ts`, `src/content/test-minimal.ts`, entire `src/content-ui/` folder)
- [ ] Inline CSS (popup.html has 1093 lines with massive style blocks)
- [ ] State management chaos (no centralized state, manual message passing)
- [ ] Complex build system (split across multiple vite configs)

## Target Architecture

### Directory Structure (WXT)
```
src/
├── entrypoints/
│   ├── background.ts           # Background script
│   ├── content.ts             # Content script with React overlay
│   └── popup/                 # Popup UI
│       ├── index.html
│       ├── main.tsx          # React entry point
│       └── App.tsx           # Main popup component
├── components/               # Shared MUI components
├── stores/                  # Zustand stores
│   ├── popup-store.ts
│   ├── tunnel-store.ts
│   ├── settings-store.ts
│   └── chrome-storage.ts
├── lib/                     # Utilities
└── types/                   # TypeScript types
```

### Technology Stack
- **Framework**: WXT (Next-gen web extension framework)
- **UI Library**: Material-UI (props-based components, no string classes)
- **State Management**: Zustand with chrome.storage persistence
- **Language**: TypeScript (strict mode)
- **Styling**: MUI theme system + CSS Modules for custom styles

## Migration Phases

### Phase 1: Project Setup & WXT Migration ⏱️ 2-3 days
**Branch**: `feature/wxt-migration`

#### Setup Tasks
- [x] Install WXT and dependencies
- [x] Create new WXT project structure in parallel folder
- [x] Set up wxt.config.ts with current extension settings
- [x] Configure TypeScript with strict settings
- [x] Set up MUI with theme provider

#### Dependencies
- [x] Install WXT: `npm install wxt`
- [x] Keep existing MUI dependencies
- [x] Install Zustand: `npm install zustand`
- [x] Add development dependencies for WXT

#### Initial Structure
- [x] Create `src/entrypoints/` directory
- [x] Move manifest configuration to wxt.config.ts
- [x] Create basic popup entrypoint
- [x] Create background script entrypoint
- [x] Test basic build process

**Success Criteria**: ✅ **COMPLETED** - WXT builds successfully and loads in Chrome

### Phase 2: State Management Migration ⏱️ 2-3 days
**Goal**: Replace scattered state with centralized Zustand stores

#### Zustand Store Creation
- [ ] **settings-store.ts**: User preferences, relay URL, templates
- [ ] **tunnel-store.ts**: Tunnel state, sharing functionality
- [ ] **popup-store.ts**: UI state, active tabs, form data
- [ ] **chrome-storage.ts**: Persistence adapter for chrome.storage

#### State Migration Tasks
- [ ] Analyze current state scattered across files
- [ ] Create typed interfaces for all state
- [ ] Build chrome.storage persistence middleware
- [ ] Create message bridge for background ↔ popup communication
- [ ] Migrate settings from manual chrome.storage calls
- [ ] Replace manual message passing with Zustand subscriptions

#### Testing
- [ ] Test state persistence across extension restarts
- [ ] Verify popup ↔ background state sync
- [ ] Test in multiple tabs/windows

**Success Criteria**: All state centralized, no manual chrome.storage calls

### Phase 3: Popup Migration to MUI ⏱️ 2-3 days
**Goal**: Replace current popup with clean MUI-based React app

#### Component Migration
- [ ] Create MUI theme for extension branding
- [ ] **MainTab Component**: Replace vanilla DOM manipulation
  - [ ] Convert buttons to MUI Button components
  - [ ] Replace custom forms with MUI TextField, Select
  - [ ] Use MUI Card, Paper for layout
- [ ] **SettingsTab Component**:
  - [ ] MUI FormControl, RadioGroup for options
  - [ ] MUI Switch for toggles
  - [ ] MUI Autocomplete for template selection
- [ ] **LiveShareTab Component**:
  - [ ] MUI CircularProgress for loading states
  - [ ] MUI Alert for status messages
  - [ ] MUI IconButton for actions

#### UI Cleanup Tasks
- [ ] Remove all inline CSS from HTML
- [ ] Delete old popup.html (1093 lines)
- [ ] Delete old popup.ts (873 lines)
- [ ] Replace string-based styling with MUI props
- [ ] Implement dark/light theme support
- [ ] Add proper loading states and error handling

#### Integration
- [ ] Connect MUI components to Zustand stores
- [ ] Replace manual DOM updates with React state
- [ ] Test all popup functionality

**Success Criteria**: Popup is fully MUI-based with no manual DOM manipulation

### Phase 4: Content Script Overlay Migration ⏱️ 3-4 days
**Goal**: Replace vanilla overlay with React + Shadow DOM + MUI

#### Shadow DOM Implementation
- [ ] Create Shadow DOM container with proper CSS isolation
- [ ] Set up MUI ThemeProvider inside Shadow DOM
- [ ] Handle CSS injection for MUI styles in Shadow DOM
- [ ] Test style isolation from host page

#### Overlay Component Migration
- [ ] **Element Selector**: Convert to MUI components
  - [ ] MUI Tooltip for hover states
  - [ ] MUI Paper for selection indicators
- [ ] **Note Panel**:
  - [ ] MUI TextField for text input
  - [ ] MUI Button for actions
  - [ ] MUI Card for panel layout
- [ ] **Mode Selector**:
  - [ ] MUI ToggleButtonGroup for mode selection
  - [ ] MUI Chip for status indicators

#### Functionality Migration
- [ ] Port element selection logic
- [ ] Port screenshot capture
- [ ] Port console/network capture
- [ ] Connect to Zustand stores
- [ ] Test React overlay functionality

#### Cleanup
- [ ] Delete vanilla-overlay.ts (19KB file)
- [ ] Delete unused content-ui folder
- [ ] Remove content/index.ts and test-minimal.ts

**Success Criteria**: React overlay works with proper style isolation

### Phase 5: Background Script Migration ⏱️ 1-2 days
**Goal**: Simplify background script, integrate with Zustand

#### Background Script Tasks
- [ ] Port background logic to WXT structure
- [ ] Connect to Zustand stores for state management
- [ ] Simplify message handling (use Zustand instead of manual messages)
- [ ] Port tunnel management functionality
- [ ] Port screenshot handling
- [ ] Test all background functionality

**Success Criteria**: Background script works with new state system

### Phase 6: Build System & Configuration ⏱️ 1-2 days
**Goal**: Clean up build process, environment handling

#### Build Configuration
- [ ] Configure WXT for different environments (dev, staging, prod)
- [ ] Set up proper TypeScript compilation
- [ ] Configure hot reload for development
- [ ] Set up proper source maps
- [ ] Configure icon generation

#### Testing & Deployment
- [ ] Test extension loading in Chrome
- [ ] Test hot reload functionality
- [ ] Test production build
- [ ] Update package.json scripts
- [ ] Update development documentation

**Success Criteria**: Clean build process, easy development workflow

### Phase 7: Testing & Polish ⏱️ 2-3 days
**Goal**: Comprehensive testing and final cleanup

#### Testing Tasks
- [ ] Test all extension functionality
- [ ] Test state persistence
- [ ] Test across different websites
- [ ] Test error handling
- [ ] Performance testing
- [ ] Memory leak testing

#### Polish Tasks
- [ ] Clean up any remaining dead code
- [ ] Add proper error boundaries
- [ ] Improve loading states
- [ ] Add proper TypeScript types for all APIs
- [ ] Update documentation

#### Final Cleanup
- [ ] Delete old files after confirming new system works
- [ ] Update README with new development instructions
- [ ] Update package.json with new scripts

**Success Criteria**: Extension fully functional with new architecture

## Technical Decisions

### ✅ Confirmed Choices
- **Framework**: WXT (file-based entrypoints, better DX)
- **UI Library**: Material-UI (props-based, no string manipulation)
- **State Management**: Zustand with chrome.storage persistence
- **Language**: TypeScript with strict configuration
- **Architecture**: Centralized state, React components throughout

### 🚫 Rejected Approaches
- Custom Vite setup (too complex)
- Tailwind/shadcn (string-based class manipulation)
- @plasmohq/messaging (not needed with Zustand)
- Manual state management (error-prone)

## Risk Mitigation

### High-Risk Areas
- [ ] Shadow DOM CSS injection (test thoroughly)
- [ ] State synchronization between contexts
- [ ] Extension manifest compatibility
- [ ] Performance impact of React overlays

### Mitigation Strategies
- [ ] Feature branch for all work
- [ ] Phase-by-phase implementation
- [ ] Extensive testing at each phase
- [ ] Backup plan to revert if needed
- [ ] Parallel development (keep old system until new is proven)

## Success Metrics

### Code Quality
- [ ] **50%+ reduction** in total lines of code
- [ ] **Zero dead files** remaining
- [ ] **100% TypeScript coverage** for stores and APIs
- [ ] **Consistent MUI components** throughout

### Developer Experience
- [ ] **Fast hot reload** with WXT
- [ ] **Type-safe state management** across all contexts
- [ ] **Simple build process** with single config
- [ ] **Easy testing** with centralized state

### Performance
- [ ] **No memory leaks** in long-running sessions
- [ ] **Fast overlay rendering** with Shadow DOM
- [ ] **Minimal bundle size** increase

## Timeline

**Total Estimated Time**: 12-16 days

- Phase 1: 2-3 days (WXT setup)
- Phase 2: 2-3 days (State management)
- Phase 3: 2-3 days (Popup migration)
- Phase 4: 3-4 days (Content script)
- Phase 5: 1-2 days (Background script)
- Phase 6: 1-2 days (Build system)
- Phase 7: 2-3 days (Testing & polish)

## Getting Started

1. **Create feature branch**: `git checkout -b feature/wxt-migration`
2. **Start with Phase 1**: Set up WXT project structure
3. **Test incrementally**: Each phase should be functional
4. **Document decisions**: Update this file as we progress

---

**Last Updated**: 2025-01-25
**Status**: Planning Phase
**Next Action**: Begin Phase 1 - WXT setup