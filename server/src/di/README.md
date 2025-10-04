# Dependency Injection Container

This module provides a lightweight dependency injection container for managing service instantiation and dependencies in the server application.

## Features

- **Service Registration**: Register services with unique tokens
- **Dependency Resolution**: Automatic dependency injection based on registered services
- **Lifetime Management**: Support for singleton and transient service lifetimes
- **Scoped Containers**: Create child containers that inherit from parent containers
- **Type Safety**: Full TypeScript support with proper typing

## Basic Usage

### Registering Services

```typescript
import { container, SERVICE_TOKENS } from './di';

// Register a singleton service
container.registerClass(SERVICE_TOKENS.WebSocketService, WebSocketService, 'singleton');

// Register a service with dependencies
container.registerClass(
  SERVICE_TOKENS.PersistenceService,
  PersistenceService,
  'singleton',
  [SERVICE_TOKENS.HttpService] // dependencies
);
```

### Resolving Services

```typescript
import { container, SERVICE_TOKENS } from './di';

// Resolve a service
const webSocketService = container.resolve<IWebSocketService>(SERVICE_TOKENS.WebSocketService);
```

## Service Lifetimes

### Singleton
Services registered as singletons are created once and reused for all subsequent resolutions.

```typescript
container.registerClass('MyService', MyService, 'singleton');
const instance1 = container.resolve('MyService');
const instance2 = container.resolve('MyService');
console.log(instance1 === instance2); // true
```

### Transient
Services registered as transient create a new instance each time they are resolved.

```typescript
container.registerClass('MyService', MyService, 'transient');
const instance1 = container.resolve('MyService');
const instance2 = container.resolve('MyService');
console.log(instance1 === instance2); // false
```

## Scoped Containers

Create child containers that can override services while inheriting from parent containers.

```typescript
const parentContainer = new Container();
// Register services in parent...

const scopedContainer = parentContainer.createScope();
// Register scoped services...

// Resolves from scope first, then parent
const service = scopedContainer.resolve('SomeService');
```

## Service Tokens

Use the predefined service tokens for type safety:

```typescript
import { SERVICE_TOKENS } from './di';

SERVICE_TOKENS.WebSocketService
SERVICE_TOKENS.HttpService
SERVICE_TOKENS.PersistenceService
SERVICE_TOKENS.GameStateService
SERVICE_TOKENS.GameManager
```

## Testing

The container enables easy testing with mocked services:

```typescript
// Create a test container
const testContainer = new Container();

// Register mock services
testContainer.register('WebSocketService', () => mockWebSocketService, 'singleton');

// Use in tests
const service = testContainer.resolve('ServiceUnderTest');
```

## API Reference

### Container

- `register<T>(token, factory, lifetime, dependencies?)`: Register a service
- `registerClass<T>(token, ServiceClass, lifetime, dependencies?)`: Register a service class
- `resolve<T>(token)`: Resolve a service instance
- `has(token)`: Check if a service is registered
- `getRegisteredServices()`: Get all registered service tokens
- `clear()`: Clear all registered services
- `createScope()`: Create a scoped container

### ScopedContainer

Extends Container with parent container fallback resolution.