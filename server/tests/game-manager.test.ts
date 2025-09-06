import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameManager } from '../src/game-manager';
import { select_question } from '../src/lib/questions';

// Access the mocked Bun file from global
const mockBunFile = (global as any).Bun.file;

// Mock the questions module
vi.mock('../src/lib/questions', () => ({
  select_question: vi.fn(),
}));

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockWs: any;
  let mockGameSocket: any;

  beforeEach(() => {
    gameManager = new GameManager();

    // Mock WebSocket
    mockWs = {
      data: { game: 'test-game', player: 'player1' },
      publish: vi.fn(),
      send: vi.fn(),
      subscribe: vi.fn(),
      close: vi.fn(),
    };

    mockGameSocket = {
      ...mockWs,
      data: { game: 'test-game', player: 'player1' },
    };

    // Reset mocks
    vi.clearAllMocks();
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
      const gameId = 'test-game';
      const mockFileInstance = {
        exists: vi.fn().mockResolvedValue(true),
        json: vi.fn().mockResolvedValue({
          id: gameId,
          players: [],
          catagories: [],
          catagory_select: true,
          game_completed: false,
          waiting_for_players: false,
          current_question: { catagory: '', content: '' },
          history: [],
          data: {}
        }),
      };
      mockBunFile.mockReturnValue(mockFileInstance);

      const game = await gameManager.getOrCreateGame(gameId);

      expect(game).toBeDefined();
      expect(game.id).toBe(gameId);
      expect(mockFileInstance.exists).toHaveBeenCalledWith();
      expect(mockFileInstance.json).toHaveBeenCalled();
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
      game.catagories = ['test-category'];
      game.catagory_select = false;
    });

    it('should select new question and reset player votes', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = ['test-category'];
      game.catagory_select = false;

      // Add a player to the game
      game.players = [{
        id: 'player1',
        name: 'Test Player',
        score: 0,
        connected: true,
        this_round: { vote: 'Have', voted: true }
      }];

      // Set up mock for this specific test
      vi.mocked(select_question).mockReturnValue({
        catagory: 'test-category',
        content: 'Test question?'
      });

      const data = {};

      await gameManager.handleNextQuestion(mockGameSocket, data);

      expect(game.current_question.catagory).toBe('test-category');
      expect(game.current_question.content).toBe('Test question?');
      expect(game.waiting_for_players).toBe(true);

      const player = game.players.find(p => p.id === 'player1');
      expect(player?.this_round.voted).toBe(false);
      expect(player?.this_round.vote).toBe(null);
    });

    it('should add current round to history before selecting new question', async () => {
      const game = await gameManager.getOrCreateGame('test-game');
      game.catagories = ['test-category'];
      game.catagory_select = false;
      game.current_question = { catagory: 'old-category', content: 'Old question?' };

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

      // When all players have voted, it should proceed to next question
      // which sets waiting_for_players back to true
      expect(game.waiting_for_players).toBe(true);
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
