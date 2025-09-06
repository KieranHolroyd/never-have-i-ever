import { vi, afterEach } from 'vitest';

// Mock Bun environment
const mockBunFile = vi.fn();
const mockBunWrite = vi.fn();

global.Bun = {
  file: mockBunFile,
  write: mockBunWrite,
} as any;

// Setup default mock implementations
const mockFileInstance = {
  exists: vi.fn().mockResolvedValue(false),
  json: vi.fn().mockResolvedValue({
    'test-category': {
      flags: { is_nsfw: false },
      questions: ['Test question?']
    }
  }),
  text: vi.fn().mockResolvedValue('{}'),
};

mockBunFile.mockReturnValue(mockFileInstance);
mockBunWrite.mockResolvedValue(undefined);

// Mock Redis client
vi.mock('../src/redis_client', () => ({
  client: {
    json: {
      GET: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
    },
  },
}));

// Mock Axiom
vi.mock('../src/axiom', () => ({
  ingestEvent: vi.fn(),
}));

// Mock config
vi.mock('../src/config', () => ({
  config: {
    GAME_DATA_DIR: './tests/fixtures/games/',
  },
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  // Reset mocks to default state
  mockFileInstance.exists.mockResolvedValue(false);
  mockFileInstance.json.mockResolvedValue({
    'test-category': {
      flags: { is_nsfw: false },
      questions: ['Test question?']
    }
  });
});
