import { mock } from 'bun:test';
import type { IWebSocketService } from '../../src/services/websocket-service';
import type { IHttpService } from '../../src/services/http-service';
import type { IPersistenceService } from '../../src/services/persistence-service';
import type { IGameStateService } from '../../src/services/game-state-service';
import type { GameSocket } from '../../src/lib/router';

/**
 * Mock WebSocket factory for testing
 */
export function createMockWebSocket(
  gameId = 'test-game',
  playerId = 'p1',
  playing = 'never-have-i-ever'
): GameSocket & { __getMessages: () => { sent: string[], published: Array<{ topic: string; data: string }>, subscriptions: string[] } } {
  const sent: string[] = [];
  const published: Array<{ topic: string; data: string }> = [];
  const subscriptions: string[] = [];

  return {
    data: { game: gameId, player: playerId, playing },
    send: mock((data: string) => sent.push(data)),
    publish: mock((topic: string, data: string) => published.push({ topic, data })),
    subscribe: mock((topic: string) => subscriptions.push(topic)),
    close: mock(),
    __getMessages() { return { sent, published, subscriptions }; }
  } as any;
}

/**
 * Mock WebSocket service factory
 */
export function createMockWebSocketService(): IWebSocketService {
  return {
    sendToClient: mock(),
    broadcastToGameAndClient: mock(),
    publishToGame: mock(),
    broadcastToGame: mock(),
    handleDisconnect: mock(),
    handleReconnectStatus: mock(),
    handlePing: mock(),
    addWebSocket: mock(),
    removeWebSocket: mock(),
    hasWebSockets: mock(),
    getTimeoutStart: mock(() => 0),
    setTimeoutStart: mock(),
    deleteTimeoutStart: mock(),
    cleanup: mock(),
    getRoundTimeoutMs: mock(() => 30000)
  };
}

/**
 * Mock HTTP service factory
 */
export function createMockHttpService(): IHttpService {
  return {
    getQuestionsList: mock(),
    handleCategories: mock(),
    handleCAHPacks: mock(),
    handleGame: mock(),
    handleGithubWebhook: mock()
  };
}

/**
 * Mock persistence service factory
 */
export function createMockPersistenceService(): IPersistenceService {
  return {
    loadGame: mock(),
    createGame: mock(),
    saveGame: mock(),
    saveActiveGames: mock()
  };
}

/**
 * Mock game state service factory
 */
export function createMockGameStateService(): IGameStateService {
  return {
    getGame: mock(),
    setGame: mock(),
    deleteGame: mock(),
    hasGame: mock(),
    getAllGameIds: mock()
  };
}

/**
 * Mock Valkey client factory (compatible with Bun's RedisClient)
 */
export function createMockRedisClient() {
  return {
    get: mock(),
    set: mock(),
    del: mock(),
    exists: mock(),
    keys: mock(),
    ping: mock(() => Promise.resolve('PONG')),
    publish: mock(),
    subscribe: mock(),
    unsubscribe: mock()
  };
}

/**
 * Mock database factory
 */
export function createMockDatabase() {
  return {
    prepare: mock(() => ({
      all: mock(),
      run: mock(),
      get: mock()
    })),
    close: mock()
  };
}

/**
 * Mock game manager factory
 */
export function createMockGameManager() {
  return {
    getOrCreateGame: mock(),
    handleJoinGame: mock(),
    handleSelectCategories: mock(),
    handleSelectCategory: mock(),
    handleConfirmSelections: mock(),
    handleVote: mock(),
    handleNextQuestion: mock(),
    handleResetGame: mock(),
    handleDisconnect: mock(),
    handleCategories: mock(),
    handleGame: mock(),
    games: new Map()
  };
}

/**
 * Mock WebSocket context factory for middleware testing
 */
export function createMockWebSocketContext(
  wsData = { game: 'test-game', player: 'p1', playing: 'never-have-i-ever' },
  messageData = { op: 'test' },
  gameManager = createMockGameManager()
) {
  return {
    ws: createMockWebSocket(wsData.game, wsData.player, wsData.playing),
    data: messageData,
    gameManager
  };
}

/**
 * Helper to get the last call arguments for a mock
 */
export function getLastCall(mock: any) {
  return mock.mock.calls[mock.mock.calls.length - 1];
}

/**
 * Helper to get all call arguments for a mock
 */
export function getAllCalls(mock: any) {
  return mock.mock.calls;
}