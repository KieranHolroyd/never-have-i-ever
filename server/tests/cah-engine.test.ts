import { describe, expect, it, mock } from "bun:test";
import { createCardsAgainstHumanityEngine } from "../src/lib/engines/cards-against-humanity";
import { hashRoomPassword } from "../src/utils/game-password";
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
    maxPlayers: 20,
    creatorPlayerId: "p1",
    passwordHash: null,
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
    removePlayer: mock(async (_gameId: string, playerId: string) => {
      const index = players.findIndex((entry) => entry.id === playerId);
      if (index >= 0) players.splice(index, 1);
    }),
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
    maxPlayers: 20,
    creatorPlayerId: 'p1',
    passwordHash: null,
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
    removePlayer: mock(async (_gameId: string, playerId: string) => {
      const index = players.findIndex((entry) => entry.id === playerId);
      if (index >= 0) players.splice(index, 1);
    }),
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

  it("requires the correct password to join a protected game", async () => {
    const { meta, service } = createStatefulCahService();
    meta.phase = "waiting";
    meta.selectedPacks = [];
    meta.passwordHash = await hashRoomPassword("secret123");

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createCardsAgainstHumanityEngine(wsService, httpService, {} as any, service);
    const ws = createMockWebSocket("test-game", "p9", "cards-against-humanity");

    await expect(
      engine.handlers.join_game(ws, {
        op: "join_game",
        create: false,
        playername: "Late Joiner",
      })
    ).rejects.toThrow("This game requires a password");

    await expect(
      engine.handlers.join_game(ws, {
        op: "join_game",
        create: false,
        playername: "Late Joiner",
        password: "wrong-password",
      })
    ).rejects.toThrow("Incorrect game password");
  });

  it("only lets the creator change the room password", async () => {
    const { meta, service } = createStatefulCahService();
    meta.phase = "waiting";
    meta.creatorPlayerId = "p1";

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createCardsAgainstHumanityEngine(wsService, httpService, {} as any, service);

    await expect(
      engine.handlers.set_room_password(createMockWebSocket("test-game", "p2", "cards-against-humanity"), {
        op: "set_room_password",
        password: "secret123",
      })
    ).rejects.toThrow("Only the game creator can change the room password");

    await expect(
      engine.handlers.set_room_password(createMockWebSocket("test-game", "p1", "cards-against-humanity"), {
        op: "set_room_password",
        password: "secret123",
      })
    ).resolves.toBeUndefined();

    expect(meta.passwordHash).toEqual(expect.any(String));
  });

  it("transfers creator when the creator disconnects", async () => {
    const { meta, service } = createStatefulCahService();
    meta.creatorPlayerId = "p1";

    const secondPlayer: CAHPlayer = {
      id: "p2",
      name: "Connected Player",
      score: 0,
      connected: true,
      hand: [],
      isJudge: false,
    };

    await service.addPlayer("test-game", secondPlayer);

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createCardsAgainstHumanityEngine(wsService, httpService, {} as any, service);

    await engine.handlers.disconnect(createMockWebSocket("test-game", "p1", "cards-against-humanity"), {
      op: "disconnect",
    });

    expect(meta.creatorPlayerId).toBe("p2");
  });

  it("prevents new players joining when the room is full", async () => {
    const { meta, service } = createStatefulCahService();
    meta.phase = "waiting";
    meta.selectedPacks = [];
    meta.maxPlayers = 1;

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createCardsAgainstHumanityEngine(wsService, httpService, {} as any, service);

    await expect(
      engine.handlers.join_game(createMockWebSocket("test-game", "p9", "cards-against-humanity"), {
        op: "join_game",
        create: false,
        playername: "Late Joiner",
      })
    ).rejects.toThrow("Game is full (maximum 1 players)");
  });

  it("only lets the creator change the room size", async () => {
    const { meta, service } = createStatefulCahService();
    meta.phase = "waiting";

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createCardsAgainstHumanityEngine(wsService, httpService, {} as any, service);

    await expect(
      engine.handlers.set_max_players(createMockWebSocket("test-game", "p2", "cards-against-humanity"), {
        op: "set_max_players",
        maxPlayers: 5,
      })
    ).rejects.toThrow("Only the game creator can change the room size");

    await expect(
      engine.handlers.set_max_players(createMockWebSocket("test-game", "p1", "cards-against-humanity"), {
        op: "set_max_players",
        maxPlayers: 5,
      })
    ).resolves.toBeUndefined();

    expect(meta.maxPlayers).toBe(5);
  });

  it("only lets the creator remove players before the game starts", async () => {
    const { meta, players, service } = createStatefulCahService();
    meta.phase = "waiting";

    const removedSocket = createMockWebSocket("test-game", "p2", "cards-against-humanity");
    const creatorSocket = createMockWebSocket("test-game", "p1", "cards-against-humanity");
    const wsService = {
      ...createMockWebSocketService(),
      getGameSockets: mock(() => new Set([creatorSocket, removedSocket])),
    };
    const httpService = createMockHttpService();
    const engine = createCardsAgainstHumanityEngine(wsService, httpService, {} as any, service);

    players.push({
      id: "p2",
      name: "Second Player",
      score: 0,
      connected: true,
      hand: [],
      isJudge: false,
    });

    await expect(
      engine.handlers.remove_player(createMockWebSocket("test-game", "p2", "cards-against-humanity"), {
        op: "remove_player",
        playerId: "p1",
      })
    ).rejects.toThrow("Only the game creator can remove players");

    await expect(
      engine.handlers.remove_player(createMockWebSocket("test-game", "p1", "cards-against-humanity"), {
        op: "remove_player",
        playerId: "p2",
      })
    ).resolves.toBeUndefined();

    expect(players.map((player) => player.id)).toEqual(["p1"]);
    expect(wsService.sendToClient).toHaveBeenCalledWith(
      removedSocket,
      "removed_from_game",
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(wsService.removeWebSocket).toHaveBeenCalledWith("test-game", removedSocket);
  });
});