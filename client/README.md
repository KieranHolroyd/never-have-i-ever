# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `bun install` (or `npm install` or `yarn`), start a development server:

```bash
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

To create a production version of your app:

```bash
bun run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Testing

This project includes comprehensive automated browser testing using Playwright.

### Running Tests

Make sure the server is running first:

```bash
cd ../server
bun run dev
```

Then run the browser tests:

```bash
# Install Playwright browsers (first time only)
npm run test:install
npm run test:install-deps  # Install system dependencies if needed

# Run all tests
npm run test

# Run tests with UI (interactive)
npm run test:ui

# Run tests with visible browser
npm run test:headed

# Debug tests
npm run test:debug
```

### Local Playwright Commands

This project uses local Playwright binaries for security (command allowlisting). The npm scripts automatically use:

- `./node_modules/.bin/playwright` - Main CLI
- Local browser installations in `./node_modules/playwright-core/browsers/`

If you need to allowlist commands in your shell, add:

```
[path/to/project]/client/node_modules/.bin/playwright
```

### Test Coverage

The test suite covers:

- **Game Flow**: Home page, game creation, player setup
- **Category Selection**: UI interaction, synchronization
- **Voting System**: Vote buttons, score tracking, question progression
- **Multiplayer**: Real-time synchronization, player management
- **End-to-End**: Complete game scenarios, error handling

### Test Structure

- `tests/game.spec.ts` - Basic game functionality
- `tests/multiplayer.spec.ts` - Multiplayer features
- `tests/voting.spec.ts` - Voting mechanism
- `tests/e2e.spec.ts` - End-to-end scenarios
- `tests/helpers.ts` - Test utilities and helpers

See `tests/README.md` for detailed documentation.
