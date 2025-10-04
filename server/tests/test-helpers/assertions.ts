import { expect } from 'vitest';
import type { GameSocket } from '../../src/lib/router';
import type { GameState } from '../../src/services/game-state-service';

/**
 * Get the last message sent by operation type from a mock WebSocket
 */
export function getLastMessageByOp(client: any, op: string) {
  const { sent, published } = client.__getMessages();

  // Search direct sends first
  for (let i = sent.length - 1; i >= 0; i--) {
    const msg = JSON.parse(sent[i]);
    if (msg.op === op) return msg;
  }

  // Fallback to published messages
  for (let i = published.length - 1; i >= 0; i--) {
    const msg = JSON.parse(published[i].data);
    if (msg.op === op) return msg;
  }

  return null;
}

/**
 * Get the last game state message from a mock WebSocket
 */
export function getLastGameStateMessage(client: any) {
  return getLastMessageByOp(client, 'game_state');
}

/**
 * Assert that a broadcast was made to a game
 */
export function expectBroadcastToGame(
  service: any,
  gameId: string,
  op: string,
  data?: any
) {
  expect(service.broadcastToGameAndClient).toHaveBeenCalledWith(
    expect.any(Object), // ws
    op,
    data
  );
}

/**
 * Assert that a message was sent to a specific client
 */
export function expectSentToClient(
  service: any,
  op: string,
  data?: any
) {
  expect(service.sendToClient).toHaveBeenCalledWith(
    expect.any(Object), // ws
    op,
    data
  );
}

/**
 * Assert that a game state matches expected properties
 */
export function expectGameState(
  gameState: GameState,
  expected: Partial<GameState>
) {
  expect(gameState).toMatchObject(expected);
}

/**
 * Assert that a player has expected properties
 */
export function expectPlayer(
  player: any,
  expected: any
) {
  expect(player).toMatchObject(expected);
}

/**
 * Assert that a mock was called with specific arguments
 */
export function expectCalledWith(
  mock: any,
  ...args: any[]
) {
  expect(mock).toHaveBeenCalledWith(...args);
}

/**
 * Assert that a mock was called
 */
export function expectCalled(mock: any) {
  expect(mock).toHaveBeenCalled();
}

/**
 * Assert that a mock was not called
 */
export function expectNotCalled(mock: any) {
  expect(mock).not.toHaveBeenCalled();
}

/**
 * Assert that a mock was called a specific number of times
 */
export function expectCalledTimes(mock: any, times: number) {
  expect(mock).toHaveBeenCalledTimes(times);
}

/**
 * Assert that an error was thrown with specific message
 */
export function expectErrorThrown(
  fn: () => Promise<any>,
  errorMessage: string
) {
  return expect(fn()).rejects.toThrow(errorMessage);
}

/**
 * Assert that a WebSocket subscription was made
 */
export function expectSubscribed(client: any, topic: string) {
  const { subscriptions } = client.__getMessages();
  expect(subscriptions).toContain(topic);
}

/**
 * Assert that a WebSocket message was published
 */
export function expectPublished(client: any, topic: string, op?: string) {
  const { published } = client.__getMessages();
  const found = published.find((p: any) => {
    const msg = JSON.parse(p.data);
    return p.topic === topic && (!op || msg.op === op);
  });
  expect(found).toBeDefined();
}

/**
 * Assert that a WebSocket message was sent directly
 */
export function expectSent(client: any, op: string) {
  const message = getLastMessageByOp(client, op);
  expect(message).toBeTruthy();
  return message;
}

/**
 * Wait for a specific message type from a WebSocket (for async tests)
 */
export function waitForMessage(client: any, op: string, timeout = 1000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for message ${op}`));
    }, timeout);

    // Check if message already exists
    const existing = getLastMessageByOp(client, op);
    if (existing) {
      clearTimeout(timer);
      resolve(existing);
      return;
    }

    // In a real implementation, you'd set up event listeners
    // For now, just check periodically
    const checkInterval = setInterval(() => {
      const message = getLastMessageByOp(client, op);
      if (message) {
        clearTimeout(timer);
        clearInterval(checkInterval);
        resolve(message);
      }
    }, 10);
  });
}

/**
 * Assert that a service method was called with correct game state
 */
export function expectGameStateSaved(service: any, expectedGameState: Partial<GameState>) {
  expect(service.setGame).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining(expectedGameState)
  );
}

/**
 * Assert that a timeout was set
 */
export function expectTimeoutSet(service: any, gameId: string) {
  expect(service.setTimeoutStart).toHaveBeenCalledWith(gameId, expect.any(Number));
}

/**
 * Assert that a timeout was cleared
 */
export function expectTimeoutCleared(service: any, gameId: string) {
  expect(service.deleteTimeoutStart).toHaveBeenCalledWith(gameId);
}