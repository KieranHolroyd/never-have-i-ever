import { describe, expect, it, mock } from "bun:test";
import { createCardsAgainstHumanityEngine } from "../src/lib/engines/cards-against-humanity";
import type {
  CAHGameMeta,
  CAHPlayer,
  CAHSubmission,
  CAHWhiteCard,
  ICAHGameStateService,
} from "../src/services/cah-game-state-service";
import {
  createMockHttpService,
  createMockWebSocket,
  createMockWebSocketService,
} from "./test-helpers";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createStatefulCahService() {
  const players: CAHPlayer[] = [
    {
      id: "p1",
      name: "Anonymous Player",
      score: 2,
      connected: false,
      hand: [{ id: "w1", text: "Existing card" }],
      isJudge: false,
    },
  ];

  const meta: CAHGameMeta = {
    phase: "selecting",
    currentJudge: "p2",
    currentBlackCard: {
      id: "b1",
      text: "Test black card",
      pick: 1,
    },
    currentRound: 2,
    selectedPacks: ["CAH Base Set"],
    roundWinner: null,
    maxRounds: 10,
    handSize: 7,
    gameCompleted: false,
    blackDeck: [],
    whiteDeck: [
      { id: "w2", text: "Card 2" },
      { id: "w3", text: "Card 3" },
      { id: "w4", text: "Card 4" },
      { id: "w5", text: "Card 5" },
      { id: "w6", text: "Card 6" },
      { id: "w7", text: "Card 7" },
    ],
  };

  const service: ICAHGameStateService = {
    gameExists: mock(async () => true),
    createGame: mock(async () => {}),
    deleteGame: mock(async () => {}),
    getGameMeta: mock(async () => clone(meta)),
    setGameMeta: mock(async (_gameId: string, fields: Partial<CAHGameMeta>) => {
      Object.assign(meta, clone(fields));
    }),
    addPlayer: mock(async (_gameId: string, player: CAHPlayer) => {
      const existing = players.find((entry) => entry.id === player.id);
      if (existing) {
        existing.name = player.name;
        existing.connected = player.connected;
        return;
      }

      players.push(clone(player));
    }),
    getPlayer: mock(async (_gameId: string, playerId: string) => {
      const player = players.find((entry) => entry.id === playerId);
      return player ? clone(player) : null;
    }),
    getPlayers: mock(async () => clone(players)),
    updatePlayerConnected: mock(async (_gameId: string, playerId: string, connected: boolean) => {
      const player = players.find((entry) => entry.id === playerId);
      if (player) player.connected = connected;
    }),
    updatePlayerHand: mock(async (_gameId: string, playerId: string, hand: CAHWhiteCard[]) => {
      const player = players.find((entry) => entry.id === playerId);
      if (player) player.hand = clone(hand);
    }),
    setPlayerIsJudge: mock(async () => {}),
    resetAllJudges: mock(async () => {}),
    incrPlayerScore: mock(async () => {}),
    addSubmission: mock(async (_gameId: string, _sub: CAHSubmission, _round: number) => {}),
    getSubmissions: mock(async () => []),
    clearSubmissions: mock(async () => {}),
    getFullGameState: mock(async () => null),
    listActiveGames: mock(async () => []),
  };

  return { meta, players, service };
}

function createJudgingReconnectService() {
  const players: CAHPlayer[] = [
    {
      id: 'p1',
      name: 'Disconnected Submitter',
      score: 1,
      connected: false,
      hand: [
        { id: 'w1', text: 'Card 1' },
        { id: 'w2', text: 'Card 2' },
        { id: 'w3', text: 'Card 3' },
        { id: 'w4', text: 'Card 4' },
        { id: 'w5', text: 'Card 5' },
      ],
      isJudge: false,
    },
    {
      id: 'p2',
      name: 'Judge Judy',
      score: 3,
      connected: true,
      hand: [],
      isJudge: true,
    },
  ];

  const meta: CAHGameMeta = {
    phase: 'judging',
    currentJudge: 'p2',
    currentBlackCard: {
      id: 'b1',
      text: 'Pick your favorite.',
      pick: 1,
    },
    currentRound: 4,
    selectedPacks: ['CAH Base Set'],
    roundWinner: null,
    maxRounds: 10,
    handSize: 7,
    gameCompleted: false,
    blackDeck: [],
    whiteDeck: [
      { id: 'w6', text: 'Card 6' },
      { id: 'w7', text: 'Card 7' },
    ],
  };

  const service: ICAHGameStateService = {
    gameExists: mock(async () => true),
    createGame: mock(async () => {}),
    deleteGame: mock(async () => {}),
    getGameMeta: mock(async () => clone(meta)),
    setGameMeta: mock(async (_gameId: string, fields: Partial<CAHGameMeta>) => {
      Object.assign(meta, clone(fields));
    }),
    addPlayer: mock(async (_gameId: string, player: CAHPlayer) => {
      const existing = players.find((entry) => entry.id === player.id);
      if (existing) {
        existing.name = player.name;
        existing.connected = player.connected;
        return;
      }

      players.push(clone(player));
    }),
    getPlayer: mock(async (_gameId: string, playerId: string) => {
      const player = players.find((entry) => entry.id === playerId);
      return player ? clone(player) : null;
    }),
    getPlayers: mock(async () => clone(players)),
    updatePlayerConnected: mock(async (_gameId: string, playerId: string, connected: boolean) => {
      const player = players.find((entry) => entry.id === playerId);
      if (player) player.connected = connected;
    }),
    updatePlayerHand: mock(async (_gameId: string, playerId: string, hand: CAHWhiteCard[]) => {
      const player = players.find((entry) => entry.id === playerId);
      if (player) player.hand = clone(hand);
    }),
    setPlayerIsJudge: mock(async () => {}),
    resetAllJudges: mock(async () => {}),
    incrPlayerScore: mock(async () => {}),
    addSubmission: mock(async (_gameId: string, _sub: CAHSubmission, _round: number) => {}),
    getSubmissions: mock(async () => []),
    clearSubmissions: mock(async () => {}),
    getFullGameState: mock(async () => null),
    listActiveGames: mock(async () => []),
  };

  return { meta, players, service };
}

describe("Cards Against Humanity engine", () => {
  it("refreshes a reconnecting player's name and refills missing cards", async () => {
    const { meta, players, service } = createStatefulCahService();
    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createCardsAgainstHumanityEngine(wsService, httpService, {} as any, service);
    const ws = createMockWebSocket("test-game", "p1", "cards-against-humanity");

    await engine.handlers.join_game(ws, {
      op: "join_game",
      create: true,
      playername: "Manual Tester",
    });

    expect(players[0]).toMatchObject({
      name: "Manual Tester",
      connected: true,
    });
    expect(players[0].hand.map((card) => card.id)).toEqual([
      "w1",
      "w2",
      "w3",
      "w4",
      "w5",
      "w6",
      "w7",
    ]);
    expect(meta.whiteDeck).toEqual([]);
  });

  it("refills a reconnecting player during judging without changing the round state", async () => {
    const { meta, players, service } = createJudgingReconnectService();
    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createCardsAgainstHumanityEngine(wsService, httpService, {} as any, service);
    const ws = createMockWebSocket('test-game', 'p1', 'cards-against-humanity');

    await engine.handlers.join_game(ws, {
      op: 'join_game',
      create: true,
      playername: 'Back Again',
    });

    expect(players[0]).toMatchObject({
      name: 'Back Again',
      connected: true,
      isJudge: false,
    });
    expect(players[0].hand.map((card) => card.id)).toEqual([
      'w1',
      'w2',
      'w3',
      'w4',
      'w5',
      'w6',
      'w7',
    ]);
    expect(meta.phase).toBe('judging');
    expect(meta.currentJudge).toBe('p2');
    expect(meta.whiteDeck).toEqual([]);
  });
});