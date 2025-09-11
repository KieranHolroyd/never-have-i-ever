import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { emit, send, publish } from '../src/lib/socket';

describe('Socket Utils', () => {
  let mockWs: any;

  beforeEach(() => {
    mockWs = {
      publish: mock(() => {}),
      send: mock(() => {}),
    };
  });

  describe('emit', () => {
    it('should publish message to topic when WebSocket provided', () => {
      const data = { test: 'data' };

      emit(mockWs, 'topic', 'test-op', data);

      expect(mockWs.publish).toHaveBeenCalledWith('topic', JSON.stringify({ ...data, op: 'test-op' }));
      // We intentionally avoid direct send in emit to prevent duplicate deliveries
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('should handle error when no WebSocket provided', () => {
      // The emit function catches errors internally and logs them
      expect(() => emit(null as any, 'topic', 'test-op')).not.toThrow();
    });
  });

  describe('send', () => {
    it('should send message directly to WebSocket', () => {
      const data = { test: 'data' };

      send(mockWs, 'test-op', data);

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ ...data, op: 'test-op' }));
    });
  });

  describe('publish', () => {
    it('should publish message to topic', () => {
      const data = { test: 'data' };

      publish(mockWs, 'topic', 'test-op', data);

      expect(mockWs.publish).toHaveBeenCalledWith('topic', JSON.stringify({ ...data, op: 'test-op' }));
    });
  });
});
