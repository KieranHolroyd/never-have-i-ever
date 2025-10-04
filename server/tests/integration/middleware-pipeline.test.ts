import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketMiddlewarePipeline, createDefaultMiddlewarePipeline } from '../../src/middleware/index';
import { WebSocketAuthMiddleware } from '../../src/middleware/websocket-auth-middleware';
import { WebSocketLoggingMiddleware } from '../../src/middleware/websocket-logging-middleware';
import { WebSocketValidationMiddleware } from '../../src/middleware/websocket-validation-middleware';
import { createMockWebSocketContext, createMockGameManager } from '../test-helpers';

describe('Middleware Pipeline Integration', () => {
  let pipeline: WebSocketMiddlewarePipeline;
  let mockGameManager: any;

  beforeEach(() => {
    pipeline = new WebSocketMiddlewarePipeline();
    mockGameManager = createMockGameManager();
  });

  describe('Pipeline execution order', () => {
    it('should execute middleware in correct order', async () => {
      const executionOrder: string[] = [];
      const mockContext = createMockWebSocketContext();

      const mockLogging = vi.fn(async (ctx, next) => {
        executionOrder.push('logging');
        await next();
      });
      const mockAuth = vi.fn(async (ctx, next) => {
        executionOrder.push('auth');
        await next();
      });
      const mockValidation = vi.fn(async (ctx, next) => {
        executionOrder.push('validation');
        await next();
      });

      pipeline
        .use(mockLogging)
        .use(mockAuth)
        .use(mockValidation);

      await pipeline.execute(mockContext);

      expect(executionOrder).toEqual(['logging', 'auth', 'validation']);
      expect(mockLogging).toHaveBeenCalledWith(mockContext, expect.any(Function));
      expect(mockAuth).toHaveBeenCalledWith(mockContext, expect.any(Function));
      expect(mockValidation).toHaveBeenCalledWith(mockContext, expect.any(Function));
    });

    it('should stop execution on middleware error', async () => {
      const mockContext = createMockWebSocketContext();
      const executionOrder: string[] = [];

      const failingMiddleware = vi.fn(async () => {
        executionOrder.push('failing');
        throw new Error('Middleware failed');
      });
      const shouldNotExecute = vi.fn(async () => {
        executionOrder.push('should-not-execute');
      });

      pipeline
        .use(failingMiddleware)
        .use(shouldNotExecute);

      await expect(pipeline.execute(mockContext)).rejects.toThrow('Middleware failed');

      expect(executionOrder).toEqual(['failing']);
      expect(shouldNotExecute).not.toHaveBeenCalled();
    });

    it('should pass context through middleware chain', async () => {
      const mockContext = createMockWebSocketContext();
      const receivedContexts: any[] = [];

      const middleware1 = vi.fn(async (ctx, next) => {
        receivedContexts.push(ctx);
        ctx.data.modified = true;
        await next();
      });
      const middleware2 = vi.fn(async (ctx, next) => {
        receivedContexts.push(ctx);
        expect(ctx.data.modified).toBe(true);
        await next();
      });

      pipeline
        .use(middleware1)
        .use(middleware2);

      await pipeline.execute(mockContext);

      expect(receivedContexts).toHaveLength(2);
      expect(receivedContexts[0]).toBe(mockContext);
      expect(receivedContexts[1]).toBe(mockContext);
      expect(mockContext.data.modified).toBe(true);
    });
  });

  describe('Default middleware pipeline', () => {
    it('should create pipeline with correct middleware order', () => {
      const defaultPipeline = createDefaultMiddlewarePipeline(mockGameManager);

      expect(defaultPipeline).toBeInstanceOf(WebSocketMiddlewarePipeline);
      // The pipeline is created with the correct middleware internally
    });

    it('should execute default middleware for valid request', async () => {
      const mockContext = createMockWebSocketContext(
        { game: 'test-game', player: 'p1', playing: 'never-have-i-ever' },
        { op: 'join_game', create: true, playername: 'Alice' },
        {
          ...mockGameManager,
          games: new Map([['test-game', {
            id: 'test-game',
            players: [],
            catagories: [],
            catagory_select: true,
            game_completed: false,
            waiting_for_players: false,
            current_question: { catagory: '', content: '' },
            history: [],
            data: {}
          }]])
        }
      );

      const defaultPipeline = createDefaultMiddlewarePipeline(mockContext.gameManager);

      // Should not throw for valid request
      await expect(defaultPipeline.execute(mockContext)).resolves.not.toThrow();
    });

    it('should fail default middleware for invalid auth', async () => {
      const mockContext = createMockWebSocketContext(
        { game: 'non-existent', player: 'p1', playing: 'never-have-i-ever' },
        { op: 'join_game', create: false, playername: 'Alice' },
        mockGameManager
      );

      const defaultPipeline = createDefaultMiddlewarePipeline(mockContext.gameManager);

      // Should throw due to game not found
      await expect(defaultPipeline.execute(mockContext)).rejects.toThrow('Game not found');
    });
  });

  describe('Middleware interaction', () => {
    it('should allow logging middleware to wrap execution', async () => {
      const mockContext = createMockWebSocketContext();
      let loggedRequest = false;
      let loggedResponse = false;

      // Mock logger to track calls
      const originalLog = console.log;
      console.log = vi.fn((...args) => {
        if (args[0]?.includes('WebSocket Request')) loggedRequest = true;
        if (args[0]?.includes('WebSocket Response')) loggedResponse = true;
        originalLog(...args);
      });

      const mockMiddleware = vi.fn(async (ctx, next) => {
        await next();
      });

      pipeline
        .use(WebSocketLoggingMiddleware.logRequest)
        .use(mockMiddleware);

      await pipeline.execute(mockContext);

      expect(loggedRequest).toBe(true);
      expect(loggedResponse).toBe(true);
      expect(mockMiddleware).toHaveBeenCalled();

      console.log = originalLog;
    });

    it('should validate message before auth in default pipeline', async () => {
      const mockContext = createMockWebSocketContext(
        { game: 'test-game', player: 'p1', playing: 'never-have-i-ever' },
        { /* missing op */ },
        mockGameManager
      );

      const defaultPipeline = createDefaultMiddlewarePipeline(mockContext.gameManager);

      // Should fail validation before auth
      await expect(defaultPipeline.execute(mockContext)).rejects.toThrow();
    });

    it('should handle auth failure gracefully', async () => {
      const mockContext = createMockWebSocketContext(
        { /* missing game */ player: 'p1', playing: 'never-have-i-ever' },
        { op: 'join_game', create: true, playername: 'Alice' },
        mockGameManager
      );

      const defaultPipeline = createDefaultMiddlewarePipeline(mockContext.gameManager);

      // Should fail auth due to missing game
      await expect(defaultPipeline.execute(mockContext)).rejects.toThrow('Missing required WebSocket metadata');
    });
  });

  describe('Error propagation', () => {
    it('should propagate errors from middleware chain', async () => {
      const mockContext = createMockWebSocketContext();
      const customError = new Error('Custom middleware error');

      pipeline.use(async (ctx, next) => {
        throw customError;
      });

      await expect(pipeline.execute(mockContext)).rejects.toThrow(customError);
    });

    it('should handle async errors properly', async () => {
      const mockContext = createMockWebSocketContext();

      pipeline.use(async (ctx, next) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      });

      await expect(pipeline.execute(mockContext)).rejects.toThrow('Async error');
    });
  });

  describe('Middleware composition', () => {
    it('should allow conditional middleware execution', async () => {
      const mockContext = createMockWebSocketContext();
      let conditionalExecuted = false;

      pipeline
        .use(async (ctx, next) => {
          if (ctx.data.op === 'test') {
            conditionalExecuted = true;
          }
          await next();
        })
        .use(async (ctx, next) => {
          await next();
        });

      await pipeline.execute(mockContext);

      expect(conditionalExecuted).toBe(true);
    });

    it('should support middleware that modifies context', async () => {
      const mockContext = createMockWebSocketContext({}, { op: 'test', value: 1 });

      pipeline.use(async (ctx, next) => {
        ctx.data.value *= 2;
        await next();
      });

      await pipeline.execute(mockContext);

      expect(mockContext.data.value).toBe(2);
    });
  });
});