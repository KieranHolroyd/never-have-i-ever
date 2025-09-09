import type { GameEngine } from "../../types";
import type { GameSocket } from "../router";
import { GameManager } from "../../game-manager";

export function createNeverHaveIEverEngine(gameManager: GameManager): GameEngine {
  const handlers: Record<string, (ws: GameSocket, data: any) => Promise<void>> = {
    join_game: (ws, data) => gameManager.handleJoinGame(ws, data),
    select_catagories: (ws, data) => gameManager.handleSelectCategories(ws, data),
    select_catagory: (ws, data) => gameManager.handleSelectCategory(ws, data),
    confirm_selections: (ws, data) => gameManager.handleConfirmSelections(ws, data),
    next_question: (ws, data) => gameManager.handleNextQuestion(ws, data),
    reset_game: (ws, data) => gameManager.handleResetGame(ws, data),
    vote: (ws, data) => gameManager.handleVote(ws, data),
    ping: (ws, data) => gameManager.handlePing(ws, data),
    reconnect_status: (ws, data) => gameManager.handleReconnectStatus(ws, data),
  };

  return {
    type: "never-have-i-ever",
    handlers,
  };
}


