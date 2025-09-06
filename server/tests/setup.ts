import { afterEach } from 'bun:test';

// Set environment variables before other modules load
process.env.VALKEY_URI = 'valkey://localhost:6379';
process.env.GAME_DATA_DIR = './tests/fixtures/games/';

// Clean up after each test
afterEach(() => {
  // No mocks to clean up since we're not using them
});
