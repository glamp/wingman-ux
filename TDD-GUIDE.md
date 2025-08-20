# Test-Driven Development Guide for Wingman

## Overview

This project follows Test-Driven Development (TDD) principles. All new features should be developed using the Red-Green-Refactor cycle.

## TDD Workflow

### 1. Red Phase - Write a Failing Test
```typescript
// Example: Write test first for a new feature
describe('New Feature', () => {
  it('should do something specific', () => {
    const result = newFeature('input');
    expect(result).toBe('expected output');
  });
});
```

### 2. Green Phase - Make the Test Pass
```typescript
// Write minimal code to make the test pass
function newFeature(input: string): string {
  return 'expected output';
}
```

### 3. Refactor Phase - Improve the Code
```typescript
// Refactor while keeping tests green
function newFeature(input: string): string {
  // Improved implementation
  return processInput(input);
}
```

## Test Infrastructure

### Testing Stack
- **Test Runner**: Vitest (fast, ESM-native, snapshot support)
- **React Testing**: @testing-library/react
- **API Testing**: Supertest (real servers, no mocks)
- **Browser Testing**: Playwright via MCP

### Project Test Structure
```
packages/
├── relay-server/
│   └── src/__tests__/
│       ├── server.test.ts      # API endpoint tests
│       ├── stats.test.ts       # TDD example: statistics endpoint
│       └── storage.test.ts     # Storage service tests
├── web-sdk/
│   └── src/__tests__/
│       ├── useWingman.test.tsx # TDD example: React hook
│       └── WingmanProvider.test.tsx
└── chrome-extension/
    └── src/__tests__/
        └── background.test.ts   # Extension background tests
```

## TDD Examples in This Project

### Example 1: Statistics API (Relay Server)

Located in `packages/relay-server/src/__tests__/stats.test.ts`

**Test First Approach:**
1. Defined API behavior through tests
2. Tests specified the exact response shape
3. Implementation followed test requirements

```typescript
// Test defines the expected behavior
it('should return empty stats when no annotations exist', async () => {
  const response = await request(app)
    .get('/annotations/stats')
    .expect(200);

  expect(response.body).toEqual({
    totalAnnotations: 0,
    annotationsByMode: { element: 0, region: 0 },
    // ... other expected fields
  });
});
```

### Example 2: React Hook (Web SDK)

Located in `packages/web-sdk/src/__tests__/useWingman.test.tsx`

**Test First Approach:**
1. Defined hook API through tests
2. Tests specified state management behavior
3. Implementation driven by test requirements

```typescript
// Test defines hook behavior
it('should toggle active state', () => {
  const { result } = renderHook(() => useWingman(), { wrapper });
  
  expect(result.current.isActive).toBe(false);
  
  act(() => {
    result.current.activate();
  });
  
  expect(result.current.isActive).toBe(true);
});
```

## Best Practices

### 1. No Mocking Philosophy
- **Prefer real implementations** over mocks
- **Use actual servers** in tests (dynamic ports)
- **Real file systems** with temp directories
- **Actual network calls** when testing APIs

### 2. Integration-First Testing
```typescript
// Good: Test real behavior
it('should save annotation to file system', async () => {
  const response = await request(app)
    .post('/annotations')
    .send(realAnnotation);
  
  // Verify file was actually created
  const files = await fs.readdir(annotationsDir);
  expect(files).toHaveLength(1);
});

// Avoid: Mocking file system
it('should call fs.writeFile', () => {
  const fsMock = jest.mock('fs');
  // Don't do this!
});
```

### 3. Snapshot Testing
```typescript
// Good for API responses
expect(response.body).toMatchSnapshot({
  id: expect.any(String),        // Dynamic values
  timestamp: expect.any(String)
});

// Good for component output
expect(rendered.container).toMatchSnapshot();
```

### 4. Test Organization
```typescript
describe('Feature Area', () => {
  describe('Specific Functionality', () => {
    it('should handle normal case', () => {});
    it('should handle edge case', () => {});
    it('should handle error case', () => {});
  });
});
```

## Running Tests

### All Tests
```bash
npm test                 # Run all tests across workspaces
```

### Package-Specific Tests
```bash
cd packages/relay-server && npm test
cd packages/web-sdk && npm test
cd packages/chrome-extension && npm test
```

### Watch Mode (TDD Development)
```bash
npm run test:watch       # Watch mode for active development
```

### Specific Test File
```bash
cd packages/relay-server
npm test -- src/__tests__/stats.test.ts
```

## TDD Checklist for New Features

- [ ] Write test describing desired behavior
- [ ] Run test and verify it fails (Red)
- [ ] Write minimal code to pass test (Green)
- [ ] Refactor while keeping tests green
- [ ] Add edge case tests
- [ ] Add error handling tests
- [ ] Run full test suite before committing

## Common Testing Patterns

### Testing Async Operations
```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing React Hooks
```typescript
const { result } = renderHook(() => useCustomHook(), {
  wrapper: ({ children }) => <Provider>{children}</Provider>
});

act(() => {
  result.current.someMethod();
});

expect(result.current.someValue).toBe(expected);
```

### Testing Express Routes
```typescript
const response = await request(app)
  .post('/endpoint')
  .send(payload)
  .expect(201);

expect(response.body).toMatchObject(expectedShape);
```

### Testing with Temporary Files
```typescript
beforeEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});
```

## Benefits of TDD in This Project

1. **Confidence in Refactoring**: Tests ensure functionality remains intact
2. **Living Documentation**: Tests describe how the system should behave
3. **Design Feedback**: Hard-to-test code indicates design issues
4. **Regression Prevention**: Tests catch breaking changes immediately
5. **Faster Development**: Less debugging, more predictable progress

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supertest](https://github.com/ladjs/supertest)
- [TDD by Example - Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)

## Contributing

When contributing to this project:
1. Always write tests first
2. Follow the existing test patterns
3. Ensure all tests pass before submitting PR
4. Include tests for bug fixes (regression tests)
5. Update this guide with new testing patterns you discover