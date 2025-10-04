import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketAuthMiddleware } from '../../../src/middleware/websocket-auth-middleware';
import { createMockWebSocketContext, createMockGameManager } from '../../test-helpers';

describe('WebSocketAuthMiddleware', () => {
  let mockGameManager: any;

  beforeEach(() => {
    mockGameManager = createMockGameManager();
  });

  describe('authenticate', () => {
    it('should pass authentication for valid WebSocket metadata', async () => {
      const mockGame = {
        id: 'test-game',
        players: [],
        catagories: [],
        catagory_select: true,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [],
        data: {}
      };
      mockGameManager.games.set('test-game', mockGame);

      const context = createMockWebSocketContext(
        { game: 'test-game', player: 'p1', playing: 'never-have-i-ever' },
        { op: 'join_game', create: true, playername: 'Alice' },
        mockGameManager
      );

      const next = vi.fn();

      await WebSocketAuthMiddleware.authenticate(context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error for missing game metadata', async () => {
      const context = createMockWebSocketContext(
        { player: 'p1', playing: 'never-have-i-ever' }, // missing game
        { op: 'join_game' },
        mockGameManager
      );

      const next = vi.fn();

      await expect(WebSocketAuthMiddleware.authenticate(context, next))
        .rejects.toThrow('Missing required WebSocket metadata: game, player, or playing');
    });

    it('should throw error for missing player metadata', async () => {
      const context = createMockWebSocketContext(
        { game: 'test-game', playing: 'never-have-i-ever' }, // missing player
        { op: 'join_game' },
        mockGameManager
      );

      const next = vi.fn();

      await expect(WebSocketAuthMiddleware.authenticate(context, next))
        .rejects.toThrow('Missing required WebSocket metadata: game, player, or playing');
    });

    it('should throw error for missing playing metadata', async () => {
      const context = createMockWebSocketContext(
        { game: 'test-game', player: 'p1' }, // missing playing
        { op: 'join_game' },
        mockGameManager
      );

      const next = vi.fn();

      await expect(WebSocketAuthMiddleware.authenticate(context, next))
        .rejects.toThrow('Missing required WebSocket metadata: game, player, or playing');
    });

    it('should throw error for non-existent game', async () => {
      const context = createMockWebSocketContext(
        { game: 'non-existent-game', player: 'p1', playing: 'never-have-i-ever' },
        { op: 'join_game' },
        mockGameManager
      );

      const next = vi.fn();

      await expect(WebSocketAuthMiddleware.authenticate(context, next))
        .rejects.toThrow('Game not found');
    });

    it('should allow new players to join without existing in game', async () => {
      const mockGame = {
        id: 'test-game',
        players: [],
        catagories: [],
        catagory_select: true,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [],
        data: {}
      };
      mockGameManager.games.set('test-game', mockGame);

      const context = createMockWebSocketContext(
        { game: 'test-game', player: 'new-player', playing: 'never-have-i-ever' },
        { op: 'join_game', create: false, playername: 'New Player' },
        mockGameManager
      );

      const next = vi.fn();

      // Should not throw - new players are allowed
      await WebSocketAuthMiddleware.authenticate(context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow existing players to reconnect', async () => {
      const mockGame = {
        id: 'test-game',
        players: [{ id: 'existing-player', name: 'Existing', score: 0, connected: false, this_round: { vote: null, voted: false } }],
        catagories: [],
        catagory_select: true,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [],
        data: {}
      };
      mockGameManager.games.set('test-game', mockGame);

      const context = createMockWebSocketContext(
        { game: 'test-game', player: 'existing-player', playing: 'never-have-i-ever' },
        { op: 'join_game', create: false, playername: 'Existing' },
        mockGameManager
      );

      const next = vi.fn();

      await WebSocketAuthMiddleware.authenticate(context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle CAH game type', async () => {
      const mockGame = {
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
        gameCompleted: false
      };
      mockGameManager.games.set('test-game', mockGame);

      const context = createMockWebSocketContext(
        { game: 'test-game', player: 'p1', playing: 'cards-against-humanity' },
        { op: 'join_game', create: true, playername: 'Alice' },
        mockGameManager
      );

      const next = vi.fn();

      await WebSocketAuthMiddleware.authenticate(context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should call next with correct context', async () => {
      const mockGame = {
        id: 'test-game',
        players: [],
        catagories: [],
        catagory_select: true,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [],
        data: {}
      };
      mockGameManager.games.set('test-game', mockGame);

      const context = createMockWebSocketContext(
        { game: 'test-game', player: 'p1', playing: 'never-have-i-ever' },
        { op: 'test_op', data: 'test' },
        mockGameManager
      );

      const next = vi.fn();

      await WebSocketAuthMiddleware.authenticate(context, next);

      expect(next).toHaveBeenCalledWith();
      expect(context.ws.data.game).toBe('test-game');
      expect(context.data.op).toBe('test_op');
    });
  });
});