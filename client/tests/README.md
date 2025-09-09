# Automated Browser Testing

This directory contains automated browser tests for the Never Have I Ever game using Playwright.

## Local Playwright Setup

For security reasons (command allowlisting), this project uses local Playwright binaries instead of `npx`:

```bash
# Install Playwright browsers locally
npm run test:install
npm run test:install-deps  # Install system dependencies if needed

# Allowlist these specific commands in your shell:
# /path/to/project/client/node_modules/.bin/playwright
```

## Test Structure

### Core Test Files

- `game.spec.ts` - Basic game functionality tests
- `multiplayer.spec.ts` - Multiplayer synchronization tests
- `voting.spec.ts` - Voting mechanism tests
- `e2e.spec.ts` - End-to-end test scenarios
- `helpers.ts` - Test utilities and helper functions

## Running Tests

### Prerequisites

Make sure you have the server running:

```bash
cd ../server
bun run dev
```

### Run All Tests

```bash
npm run test
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:ui
```

### Run Tests in Headed Mode (Visible Browser)

```bash
npm run test:headed
```

### Debug Tests

```bash
npm run test:debug
```

### Run Specific Test File

```bash
npx playwright test voting.spec.ts
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
