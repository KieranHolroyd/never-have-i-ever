import { describe, it, expect } from 'bun:test';
import { Container, SERVICE_TOKENS } from './container';
import { WebSocketService } from '../services/websocket-service';
import { HttpService } from '../services/http-service';
import { PersistenceService } from '../services/persistence-service';

describe('Dependency Injection Container', () => {
  it('should register and resolve singleton services', () => {
    const container = new Container();

    // Register services
    container.registerClass('WebSocketService', WebSocketService, 'singleton');
    container.registerClass('HttpService', HttpService, 'singleton');

    // Resolve services
    const ws1 = container.resolve<WebSocketService>('WebSocketService');
    const ws2 = container.resolve<WebSocketService>('WebSocketService');
    const http1 = container.resolve<HttpService>('HttpService');
    const http2 = container.resolve<HttpService>('HttpService');

    // Verify singleton behavior - same instances
    expect(ws1).toBe(ws2);
    expect(http1).toBe(http2);

    // Verify they are correct types
    expect(ws1).toBeInstanceOf(WebSocketService);
    expect(http1).toBeInstanceOf(HttpService);
  });

  it('should register and resolve transient services', () => {
    const container = new Container();

    // Register transient service
    container.registerClass('WebSocketService', WebSocketService, 'transient');

    // Resolve services
    const ws1 = container.resolve<WebSocketService>('WebSocketService');
    const ws2 = container.resolve<WebSocketService>('WebSocketService');

    // Verify transient behavior - different instances
    expect(ws1).not.toBe(ws2);
    expect(ws1).toBeInstanceOf(WebSocketService);
    expect(ws2).toBeInstanceOf(WebSocketService);
  });

  it('should resolve services with dependencies', () => {
    const container = new Container();

    // Register services with dependencies
    container.registerClass(SERVICE_TOKENS.HttpService, HttpService, 'singleton');
    container.registerClass(
      SERVICE_TOKENS.PersistenceService,
      PersistenceService,
      'singleton',
      [SERVICE_TOKENS.HttpService]
    );

    // Resolve dependent service
    const persistence = container.resolve<PersistenceService>(SERVICE_TOKENS.PersistenceService);

    // Verify it was created correctly
    expect(persistence).toBeInstanceOf(PersistenceService);
  });

  it('should throw error for unregistered service', () => {
    const container = new Container();

    expect(() => {
      container.resolve('NonExistentService');
    }).toThrow('Service \'NonExistentService\' not registered in container');
  });

  it('should check if service is registered', () => {
    const container = new Container();

    container.registerClass('TestService', WebSocketService, 'singleton');

    expect(container.has('TestService')).toBe(true);
    expect(container.has('NonExistentService')).toBe(false);
  });

  it('should create scoped containers', () => {
    const parentContainer = new Container();
    parentContainer.registerClass('SharedService', WebSocketService, 'singleton');

    const scopedContainer = parentContainer.createScope();

    // Should resolve from parent
    const service1 = scopedContainer.resolve<WebSocketService>('SharedService');
    expect(service1).toBeInstanceOf(WebSocketService);

    // Register in scope
    scopedContainer.registerClass('ScopedService', HttpService, 'singleton');

    // Should resolve from scope
    const service2 = scopedContainer.resolve<HttpService>('ScopedService');
    expect(service2).toBeInstanceOf(HttpService);

    // Parent should not have scoped service
    expect(parentContainer.has('ScopedService')).toBe(false);
  });
});