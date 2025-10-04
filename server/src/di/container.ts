export type ServiceLifetime = 'singleton' | 'transient';

export interface ServiceDescriptor<T = any> {
  factory: (...deps: any[]) => T;
  lifetime: ServiceLifetime;
  dependencies: (string | symbol)[];
  instance?: T;
}

export class Container {
  private services = new Map<string | symbol, ServiceDescriptor>();

  /**
   * Register a service with the container
   * @param token - Unique identifier for the service
   * @param factory - Factory function that creates the service instance
   * @param lifetime - Whether the service should be singleton or transient
   * @param dependencies - Array of service tokens this service depends on
   */
  register<T>(
    token: string | symbol,
    factory: (...deps: any[]) => T,
    lifetime: ServiceLifetime = 'singleton',
    dependencies: (string | symbol)[] = []
  ): void {
    this.services.set(token, {
      factory,
      lifetime,
      dependencies,
    });
  }

  /**
   * Register a service class with automatic dependency resolution
   * @param token - Unique identifier for the service
   * @param ServiceClass - The service class constructor
   * @param lifetime - Whether the service should be singleton or transient
   * @param dependencies - Array of service tokens this service depends on (optional, will be inferred from constructor)
   */
  registerClass<T>(
    token: string | symbol,
    ServiceClass: new (...args: any[]) => T,
    lifetime: ServiceLifetime = 'singleton',
    dependencies?: (string | symbol)[]
  ): void {
    const factory = (...deps: any[]) => new ServiceClass(...deps);
    this.register(token, factory, lifetime, dependencies);
  }

  /**
   * Resolve a service from the container
   * @param token - Service identifier to resolve
   * @returns The service instance
   */
  resolve<T>(token: string | symbol): T {
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`Service '${String(token)}' not registered in container`);
    }

    if (descriptor.lifetime === 'singleton' && descriptor.instance) {
      return descriptor.instance;
    }

    // Resolve dependencies
    const deps = descriptor.dependencies.map(dep => this.resolve(dep));

    // Create instance
    const instance = descriptor.factory(...deps);

    // Cache singleton instances
    if (descriptor.lifetime === 'singleton') {
      descriptor.instance = instance;
    }

    return instance;
  }

  /**
   * Check if a service is registered
   * @param token - Service identifier to check
   * @returns True if the service is registered
   */
  has(token: string | symbol): boolean {
    return this.services.has(token);
  }

  /**
   * Get all registered service tokens
   * @returns Array of registered service tokens
   */
  getRegisteredServices(): (string | symbol)[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all registered services and cached instances
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Create a scoped container that inherits services from this container
   * @returns A new scoped container
   */
  createScope(): ScopedContainer {
    return new ScopedContainer(this);
  }
}

export class ScopedContainer extends Container {
  constructor(private parent: Container) {
    super();
  }

  resolve<T>(token: string | symbol): T {
    // First try to resolve from this scope
    if (super.has(token)) {
      return super.resolve(token);
    }

    // Fall back to parent container
    return this.parent.resolve(token);
  }

  has(token: string | symbol): boolean {
    return super.has(token) || this.parent.has(token);
  }
}

// Service tokens for type safety
export const SERVICE_TOKENS = {
  WebSocketService: Symbol('WebSocketService'),
  HttpService: Symbol('HttpService'),
  PersistenceService: Symbol('PersistenceService'),
  GameStateService: Symbol('GameStateService'),
  GameManager: Symbol('GameManager'),
} as const;

// Global container instance
export const container = new Container();