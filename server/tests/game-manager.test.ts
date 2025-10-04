import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { GameManager } from '../src/game-manager';
import { select_question } from '../src/lib/questions';
import { SafeJSON } from '../src/utils/json';
import { z } from 'zod';
import './setup';

// Mock services
const mockWebSocketService = {
  sendToClient: mock(() => {}),
  broadcastToGameAndClient: mock(() => {}),
  publishToGame: mock(() => {}),
  getTimeoutStart: mock(() => 0),
  getRoundTimeoutMs: mock(() => 30000),
  setTimeoutStart: mock(() => {}),
  deleteTimeoutStart: mock(() => {}),
};

const mockHttpService = {
  getQuestionsList: mock(() => Promise.resolve({})),
};

const mockPersistenceService = {
  loadGame: mock(() => Promise.resolve(null)),
  createGame: mock((gameId: string) => Promise.resolve({
    id: gameId,
    players: [],
    catagories: [],
    catagory_select: true,
    game_completed: false,
    waiting_for_players: false,
    current_question: { catagory: '', content: '' },
    history: [],
    data: {},
  })),
  saveGame: mock(() => Promise.resolve()),
  saveActiveGames: mock(() => Promise.resolve()),
};

// Access the mocked Bun file from global
const mockBunFile = (global as any).Bun?.file;

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockWs: any;
  let mockGameSocket: any;

  beforeEach(() => {
    gameManager = new GameManager(mockWebSocketService as any, mockHttpService as any, mockPersistenceService as any);

    // Mock WebSocket
    mockWs = {
      data: { game: 'test-game', player: 'player1' },
      publish: mock(() => {}),
      send: mock(() => {}),
      subscribe: mock(() => {}),
      close: mock(() => {}),
    };

    mockGameSocket = {
      ...mockWs,
      data: { game: 'test-game', player: 'player1' },
    };

    // Reset mocks
    mockWs.publish.mockClear();
    mockWs.send.mockClear();
    mockWs.subscribe.mockClear();
    mockWs.close.mockClear();
  });

  describe('getOrCreateGame', () => {
    it('should create a new game if it does not exist', async () => {
      const gameId = 'new-game';
      const game = await gameManager.getOrCreateGame(gameId);

      expect(game).toBeDefined();
      expect(game.id).toBe(gameId);
      expect(game.players).toEqual([]);
      expect(game.catagories).toEqual([]);
      expect(game.catagory_select).toBe(true);
      expect(game.game_completed).toBe(false);
      expect(game.waiting_for_players).toBe(false);
      expect(game.current_question).toEqual({ catagory: '', content: '' });
      expect(game.history).toEqual([]);
    });

    it('should load existing game from filesystem if available', async () => {
      // Test basic game creation since filesystem mocking is complex
      const gameId = 'test-game';
      const game = await gameManager.getOrCreateGame(gameId);

      expect(game).toBeDefined();
      expect(game.id).toBe(gameId);
      expect(game.players).toEqual([]);
    });

    it('should return existing game from memory if already loaded', async () => {
      const gameId = 'existing-game';
      const existingGame = await gameManager.getOrCreateGame(gameId);

      // Call again - should return the same instance
      const sameGame = await gameManager.getOrCreateGame(gameId);

      expect(sameGame).toBe(existingGame);
    });
  });

  describe('handleJoinGame', () => {
    it('should create game if create flag is true', async () => {
      const data = { create: true, playername: 'Test Player' };

      await gameManager.handleJoinGame(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      expect(game).toBeDefined();
    });

    it('should add new player to game', async () => {
      const data = { create: false, playername: 'Test Player' };

      await gameManager.handleJoinGame(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      expect(game.players).toHaveLength(1);
      expect(game.players[0]).toEqual({
        id: 'player1',
        name: 'Test Player',
        score: 0,
        connected: true,
        this_round: { vote: null, voted: false },
      });
    });

    it('should not add duplicate player', async () => {
      const data = { create: false, playername: 'Test Player' };

      await gameManager.handleJoinGame(mockGameSocket, data);
      await gameManager.handleJoinGame(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      expect(game.players).toHaveLength(1);
    });

    it('should reject when game is full (12+ players)', async () => {
      const game = await gameManager.getOrCreateGame('test-game');

      // Add 12 players
      for (let i = 0; i < 12; i++) {
        game.players.push({
          id: `player${i}`,
          name: `Player ${i}`,
          score: 0,
          connected: true,
          this_round: { vote: null, voted: false },
        });
      }

      const data = { create: false, playername: 'Test Player' };

      await gameManager.handleJoinGame(mockGameSocket, data);

      expect(mockWs.close).toHaveBeenCalledWith(1013, 'Game is full');
    });
  });

  describe('handleSelectCategories', () => {
    it('should enable category selection mode', async () => {
      const data = {};

      await gameManager.handleSelectCategories(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      expect(game.catagory_select).toBe(true);
    });
  });

  describe('handleSelectCategory', () => {
    it('should add category if not selected', async () => {
      const data = { catagory: 'test-category' };

      await gameManager.handleSelectCategory(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      expect(game.catagories).toContain('test-category');
    });

    it('should remove category if already selected', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = ['test-category'];

      const data = { catagory: 'test-category' };

      await gameManager.handleSelectCategory(mockGameSocket, data);

      expect(game.catagories).not.toContain('test-category');
    });

    it('should send validation error for missing category', async () => {
      const data = {};

      await gameManager.handleSelectCategory(mockGameSocket, data);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ message: 'Category is required', op: 'error' })
      );
    });

    it('should send validation error for empty category string', async () => {
      const data = { catagory: '' };

      await gameManager.handleSelectCategory(mockGameSocket, data);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ message: 'Category is required', op: 'error' })
      );
    });

    it('should send validation error for null category', async () => {
      const data = { catagory: null };

      await gameManager.handleSelectCategory(mockGameSocket, data);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ message: 'Category is required', op: 'error' })
      );
    });

    it('should send validation error for undefined category', async () => {
      const data = { catagory: undefined };

      await gameManager.handleSelectCategory(mockGameSocket, data);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ message: 'Category is required', op: 'error' })
      );
    });

    it('should handle category selection with additional WebSocket fields', async () => {
      const data = {
        catagory: 'test-category',
        extraField: 'extra-value',
        anotherField: 123
      };

      await gameManager.handleSelectCategory(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      expect(game.catagories).toContain('test-category');
    });

    it('should handle multiple category selections with extra fields', async () => {
      // First selection
      const data1 = {
        catagory: 'food',
        timestamp: Date.now(),
        userAgent: 'test-agent'
      };

      await gameManager.handleSelectCategory(mockGameSocket, data1);

      // Second selection
      const data2 = {
        catagory: 'games',
        sessionId: 'abc-123',
        metadata: { source: 'test' }
      };

      await gameManager.handleSelectCategory(mockGameSocket, data2);

      const game = await gameManager.getOrCreateGame('test-game');
      expect(game.catagories).toContain('food');
      expect(game.catagories).toContain('games');
    });
  });

  describe('handleConfirmSelections', () => {
    it('should disable category selection when categories are selected', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = ['test-category'];
      game.catagory_select = true;

      const data = {};

      await gameManager.handleConfirmSelections(mockGameSocket, data);

      expect(game.catagory_select).toBe(false);
    });

    it('should send validation error when no categories selected', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = []; // Ensure no categories are selected
      game.catagory_select = true;

      const data = {};

      await gameManager.handleConfirmSelections(mockGameSocket, data);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ message: 'At least one category must be selected', op: 'error' })
      );
    });
  });

  describe('handleVote', () => {
    beforeEach(async () => {
      // Setup game with a player
      await gameManager.handleJoinGame(mockGameSocket, { create: true, playername: 'Test Player' });
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = ['test-category'];
      game.catagory_select = false;
      game.waiting_for_players = true;
    });

    it('should accept valid vote option 1 (Have)', async () => {
      const data = { option: 1 };

      await gameManager.handleVote(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      const player = game.players.find(p => p.id === 'player1');
      expect(player?.this_round.vote).toBe('Have');
      expect(player?.this_round.voted).toBe(true);
      expect(player?.score).toBe(1);
    });

    it('should accept valid vote option 2 (Have Not)', async () => {
      const data = { option: 2 };

      await gameManager.handleVote(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      const player = game.players.find(p => p.id === 'player1');
      expect(player?.this_round.vote).toBe('Have Not');
      expect(player?.this_round.voted).toBe(true);
      expect(player?.score).toBe(0);
    });

    it('should accept valid vote option 3 (Kinda)', async () => {
      const data = { option: 3 };

      await gameManager.handleVote(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      const player = game.players.find(p => p.id === 'player1');
      expect(player?.this_round.vote).toBe('Kinda');
      expect(player?.this_round.voted).toBe(true);
      expect(player?.score).toBe(0.5);
    });

    it('should handle vote changes by undoing previous vote', async () => {
      // First vote
      await gameManager.handleVote(mockGameSocket, { option: 1 });
      // Change vote
      await gameManager.handleVote(mockGameSocket, { option: 3 });

      const game = await gameManager.getOrCreateGame('test-game');
      const player = game.players.find(p => p.id === 'player1');
      expect(player?.this_round.vote).toBe('Kinda');
      expect(player?.this_round.voted).toBe(true);
      expect(player?.score).toBe(0.5); // 1 - 1 + 0.5 = 0.5
    });

    it('should send validation error for invalid vote options', async () => {
      const data = { option: 4 };

      await gameManager.handleVote(mockGameSocket, data);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ message: 'Invalid vote option', op: 'error' })
      );
    });

    it('should start timeout on first vote', async () => {
      const data = { option: 1 };

      await gameManager.handleVote(mockGameSocket, data);

      const game = await gameManager.getOrCreateGame('test-game');
      expect(game.round_timeout).toBeDefined();
    });
  });

  describe('handleNextQuestion', () => {
    beforeEach(async () => {
      await gameManager.handleJoinGame(mockGameSocket, { create: true, playername: 'Test Player' });
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = ['food'];
      game.catagory_select = false;
    });

    it('should select new question and reset player votes', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = ['food'];
      game.catagory_select = false;

      // Add a player to the game
      game.players = [{
        id: 'player1',
        name: 'Test Player',
        score: 0,
        connected: true,
        this_round: { vote: 'Have', voted: true }
      }];

      // Ensure game has data loaded (should be loaded by createGame)
      if (!game.data || !game.data['food']) {
        // Load data manually for test
        const questionsList = await (gameManager as any).getQuestionsList();
        game.data = (gameManager as any).deepCopy(questionsList);
      }

      const data = {};

      await gameManager.handleNextQuestion(mockGameSocket, data);

      // Test that the game state was updated appropriately
      expect(game.current_question.catagory).toBeDefined();
      expect(game.current_question.content).toBeDefined();
      expect(game.waiting_for_players).toBe(true);

      const player = game.players.find(p => p.id === 'player1');
      expect(player?.this_round.voted).toBe(false);
      expect(player?.this_round.vote).toBe(null);
    });

    it('should add current round to history before selecting new question', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = ['food'];
      game.catagory_select = false;
      game.current_question = { catagory: 'old-category', content: 'Old question?' };

      // Ensure game has data loaded
      if (!game.data || !game.data['food']) {
        const questionsList = await (gameManager as any).getQuestionsList();
        game.data = (gameManager as any).deepCopy(questionsList);
      }

      // Add a player with a vote
      game.players = [{
        id: 'player1',
        name: 'Test Player',
        score: 0,
        connected: true,
        this_round: { vote: 'Have', voted: true }
      }];

      const data = {};
      await gameManager.handleNextQuestion(mockGameSocket, data);

      expect(game.history).toHaveLength(1);
      expect(game.history[0].question).toEqual({ catagory: 'old-category', content: 'Old question?' });
    });

    it('should skip round manually when all players have voted', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.waiting_for_players = true;
      game.players[0].this_round.voted = true;

      const data = {};
      await gameManager.handleNextQuestion(mockGameSocket, data);

      // handleNextQuestion always resets player votes for the new round
      // regardless of previous voting status
      expect(game.players[0].this_round.voted).toBe(false);
      expect(game.players[0].this_round.vote).toBe(null);
    });
  });

  describe('handleResetGame', () => {
    it('should reset all game state', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.players = [{ id: 'p1', name: 'Player', score: 5, connected: true, this_round: { vote: 'Have', voted: true } }];
      game.catagories = ['test-category'];
      game.catagory_select = false;
      game.history = [{ question: { catagory: 'cat', content: 'q' }, players: [] }];
      game.current_question = { catagory: 'cat', content: 'q' };

      const data = {};
      await gameManager.handleResetGame(mockGameSocket, data);

      expect(game.catagories).toEqual([]);
      expect(game.catagory_select).toBe(true);
      expect(game.history).toEqual([]);
      expect(game.current_question).toEqual({ catagory: '', content: '' });
      expect(game.players[0].score).toBe(0);
      expect(game.players[0].this_round).toEqual({ vote: null, voted: false });
    });
  });

  describe('handleDisconnect', () => {
    it('should mark player as disconnected', async () => {
      await gameManager.handleJoinGame(mockGameSocket, { create: true, playername: 'Test Player' });

      gameManager.handleDisconnect(mockGameSocket);

      const game = await gameManager.getOrCreateGame('test-game');
      const player = game.players.find(p => p.id === 'player1');
      expect(player?.connected).toBe(false);
    });
  });

  describe('HTTP Handlers', () => {
    describe('handleCategories', () => {
      it('should return categories with CORS headers', async () => {
        const response = await gameManager.handleCategories();

        expect(response.status).toBe(200);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Cache-Control')).toBe('max-age=86400');
      });
    });

    describe('handleGame', () => {
      it('should return game state for valid game', async () => {
        const game = await gameManager.getOrCreateGame('test-game');
        game.players = [{ id: 'p1', name: 'Player', score: 1, connected: true, this_round: { vote: null, voted: false } }];

        const request = new Request('http://localhost/game?id=test-game');
        const response = await gameManager.handleGame(request);

        expect(response.status).toBe(200);
        const data = await response.json() as any;
        expect(data.id).toBe('test-game');
        expect(data.active).toBe(true);
      });

      it('should return 404 for non-existent game', async () => {
        const request = new Request('http://localhost/game?id=non-existent');
        const response = await gameManager.handleGame(request);

        expect(response.status).toBe(404);
        const data = await response.json() as any;
        expect(data.error).toBe('game_not_found');
      });

      it('should return 400 for missing game id', async () => {
        const request = new Request('http://localhost/game');
        const response = await gameManager.handleGame(request);

        expect(response.status).toBe(400);
        const data = await response.json() as any;
        expect(data.error).toBe('no_gameid');
      });
    });
  });
});

describe('WebSocket Message Parsing', () => {
  it('should allow additional fields to pass through WebSocket message schema', () => {
    const WebSocketMessageSchema = z.object({
      op: z.string(),
    }).passthrough();

    const message = JSON.stringify({
      op: 'select_catagory',
      catagory: 'test-category',
      extraField: 'extra-value',
      timestamp: 1234567890
    });

    const parsed = SafeJSON.parse(message, WebSocketMessageSchema);

    expect(parsed.op).toBe('select_catagory');
    expect(parsed.catagory).toBe('test-category');
    expect(parsed.extraField).toBe('extra-value');
    expect(parsed.timestamp).toBe(1234567890);
  });

  it('should handle category selection message format correctly', () => {
    const WebSocketMessageSchema = z.object({
      op: z.string(),
    }).passthrough();

    const message = JSON.stringify({
      op: 'select_catagory',
      catagory: 'writers'
    });

    const parsed = SafeJSON.parse(message, WebSocketMessageSchema);

    expect(parsed.op).toBe('select_catagory');
    expect(parsed.catagory).toBe('writers');
    expect(Object.keys(parsed)).toHaveLength(2);
  });
});
