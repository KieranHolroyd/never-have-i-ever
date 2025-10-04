import { vi } from 'vitest';
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
    send: vi.fn((data: string) => sent.push(data)),
    publish: vi.fn((topic: string, data: string) => published.push({ topic, data })),
    subscribe: vi.fn((topic: string) => subscriptions.push(topic)),
    close: vi.fn(),
    __getMessages() { return { sent, published, subscriptions }; }
  } as any;
}

/**
 * Mock WebSocket service factory
 */
export function createMockWebSocketService(): IWebSocketService {
  return {
    sendToClient: vi.fn(),
    broadcastToGameAndClient: vi.fn(),
    publishToGame: vi.fn(),
    broadcastToGame: vi.fn(),
    handleDisconnect: vi.fn(),
    handleReconnectStatus: vi.fn(),
    handlePing: vi.fn(),
    addWebSocket: vi.fn(),
    removeWebSocket: vi.fn(),
    hasWebSockets: vi.fn(),
    getTimeoutStart: vi.fn(() => 0),
    setTimeoutStart: vi.fn(),
    deleteTimeoutStart: vi.fn(),
    cleanup: vi.fn(),
    getRoundTimeoutMs: vi.fn(() => 30000)
  };
}

/**
 * Mock HTTP service factory
 */
export function createMockHttpService(): IHttpService {
  return {
    getQuestionsList: vi.fn(),
    handleCategories: vi.fn(),
    handleCAHPacks: vi.fn(),
    handleGame: vi.fn(),
    handleGithubWebhook: vi.fn()
  };
}

/**
 * Mock persistence service factory
 */
export function createMockPersistenceService(): IPersistenceService {
  return {
    loadGame: vi.fn(),
    createGame: vi.fn(),
    saveGame: vi.fn(),
    saveActiveGames: vi.fn()
  };
}

/**
 * Mock game state service factory
 */
export function createMockGameStateService(): IGameStateService {
  return {
    getGame: vi.fn(),
    setGame: vi.fn(),
    deleteGame: vi.fn(),
    hasGame: vi.fn(),
    getAllGameIds: vi.fn()
  };
}

/**
 * Mock Redis client factory
 */
export function createMockRedisClient() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  };
}

/**
 * Mock database factory
 */
export function createMockDatabase() {
  return {
    prepare: vi.fn(() => ({
      all: vi.fn(),
      run: vi.fn(),
      get: vi.fn()
    })),
    close: vi.fn()
  };
}

/**
 * Mock game manager factory
 */
export function createMockGameManager() {
  return {
    getOrCreateGame: vi.fn(),
    handleJoinGame: vi.fn(),
    handleSelectCategories: vi.fn(),
    handleSelectCategory: vi.fn(),
    handleConfirmSelections: vi.fn(),
    handleVote: vi.fn(),
    handleNextQuestion: vi.fn(),
    handleResetGame: vi.fn(),
    handleDisconnect: vi.fn(),
    handleCategories: vi.fn(),
    handleGame: vi.fn(),
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