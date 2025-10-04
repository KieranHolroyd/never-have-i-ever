# Comprehensive Testing Strategy

This document outlines the comprehensive testing strategy for the new modular architecture, covering unit tests, integration tests, engine-specific tests, middleware testing, and end-to-end testing guidelines.

## Architecture Overview

The application follows a modular architecture with:

- **Dependency Injection Container**: Manages service instantiation and dependencies
- **Services Layer**: WebSocketService, HttpService, PersistenceService, GameStateService
- **Middleware Pipeline**: Authentication, logging, validation, and error handling
- **Engine Registry**: Game engines (Cards Against Humanity, Never Have I Ever)
- **Game Manager**: Orchestrates game logic using services and engines

## Testing Pyramid

```
┌─────────────────┐
│   E2E Tests     │ ← User journeys, critical paths
├─────────────────┤
│ Integration     │ ← Service interactions, middleware pipeline
├─────────────────┤
│   Unit Tests    │ ← Individual components, isolated logic
└─────────────────┘
```

## 1. Unit Testing Strategy

### Services Testing

Each service should be tested in isolation with mocked dependencies.

#### WebSocketService Tests
```typescript
describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService();
  });

  describe('sendToClient', () => {
    it('should send JSON message to client', () => {
      const mockWs = createMockWebSocket();
      service.sendToClient(mockWs, 'test_op', { data: 'value' });
      expect(mockWs.send).toHaveBeenCalledWith('{"op":"test_op","data":"value"}');
    });

    it('should handle send errors gracefully', () => {
      const mockWs = createMockWebSocket();
      mockWs.send.mockImplementation(() => { throw new Error('Send failed'); });
      // Should not throw, should attempt error message send
    });
  });

  describe('broadcastToGame', () => {
    it('should publish to game topic via any connected socket', () => {
      const mockWs1 = createMockWebSocket();
      const mockWs2 = createMockWebSocket();
      service.addWebSocket('game1', mockWs1);
      service.addWebSocket('game1', mockWs2);

      service.broadcastToGame('game1', 'update', { state: 'new' });

      expect(mockWs1.publish).toHaveBeenCalledWith('game1', '{"op":"update","state":"new"}');
      expect(mockWs2.publish).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove WebSocket and mark player disconnected', () => {
      const mockWs = createMockWebSocket();
      const mockGame = createMockGame();
      service.addWebSocket('game1', mockWs);

      service.handleDisconnect(mockWs, mockGame);

      expect(service.hasWebSockets('game1')).toBe(false);
      expect(mockGame.players[0].connected).toBe(false);
    });
  });
});
```

#### HttpService Tests
```typescript
describe('HttpService', () => {
  let service: HttpService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockRedisClient();
    service = new HttpService();
    // Mock ValkeyJSON.get/set
  });

  describe('getQuestionsList', () => {
    it('should return cached questions when available', async () => {
      mockClient.get.mockResolvedValue(mockCategoriesData);

      const result = await service.getQuestionsList();

      expect(result).toEqual(mockCategoriesData);
      expect(mockClient.get).toHaveBeenCalledWith('shared:questions_list', CatagoriesSchema);
    });

    it('should load from database and cache when not cached', async () => {
      mockClient.get.mockResolvedValue(null);
      // Mock database operations

      const result = await service.getQuestionsList();

      expect(mockClient.set).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('handleCategories', () => {
    it('should return categories with proper CORS headers', async () => {
      const response = await service.handleCategories();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Cache-Control')).toBe('max-age=86400');
    });
  });
});
```

#### GameStateService Tests
```typescript
describe('GameStateService', () => {
  let service: GameStateService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockRedisClient();
    service = new GameStateService();
  });

  describe('getGame', () => {
    it('should deserialize and return game state', async () => {
      const mockGameState = createMockCAHGameState();
      mockClient.get.mockResolvedValue(JSON.stringify(mockGameState));

      const result = await service.getGame('test-game');

      expect(result).toEqual(mockGameState);
    });

    it('should return null for non-existent game', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await service.getGame('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('setGame', () => {
    it('should serialize and store game state', async () => {
      const mockGameState = createMockNHIEGameState();

      await service.setGame('test-game', mockGameState);

      expect(mockClient.set).toHaveBeenCalledWith('game:test-game', JSON.stringify(mockGameState));
    });

    it('should clean non-serializable properties', async () => {
      const gameWithTimeout = {
        ...createMockNHIEGameState(),
        round_timeout: setTimeout(() => {}, 1000)
      };

      await service.setGame('test-game', gameWithTimeout as any);

      const storedData = JSON.parse(mockClient.set.mock.calls[0][1]);
      expect(storedData.round_timeout).toBeUndefined();
    });
  });
});
```

### Middleware Testing

#### WebSocketAuthMiddleware Tests
```typescript
describe('WebSocketAuthMiddleware', () => {
  describe('authenticate', () => {
    it('should pass authentication for valid WebSocket metadata', async () => {
      const context = createMockWebSocketContext({
        game: 'test-game',
        player: 'player1',
        playing: 'never-have-i-ever'
      });
      const next = vi.fn();

      await WebSocketAuthMiddleware.authenticate(context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error for missing game metadata', async () => {
      const context = createMockWebSocketContext({
        player: 'player1',
        playing: 'never-have-i-ever'
        // missing game
      });
      const next = vi.fn();

      await expect(WebSocketAuthMiddleware.authenticate(context, next))
        .rejects.toThrow('Missing required WebSocket metadata');
    });

    it('should throw error for non-existent game', async () => {
      const context = createMockWebSocketContext({
        game: 'non-existent',
        player: 'player1',
        playing: 'never-have-i-ever'
      });
      const mockGameManager = { games: new Map() };
      context.gameManager = mockGameManager;
      const next = vi.fn();

      await expect(WebSocketAuthMiddleware.authenticate(context, next))
        .rejects.toThrow('Game not found');
    });
  });
});
```

#### WebSocketValidationMiddleware Tests
```typescript
describe('WebSocketValidationMiddleware', () => {
  describe('validateMessage', () => {
    it('should validate required operation field', async () => {
      const context = createMockWebSocketContext({}, { /* no op */ });
      const next = vi.fn();

      await expect(WebSocketValidationMiddleware.validateMessage(context, next))
        .rejects.toThrow();
    });

    it('should validate operation-specific schemas', async () => {
      const context = createMockWebSocketContext({}, {
        op: 'join_game',
        create: true,
        playername: 'Test Player'
      });
      const next = vi.fn();

      await WebSocketValidationMiddleware.validateMessage(context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid vote options', async () => {
      const context = createMockWebSocketContext({}, {
        op: 'vote',
        option: 5 // invalid option
      });
      const next = vi.fn();

      await expect(WebSocketValidationMiddleware.validateMessage(context, next))
        .rejects.toThrow();
    });
  });
});
```

### Engine Testing

#### Cards Against Humanity Engine Tests
```typescript
describe('Cards Against Humanity Engine', () => {
  let engine: GameEngine;
  let mockGameManager: GameManager;
  let mockGameStateService: IGameStateService;

  beforeEach(() => {
    mockGameStateService = createMockGameStateService();
    mockGameManager = createMockGameManager();
    engine = createCardsAgainstHumanityEngine(mockGameManager, mockGameStateService);
  });

  describe('join_game', () => {
    it('should create game when create flag is true', async () => {
      const ws = createMockWebSocket();

      await engine.handlers.join_game(ws, { create: true, playername: 'Alice' });

      expect(mockGameStateService.setGame).toHaveBeenCalled();
      const gameState = getLastGameStateCall(mockGameStateService);
      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0].name).toBe('Alice');
    });

    it('should start round when 3+ players join', async () => {
      // Setup 2 existing players
      const existingGame = createMockCAHGameState();
      existingGame.players = [
        createMockCAHPlayer('p1', 'Alice'),
        createMockCAHPlayer('p2', 'Bob')
      ];
      mockGameStateService.getGame.mockResolvedValue(existingGame);

      const ws = createMockWebSocket();

      await engine.handlers.join_game(ws, { create: false, playername: 'Cara' });

      const gameState = getLastGameStateCall(mockGameStateService);
      expect(gameState.phase).toBe('selecting');
      expect(gameState.currentBlackCard).toBeDefined();
    });
  });

  describe('submit_cards', () => {
    it('should accept valid card submission', async () => {
      const game = createMockCAHGameState();
      game.players = [createMockCAHPlayer('p1', 'Alice', ['card1', 'card2'])];
      game.currentBlackCard = { id: 'black1', text: 'Test?', pick: 1 };
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket();

      await engine.handlers.submit_cards(ws, { cardIds: ['card1'] });

      expect(game.submittedCards).toHaveLength(1);
      expect(game.submittedCards[0].playerId).toBe('p1');
    });

    it('should reject submission with wrong number of cards', async () => {
      const game = createMockCAHGameState();
      game.players = [createMockCAHPlayer('p1', 'Alice', ['card1', 'card2'])];
      game.currentBlackCard = { id: 'black1', text: 'Test?', pick: 2 };
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket();

      await expect(engine.handlers.submit_cards(ws, { cardIds: ['card1'] }))
        .rejects.toThrow('Must submit exactly 2 cards');
    });
  });

  describe('select_winner', () => {
    it('should award point to winner and advance to scoring phase', async () => {
      const game = createMockCAHGameState();
      game.players = [
        createMockCAHPlayer('p1', 'Alice'),
        createMockCAHPlayer('p2', 'Bob')
      ];
      game.currentJudge = 'p1';
      game.submittedCards = [{
        playerId: 'p2',
        cards: [{ id: 'card1', text: 'Test card' }],
        playerName: 'Bob'
      }];
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket();

      await engine.handlers.select_winner(ws, { winnerPlayerId: 'p2' });

      expect(game.players[1].score).toBe(1);
      expect(game.roundWinner).toBe('p2');
      expect(game.phase).toBe('scoring');
    });
  });
});
```

## 2. Integration Testing Strategy

### Service Integration Tests

#### Container-Service Integration
```typescript
describe('Service Integration via Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    // Register all services with their dependencies
    container.registerClass(SERVICE_TOKENS.HttpService, HttpService, 'singleton');
    container.registerClass(
      SERVICE_TOKENS.PersistenceService,
      PersistenceService,
      'singleton',
      [SERVICE_TOKENS.HttpService]
    );
    container.registerClass(
      SERVICE_TOKENS.GameStateService,
      GameStateService,
      'singleton'
    );
  });

  it('should resolve service with dependencies correctly', () => {
    const persistenceService = container.resolve<IPersistenceService>(SERVICE_TOKENS.PersistenceService);

    expect(persistenceService).toBeInstanceOf(PersistenceService);
    // Verify dependency injection worked
    expect((persistenceService as any).httpService).toBeDefined();
  });

  it('should maintain singleton instances across resolutions', () => {
    const service1 = container.resolve<IGameStateService>(SERVICE_TOKENS.GameStateService);
    const service2 = container.resolve<IGameStateService>(SERVICE_TOKENS.GameStateService);

    expect(service1).toBe(service2);
  });
});
```

#### WebSocket Service Integration
```typescript
describe('WebSocket Service Integration', () => {
  let webSocketService: WebSocketService;
  let mockWs1: any, mockWs2: any;

  beforeEach(() => {
    webSocketService = new WebSocketService();
    mockWs1 = createMockWebSocket('game1', 'p1');
    mockWs2 = createMockWebSocket('game1', 'p2');
  });

  it('should manage WebSocket connections per game', () => {
    webSocketService.addWebSocket('game1', mockWs1);
    webSocketService.addWebSocket('game1', mockWs2);
    webSocketService.addWebSocket('game2', createMockWebSocket('game2', 'p3'));

    expect(webSocketService.hasWebSockets('game1')).toBe(true);
    expect(webSocketService.hasWebSockets('game2')).toBe(true);
    expect(webSocketService.hasWebSockets('game3')).toBe(false);
  });

  it('should broadcast to all clients in game', () => {
    webSocketService.addWebSocket('game1', mockWs1);
    webSocketService.addWebSocket('game1', mockWs2);

    webSocketService.broadcastToGame('game1', 'update', { state: 'changed' });

    expect(mockWs1.publish).toHaveBeenCalledWith('game1', '{"op":"update","state":"changed"}');
    expect(mockWs2.publish).not.toHaveBeenCalled(); // Only one socket publishes
  });

  it('should handle disconnections properly', () => {
    webSocketService.addWebSocket('game1', mockWs1);
    webSocketService.addWebSocket('game1', mockWs2);

    const mockGame = { players: [{ id: 'p1', connected: true }] };
    webSocketService.handleDisconnect(mockWs1, mockGame);

    expect(webSocketService.hasWebSockets('game1')).toBe(true); // ws2 still connected
    expect(mockGame.players[0].connected).toBe(false);
  });
});
```

### Middleware Pipeline Integration
```typescript
describe('Middleware Pipeline Integration', () => {
  let pipeline: WebSocketMiddlewarePipeline;
  let mockGameManager: any;

  beforeEach(() => {
    pipeline = createDefaultMiddlewarePipeline(mockGameManager);
  });

  it('should execute middleware in correct order', async () => {
    const executionOrder: string[] = [];
    const mockContext = createMockWebSocketContext();

    // Mock middleware to track execution
    const mockLogging = vi.fn((ctx, next) => {
      executionOrder.push('logging');
      return next();
    });
    const mockAuth = vi.fn((ctx, next) => {
      executionOrder.push('auth');
      return next();
    });
    const mockValidation = vi.fn((ctx, next) => {
      executionOrder.push('validation');
      return next();
    });

    pipeline = new WebSocketMiddlewarePipeline()
      .use(mockLogging)
      .use(mockAuth)
      .use(mockValidation);

    await pipeline.execute(mockContext);

    expect(executionOrder).toEqual(['logging', 'auth', 'validation']);
  });

  it('should stop execution on middleware error', async () => {
    const mockContext = createMockWebSocketContext();
    const executionOrder: string[] = [];

    const failingMiddleware = vi.fn(() => {
      executionOrder.push('failing');
      throw new Error('Middleware failed');
    });
    const shouldNotExecute = vi.fn(() => {
      executionOrder.push('should-not-execute');
    });

    pipeline = new WebSocketMiddlewarePipeline()
      .use(failingMiddleware)
      .use(shouldNotExecute);

    await expect(pipeline.execute(mockContext)).rejects.toThrow('Middleware failed');

    expect(executionOrder).toEqual(['failing']);
    expect(shouldNotExecute).not.toHaveBeenCalled();
  });
});
```

### Engine-GameManager Integration
```typescript
describe('Engine-GameManager Integration', () => {
  let gameManager: GameManager;
  let mockWebSocketService: any;
  let mockHttpService: any;
  let mockPersistenceService: any;

  beforeEach(() => {
    mockWebSocketService = createMockWebSocketService();
    mockHttpService = createMockHttpService();
    mockPersistenceService = createMockPersistenceService();

    gameManager = new GameManager(
      mockWebSocketService,
      mockHttpService,
      mockPersistenceService
    );
  });

  it('should route messages to appropriate engine', async () => {
    const mockWs = createMockWebSocket('test-game', 'p1', 'cards-against-humanity');

    // Register CAH engine
    const cahEngine = createCardsAgainstHumanityEngine(gameManager, createMockGameStateService());
    engineRegistry.register(cahEngine);

    await gameManager.handleMessage(mockWs, { op: 'join_game', create: true, playername: 'Alice' });

    expect(mockWebSocketService.broadcastToGameAndClient).toHaveBeenCalled();
  });

  it('should handle engine-specific message validation', async () => {
    const mockWs = createMockWebSocket('test-game', 'p1', 'never-have-i-ever');

    // Invalid message for NHIE
    const invalidMessage = { op: 'select_packs', packIds: [] };

    await expect(gameManager.handleMessage(mockWs, invalidMessage))
      .rejects.toThrow();
  });
});
```

## 3. Engine-Specific Testing

### Cards Against Humanity Engine Tests
- **Game Creation**: Pack selection, card loading, deck shuffling
- **Player Management**: Joining, disconnecting, judge rotation
- **Round Flow**: Black card drawing, card submission, winner selection
- **Scoring**: Point calculation, round progression, game completion
- **Edge Cases**: Empty decks, disconnected judges, invalid submissions

### Never Have I Ever Engine Tests
- **Category Selection**: Adding/removing categories, confirmation
- **Question Flow**: Question selection, voting timeout, round progression
- **Voting Logic**: Vote validation, score calculation, vote changes
- **Timeout Handling**: Automatic progression, manual skipping
- **Game Reset**: State cleanup, player reset, history clearing

## 4. Middleware Testing Strategy

### Authentication Middleware
- Valid WebSocket metadata validation
- Game existence verification
- Player permission checks
- Error handling for invalid connections

### Validation Middleware
- Base message structure validation
- Operation-specific schema validation
- Business logic validation
- Error response formatting

### Logging Middleware
- Request logging with context
- Response time tracking
- Error logging with details
- Performance monitoring

### Error Middleware
- Exception catching and handling
- Error response formatting
- Client notification of errors
- Error logging and monitoring

## 5. End-to-End Testing Guidelines

### Critical User Journeys

#### Never Have I Ever Game Flow
```typescript
describe('Never Have I Ever E2E', () => {
  let server: any;
  let clients: WebSocket[];

  beforeEach(async () => {
    server = await startTestServer();
    clients = await Promise.all([
      connectTestClient('game1', 'player1'),
      connectTestClient('game1', 'player2'),
      connectTestClient('game1', 'player3')
    ]);
  });

  afterEach(async () => {
    await Promise.all(clients.map(c => c.close()));
    await server.close();
  });

  it('should complete full game cycle', async () => {
    // Player 1 creates game
    await sendMessage(clients[0], { op: 'join_game', create: true, playername: 'Alice' });
    await expectGameState(clients[0], { phase: 'category_select' });

    // Players join
    await sendMessage(clients[1], { op: 'join_game', create: false, playername: 'Bob' });
    await sendMessage(clients[2], { op: 'join_game', create: false, playername: 'Cara' });

    // Select categories
    await sendMessage(clients[0], { op: 'select_category', catagory: 'food' });
    await sendMessage(clients[0], { op: 'select_category', catagory: 'relationships' });
    await sendMessage(clients[0], { op: 'confirm_selections' });

    // Start first round
    await sendMessage(clients[0], { op: 'next_question' });
    await expectGameState(clients[0], { phase: 'waiting', waitingForPlayers: true });

    // All players vote
    await sendMessage(clients[0], { op: 'vote', option: 1 }); // Have
    await sendMessage(clients[1], { op: 'vote', option: 2 }); // Have Not
    await sendMessage(clients[2], { op: 'vote', option: 3 }); // Kinda

    // Wait for auto-progression or manual next
    await expectGameState(clients[0], { phase: 'waiting', current_question: expect.any(Object) });

    // Verify scores updated correctly
    const finalState = await getGameState(clients[0]);
    expect(finalState.players.find(p => p.id === 'player1').score).toBe(1);
    expect(finalState.players.find(p => p.id === 'player2').score).toBe(0);
    expect(finalState.players.find(p => p.id === 'player3').score).toBe(0.5);
  });
});
```

#### Cards Against Humanity Game Flow
```typescript
describe('Cards Against Humanity E2E', () => {
  it('should complete full CAH round', async () => {
    // Setup 3+ players
    // Select card packs
    // Verify cards dealt
    // Submit white cards
    // Judge selects winner
    // Verify scoring and round progression
  });
});
```

### Performance Testing
- Concurrent game handling (multiple games running simultaneously)
- High-frequency message processing
- Memory usage under load
- Database connection pooling

### Reliability Testing
- Network disconnection/reconnection handling
- Server restart recovery
- Database failure scenarios
- Timeout handling

## 6. Test Utilities and Helpers

### Mock Factories
```typescript
// test-helpers/mocks.ts
export function createMockWebSocket(gameId = 'test-game', playerId = 'p1', playing = 'never-have-i-ever') {
  const sent: string[] = [];
  const published: Array<{ topic: string; data: string }> = [];
  const subscriptions: string[] = [];

  return {
    data: { game: gameId, player: playerId, playing },
    send: vi.fn((data: string) => sent.push(data)),
    publish: vi.fn((topic: string, data: string) => published.push({ topic, data })),
    subscribe: vi.fn((topic: string) => subscriptions.push(topic)),
    close: vi.fn(),
    __getMessages() { return { sent, published, subscriptions }; }
  };
}

export function createMockGameStateService() {
  return {
    getGame: vi.fn(),
    setGame: vi.fn(),
    deleteGame: vi.fn(),
    hasGame: vi.fn(),
    getAllGameIds: vi.fn()
  };
}

export function createMockWebSocketService() {
  return {
    sendToClient: vi.fn(),
    broadcastToGameAndClient: vi.fn(),
    publishToGame: vi.fn(),
    getTimeoutStart: vi.fn(() => 0),
    getRoundTimeoutMs: vi.fn(() => 30000),
    setTimeoutStart: vi.fn(),
    deleteTimeoutStart: vi.fn()
  };
}
```

### Test Data Factories
```typescript
// test-helpers/factories.ts
export function createMockNHIEGameState(overrides = {}): NHIEGameState {
  return {
    id: 'test-game',
    gameType: 'never-have-i-ever',
    players: [],
    phase: 'category_select',
    current_question: { catagory: '', content: '' },
    catagories: [],
    data: {},
    history: [],
    waitingForPlayers: false,
    gameCompleted: false,
    ...overrides
  };
}

export function createMockCAHGameState(overrides = {}): CAHGameState {
  return {
    id: 'test-game',
    gameType: 'cards-against-humanity',
    players: [],
    selectedPacks: [],
    phase: 'waiting',
    currentJudge: null,
    currentBlackCard: null,
    submittedCards: [],
    roundWinner: null,
    deck: { blackCards: [], whiteCards: [] },
    handSize: 7,
    maxRounds: 10,
    currentRound: 0,
    waitingForPlayers: true,
    gameCompleted: false,
    ...overrides
  };
}

export function createMockNHIEPlayer(id: string, name: string, overrides = {}): NHIEPlayer {
  return {
    id,
    name,
    score: 0,
    connected: true,
    this_round: { vote: null, voted: false },
    ...overrides
  };
}

export function createMockCAHPlayer(id: string, name: string, hand: string[] = []): CAHPlayer {
  return {
    id,
    name,
    score: 0,
    connected: true,
    hand: hand.map(id => ({ id, text: `Card ${id}` })),
    isJudge: false
  };
}
```

### Assertion Helpers
```typescript
// test-helpers/assertions.ts
export async function expectGameState(client: WebSocket, expectedState: Partial<GameState>) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for game state')), 5000);

    client.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.op === 'game_state') {
        clearTimeout(timeout);
        try {
          expect(message.game).toMatchObject(expectedState);
          resolve(message.game);
        } catch (error) {
          reject(error);
        }
      }
    };
  });
}

export function getLastMessageByOp(client: any, op: string) {
  const { sent, published } = client.__getMessages();
  // Search sent messages first, then published
  for (let i = sent.length - 1; i >= 0; i--) {
    const msg = JSON.parse(sent[i]);
    if (msg.op === op) return msg;
  }
  for (let i = published.length - 1; i >= 0; i--) {
    const msg = JSON.parse(published[i].data);
    if (msg.op === op) return msg;
  }
  return null;
}

export function expectBroadcastToGame(service: any, gameId: string, op: string, data?: any) {
  expect(service.broadcastToGameAndClient).toHaveBeenCalledWith(
    expect.any(Object), // ws
    op,
    data
  );
}
```

## 7. Mocking Strategies

### Service Mocking
- Use Vitest/vi.fn() for function mocks
- Create partial mocks for complex services
- Mock external dependencies (Redis, Database, FileSystem)

### WebSocket Mocking
- Mock WebSocket send/publish/subscribe methods
- Track message history for assertions
- Simulate connection states and errors

### Database Mocking
- Mock SQLite database operations
- Mock Redis/Valkey operations
- Use in-memory data stores for testing

### Timer Mocking
- Mock setTimeout/clearTimeout for timeout testing
- Control time progression in tests
- Test timeout edge cases

## 8. Test Infrastructure Updates

### Test Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    globals: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
```

### Test Scripts
```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest --run tests/unit",
    "test:integration": "vitest --run tests/integration",
    "test:e2e": "vitest --run tests/e2e",
    "test:coverage": "vitest --run --coverage",
    "test:ci": "vitest --run --reporter=verbose"
  }
}
```

### CI/CD Integration
- Run unit tests on every PR
- Run integration tests on main branch merges
- Run E2E tests nightly
- Generate coverage reports
- Fail builds on test failures or coverage drops

## 9. Coverage Goals

- **Unit Tests**: 80%+ coverage for services, middleware, utilities
- **Integration Tests**: 90%+ coverage for service interactions
- **Engine Tests**: 95%+ coverage for game logic
- **E2E Tests**: Critical user journeys fully covered

## 10. Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and independent

### Test Data Management
- Use factories for test data creation
- Avoid hard-coded test data
- Clean up after tests
- Use meaningful test data

### Mock Management
- Reset mocks between tests
- Use descriptive mock names
- Verify mock interactions
- Avoid over-mocking

### Performance
- Keep tests fast (< 100ms per test)
- Parallelize independent tests
- Use appropriate test doubles
- Profile slow tests

This comprehensive testing strategy ensures the new modular architecture is thoroughly tested at all levels, providing confidence in code changes and enabling fast, reliable development.