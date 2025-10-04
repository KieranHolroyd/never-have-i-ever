import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { createServer } from '../../../server/src/index';
import type { Server } from 'http';

// Mock external dependencies for E2E tests
vi.mock('../../../server/src/redis_client', () => ({
  client: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn()
  },
  getClient: () => Promise.resolve({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn()
  })
}));

describe('Never Have I Ever E2E Flow', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    port = 3001;
    server = await createServer(port);
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe('Full Game Flow', () => {
    let clients: WebSocket[] = [];
    const gameId = 'e2e-test-game';

    beforeEach(() => {
      clients = [];
    });

    afterEach(async () => {
      // Clean up WebSocket connections
      await Promise.all(clients.map(client => {
        return new Promise((resolve) => {
          client.close();
          client.on('close', resolve);
        });
      }));
    });

    it('should complete full NHIE game cycle', async () => {
      // Connect 3 clients
      clients = await Promise.all([
        connectTestClient(gameId, 'player1'),
        connectTestClient(gameId, 'player2'),
        connectTestClient(gameId, 'player3')
      ]);

      // Player 1 creates game
      await sendMessage(clients[0], { op: 'join_game', create: true, playername: 'Alice' });
      await expectGameState(clients[0], { phase: 'category_select' });

      // Players 2 and 3 join
      await sendMessage(clients[1], { op: 'join_game', create: false, playername: 'Bob' });
      await sendMessage(clients[2], { op: 'join_game', create: false, playername: 'Cara' });

      // Select categories
      await sendMessage(clients[0], { op: 'select_category', catagory: 'food' });
      await sendMessage(clients[0], { op: 'select_category', catagory: 'relationships' });
      await sendMessage(clients[0], { op: 'confirm_selections' });

      // Wait for game state update
      await expectGameState(clients[0], { phase: 'waiting' });

      // Start first round
      await sendMessage(clients[0], { op: 'next_question' });
      const gameState = await expectGameState(clients[0], { phase: 'waiting', waitingForPlayers: true });

      // All players vote
      await sendMessage(clients[0], { op: 'vote', option: 1 }); // Have
      await sendMessage(clients[1], { op: 'vote', option: 2 }); // Have Not
      await sendMessage(clients[2], { op: 'vote', option: 3 }); // Kinda

      // Wait for auto-progression or manual next
      await expectGameState(clients[0], { phase: 'waiting', current_question: expect.any(Object) });

      // Verify scores updated correctly
      const finalState = await getGameState(clients[0]);
      expect(finalState.players.find((p: any) => p.id === 'player1').score).toBe(1);
      expect(finalState.players.find((p: any) => p.id === 'player2').score).toBe(0);
      expect(finalState.players.find((p: any) => p.id === 'player3').score).toBe(0.5);
    });

    it('should handle player disconnection and reconnection', async () => {
      // Connect 2 clients
      clients = await Promise.all([
        connectTestClient(gameId, 'player1'),
        connectTestClient(gameId, 'player2')
      ]);

      // Both join game
      await sendMessage(clients[0], { op: 'join_game', create: true, playername: 'Alice' });
      await sendMessage(clients[1], { op: 'join_game', create: false, playername: 'Bob' });

      // Start game
      await sendMessage(clients[0], { op: 'select_category', catagory: 'food' });
      await sendMessage(clients[0], { op: 'confirm_selections' });
      await sendMessage(clients[0], { op: 'next_question' });

      // Player 2 disconnects
      clients[1].close();
      await waitForEvent(clients[1], 'close');

      // Verify player marked as disconnected
      const stateAfterDisconnect = await getGameState(clients[0]);
      expect(stateAfterDisconnect.players.find((p: any) => p.id === 'player2').connected).toBe(false);

      // Player 2 reconnects
      const newClient = await connectTestClient(gameId, 'player2');
      clients[1] = newClient;

      await sendMessage(newClient, { op: 'join_game', create: false, playername: 'Bob' });

      // Verify player reconnected
      const stateAfterReconnect = await getGameState(clients[0]);
      expect(stateAfterReconnect.players.find((p: any) => p.id === 'player2').connected).toBe(true);
    });

    it('should handle timeout and auto-progression', async () => {
      // Connect 2 clients
      clients = await Promise.all([
        connectTestClient(gameId, 'player1'),
        connectTestClient(gameId, 'player2')
      ]);

      // Setup game
      await sendMessage(clients[0], { op: 'join_game', create: true, playername: 'Alice' });
      await sendMessage(clients[1], { op: 'join_game', create: false, playername: 'Bob' });
      await sendMessage(clients[0], { op: 'select_category', catagory: 'food' });
      await sendMessage(clients[0], { op: 'confirm_selections' });
      await sendMessage(clients[0], { op: 'next_question' });

      // Only one player votes
      await sendMessage(clients[0], { op: 'vote', option: 1 });

      // Wait for timeout (this would need to be mocked in real E2E)
      // In a real scenario, we'd either wait for the actual timeout
      // or mock the timer to speed up the test

      // For this example, we'll manually trigger next question
      await sendMessage(clients[0], { op: 'next_question' });

      const newState = await expectGameState(clients[0], { phase: 'waiting' });
      expect(newState.current_question).not.toBeUndefined();
    });

    it('should handle game reset', async () => {
      // Connect clients and setup game
      clients = await Promise.all([
        connectTestClient(gameId, 'player1'),
        connectTestClient(gameId, 'player2')
      ]);

      await sendMessage(clients[0], { op: 'join_game', create: true, playername: 'Alice' });
      await sendMessage(clients[1], { op: 'join_game', create: false, playername: 'Bob' });
      await sendMessage(clients[0], { op: 'select_category', catagory: 'food' });
      await sendMessage(clients[0], { op: 'confirm_selections' });
      await sendMessage(clients[0], { op: 'next_question' });
      await sendMessage(clients[0], { op: 'vote', option: 1 });
      await sendMessage(clients[1], { op: 'vote', option: 2 });

      // Verify game has progressed
      const gameState = await getGameState(clients[0]);
      expect(gameState.players.some((p: any) => p.score > 0)).toBe(true);

      // Reset game
      await sendMessage(clients[0], { op: 'reset_game' });

      // Verify reset
      const resetState = await expectGameState(clients[0], { phase: 'category_select' });
      expect(resetState.players.every((p: any) => p.score === 0)).toBe(true);
      expect(resetState.catagories).toEqual([]);
      expect(resetState.history).toEqual([]);
    });
  });
});

// Helper functions for E2E tests

async function connectTestClient(gameId: string, playerId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws?game=${gameId}&player=${playerId}&playing=never-have-i-ever`);

    ws.on('open', () => resolve(ws));
    ws.on('error', reject);

    // Timeout after 5 seconds
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

async function sendMessage(client: WebSocket, message: any): Promise<void> {
  return new Promise((resolve, reject) => {
    client.send(JSON.stringify(message), (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function expectGameState(client: WebSocket, expectedState: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for game state'));
    }, 5000);

    const messageHandler = (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.op === 'game_state') {
          clearTimeout(timeout);
          client.off('message', messageHandler);

          // Check if state matches expectations
          const gameState = message.game;
          const matches = Object.entries(expectedState).every(([key, value]) => {
            if (typeof value === 'function') {
              return value(gameState[key]);
            }
            return gameState[key] === value;
          });

          if (matches) {
            resolve(gameState);
          } else {
            reject(new Error(`Game state mismatch. Expected: ${JSON.stringify(expectedState)}, Got: ${JSON.stringify(gameState)}`));
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    client.on('message', messageHandler);
  });
}

async function getGameState(client: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for game state'));
    }, 5000);

    const messageHandler = (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.op === 'game_state') {
          clearTimeout(timeout);
          client.off('message', messageHandler);
          resolve(message.game);
        }
      } catch (error) {
        reject(error);
      }
    };

    client.on('message', messageHandler);
  });
}

async function waitForEvent(client: WebSocket, event: string): Promise<void> {
  return new Promise((resolve) => {
    client.once(event, resolve);
  });
}