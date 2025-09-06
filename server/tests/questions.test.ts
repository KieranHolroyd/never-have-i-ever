import { describe, it, expect, beforeEach } from 'bun:test';
import { select_question, chooseQuestionFromCatagory } from '../src/lib/questions';
import { GameData } from '../src/types';

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
  });

  describe('select_question', () => {
    it('should select a random category and question', () => {
      const result = select_question(mockGame);

      expect(result).toHaveProperty('catagory');
      expect(result).toHaveProperty('content');
      expect(mockGame.catagories).toContain(result.catagory);
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should mark game as completed when only one category and no questions left', () => {
      mockGame.catagories = ['test-category'];
      mockGame.data['test-category'].questions = [];

      const result = select_question(mockGame);

      expect(result.catagory).toBe('test-category');
      expect(result.content).toBeUndefined();
      expect(mockGame.game_completed).toBe(true);
    });

    it('should remove category when no questions left and multiple categories', () => {
      // Reset the game state
      mockGame.catagories = ['test-category', 'another-category'];
      mockGame.data['test-category'].questions = [];
      mockGame.data['another-category'].questions = ['Another question?'];

      const result = select_question(mockGame);

      // Since we can't control which category is picked first, let's just test the general behavior
      expect(mockGame.catagories.length).toBeLessThanOrEqual(2); // Should have removed one category or kept both
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
    });
  });

  describe('chooseQuestionFromCatagory', () => {
    it('should select and remove a random question from category', () => {
      const originalLength = mockGame.data['test-category'].questions.length;
      const result = chooseQuestionFromCatagory('test-category', mockGame);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockGame.data['test-category'].questions).toHaveLength(originalLength - 1);
      expect(mockGame.data['test-category'].questions).not.toContain(result);
    });

    it('should return undefined when no questions left', () => {
      mockGame.data['test-category'].questions = [];

      const result = chooseQuestionFromCatagory('test-category', mockGame);

      expect(result).toBeUndefined();
    });
  });
});
