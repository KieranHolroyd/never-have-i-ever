import type { GameEngine, GameEngineRegistry } from "../types";

class InMemoryEngineRegistry implements GameEngineRegistry {
  private engines: Map<string, GameEngine> = new Map();

  register(engine: GameEngine): void {
    this.engines.set(engine.type, engine);
  }

  get(type: string): GameEngine | undefined {
    return this.engines.get(type);
  }

  has(type: string): boolean {
    return this.engines.has(type);
  }
}

export const engineRegistry: GameEngineRegistry = new InMemoryEngineRegistry();


