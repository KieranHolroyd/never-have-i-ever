import type { NHIEGameState, NHIEPlayer } from '../../src/types';

/**
 * Factory for creating mock NHIE game state
 */
export function createMockNHIEGameState(overrides: Partial<NHIEGameState> = {}): NHIEGameState {
  return {
    id: 'test-game',
    gameType: 'never-have-i-ever',
    players: [],
    phase: 'category_select',
    current_question: { catagory: '', content: '' },
    catagories: [],
    history: [],
    waitingForPlayers: false,
    gameCompleted: false,
    ...overrides
  };
}

/**
 * Factory for creating mock NHIE player
 */
export function createMockNHIEPlayer(
  id: string,
  name: string,
  overrides: Partial<NHIEPlayer> = {}
): NHIEPlayer {
  return {
    id,
    name,
    score: 0,
    connected: true,
    this_round: { vote: null, voted: false },
    ...overrides
  };
}

/**
 * Factory for creating mock categories data
 */
export function createMockCategoriesData(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    food: {
      flags: { is_nsfw: false },
      questions: [
        'Never have I ever eaten sushi.',
        'Never have I ever burned my food while cooking.'
      ]
    },
    relationships: {
      flags: { is_nsfw: false },
      questions: [
        'Never have I ever gone on a blind date.',
        'Never have I ever sent a text to the wrong person.'
      ]
    },
    ...overrides
  };
}
