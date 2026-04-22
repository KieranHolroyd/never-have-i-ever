import { describe, it, expect } from 'bun:test';
import {
  deepCopy,
  omitKeys,
  validateRequiredParams,
} from '../src/utils';

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
});
