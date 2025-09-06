import { describe, it, expect } from 'vitest';
import {
  GameError,
  ValidationError,
  NotFoundError,
  GameFullError,
  GameNotFoundError,
  PlayerNotFoundError,
  InvalidOperationError
} from '../src/errors';

describe('Errors', () => {
  describe('GameError', () => {
    it('should create error with correct properties', () => {
      const error = new GameError('Test message', 'TEST_CODE', 400, { extra: 'data' });

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.name).toBe('GameError');
    });

    it('should default statusCode to 400', () => {
      const error = new GameError('Test message', 'TEST_CODE');

      expect(error.statusCode).toBe(400);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'name' });

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'name' });
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource and id', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe('User with id 123 not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ resource: 'User', id: '123' });
      expect(error.name).toBe('NotFoundError');
    });

    it('should create not found error without id', () => {
      const error = new NotFoundError('Game');

      expect(error.message).toBe('Game not found');
      expect(error.details).toEqual({ resource: 'Game', id: undefined });
    });
  });

  describe('GameFullError', () => {
    it('should create game full error', () => {
      const error = new GameFullError();

      expect(error.message).toBe('Game is full');
      expect(error.code).toBe('GAME_FULL');
      expect(error.statusCode).toBe(1013);
      expect(error.name).toBe('GameFullError');
    });
  });

  describe('GameNotFoundError', () => {
    it('should create game not found error', () => {
      const error = new GameNotFoundError('game-123');

      expect(error.message).toBe('Game with id game-123 not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('GameNotFoundError');
    });
  });

  describe('PlayerNotFoundError', () => {
    it('should create player not found error', () => {
      const error = new PlayerNotFoundError('player-123');

      expect(error.message).toBe('Player with id player-123 not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('PlayerNotFoundError');
    });
  });

  describe('InvalidOperationError', () => {
    it('should create invalid operation error with reason', () => {
      const error = new InvalidOperationError('vote', 'Game not started');

      expect(error.message).toBe('Invalid operation: vote. Game not started');
      expect(error.code).toBe('INVALID_OPERATION');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ operation: 'vote', reason: 'Game not started' });
      expect(error.name).toBe('InvalidOperationError');
    });

    it('should create invalid operation error without reason', () => {
      const error = new InvalidOperationError('join');

      expect(error.message).toBe('Invalid operation: join');
      expect(error.details).toEqual({ operation: 'join', reason: undefined });
    });
  });
});
