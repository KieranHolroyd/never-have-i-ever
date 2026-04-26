import { afterEach, describe, expect, it, mock } from "bun:test";
import type { NHIEGameState, NHIEPlayer } from "@nhie/shared";
import type { GameMetaHash, IGameStateService } from "../src/services/game-state-service";
import { createNeverHaveIEverEngine } from "../src/lib/engines/never-have-i-ever";
import { hashRoomPassword } from "../src/utils/game-password";
import {
  createMockGameStateService,
  createMockHttpService,
  createMockWebSocket,
  createMockWebSocketService,
} from "./test-helpers";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createStatefulGameStateService() {
  const players: NHIEPlayer[] = [
    {
      id: "p1",
      name: "Alice",
      score: 0,
      connected: true,
      this_round: { vote: null, voted: false },
    },
    {
      id: "p2",
      name: "Bob",
      score: 0,
      connected: true,
      this_round: { vote: null, voted: false },
    },
  ];

  const meta: GameMetaHash = {
    phase: "waiting",
    waitingForPlayers: false,
    gameCompleted: false,
    max_players: 20,
    creator_player_id: "p1",
    current_q_cat: "food",
    current_q_content: "Never have I ever drunk coconut milk.",
    timeout_start: 0,
  };

  const baseGame: NHIEGameState = {
    id: "test-game",
    gameType: "never-have-i-ever",
    phase: "waiting",
    players: clone(players),
    catagories: ["food"],
    current_question: {
      catagory: "food",
      content: "Never have I ever drunk coconut milk.",
    },
    history: [],
    waitingForPlayers: false,
    gameCompleted: false,
    timeout_start: 0,
    timeout_duration: 0,
  };

  const service = {
    ...createMockGameStateService(),
    gameExists: mock(async () => true),
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
    getGameMeta: mock(async () => clone(meta)),
    setGameMeta: mock(async (_gameId: string, fields: GameMetaHash) => {
      Object.assign(meta, fields);
    }),
    getFullGameState: mock(async () => ({
      ...clone(baseGame),
      phase: (meta.phase as NHIEGameState["phase"]) ?? baseGame.phase,
      players: clone(players),
      current_question: {
        catagory: meta.current_q_cat ?? baseGame.current_question.catagory,
        content: meta.current_q_content ?? baseGame.current_question.content,
      },
      waitingForPlayers: meta.waitingForPlayers ?? false,
      gameCompleted: meta.gameCompleted ?? false,
      timeout_start: meta.timeout_start ?? 0,
    })),
    recordVote: mock(async (
      _gameId: string,
      playerId: string,
      voteLabel: string,
      scoreDelta: number,
      undoDelta: number,
    ) => {
      const player = players.find((entry) => entry.id === playerId);
      if (!player) throw new Error("Player not found");

      player.score += scoreDelta + undoDelta;
      player.this_round = { vote: voteLabel, voted: true };

      const allVoted = players.filter((entry) => entry.connected).every((entry) => entry.this_round.voted);
      return { player: clone(player), allVoted };
    }),
  } as IGameStateService;

  return { service, players, meta };
}

function createStatefulWebSocketService() {
  const timeoutStarts = new Map<string, number>();

  return {
    ...createMockWebSocketService(),
    getTimeoutStart: mock((gameId: string) => timeoutStarts.get(gameId)),
    setTimeoutStart: mock((gameId: string, startTime: number) => {
      timeoutStarts.set(gameId, startTime);
    }),
    deleteTimeoutStart: mock((gameId: string) => {
      timeoutStarts.delete(gameId);
    }),
  };
}

describe("Never Have I Ever engine", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  });

  it("broadcasts final vote results with a 10-second window when the last player votes", async () => {
    const gameStateService = createStatefulGameStateService();
    const wsService = createStatefulWebSocketService();
    const httpService = createMockHttpService();
    const engine = createNeverHaveIEverEngine(wsService, httpService, gameStateService.service);
    const alice = createMockWebSocket("test-game", "p1");
    const bob = createMockWebSocket("test-game", "p2");

    const setTimeoutMock = mock((
      _fn: Parameters<typeof setTimeout>[0],
      delay?: Parameters<typeof setTimeout>[1],
    ) => `timer-${delay}` as any);
    const clearTimeoutMock = mock(() => {});
    globalThis.setTimeout = setTimeoutMock as unknown as typeof setTimeout;
    globalThis.clearTimeout = clearTimeoutMock as unknown as typeof clearTimeout;

    await engine.handlers.vote(alice, { option: 1 });
    await engine.handlers.vote(bob, { option: 2 });

    const gameStateCalls = (wsService.broadcastToGameAndClient as ReturnType<typeof mock>).mock.calls
      .filter((call) => call[1] === "game_state");
    const finalState = gameStateCalls.at(-1)?.[2]?.game as NHIEGameState;

    expect(finalState.waitingForPlayers).toBe(true);
    expect(finalState.timeout_duration).toBe(10_000);
    expect(finalState.players).toEqual([
      expect.objectContaining({
        id: "p1",
        score: 1,
        this_round: { vote: "Have", voted: true },
      }),
      expect.objectContaining({
        id: "p2",
        score: 0,
        this_round: { vote: "Have Not", voted: true },
      }),
    ]);

    const timeoutDelays = setTimeoutMock.mock.calls.map((call) => call[1]);
    expect(timeoutDelays).toEqual([30_000, 10_000]);
    expect(clearTimeoutMock).toHaveBeenCalledWith("timer-30000");
    expect(wsService.setTimeoutStart).toHaveBeenCalledTimes(2);
    expect(wsService.setTimeoutStart).toHaveBeenLastCalledWith("test-game", expect.any(Number));
  });

  it("requires the correct password to join a protected game", async () => {
    const protectedMeta: GameMetaHash = {
      phase: "category_select",
      waitingForPlayers: false,
      gameCompleted: false,
      max_players: 20,
      current_q_cat: "",
      current_q_content: "",
      timeout_start: 0,
      password_hash: await hashRoomPassword("secret123"),
    };

    const gameStateService = {
      ...createMockGameStateService(),
      gameExists: mock(async () => true),
      getGameMeta: mock(async () => clone(protectedMeta)),
    } as IGameStateService;

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createNeverHaveIEverEngine(wsService, httpService, gameStateService);
    const ws = createMockWebSocket("test-game", "p3");

    await expect(
      engine.handlers.join_game(ws, {
        op: "join_game",
        create: false,
        playername: "Charlie",
      })
    ).rejects.toThrow("This game requires a password");

    await expect(
      engine.handlers.join_game(ws, {
        op: "join_game",
        create: false,
        playername: "Charlie",
        password: "wrong-password",
      })
    ).rejects.toThrow("Incorrect game password");
  });

  it("only lets the creator change the room password", async () => {
    const gameStateService = createStatefulGameStateService();
    gameStateService.meta.phase = "category_select";
    gameStateService.meta.creator_player_id = "p1";

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createNeverHaveIEverEngine(wsService, httpService, gameStateService.service);

    await expect(
      engine.handlers.set_room_password(createMockWebSocket("test-game", "p2"), {
        op: "set_room_password",
        password: "secret123",
      })
    ).rejects.toThrow("Only the game creator can change the room password");

    await expect(
      engine.handlers.set_room_password(createMockWebSocket("test-game", "p1"), {
        op: "set_room_password",
        password: "secret123",
      })
    ).resolves.toBeUndefined();

    expect(gameStateService.meta.password_hash).toEqual(expect.any(String));
  });

  it("transfers creator when the creator disconnects", async () => {
    const gameStateService = createStatefulGameStateService();
    gameStateService.meta.creator_player_id = "p1";

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createNeverHaveIEverEngine(wsService, httpService, gameStateService.service);

    await engine.handlers.disconnect(createMockWebSocket("test-game", "p1"), {
      op: "disconnect",
    });

    expect(gameStateService.meta.creator_player_id).toBe("p2");
  });

  it("prevents new players joining when the room is full", async () => {
    const gameStateService = createStatefulGameStateService();
    gameStateService.meta.max_players = 2;

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createNeverHaveIEverEngine(wsService, httpService, gameStateService.service);

    await expect(
      engine.handlers.join_game(createMockWebSocket("test-game", "p3"), {
        op: "join_game",
        create: false,
        playername: "Charlie",
      })
    ).rejects.toThrow("Game is full (maximum 2 players)");
  });

  it("only lets the creator change the room size", async () => {
    const gameStateService = createStatefulGameStateService();
    gameStateService.meta.phase = "category_select";

    const wsService = createMockWebSocketService();
    const httpService = createMockHttpService();
    const engine = createNeverHaveIEverEngine(wsService, httpService, gameStateService.service);

    await expect(
      engine.handlers.set_max_players(createMockWebSocket("test-game", "p2"), {
        op: "set_max_players",
        maxPlayers: 4,
      })
    ).rejects.toThrow("Only the game creator can change the room size");

    await expect(
      engine.handlers.set_max_players(createMockWebSocket("test-game", "p1"), {
        op: "set_max_players",
        maxPlayers: 4,
      })
    ).resolves.toBeUndefined();

    expect(gameStateService.meta.max_players).toBe(4);
  });

  it("only lets the creator remove players before the game starts", async () => {
    const gameStateService = createStatefulGameStateService();
    gameStateService.meta.phase = "category_select";

    const removedSocket = createMockWebSocket("test-game", "p2");
    const creatorSocket = createMockWebSocket("test-game", "p1");
    const wsService = {
      ...createMockWebSocketService(),
      getGameSockets: mock(() => new Set([creatorSocket, removedSocket])),
    };
    const httpService = createMockHttpService();
    const engine = createNeverHaveIEverEngine(wsService, httpService, gameStateService.service);

    await expect(
      engine.handlers.remove_player(createMockWebSocket("test-game", "p2"), {
        op: "remove_player",
        playerId: "p1",
      })
    ).rejects.toThrow("Only the game creator can remove players");

    await expect(
      engine.handlers.remove_player(createMockWebSocket("test-game", "p1"), {
        op: "remove_player",
        playerId: "p2",
      })
    ).resolves.toBeUndefined();

    expect(gameStateService.players.map((player) => player.id)).toEqual(["p1"]);
    expect(wsService.sendToClient).toHaveBeenCalledWith(
      removedSocket,
      "removed_from_game",
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(wsService.removeWebSocket).toHaveBeenCalledWith("test-game", removedSocket);
  });
});