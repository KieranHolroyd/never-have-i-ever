/**
 * Mocking Strategies for Comprehensive Testing
 *
 * This file demonstrates various mocking strategies used throughout the testing suite.
 * Each strategy serves a specific purpose and should be chosen based on the testing needs.
 */

import { mock } from 'bun:test';

// ================================
// 1. Service Mocking Strategies
// ================================

/**
 * Strategy 1: Complete Service Mock
 * Use when you want to mock an entire service interface
 */
export function createCompleteServiceMock<T extends Record<string, any>>(serviceInterface: T): T {
  const mock = {} as T;

  for (const key of Object.keys(serviceInterface)) {
    (mock as any)[key] = mock();
  }

  return mock;
}

/**
 * Strategy 2: Partial Service Mock
 * Use when you only want to mock specific methods while keeping others real
 */
export function createPartialServiceMock<T extends Record<string, any>>(
  serviceClass: new (...args: any[]) => T,
  methodsToMock: Partial<Record<keyof T, any>> = {}
): T {
  const realInstance = new serviceClass();

  for (const [method, mockImplementation] of Object.entries(methodsToMock)) {
    if (typeof mockImplementation === 'function') {
      vi.spyOn(realInstance, method as keyof T).mockImplementation(mockImplementation);
    } else {
      vi.spyOn(realInstance, method as keyof T).mockReturnValue(mockImplementation);
    }
  }

  return realInstance;
}

/**
 * Strategy 3: Factory-based Service Mock
 * Use when you need consistent mock instances across tests
 */
export class ServiceMockFactory {
  private static instances = new Map<string, any>();

  static get<T>(key: string, factory: () => T): T {
    if (!this.instances.has(key)) {
      this.instances.set(key, factory());
    }
    return this.instances.get(key);
  }

  static reset(): void {
    this.instances.clear();
  }
}

// ================================
// 2. External Dependency Mocking
// ================================

/**
 * Strategy 4: Database Mocking
 * Mock database operations for testing without real DB
 */
export function createDatabaseMock() {
  return {
    prepare: mock(() => ({
      all: mock(() => []),
      run: mock(() => ({ changes: 1, lastInsertRowid: 1 })),
      get: mock(() => null),
      bind: mock().mockReturnThis()
    })),
    close: mock(),
    exec: mock()
  };
}

/**
 * Strategy 5: Valkey Mocking
 * Mock Valkey operations for testing without real Valkey (using Bun's RedisClient)
 */
export function createRedisMock(initialData: Record<string, string> = {}) {
  const data = new Map(Object.entries(initialData));

  return {
    get: mock(async (key: string) => data.get(key) || null),
    set: mock(async (key: string, value: string) => {
      data.set(key, value);
      return 'OK';
    }),
    del: mock(async (key: string) => {
      const existed = data.has(key);
      data.delete(key);
      return existed ? 1 : 0;
    }),
    exists: mock(async (key: string) => data.has(key) ? 1 : 0),
    keys: mock(async (pattern: string) => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Array.from(data.keys()).filter(key => regex.test(key));
    }),
    ping: mock(async () => 'PONG'),
    publish: mock(async (channel: string, message: string) => 1),
    subscribe: mock(async (channel: string) => 'OK'),
    unsubscribe: mock(async (channel: string) => 'OK'),
    hget: mock(async (key: string, field: string) => data.get(`${key}:${field}`) || null),
    hset: mock(async (key: string, field: string, value: string) => {
      data.set(`${key}:${field}`, value);
      return 1;
    }),
    expire: mock(async () => 1)
  };
}

/**
 * Strategy 6: File System Mocking
 * Mock file operations for testing without real files
 */
export function createFileSystemMock(initialFiles: Record<string, string> = {}) {
  const files = new Map(Object.entries(initialFiles));

  return {
    readFile: mock(async (path: string) => {
      const content = files.get(path);
      if (!content) {
        throw new Error(`File not found: ${path}`);
      }
      return content;
    }),
    writeFile: mock(async (path: string, content: string) => {
      files.set(path, content);
    }),
    exists: mock(async (path: string) => files.has(path)),
    unlink: mock(async (path: string) => {
      files.delete(path);
    }),
    mkdir: mock(async () => {}),
    readdir: mock(async (path: string) => {
      const prefix = path.endsWith('/') ? path : path + '/';
      return Array.from(files.keys())
        .filter(file => file.startsWith(prefix))
        .map(file => file.replace(prefix, ''));
    })
  };
}

// ================================
// 3. WebSocket and Network Mocking
// ================================

/**
 * Strategy 7: WebSocket Connection Mocking
 * Mock WebSocket connections for testing real-time features
 */
export function createWebSocketServerMock() {
  const connections = new Set<any>();
  const channels = new Map<string, Set<any>>();

  return {
    handleConnection: mock((ws: any) => {
      connections.add(ws);

      ws.subscribe = mock((channel: string) => {
        if (!channels.has(channel)) {
          channels.set(channel, new Set());
        }
        channels.get(channel)!.add(ws);
      });

      ws.unsubscribe = mock((channel: string) => {
        const channelConnections = channels.get(channel);
        if (channelConnections) {
          channelConnections.delete(ws);
        }
      });

      ws.publish = mock((channel: string, message: string) => {
        const channelConnections = channels.get(channel);
        if (channelConnections) {
          channelConnections.forEach(client => {
            if (client !== ws && client.onmessage) {
              client.onmessage({ data: message });
            }
          });
        }
      });

      return ws;
    }),

    broadcast: mock((channel: string, message: string) => {
      const channelConnections = channels.get(channel);
      if (channelConnections) {
        channelConnections.forEach(client => {
          if (client.onmessage) {
            client.onmessage({ data: message });
          }
        });
      }
    }),

    getConnections: () => connections,
    getChannels: () => channels,

    reset: () => {
      connections.clear();
      channels.clear();
    }
  };
}

/**
 * Strategy 8: HTTP Request/Response Mocking
 * Mock HTTP calls for testing API integrations
 */
export function createHttpClientMock(responses: Record<string, any> = {}) {
  return {
    get: mock(async (url: string) => {
      if (responses[url]) {
        return { data: responses[url], status: 200 };
      }
      throw new Error(`Unexpected GET request to ${url}`);
    }),

    post: mock(async (url: string, data?: any) => {
      const key = `${url}:${JSON.stringify(data)}`;
      if (responses[key]) {
        return { data: responses[key], status: 201 };
      }
      throw new Error(`Unexpected POST request to ${url}`);
    }),

    put: mock(async (url: string, data?: any) => {
      const key = `${url}:${JSON.stringify(data)}`;
      if (responses[key]) {
        return { data: responses[key], status: 200 };
      }
      throw new Error(`Unexpected PUT request to ${url}`);
    }),

    delete: mock(async (url: string) => {
      if (responses[url]) {
        return { status: 204 };
      }
      throw new Error(`Unexpected DELETE request to ${url}`);
    })
  };
}

// ================================
// 4. Timer and Async Operation Mocking
// ================================

/**
 * Strategy 9: Timer Mocking
 * Control time-based operations in tests
 */
export function createTimerMock() {
  let currentTime = 0;
  const timers = new Map<number, { callback: Function; delay: number }>();

  return {
    now: () => currentTime,

    setTimeout: mock((callback: Function, delay: number) => {
      const id = Math.random();
      timers.set(id, { callback, delay });
      return id;
    }),

    clearTimeout: mock((id: number) => {
      timers.delete(id);
    }),

    setInterval: mock((callback: Function, interval: number) => {
      const id = Math.random();
      const wrappedCallback = () => {
        callback();
        // Reschedule for next interval
        timers.set(id, { callback: wrappedCallback, delay: interval });
      };
      timers.set(id, { callback: wrappedCallback, delay: interval });
      return id;
    }),

    clearInterval: mock((id: number) => {
      timers.delete(id);
    }),

    // Test control methods
    advanceTime: (ms: number) => {
      currentTime += ms;

      // Execute due timers
      const dueTimers = Array.from(timers.entries())
        .filter(([, timer]) => timer.delay <= currentTime);

      dueTimers.forEach(([id, timer]) => {
        timer.callback();
        timers.delete(id);
      });
    },

    runAllTimers: () => {
      const allTimers = Array.from(timers.entries());
      allTimers.forEach(([id, timer]) => {
        timer.callback();
        timers.delete(id);
      });
    },

    reset: () => {
      currentTime = 0;
      timers.clear();
    }
  };
}

/**
 * Strategy 10: Promise-based Async Operation Mocking
 * Mock async operations that should resolve/reject in tests
 */
export function createAsyncOperationMock() {
  const pendingOperations = new Set<Promise<any>>();
  let shouldReject = false;
  let rejectWith: Error | null = null;

  return {
    asyncOperation: mock(async (data?: any) => {
      const promise = new Promise((resolve, reject) => {
        if (shouldReject && rejectWith) {
          reject(rejectWith);
        } else {
          resolve({ success: true, data });
        }
      });

      pendingOperations.add(promise);
      promise.finally(() => pendingOperations.delete(promise));

      return promise;
    }),

    setRejectMode: (error: Error) => {
      shouldReject = true;
      rejectWith = error;
    },

    setResolveMode: () => {
      shouldReject = false;
      rejectWith = null;
    },

    getPendingOperations: () => pendingOperations,

    waitForAllOperations: async () => {
      await Promise.allSettled(pendingOperations);
    },

    reset: () => {
      pendingOperations.clear();
      shouldReject = false;
      rejectWith = null;
    }
  };
}

// ================================
// 5. Environment and Configuration Mocking
// ================================

/**
 * Strategy 11: Environment Variable Mocking
 * Mock environment variables for different test scenarios
 */
export function createEnvironmentMock(initialEnv: Record<string, string> = {}) {
  const originalEnv = { ...process.env };
  const env = { ...initialEnv };

  return {
    set: (key: string, value: string) => {
      env[key] = value;
      process.env[key] = value;
    },

    get: (key: string) => env[key] || process.env[key],

    delete: (key: string) => {
      delete env[key];
      delete process.env[key];
    },

    reset: () => {
      Object.keys(env).forEach(key => {
        if (originalEnv[key] !== undefined) {
          process.env[key] = originalEnv[key];
        } else {
          delete process.env[key];
        }
      });
    }
  };
}

/**
 * Strategy 12: Configuration Mocking
 * Mock configuration objects for testing different setups
 */
export function createConfigMock(overrides: Record<string, any> = {}) {
  const defaultConfig = {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'sqlite::memory:',
    VALKEY_URI: 'redis://localhost:6379',
    GAME_DATA_DIR: './tests/fixtures/',
    LOG_LEVEL: 'error',
    SECRET_KEY: 'test-secret',
    CORS_ORIGIN: '*',
    RATE_LIMIT_WINDOW: 60000,
    RATE_LIMIT_MAX: 100
  };

  return {
    ...defaultConfig,
    ...overrides,

    reset: () => ({ ...defaultConfig })
  };
}

// ================================
// Usage Examples
// ================================

/*
Example usage in tests:

describe('MyService', () => {
  let service: MyService;
  let mockRedis: any;
  let mockDb: any;

  beforeEach(() => {
    // Strategy 5: Redis Mocking
    mockRedis = createRedisMock({
      'game:test-game': JSON.stringify({ id: 'test-game' })
    });

    // Strategy 4: Database Mocking
    mockDb = createDatabaseMock();

    // Strategy 2: Partial Service Mock
    service = createPartialServiceMock(MyService, {
      getData: mock().mockResolvedValue('mocked data'),
      saveData: mock().mockResolvedValue(true)
    });
  });

  it('should work with mocked dependencies', async () => {
    const result = await service.processData('input');
    expect(result).toBe('processed: mocked data');
  });
});
*/