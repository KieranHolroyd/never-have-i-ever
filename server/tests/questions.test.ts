import { describe, it, expect, vi, beforeEach } from 'vitest';
import { select_question, chooseQuestionFromCatagory } from '../src/lib/questions';
import { GameData } from '../src/types';

// Mock mathjs pickRandom
vi.mock('mathjs', () => ({
  pickRandom: vi.fn(),
}));

import { pickRandom } from 'mathjs';

describe('Questions', () => {
  let mockGame: GameData;

  beforeEach(() => {
    mockGame = {
      id: 'test-game',
      players: [],
      catagories: ['test-category', 'another-category'],
      catagory_select: false,
      game_completed: false,
      waiting_for_players: false,
      current_question: { catagory: '', content: '' },
      history: [],
      data: {
        'test-category': {
          flags: { is_nsfw: false },
          questions: ['Question 1?', 'Question 2?', 'Question 3?']
        },
        'another-category': {
          flags: { is_nsfw: false },
          questions: ['Another question?']
        }
      }
    };

    vi.clearAllMocks();
  });

  describe('select_question', () => {
    it('should select a random category and question', () => {
      (pickRandom as any).mockReturnValueOnce('test-category');
      (pickRandom as any).mockReturnValueOnce('Question 2?');

      const result = select_question(mockGame);

      expect(result).toEqual({
        catagory: 'test-category',
        content: 'Question 2?'
      });
      expect(pickRandom).toHaveBeenCalledWith(mockGame.catagories);
      expect(pickRandom).toHaveBeenCalledWith(mockGame.data['test-category'].questions);
    });

    it('should mark game as completed when only one category and no questions left', () => {
      mockGame.catagories = ['test-category'];
      mockGame.data['test-category'].questions = [];

      (pickRandom as any).mockReturnValueOnce('test-category');

      const result = select_question(mockGame);

      expect(result).toEqual({
        catagory: 'test-category',
        content: undefined
      });
      expect(mockGame.game_completed).toBe(true);
    });

    it('should remove category when no questions left and multiple categories', () => {
      // Reset the game state
      mockGame.catagories = ['test-category', 'another-category'];
      mockGame.data['test-category'].questions = [];
      mockGame.data['another-category'].questions = ['Another question?'];

      (pickRandom as any).mockImplementation((arr: any[]) => {
        if (arr.includes('test-category')) return 'test-category';
        if (arr.includes('another-category')) return 'another-category';
        if (arr.includes('Another question?')) return 'Another question?';
        return arr[0];
      });

      const result = select_question(mockGame);

      expect(result.catagory).toBe('another-category');
      expect(result.content).toBe('Another question?');
      expect(mockGame.catagories).toEqual(['another-category']); // test-category should be removed
    });
  });

  describe('chooseQuestionFromCatagory', () => {
    it('should select and remove a random question from category', () => {
      (pickRandom as any).mockReturnValueOnce('Question 1?');

      const result = chooseQuestionFromCatagory('test-category', mockGame);

      expect(result).toBe('Question 1?');
      expect(mockGame.data['test-category'].questions).toHaveLength(2);
      expect(mockGame.data['test-category'].questions).not.toContain('Question 1?');
    });

    it('should return undefined when no questions left', () => {
      mockGame.data['test-category'].questions = [];
      (pickRandom as any).mockReturnValueOnce(undefined); // pickRandom returns undefined for empty arrays

      const result = chooseQuestionFromCatagory('test-category', mockGame);

      expect(result).toBeUndefined();
    });
  });
});
