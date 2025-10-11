import type { GameEngine } from "../../types";
import type { GameSocket } from "../router";
import { GameManager } from "../../game-manager";
import { config } from "../../config";
import Database from "bun:sqlite";
import type { IGameStateService } from "../../services/game-state-service";
import type { CAHGameState, CAHPlayer, CAHBlackCard, CAHWhiteCard, CAHSubmission } from "../../types";
// Socket helpers are implemented locally in this engine to avoid
// coupling behavior with other engines

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Factory to create the Cards Against Humanity engine.
 *
 * Notes on architecture:
 * - This engine uses Valkey-based game state storage via GameStateService (using Bun's native Redis client)
 * - Broadcasting is handled via the WebSocket instance provided by the router
 *   and uses topic-based pub/sub on the `gameId` channel (ws.publish).
 * - Clients are subscribed to the `gameId` topic on join so that publishes
 *   reach all players in the same game. We also send the message directly to
 *   the initiating client (ws.send) via `emit` for immediate feedback.
 */
export function createCardsAgainstHumanityEngine(
  gameManager: GameManager,
  gameStateService: IGameStateService
): GameEngine {
  async function getGame(gameId: string): Promise<CAHGameState | null> {
    const game = await gameStateService.getGame(gameId);
    return game && 'selectedPacks' in game ? game as CAHGameState : null;
  }

  async function createCAHGame(gameId: string): Promise<CAHGameState> {
    const game: CAHGameState = {
      id: gameId,
      gameType: 'cards-against-humanity' as const,
      players: [],
      selectedPacks: [],
      phase: 'waiting' as const,
      currentJudge: null,
      currentBlackCard: null,
      submittedCards: [],
      roundWinner: null,
      deck: {
        blackCards: [],
        whiteCards: [],
      },
      handSize: 7,
      maxRounds: 10,
      currentRound: 0,
      waitingForPlayers: true,
      gameCompleted: false,
    };
    await gameStateService.setGame(gameId, game);
    return game;
  }

  /**
   * Broadcast a message to all players in a game by publishing to the
   * `gameId` topic and also directly sending to the invoking client.
   *
   * The SocketRouter gives us the `ws` that initiated the operation;
   * we rely on that to publish. All clients are subscribed in `join_game`.
   */
  function broadcastToGame(ws: GameSocket, op: string, data: any, toClient: boolean = false): void {
    try {
      const payload = JSON.stringify({ ...data, op });
      ws.publish(ws.data.game, payload);
      if (toClient) {
        ws.send(payload);
      }
    } catch (_) {
      try {
        ws.send(JSON.stringify({ op: "error", message: "Error publishing message" }));
      } catch { }
    }
  }

  function dealCards(game: CAHGameState, player: CAHPlayer): void {
    while (player.hand.length < game.handSize && game.deck.whiteCards.length > 0) {
      const card = game.deck.whiteCards.pop();
      if (card) {
        player.hand.push(card);
      }
    }

    // Log warning if deck is running low
    if (game.deck.whiteCards.length < game.players.filter(p => p.connected).length * 2) {
      console.warn(`White card deck is running low: ${game.deck.whiteCards.length} cards remaining`);
    }
  }

  function selectNextJudge(game: CAHGameState): void {
    const connectedPlayers = game.players.filter(p => p.connected);
    if (connectedPlayers.length === 0) return;

    const currentJudgeIndex = game.currentJudge
      ? connectedPlayers.findIndex(p => p.id === game.currentJudge)
      : -1;

    const nextJudgeIndex = (currentJudgeIndex + 1) % connectedPlayers.length;
    const nextJudge = connectedPlayers[nextJudgeIndex];

    game.currentJudge = nextJudge.id;

    // Update judge status for all players
    game.players.forEach(p => p.isJudge = p.id === nextJudge.id);
  }

  function checkAndReassignJudge(game: CAHGameState): void {
    if (!game.currentJudge) return;

    const currentJudgePlayer = game.players.find(p => p.id === game.currentJudge);
    if (!currentJudgePlayer || !currentJudgePlayer.connected) {
      // Judge is disconnected, select next judge
      selectNextJudge(game);
    }
  }

  function drawBlackCard(game: CAHGameState): CAHBlackCard | null {
    if (game.deck.blackCards.length === 0) return null;
    return game.deck.blackCards.pop() || null;
  }

  function startNewRound(ws: GameSocket, game: CAHGameState): void {
    game.currentRound++;
    game.submittedCards = [];
    game.roundWinner = null;

    // Select next judge
    selectNextJudge(game);

    // Draw new black card
    game.currentBlackCard = drawBlackCard(game);

    // If we have exhausted the black deck, end the game gracefully
    if (!game.currentBlackCard) {
      game.phase = 'game_over';
      game.gameCompleted = true;
      return;
    }

    // Reset player submitted status
    game.players.forEach(p => {
      if (p.connected && !p.isJudge) {
        dealCards(game, p);
      }
    });

    game.phase = 'selecting';
  }

  async function handleDisconnect(ws: GameSocket): Promise<void> {
    const game = await getGame(ws.data.game);
    if (!game) return;

    const player = game.players.find(p => p.id === ws.data.player);
    if (player) {
      player.connected = false;
      console.log(`Player ${player.name} (${player.id}) disconnected from CAH game ${ws.data.game}`);

      // If the disconnected player was the judge, reassign judge
      if (player.isJudge) {
        checkAndReassignJudge(game);
      }

      await gameStateService.setGame(ws.data.game, game);
      // Broadcast updated game state
      broadcastToGame(ws, "game_state", { game });
    }
  }

  const handlers: Record<string, (ws: GameSocket, data: any) => Promise<void>> = {
    join_game: async (ws, data) => {
      const { create, playername } = data;
      let game = await getGame(ws.data.game);

      console.log(`Player ${playername} (${ws.data.player}) joined CAH game ${ws.data.game}`);

      if (!game) {
        if (!create) {
          throw new Error("Game not found");
        }
        game = await createCAHGame(ws.data.game);
      }

      // Check if player already exists
      let player = game.players.find(p => p.id === ws.data.player);

      if (!player) {
        player = {
          id: ws.data.player,
          name: playername,
          score: 0,
          connected: true,
          hand: [],
          isJudge: false,
        };
        game.players.push(player);

        // Deal initial hand if game has started
        if (game.selectedPacks.length > 0) {
          dealCards(game, player);
        }
      } else {
        // Treat repeat joins idempotently without special reconnect handling
        player.connected = true;
      }

      // Subscribe this client to the game topic and notifications channel
      try {
        ws.subscribe(ws.data.game);
        ws.subscribe("notifications");
      } catch (_) {
        // Ignore subscribe errors in tests or environments without a bus
      }

      // If we're waiting for players and have enough, start the game
      if (game.phase === 'waiting' && game.players.filter(p => p.connected).length >= 3) {
        game.waitingForPlayers = false;
        if (game.selectedPacks.length > 0) {
          startNewRound(ws, game);
        }
      }

      // Check if judge needs reassignment
      checkAndReassignJudge(game);

      await gameStateService.setGame(ws.data.game, game);
      // Broadcast updated game state
      broadcastToGame(ws, "game_state", { game }, true);
    },

    select_packs: async (ws, data) => {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }
      const { packIds } = data;

      if (game.phase !== 'waiting') {
        throw new Error("Cannot change packs after game has started");
      }

      game.selectedPacks = packIds;

      // Load card data from SQLite database based on selected packs
      const dbPath = `${config.GAME_DATA_DIR}db.sqlite`;
      const db = new Database(dbPath);

      try {
        // Load black cards from selected packs
        const placeholders = packIds.map(() => '?').join(',');
        const blackCardsQuery = `
          SELECT id, text, pick
          FROM cah_cards
          WHERE card_type = 'black' AND pack_name IN (${placeholders})
        `;
        const blackCardRows = db.prepare(blackCardsQuery).all(...packIds) as Array<{ id: string; text: string; pick: number }>;

        game.deck.blackCards = blackCardRows.map(row => ({
          id: row.id,
          text: row.text,
          pick: row.pick
        }));

        // Load white cards from selected packs
        const whiteCardsQuery = `
          SELECT id, text
          FROM cah_cards
          WHERE card_type = 'white' AND pack_name IN (${placeholders})
        `;
        const whiteCardRows = db.prepare(whiteCardsQuery).all(...packIds) as Array<{ id: string; text: string }>;

        game.deck.whiteCards = whiteCardRows.map(row => ({
          id: row.id,
          text: row.text
        }));

        console.log(`Loaded ${game.deck.blackCards.length} black cards and ${game.deck.whiteCards.length} white cards from packs: ${packIds.join(', ')}`);
      } catch (error) {
        console.error(`Error loading Cards Against Humanity data from database: ${error}`);
        // Fallback to empty decks if database loading fails
        game.deck.blackCards = [];
        game.deck.whiteCards = [];
      } finally {
        db.close();
      }

      // Shuffle decks
      game.deck.blackCards = shuffleArray(game.deck.blackCards);
      game.deck.whiteCards = shuffleArray(game.deck.whiteCards);

      // Start first round if we have enough players
      if (game.players.filter(p => p.connected).length >= 3) {
        game.waitingForPlayers = false;
        startNewRound(ws, game);
      }

      await gameStateService.setGame(ws.data.game, game);
      broadcastToGame(ws, "game_state", { game });
    },

    submit_cards: async (ws, data) => {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }
      const { cardIds } = data;

      if (game.phase !== 'selecting') {
        throw new Error("Not in card selection phase");
      }

      const player = game.players.find(p => p.id === ws.data.player);
      if (!player || player.isJudge) {
        throw new Error("Player not found or is judge");
      }

      // Prevent duplicate submissions in the same round
      const alreadySubmitted = game.submittedCards.some(s => s.playerId === player.id);
      if (alreadySubmitted) {
        throw new Error("You have already submitted for this round");
      }

      // Find the cards in player's hand
      const submittedCards = cardIds.map((cardId: string) =>
        player.hand.find(card => card.id === cardId)
      ).filter(Boolean) as CAHWhiteCard[];

      if (submittedCards.length !== (game.currentBlackCard?.pick || 1)) {
        throw new Error(`Must submit exactly ${game.currentBlackCard?.pick || 1} cards`);
      }

      // Remove cards from hand
      submittedCards.forEach(card => {
        const index = player.hand.findIndex(c => c.id === card.id);
        if (index !== -1) {
          player.hand.splice(index, 1);
        }
      });

      // Add to submitted cards
      game.submittedCards.push({
        playerId: player.id,
        cards: submittedCards,
        playerName: player.name,
      });

      // Check if all non-judge players have submitted
      const connectedNonJudges = game.players.filter(p => p.connected && !p.isJudge);
      if (game.submittedCards.length === connectedNonJudges.length) {
        game.phase = 'judging';
      }

      await gameStateService.setGame(ws.data.game, game);
      broadcastToGame(ws, "game_state", { game });
    },

    select_winner: async (ws, data) => {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }
      const { winnerPlayerId } = data;

      if (game.phase !== 'judging') {
        throw new Error("Not in judging phase");
      }

      const currentJudge = game.players.find(p => p.id === game.currentJudge);
      if (!currentJudge || currentJudge.id !== ws.data.player) {
        throw new Error("Only the current judge can select a winner");
      }

      const winner = game.players.find(p => p.id === winnerPlayerId);
      if (!winner) {
        throw new Error("Winner player not found");
      }

      // Award point to winner
      winner.score++;

      game.roundWinner = winnerPlayerId;
      game.phase = 'scoring';

      // Auto-advance to next round after a brief delay
      setTimeout(async () => {
        if (game.currentRound >= game.maxRounds) {
          game.phase = 'game_over';
          game.gameCompleted = true;
        } else {
          startNewRound(ws, game);
        }
        await gameStateService.setGame(ws.data.game, game);
        broadcastToGame(ws, "game_state", { game });
      }, 3000);

      await gameStateService.setGame(ws.data.game, game);
      broadcastToGame(ws, "game_state", { game }, true);
    },

    reset_game: async (ws, data) => {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }

      // Reset game state
      game.phase = 'waiting';
      game.currentRound = 0;
      game.currentJudge = null;
      game.currentBlackCard = null;
      game.submittedCards = [];
      game.roundWinner = null;
      game.waitingForPlayers = true;
      game.gameCompleted = false;

      // Clear selected packs and decks so the pack selector shows again
      game.selectedPacks = [];
      game.deck.blackCards = [];
      game.deck.whiteCards = [];

      // Reset all players
      game.players.forEach(player => {
        player.score = 0;
        player.hand = [];
        player.isJudge = false;
      });

      await gameStateService.setGame(ws.data.game, game);
      broadcastToGame(ws, "game_state", { game }, true);
    },

    ping: async (ws, data) => {
      // Simple ping handler
      broadcastToGame(ws, "pong", {});
    },

    disconnect: async (ws, data) => {
      await handleDisconnect(ws);
    },
  };

  return {
    type: "cards-against-humanity",
    handlers,
  };
}
