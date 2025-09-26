# Automated Browser Testing

This directory contains automated browser tests for the Never Have I Ever game using Playwright with a focus on reliability and maintainability.

## Testing Strategy

After extensive analysis, we've implemented a realistic testing strategy that acknowledges the limitations of testing real-time, WebSocket-dependent applications:

### Test Types

1. **Smoke Tests** (`minimal-smoke.spec.ts`): Basic functionality verification
   - Fast, reliable tests that verify the application loads and basic interactions work
   - No server dependencies - test client-side resilience
   - Examples: page loading, browser compatibility, basic navigation

2. **Integration Tests** (`integration/`): Server-dependent functionality
   - Test actual API calls and WebSocket connections when server is available
   - Require server running, may be flaky due to network/server issues
   - Examples: API responses, WebSocket connectivity

3. **Unit Tests** (`unit/`): Component isolation (limited scope)
   - Test individual components with heavy mocking
   - Complex to implement due to WebSocket/real-time dependencies
   - Currently limited due to client-side navigation complexities

### Test Reliability Principles

- **No false expectations**: Tests don't assume client-side navigation or WebSocket behavior works in test environment
- **Focus on fundamentals**: Verify application loads, basic UI works, and handles errors gracefully
- **Minimize flakiness**: Avoid tests that depend on timing, network, or complex state management
- **Fast feedback**: Smoke tests run quickly to catch basic issues

## Local Playwright Setup

For security reasons (command allowlisting), this project uses local Playwright binaries:

```bash
# Install Playwright browsers locally
npm run test:install
npm run test:install-deps  # Install system dependencies if needed

# Allowlist these specific commands in your shell:
# /path/to/project/client/node_modules/.bin/playwright
```

## Test Structure

### Test Categories

1. **`unit/`** - Fast, reliable tests that work without server
   - Test basic application loading and UI structure
   - Test client-side logic that doesn't require server state
   - Examples: page loading, basic navigation, form presence

2. **`integration/`** - Tests requiring server connectivity
   - Test actual API calls and WebSocket connections
   - Require server running, may be flaky due to network/server issues
   - Examples: API responses, WebSocket connectivity, multi-user scenarios

3. **`e2e/`** - Complete user journey tests (limited scope)
   - Test critical user flows that must work
   - Most comprehensive but also most fragile
   - Examples: basic game setup flow

4. **`utils/`** - Test utilities and shared code
   - Mock implementations, test helpers, setup utilities

## Running Tests

### Prerequisites

For integration and E2E tests, ensure the server is running:

```bash
cd ../server
bun run dev
```

### Run All Tests

```bash
npm run test
```

### Run Tests by Category

```bash
# Smoke tests (fastest, no server required, recommended for CI)
npm run test:smoke

# Unit tests (fastest, no server required)
npm run test:unit

# Integration tests (requires server)
npm run test:integration

# E2E tests (requires server, most comprehensive)
npm run test:e2e
```

### Run Tests in Different Modes

```bash
# Interactive UI mode
npm run test:ui

# Headed mode (visible browser)
npm run test:headed

# Debug mode (step through tests)
npm run test:debug
```

### Run Specific Test File

```bash
npx playwright test unit/navigation.spec.ts
```

## Test Categories

### Game Flow Tests

- Home page loading
- Game creation
- Player name input
- Category selection
- Question display

### Multiplayer Tests

- Multiple players joining same game
- Real-time synchronization
- Player count display
- Cross-player state updates

### Voting Tests

- Vote button functionality
- Score tracking
- Question progression
- Player status updates

### End-to-End Tests

- Complete game flow from start to finish
- Error handling
- State persistence

## Configuration

Tests are configured in `playwright.config.ts` with the following settings:

- **Base URL**: `http://localhost:5173` (configurable via `BASE_URL` env var)
- **Browsers**: Chromium, Firefox, WebKit
- **Parallel Execution**: Enabled for faster test runs
- **Screenshots**: Taken on failure
- **Traces**: Collected on first retry

## CI/CD Integration

Tests are automatically run on GitHub Actions for:

- Push to master/main branches
- Pull requests to master/main branches

The CI pipeline:

1. Installs dependencies
2. Builds the client
3. Runs server tests
4. Runs browser tests
5. Uploads test results as artifacts

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test('test description', async ({ page }) => {
	// Test code here
});
```

### Using Test Helpers

```typescript
import { test, expect, GameHelper } from './helpers';

test('using helpers', async ({ page }) => {
	const gameHelper = new GameHelper(page);

	await gameHelper.startNewGame('Test Player');
	await gameHelper.selectCategories([0, 1]);
	await gameHelper.waitForQuestion();
	await gameHelper.vote('Have');
});
```

### Test Data

Test data like categories and questions are loaded from the server automatically. Make sure the server is running with the appropriate data files.

## Troubleshooting

### Server Connection Issues

- Ensure the server is running on `http://localhost:3000`
- Check server logs for connection errors
- Verify WebSocket connections are working

### Test Timeouts

- Increase timeout values for slow operations
- Use `page.waitForTimeout()` for brief pauses
- Check network conditions

### Browser-Specific Issues

- Test across multiple browsers when debugging
- Use `--headed` mode to see what's happening
- Check browser console for JavaScript errors

## Contributing

When adding new tests:

1. Follow the existing naming conventions
2. Add appropriate test descriptions
3. Include error handling
4. Update this README if needed
5. Ensure tests pass in CI before merging
