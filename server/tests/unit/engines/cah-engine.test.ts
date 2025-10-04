import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCardsAgainstHumanityEngine } from '../../../src/lib/engines/cards-against-humanity';
import { createMockWebSocket, createMockGameStateService, createMockCAHGameState, createMockCAHPlayer, createMockCAHBlackCard } from '../../test-helpers';

describe('Cards Against Humanity Engine', () => {
  let engine: any;
  let mockGameStateService: any;
  let mockGameManager: any;

  beforeEach(() => {
    mockGameStateService = createMockGameStateService();
    mockGameManager = { games: new Map() };
    engine = createCardsAgainstHumanityEngine(mockGameManager, mockGameStateService);
  });

  describe('join_game', () => {
    it('should create game when create flag is true', async () => {
      const ws = createMockWebSocket('test-game', 'p1');

      await engine.handlers.join_game(ws, { create: true, playername: 'Alice' });

      expect(mockGameStateService.setGame).toHaveBeenCalled();
      const [gameId, gameState] = mockGameStateService.setGame.mock.calls[0];
      expect(gameId).toBe('test-game');
      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0].name).toBe('Alice');
      expect(gameState.gameType).toBe('cards-against-humanity');
    });

    it('should add player to existing game', async () => {
      const existingGame = createMockCAHGameState({
        players: [createMockCAHPlayer('existing', 'Bob')]
      });
      mockGameStateService.getGame.mockResolvedValue(existingGame);

      const ws = createMockWebSocket('test-game', 'p1');

      await engine.handlers.join_game(ws, { create: false, playername: 'Alice' });

      expect(existingGame.players).toHaveLength(2);
      expect(existingGame.players[1].name).toBe('Alice');
    });

    it('should start round when 3+ players join', async () => {
      // Setup 2 existing players
      const existingGame = createMockCAHGameState({
        players: [
          createMockCAHPlayer('p1', 'Alice'),
          createMockCAHPlayer('p2', 'Bob')
        ],
        selectedPacks: ['Test Pack'],
        deck: {
          blackCards: [createMockCAHBlackCard('black1', 'Test?')],
          whiteCards: []
        }
      });
      mockGameStateService.getGame.mockResolvedValue(existingGame);

      const ws = createMockWebSocket('test-game', 'p3');

      await engine.handlers.join_game(ws, { create: false, playername: 'Cara' });

      const [gameId, gameState] = mockGameStateService.setGame.mock.calls[1]; // Second call
      expect(gameState.phase).toBe('selecting');
      expect(gameState.currentBlackCard).toBeDefined();
      expect(gameState.currentJudge).toBeDefined();
    });

    it('should subscribe client to game and notifications topics', async () => {
      const ws = createMockWebSocket('test-game', 'p1');

      await engine.handlers.join_game(ws, { create: true, playername: 'Alice' });

      expect(ws.subscribe).toHaveBeenCalledWith('test-game');
      expect(ws.subscribe).toHaveBeenCalledWith('notifications');
    });
  });

  describe('select_packs', () => {
    it('should load cards from selected packs', async () => {
      const game = createMockCAHGameState();
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      // Mock database operations
      const mockDb = {
        prepare: vi.fn(() => ({
          all: vi.fn(() => [
            { id: 'black1', text: 'Test black card?', pick: 1 }
          ])
        })),
        close: vi.fn()
      };

      // Mock Bun.sqlite
      vi.mocked(await import('bun:sqlite')).default.mockReturnValue(mockDb as any);

      await engine.handlers.select_packs(ws, { packIds: ['Test Pack'] });

      expect(game.selectedPacks).toEqual(['Test Pack']);
      expect(game.deck.blackCards).toHaveLength(1);
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should reject pack changes after game has started', async () => {
      const game = createMockCAHGameState({ phase: 'selecting' });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      await expect(engine.handlers.select_packs(ws, { packIds: ['Test Pack'] }))
        .rejects.toThrow('Cannot change packs after game has started');
    });
  });

  describe('submit_cards', () => {
    it('should accept valid card submission', async () => {
      const game = createMockCAHGameState({
        phase: 'selecting',
        players: [createMockCAHPlayer('p1', 'Alice', ['card1', 'card2'])],
        currentBlackCard: createMockCAHBlackCard('black1', 'Test?', 1)
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      await engine.handlers.submit_cards(ws, { cardIds: ['card1'] });

      expect(game.submittedCards).toHaveLength(1);
      expect(game.submittedCards[0].playerId).toBe('p1');
      expect(game.players[0].hand).toHaveLength(1); // Card removed from hand
    });

    it('should reject submission with wrong number of cards', async () => {
      const game = createMockCAHGameState({
        phase: 'selecting',
        players: [createMockCAHPlayer('p1', 'Alice', ['card1', 'card2'])],
        currentBlackCard: createMockCAHBlackCard('black1', 'Test?', 2) // Requires 2 cards
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      await expect(engine.handlers.submit_cards(ws, { cardIds: ['card1'] }))
        .rejects.toThrow('Must submit exactly 2 cards');
    });

    it('should move to judging phase when all players submit', async () => {
      const game = createMockCAHGameState({
        phase: 'selecting',
        players: [
          createMockCAHPlayer('p1', 'Alice', ['card1']),
          createMockCAHPlayer('p2', 'Bob', ['card2'])
        ],
        currentBlackCard: createMockCAHBlackCard('black1', 'Test?', 1)
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws1 = createMockWebSocket('test-game', 'p1');
      const ws2 = createMockWebSocket('test-game', 'p2');

      await engine.handlers.submit_cards(ws1, { cardIds: ['card1'] });
      await engine.handlers.submit_cards(ws2, { cardIds: ['card2'] });

      expect(game.submittedCards).toHaveLength(2);
      expect(game.phase).toBe('judging');
    });

    it('should reject duplicate submissions', async () => {
      const game = createMockCAHGameState({
        phase: 'selecting',
        players: [createMockCAHPlayer('p1', 'Alice', ['card1', 'card2'])],
        currentBlackCard: createMockCAHBlackCard('black1', 'Test?', 1),
        submittedCards: [{ playerId: 'p1', cards: [], playerName: 'Alice' }]
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      await expect(engine.handlers.submit_cards(ws, { cardIds: ['card1'] }))
        .rejects.toThrow('You have already submitted for this round');
    });
  });

  describe('select_winner', () => {
    it('should award point to winner and advance to scoring phase', async () => {
      const game = createMockCAHGameState({
        phase: 'judging',
        players: [
          createMockCAHPlayer('p1', 'Alice'), // Judge
          createMockCAHPlayer('p2', 'Bob')
        ],
        currentJudge: 'p1',
        submittedCards: [{
          playerId: 'p2',
          cards: [{ id: 'card1', text: 'Test card' }],
          playerName: 'Bob'
        }]
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      await engine.handlers.select_winner(ws, { winnerPlayerId: 'p2' });

      expect(game.players[1].score).toBe(1);
      expect(game.roundWinner).toBe('p2');
      expect(game.phase).toBe('scoring');
    });

    it('should reject selection from non-judge', async () => {
      const game = createMockCAHGameState({
        phase: 'judging',
        players: [
          createMockCAHPlayer('p1', 'Alice'),
          createMockCAHPlayer('p2', 'Bob') // Not judge
        ],
        currentJudge: 'p1'
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p2');

      await expect(engine.handlers.select_winner(ws, { winnerPlayerId: 'p2' }))
        .rejects.toThrow('Only the current judge can select a winner');
    });

    it('should reject selection when not in judging phase', async () => {
      const game = createMockCAHGameState({
        phase: 'selecting',
        players: [createMockCAHPlayer('p1', 'Alice')],
        currentJudge: 'p1'
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      await expect(engine.handlers.select_winner(ws, { winnerPlayerId: 'p1' }))
        .rejects.toThrow('Not in judging phase');
    });
  });

  describe('reset_game', () => {
    it('should reset all game state', async () => {
      const game = createMockCAHGameState({
        phase: 'scoring',
        players: [createMockCAHPlayer('p1', 'Alice', [], { score: 5 })],
        selectedPacks: ['Test Pack'],
        deck: { blackCards: [], whiteCards: [] },
        currentRound: 5,
        currentJudge: 'p1'
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      await engine.handlers.reset_game(ws, {});

      expect(game.phase).toBe('waiting');
      expect(game.currentRound).toBe(0);
      expect(game.currentJudge).toBeNull();
      expect(game.selectedPacks).toEqual([]);
      expect(game.players[0].score).toBe(0);
    });
  });

  describe('handleDisconnect', () => {
    it('should mark player disconnected and reassign judge if needed', async () => {
      const game = createMockCAHGameState({
        players: [
          createMockCAHPlayer('p1', 'Alice', [], { connected: true }),
          createMockCAHPlayer('p2', 'Bob', [], { connected: true })
        ],
        currentJudge: 'p1'
      });
      mockGameStateService.getGame.mockResolvedValue(game);

      const ws = createMockWebSocket('test-game', 'p1');

      await engine.handlers.disconnect(ws, {});

      expect(game.players[0].connected).toBe(false);
      expect(game.currentJudge).toBe('p2'); // Reassigned to next player
    });
  });

  describe('ping', () => {
    it('should respond with pong', async () => {
      const ws = createMockWebSocket('test-game', 'p1');

      await engine.handlers.ping(ws, {});

      const { published } = ws.__getMessages();
      expect(published).toHaveLength(1);
      expect(JSON.parse(published[0].data).op).toBe('pong');
    });
  });
});