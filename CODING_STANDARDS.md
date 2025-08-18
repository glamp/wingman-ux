# Wingman Coding Standards

## Core Principles

- **Simplicity First**: Keep everything as simple as possible. No over-engineering.
- **Type Safety**: Use TypeScript's strictest settings to catch errors at compile time (Rust-like approach)
- **Move Fast**: Break things when needed. Don't worry about backwards compatibility in v1.
- **Shared Types**: Never duplicate type definitions across packages
- **Small Steps**: Work incrementally. Get something minimal working first, then iterate. Each step should be testable and demonstrable.

## TypeScript Configuration

Use the strictest possible settings for compile-time error catching:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Code Style

- Use Prettier for formatting (run `npm run prettier` or `npx prettier --write .`)
- No manual formatting decisions - let Prettier handle it
- Keep functions small and focused on a single task
- Prefer explicit types over inference where it improves clarity

## Chrome Extension Architecture

### Content Script vs Background Script

**Content Scripts**:
- Run in the context of web pages
- Handle DOM manipulation and user interaction
- Manage the overlay UI for element/region selection
- Capture page-specific data (console, errors)

**Background Scripts (Service Worker in MV3)**:
- Handle extension lifecycle and persistent state
- Manage communication between different parts of the extension
- Execute privileged Chrome APIs (like screenshot capture)
- Coordinate data collection and submission to relay

### Message Passing
- Use Chrome's message passing API for content ↔ background communication
- Keep message payloads typed using the shared `WingmanAnnotation` interface
- Handle async messaging with proper error boundaries

## Error Handling

- Keep it simple - no complex error hierarchies
- Let errors bubble up naturally
- Log errors to console in development
- Graceful degradation over hard failures

## Storage Patterns

### Relay Server Storage
- Store annotations as plain JSON files: `./wingman/annotations/:id.json`
- No database, no complex storage layers
- File-based storage for simplicity and debugging

## Security

### CORS Configuration
- Enable CORS on the relay server for browser access
- Allow all origins in v1 (will restrict later if needed)

### Privacy
- When capturing React metadata, sanitize sensitive data:
  - Remove functions from props/state
  - Truncate long strings
  - Skip large nested objects
  - Use regex to detect and mask obvious tokens/keys

## Development Workflow

1. Start with the smallest working piece (e.g., just capture a screenshot)
2. Verify it works end-to-end before adding complexity
3. Run `npm run dev` in package for watch mode
4. Test Chrome extension by loading unpacked from `packages/chrome-extension/dist`
5. Use HMR for server development
6. Run root `npm run build` to build all packages
7. Commit working code frequently, even if incomplete

## Testing

- E2E tests with Playwright and MCP
- Focus on integration tests over unit tests
- Test the critical path: select element → capture → send → receive

## Versioning

- Don't worry about backwards compatibility in v1
- Break things when needed to move forward
- Version packages together for simplicity

## What NOT to Do

- Don't add unnecessary abstractions
- Don't duplicate type definitions
- Don't add authentication/authorization in v1
- Don't implement features not in the v1 scope (session replay, desktop app, etc.)
- Don't over-optimize for performance initially