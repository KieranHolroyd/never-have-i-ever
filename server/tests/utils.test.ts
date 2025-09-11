import { describe, it, expect } from 'bun:test';
import {
  deepCopy,
  omitKeys,
  validateRequiredParams,
  getActivePlayerCount,
  isGameActive,
  sanitizeGameState,
  sanitizeGameStateWithHistory,
  findPlayerById,
  requirePlayer
} from '../src/utils';
import { GameData, Player } from '../src/types';

describe('Utils', () => {
  describe('deepCopy', () => {
    it('should create a deep copy of an object', () => {
      const original = { a: 1, b: { c: 2 } };
      const copy = deepCopy(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
      expect(copy.b).not.toBe(original.b);
    });

    it('should handle arrays', () => {
      const original = [1, 2, { a: 3 }];
      const copy = deepCopy(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
      expect(copy[2]).not.toBe(original[2]);
    });
  });

  describe('omitKeys', () => {
    it('should omit specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omitKeys(obj, ['b']);

      expect(result).toEqual({ a: 1, c: 3 });
      expect(result).not.toHaveProperty('b');
    });

    it('should handle multiple keys to omit', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omitKeys(obj, ['a', 'c']);

      expect(result).toEqual({ b: 2, d: 4 });
    });
  });

  describe('validateRequiredParams', () => {
    it('should not throw when all required params are present', () => {
      const params = { a: 1, b: 2, c: 3 };

      expect(() => validateRequiredParams(params, ['a', 'b'])).not.toThrow();
    });

    it('should throw when required params are missing', () => {
      const params = { a: 1, b: 2 };

      expect(() => validateRequiredParams(params, ['a', 'c']))
        .toThrow('Missing required parameters: c');
    });

    it('should throw with multiple missing params', () => {
      const params = { a: 1 };

      expect(() => validateRequiredParams(params, ['a', 'b', 'c']))
        .toThrow('Missing required parameters: b, c');
    });
  });

  describe('getActivePlayerCount', () => {
    it('should count connected players', () => {
      const game: GameData = {
        id: 'test',
        players: [
          { id: '1', name: 'P1', score: 0, connected: true, this_round: { vote: null, voted: false } },
          { id: '2', name: 'P2', score: 0, connected: false, this_round: { vote: null, voted: false } },
          { id: '3', name: 'P3', score: 0, connected: true, this_round: { vote: null, voted: false } },
        ],
        catagories: [],
        catagory_select: false,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [],
        data: {},
      };

      expect(getActivePlayerCount(game)).toBe(2);
    });

    it('should return 0 for empty player list', () => {
      const game: GameData = {
        id: 'test',
        players: [],
        catagories: [],
        catagory_select: false,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [],
        data: {},
      };

      expect(getActivePlayerCount(game)).toBe(0);
    });
  });

  describe('isGameActive', () => {
    it('should return true when there are connected players', () => {
      const game: GameData = {
        id: 'test',
        players: [
          { id: '1', name: 'P1', score: 0, connected: true, this_round: { vote: null, voted: false } },
        ],
        catagories: [],
        catagory_select: false,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [],
        data: {},
      };

      expect(isGameActive(game)).toBe(true);
    });

    it('should return false when no connected players', () => {
      const game: GameData = {
        id: 'test',
        players: [
          { id: '1', name: 'P1', score: 0, connected: false, this_round: { vote: null, voted: false } },
        ],
        catagories: [],
        catagory_select: false,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [],
        data: {},
      };

      expect(isGameActive(game)).toBe(false);
    });
  });

  describe('sanitizeGameState', () => {
    it('should omit data and history from game state', () => {
      const game: GameData = {
        id: 'test',
        players: [],
        catagories: [],
        catagory_select: false,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [{ question: { catagory: 'cat', content: 'q' }, players: [] }],
        data: { 'cat': { flags: { is_nsfw: false }, questions: [] } },
      };

      const sanitized = sanitizeGameState(game);

      expect(sanitized).not.toHaveProperty('data');
      expect(sanitized).not.toHaveProperty('history');
      expect(sanitized).toHaveProperty('id');
      expect(sanitized).toHaveProperty('players');
    });
  });

  describe('sanitizeGameStateWithHistory', () => {
    it('should omit only data from game state', () => {
      const game: GameData = {
        id: 'test',
        players: [],
        catagories: [],
        catagory_select: false,
        game_completed: false,
        waiting_for_players: false,
        current_question: { catagory: '', content: '' },
        history: [{ question: { catagory: 'cat', content: 'q' }, players: [] }],
        data: { 'cat': { flags: { is_nsfw: false }, questions: [] } },
      };

      const sanitized = sanitizeGameStateWithHistory(game);

      expect(sanitized).not.toHaveProperty('data');
      expect(sanitized).toHaveProperty('history');
      expect(sanitized.history).toEqual(game.history);
    });
  });

  describe('findPlayerById', () => {
    const game: GameData = {
      id: 'test',
      players: [
        { id: '1', name: 'P1', score: 0, connected: true, this_round: { vote: null, voted: false } },
        { id: '2', name: 'P2', score: 0, connected: false, this_round: { vote: null, voted: false } },
      ],
      catagories: [],
      catagory_select: false,
      game_completed: false,
      waiting_for_players: false,
      current_question: { catagory: '', content: '' },
      history: [],
      data: {},
    };

    it('should find player by id', () => {
      const player = findPlayerById(game, '1');
      expect(player).toEqual(game.players[0]);
    });

    it('should return undefined for non-existent player', () => {
      const player = findPlayerById(game, 'non-existent');
      expect(player).toBeUndefined();
    });
  });

  describe('requirePlayer', () => {
    const game: GameData = {
      id: 'test',
      players: [
        { id: '1', name: 'P1', score: 0, connected: true, this_round: { vote: null, voted: false } },
      ],
      catagories: [],
      catagory_select: false,
      game_completed: false,
      waiting_for_players: false,
      current_question: { catagory: '', content: '' },
      history: [],
      data: {},
    };

    it('should return player when found', () => {
      const player = requirePlayer(game, '1');
      expect(player).toEqual(game.players[0]);
    });

    it('should throw error when player not found', () => {
      expect(() => requirePlayer(game, 'non-existent'))
        .toThrow('Player non-existent not found in game test');
    });
  });
});
