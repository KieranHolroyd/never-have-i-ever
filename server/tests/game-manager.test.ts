// game-manager.test.ts
// The old GameManager unit tests tested in-memory state management that was replaced by
// Redis-backed game state (GameStateService). Integration tests for game flow are in
// tests/nhie-engine.test.ts instead.
//
// This file is kept as a placeholder to avoid build errors.

import { describe, it, expect } from "bun:test";
import { GameManager } from "../src/game-manager";

describe("GameManager", () => {
  it("is importable", () => {
    expect(GameManager).toBeDefined();
  });
});
