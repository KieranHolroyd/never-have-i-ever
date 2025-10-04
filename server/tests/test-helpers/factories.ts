import type { NHIEGameState, CAHGameState, NHIEPlayer, CAHPlayer, CAHBlackCard, CAHWhiteCard, CAHSubmission } from '../../src/types';

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
    data: {},
    history: [],
    waitingForPlayers: false,
    gameCompleted: false,
    ...overrides
  };
}

/**
 * Factory for creating mock CAH game state
 */
export function createMockCAHGameState(overrides: Partial<CAHGameState> = {}): CAHGameState {
  return {
    id: 'test-game',
    gameType: 'cards-against-humanity',
    players: [],
    selectedPacks: [],
    phase: 'waiting',
    currentJudge: null,
    currentBlackCard: null,
    submittedCards: [],
    roundWinner: null,
    deck: { blackCards: [], whiteCards: [] },
    handSize: 7,
    maxRounds: 10,
    currentRound: 0,
    waitingForPlayers: true,
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
 * Factory for creating mock CAH player
 */
export function createMockCAHPlayer(
  id: string,
  name: string,
  handCardIds: string[] = [],
  overrides: Partial<CAHPlayer> = {}
): CAHPlayer {
  return {
    id,
    name,
    score: 0,
    connected: true,
    hand: handCardIds.map(id => ({ id, text: `White card ${id}` })),
    isJudge: false,
    ...overrides
  };
}

/**
 * Factory for creating mock CAH black card
 */
export function createMockCAHBlackCard(
  id: string,
  text: string,
  pick = 1,
  overrides: Partial<CAHBlackCard> = {}
): CAHBlackCard {
  return {
    id,
    text,
    pick,
    ...overrides
  };
}

/**
 * Factory for creating mock CAH white card
 */
export function createMockCAHWhiteCard(
  id: string,
  text: string,
  overrides: Partial<CAHWhiteCard> = {}
): CAHWhiteCard {
  return {
    id,
    text,
    ...overrides
  };
}

/**
 * Factory for creating mock CAH card submission
 */
export function createMockCAHSubmission(
  playerId: string,
  playerName: string,
  cardIds: string[],
  overrides: Partial<CAHSubmission> = {}
): CAHSubmission {
  return {
    playerId,
    cards: cardIds.map(id => ({ id, text: `White card ${id}` })),
    playerName,
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

/**
 * Factory for creating mock CAH packs data
 */
export function createMockCAHPacksData() {
  return [
    {
      id: 'CAH Base Set',
      name: 'CAH Base Set',
      blackCards: 90,
      whiteCards: 460,
      isOfficial: true,
      isNSFW: true
    },
    {
      id: 'CAH: First Expansion',
      name: 'CAH: First Expansion',
      blackCards: 30,
      whiteCards: 230,
      isOfficial: true,
      isNSFW: true
    }
  ];
}

/**
 * Factory for creating mock game with players
 */
export function createMockGameWithPlayers(
  gameType: 'never-have-i-ever' | 'cards-against-humanity',
  playerCount = 3,
  overrides: any = {}
) {
  const players = Array.from({ length: playerCount }, (_, i) =>
    gameType === 'never-have-i-ever'
      ? createMockNHIEPlayer(`p${i + 1}`, `Player ${i + 1}`)
      : createMockCAHPlayer(`p${i + 1}`, `Player ${i + 1}`)
  );

  if (gameType === 'never-have-i-ever') {
    return createMockNHIEGameState({
      players,
      ...overrides
    });
  } else {
    return createMockCAHGameState({
      players,
      ...overrides
    });
  }
}

/**
 * Factory for creating mock CAH game with cards dealt
 */
export function createMockCAHGameWithCards(
  playerCount = 3,
  cardsPerPlayer = 7,
  overrides: Partial<CAHGameState> = {}
): CAHGameState {
  const players = Array.from({ length: playerCount }, (_, i) => {
    const handCardIds = Array.from({ length: cardsPerPlayer }, (_, j) => `card_p${i + 1}_${j + 1}`);
    return createMockCAHPlayer(`p${i + 1}`, `Player ${i + 1}`, handCardIds);
  });

  const deck = {
    blackCards: [
      createMockCAHBlackCard('black1', 'Test black card?', 1),
      createMockCAHBlackCard('black2', 'Another test card?', 2)
    ],
    whiteCards: players.flatMap(p => p.hand)
  };

  return createMockCAHGameState({
    players,
    deck,
    selectedPacks: ['Test Pack'],
    phase: 'selecting',
    currentBlackCard: deck.blackCards[0],
    currentJudge: 'p1',
    ...overrides
  });
}