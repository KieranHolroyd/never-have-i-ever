import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketService } from '../../../src/services/websocket-service';
import { createMockWebSocket } from '../../test-helpers';
import type { GameData } from '../../../src/types';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWs: any;
  let mockGame: GameData;

  beforeEach(() => {
    service = new WebSocketService();
    mockWs = createMockWebSocket('test-game', 'p1');
    mockGame = {
      id: 'test-game',
      players: [{ id: 'p1', connected: true, name: 'Alice', score: 0, this_round: { vote: null, voted: false } }],
      catagories: [],
      catagory_select: true,
      game_completed: false,
      waiting_for_players: false,
      current_question: { catagory: '', content: '' },
      history: [],
      data: {}
    };
  });

  describe('sendToClient', () => {
    it('should send JSON message to client', () => {
      service.sendToClient(mockWs, 'test_op', { data: 'value' });

      const { sent } = mockWs.__getMessages();
      expect(sent).toHaveLength(1);
      expect(JSON.parse(sent[0])).toEqual({
        op: 'test_op',
        data: 'value'
      });
    });

    it('should handle send errors gracefully', () => {
      const errorWs = createMockWebSocket();
      vi.mocked(errorWs.send).mockImplementation(() => {
        throw new Error('Send failed');
      });

      // Should not throw
      expect(() => {
        service.sendToClient(errorWs, 'test_op', { data: 'value' });
      }).not.toThrow();
    });
  });

  describe('broadcastToGameAndClient', () => {
    it('should send to client and broadcast to game', () => {
      service.broadcastToGameAndClient(mockWs, 'update', { state: 'new' });

      const { sent } = mockWs.__getMessages();
      expect(sent).toHaveLength(1);
      expect(mockWs.publish).toHaveBeenCalledWith('test-game', expect.stringContaining('"op":"update"'));
    });
  });

  describe('publishToGame', () => {
    it('should publish message to game topic', () => {
      service.publishToGame(mockWs, 'update', { state: 'new' });

      expect(mockWs.publish).toHaveBeenCalledWith('test-game', expect.stringContaining('"op":"update"'));
    });

    it('should handle publish errors gracefully', () => {
      const errorWs = createMockWebSocket();
      vi.mocked(errorWs.publish).mockImplementation(() => {
        throw new Error('Publish failed');
      });

      expect(() => {
        service.publishToGame(errorWs, 'update', { state: 'new' });
      }).not.toThrow();

      expect(errorWs.send).toHaveBeenCalled();
    });
  });

  describe('broadcastToGame', () => {
    it('should publish via any connected socket when multiple exist', () => {
      const ws1 = createMockWebSocket('game1', 'p1');
      const ws2 = createMockWebSocket('game1', 'p2');

      service.addWebSocket('game1', ws1);
      service.addWebSocket('game1', ws2);

      service.broadcastToGame('game1', 'update', { state: 'changed' });

      // Only one socket should publish (any of them)
      expect(ws1.publish).toHaveBeenCalledTimes(1);
      expect(ws2.publish).not.toHaveBeenCalled();
    });

    it('should do nothing when no sockets connected to game', () => {
      const ws = createMockWebSocket('game1', 'p1');

      service.broadcastToGame('game1', 'update', { state: 'changed' });

      expect(ws.publish).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove WebSocket and mark player disconnected', () => {
      service.addWebSocket('test-game', mockWs);

      expect(service.hasWebSockets('test-game')).toBe(true);

      service.handleDisconnect(mockWs, mockGame);

      expect(service.hasWebSockets('test-game')).toBe(false);
      expect(mockGame.players[0].connected).toBe(false);
    });

    it('should handle non-existent player gracefully', () => {
      const emptyGame: GameData = {
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

      expect(() => {
        service.handleDisconnect(mockWs, emptyGame);
      }).not.toThrow();
    });
  });

  describe('handleReconnectStatus', () => {
    it('should report not reconnecting', async () => {
      await service.handleReconnectStatus(mockWs);

      const { sent } = mockWs.__getMessages();
      expect(sent).toHaveLength(1);
      const message = JSON.parse(sent[0]);
      expect(message.op).toBe('reconnect_status');
      expect(message.reconnecting).toBe(false);
    });
  });

  describe('handlePing', () => {
    it('should respond with pong', async () => {
      await service.handlePing(mockWs);

      const { sent } = mockWs.__getMessages();
      expect(sent).toHaveLength(1);
      expect(JSON.parse(sent[0]).op).toBe('pong');
    });
  });

  describe('WebSocket management', () => {
    it('should track WebSocket connections per game', () => {
      const ws1 = createMockWebSocket('game1', 'p1');
      const ws2 = createMockWebSocket('game1', 'p2');
      const ws3 = createMockWebSocket('game2', 'p3');

      service.addWebSocket('game1', ws1);
      service.addWebSocket('game1', ws2);
      service.addWebSocket('game2', ws3);

      expect(service.hasWebSockets('game1')).toBe(true);
      expect(service.hasWebSockets('game2')).toBe(true);
      expect(service.hasWebSockets('game3')).toBe(false);
    });

    it('should remove WebSocket from game', () => {
      const ws1 = createMockWebSocket('game1', 'p1');
      const ws2 = createMockWebSocket('game1', 'p2');

      service.addWebSocket('game1', ws1);
      service.addWebSocket('game1', ws2);

      service.removeWebSocket('game1', ws1);

      expect(service.hasWebSockets('game1')).toBe(true); // ws2 still connected

      service.removeWebSocket('game1', ws2);

      expect(service.hasWebSockets('game1')).toBe(false);
    });
  });

  describe('Timeout management', () => {
    it('should track timeout starts per game', () => {
      service.setTimeoutStart('game1', 1000);
      service.setTimeoutStart('game2', 2000);

      expect(service.getTimeoutStart('game1')).toBe(1000);
      expect(service.getTimeoutStart('game2')).toBe(2000);
      expect(service.getTimeoutStart('game3')).toBeUndefined();
    });

    it('should delete timeout starts', () => {
      service.setTimeoutStart('game1', 1000);
      expect(service.getTimeoutStart('game1')).toBe(1000);

      service.deleteTimeoutStart('game1');
      expect(service.getTimeoutStart('game1')).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should clear all WebSocket connections and timeouts', () => {
      const ws = createMockWebSocket('game1', 'p1');
      service.addWebSocket('game1', ws);
      service.setTimeoutStart('game1', 1000);

      expect(service.hasWebSockets('game1')).toBe(true);
      expect(service.getTimeoutStart('game1')).toBe(1000);

      service.cleanup();

      expect(service.hasWebSockets('game1')).toBe(false);
      expect(service.getTimeoutStart('game1')).toBeUndefined();
    });
  });

  describe('getRoundTimeoutMs', () => {
    it('should return configured timeout value', () => {
      expect(service.getRoundTimeoutMs()).toBe(10000); // 10 seconds
    });
  });
});