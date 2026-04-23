import { describe, expect, it, mock } from "bun:test";
import { WebSocketAuthMiddleware } from "../src/middleware/websocket-auth-middleware";
import { createMockWebSocket } from "./test-helpers";

describe("WebSocketAuthMiddleware", () => {
  it("allows join_game with create=true when the game does not exist yet", async () => {
    const next = mock(async () => {});
    const gameManager = {
      gameExists: mock(async () => false),
    };

    await WebSocketAuthMiddleware.authenticate(
      {
        ws: createMockWebSocket("new-game", "p1"),
        data: { op: "join_game", create: true, playername: "Alice" },
        gameManager,
      },
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(gameManager.gameExists).not.toHaveBeenCalled();
  });

  it("still rejects non-join operations when the game does not exist", async () => {
    const next = mock(async () => {});
    const gameManager = {
      gameExists: mock(async () => false),
    };

    await expect(
      WebSocketAuthMiddleware.authenticate(
        {
          ws: createMockWebSocket("missing-game", "p1"),
          data: { op: "vote", option: 1 },
          gameManager,
        },
        next,
      ),
    ).rejects.toThrow("Game not found");

    expect(next).not.toHaveBeenCalled();
    expect(gameManager.gameExists).toHaveBeenCalledWith("missing-game");
  });
});