import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container, SERVICE_TOKENS } from '../../src/di/container';
import { WebSocketService } from '../../src/services/websocket-service';
import { HttpService } from '../../src/services/http-service';
import { PersistenceService } from '../../src/services/persistence-service';
import { GameStateService } from '../../src/services/game-state-service';
import { createMockRedisClient, createMockDatabase } from '../test-helpers';

// Mock external dependencies
vi.mock('../../src/redis_client', () => ({
  client: createMockRedisClient(),
  getClient: () => Promise.resolve(createMockRedisClient())
}));

vi.mock('bun:sqlite', () => ({
  default: vi.fn(() => createMockDatabase())
}));

describe('Service Integration via Container', () => {
  let container: Container;
  let mockRedisClient: any;
  let mockDatabase: any;

  beforeEach(() => {
    container = new Container();
    mockRedisClient = createMockRedisClient();
    mockDatabase = createMockDatabase();

    // Mock the imports that services use
    vi.mocked(mockRedisClient).get.mockResolvedValue(null);
    vi.mocked(mockDatabase).prepare.mockReturnValue({
      all: vi.fn(() => []),
      run: vi.fn(),
      get: vi.fn()
    });
  });

  it('should register and resolve services correctly', () => {
    // Register services with their dependencies
    container.registerClass(SERVICE_TOKENS.HttpService, HttpService, 'singleton');
    container.registerClass(
      SERVICE_TOKENS.PersistenceService,
      PersistenceService,
      'singleton',
      [SERVICE_TOKENS.HttpService]
    );
    container.registerClass(SERVICE_TOKENS.WebSocketService, WebSocketService, 'singleton');
    container.registerClass(SERVICE_TOKENS.GameStateService, GameStateService, 'singleton');

    // Resolve services
    const httpService = container.resolve(SERVICE_TOKENS.HttpService);
    const persistenceService = container.resolve(SERVICE_TOKENS.PersistenceService);
    const webSocketService = container.resolve(SERVICE_TOKENS.WebSocketService);
    const gameStateService = container.resolve(SERVICE_TOKENS.GameStateService);

    // Verify services are instantiated correctly
    expect(httpService).toBeInstanceOf(HttpService);
    expect(persistenceService).toBeInstanceOf(PersistenceService);
    expect(webSocketService).toBeInstanceOf(WebSocketService);
    expect(gameStateService).toBeInstanceOf(GameStateService);
  });

  it('should maintain singleton instances across resolutions', () => {
    container.registerClass(SERVICE_TOKENS.WebSocketService, WebSocketService, 'singleton');

    const service1 = container.resolve(SERVICE_TOKENS.WebSocketService);
    const service2 = container.resolve(SERVICE_TOKENS.WebSocketService);

    expect(service1).toBe(service2);
  });

  it('should inject dependencies correctly', () => {
    container.registerClass(SERVICE_TOKENS.HttpService, HttpService, 'singleton');
    container.registerClass(
      SERVICE_TOKENS.PersistenceService,
      PersistenceService,
      'singleton',
      [SERVICE_TOKENS.HttpService]
    );

    const persistenceService = container.resolve<PersistenceService>(SERVICE_TOKENS.PersistenceService);

    // Verify dependency injection worked
    expect((persistenceService as any).httpService).toBeDefined();
    expect((persistenceService as any).httpService).toBeInstanceOf(HttpService);
  });

  it('should handle service registration with symbols', () => {
    container.registerClass(SERVICE_TOKENS.WebSocketService, WebSocketService, 'singleton');

    expect(container.has(SERVICE_TOKENS.WebSocketService)).toBe(true);
    expect(container.has(Symbol('NonExistentService'))).toBe(false);
  });

  it('should provide access to registered service tokens', () => {
    container.registerClass(SERVICE_TOKENS.WebSocketService, WebSocketService, 'singleton');
    container.registerClass(SERVICE_TOKENS.HttpService, HttpService, 'singleton');

    const registeredServices = container.getRegisteredServices();

    expect(registeredServices).toContain(SERVICE_TOKENS.WebSocketService);
    expect(registeredServices).toContain(SERVICE_TOKENS.HttpService);
    expect(registeredServices).toHaveLength(2);
  });

  describe('Scoped containers', () => {
    it('should inherit services from parent container', () => {
      // Register in parent
      container.registerClass(SERVICE_TOKENS.WebSocketService, WebSocketService, 'singleton');

      const scopedContainer = container.createScope();

      // Should resolve from parent
      const service = scopedContainer.resolve(SERVICE_TOKENS.WebSocketService);
      expect(service).toBeInstanceOf(WebSocketService);
    });

    it('should allow overriding services in scope', () => {
      // Register in parent
      container.register(SERVICE_TOKENS.WebSocketService, () => 'parent-service', 'singleton');

      const scopedContainer = container.createScope();
      // Override in scope
      scopedContainer.register(SERVICE_TOKENS.WebSocketService, () => 'scoped-service', 'singleton');

      const scopedService = scopedContainer.resolve(SERVICE_TOKENS.WebSocketService);
      expect(scopedService).toBe('scoped-service');

      // Parent should still have original
      const parentService = container.resolve(SERVICE_TOKENS.WebSocketService);
      expect(parentService).toBe('parent-service');
    });
  });

  describe('Service lifetime management', () => {
    it('should create new instances for transient services', () => {
      container.registerClass('TransientService', WebSocketService, 'transient');

      const instance1 = container.resolve('TransientService');
      const instance2 = container.resolve('TransientService');

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(WebSocketService);
      expect(instance2).toBeInstanceOf(WebSocketService);
    });

    it('should reuse instances for singleton services', () => {
      container.registerClass('SingletonService', WebSocketService, 'singleton');

      const instance1 = container.resolve('SingletonService');
      const instance2 = container.resolve('SingletonService');

      expect(instance1).toBe(instance2);
    });
  });

  describe('Error handling', () => {
    it('should throw error for unregistered service', () => {
      expect(() => {
        container.resolve('NonExistentService');
      }).toThrow('Service \'NonExistentService\' not registered in container');
    });

    it('should handle dependency resolution failures', () => {
      // Register service with dependency that doesn't exist
      container.register(
        'ServiceWithBadDep',
        () => 'service',
        'singleton',
        ['NonExistentDependency']
      );

      expect(() => {
        container.resolve('ServiceWithBadDep');
      }).toThrow('Service \'NonExistentDependency\' not registered in container');
    });
  });

  describe('Service cleanup', () => {
    it('should clear all registered services', () => {
      container.registerClass(SERVICE_TOKENS.WebSocketService, WebSocketService, 'singleton');
      container.registerClass(SERVICE_TOKENS.HttpService, HttpService, 'singleton');

      expect(container.has(SERVICE_TOKENS.WebSocketService)).toBe(true);
      expect(container.has(SERVICE_TOKENS.HttpService)).toBe(true);

      container.clear();

      expect(container.has(SERVICE_TOKENS.WebSocketService)).toBe(false);
      expect(container.has(SERVICE_TOKENS.HttpService)).toBe(false);
      expect(container.getRegisteredServices()).toHaveLength(0);
    });
  });
});