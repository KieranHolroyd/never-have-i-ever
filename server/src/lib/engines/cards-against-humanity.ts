import type { GameEngine } from "../../types";
import type { GameSocket } from "../router";
import { GameManager } from "../../game-manager";
import { config } from "../../config";
// Socket helpers are implemented locally in this engine to avoid
// coupling behavior with other engines

// Cards Against Humanity specific types
export type CAHGameState = {
  id: string;
  players: CAHPlayer[];
  selectedPacks: string[];

  // Game phases
  phase: 'waiting' | 'selecting' | 'judging' | 'scoring' | 'game_over';

  // Current round state
  currentJudge: string | null;
  currentBlackCard: CAHBlackCard | null;
  submittedCards: CAHSubmission[];
  roundWinner: string | null;

  // Deck state
  deck: {
    blackCards: CAHBlackCard[];
    whiteCards: CAHWhiteCard[];
  };

  // Game settings
  handSize: number;
  maxRounds: number;
  currentRound: number;

  // Control states
  waitingForPlayers: boolean;
  gameCompleted: boolean;
};

export type CAHPlayer = {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  hand: CAHWhiteCard[];
  isJudge: boolean;
};

export type CAHBlackCard = {
  id: string;
  text: string;
  pick: number;
};

export type CAHWhiteCard = {
  id: string;
  text: string;
};

export type CAHSubmission = {
  playerId: string;
  cards: CAHWhiteCard[];
  playerName: string;
};

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
 * - This engine maintains its own in-memory game state per `gameId`.
 * - Broadcasting is handled via the WebSocket instance provided by the router
 *   and uses topic-based pub/sub on the `gameId` channel (ws.publish).
 * - Clients are subscribed to the `gameId` topic on join so that publishes
 *   reach all players in the same game. We also send the message directly to
 *   the initiating client (ws.send) via `emit` for immediate feedback.
 */
export function createCardsAgainstHumanityEngine(gameManager: GameManager): GameEngine {
  // In-memory game state storage (in production, use Redis/database)
  const cahGames = new Map<string, CAHGameState>();

  function getOrCreateCAHGame(gameId: string): CAHGameState {
    let game = cahGames.get(gameId);

    if (!game) {
      game = {
        id: gameId,
        players: [],
        selectedPacks: [],
        phase: 'waiting',
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
      cahGames.set(gameId, game);
    }

    return game;
  }

  /**
   * Broadcast a message to all players in a game by publishing to the
   * `gameId` topic and also directly sending to the invoking client.
   *
   * The SocketRouter gives us the `ws` that initiated the operation;
   * we rely on that to publish. All clients are subscribed in `join_game`.
   */
  function broadcastToGame(ws: GameSocket, op: string, data: any): void {
    try {
      const payload = JSON.stringify({ ...data, op });
      ws.publish(ws.data.game, payload);
    } catch (_) {
      try {
        ws.send(JSON.stringify({ op: "error", message: "Error publishing message" }));
      } catch {}
    }
  }

  function dealCards(game: CAHGameState, player: CAHPlayer): void {
    while (player.hand.length < game.handSize && game.deck.whiteCards.length > 0) {
      const card = game.deck.whiteCards.pop();
      if (card) {
        player.hand.push(card);
      }
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

  function drawBlackCard(game: CAHGameState): CAHBlackCard | null {
    if (game.deck.blackCards.length === 0) return null;
    return game.deck.blackCards.pop() || null;
  }

  function startNewRound(game: CAHGameState): void {
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

  const handlers: Record<string, (ws: GameSocket, data: any) => Promise<void>> = {
    join_game: async (ws, data) => {
      const game = getOrCreateCAHGame(ws.data.game);
      const { create, playername } = data;

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
          startNewRound(game);
        }
      }

      broadcastToGame(ws, "game_state", { game });
    },

    select_packs: async (ws, data) => {
      const game = getOrCreateCAHGame(ws.data.game);
      const { packIds } = data;

      if (game.phase !== 'waiting') {
        throw new Error("Cannot change packs after game has started");
      }

      game.selectedPacks = packIds;

      // TODO: Load actual card data from selected packs
      // For now, we'll use placeholder data
      // Define a type for the CAH card data file
      type CAHCardData = {
        blackCards: CAHBlackCard[];
        whiteCards: CAHWhiteCard[];
      };

      // Load actual card data from the JSON file
      const filePath = `${config.GAME_DATA_DIR}cards-against-humanity.json`;
      try {
        const cardFile = Bun.file(filePath);
        if (await cardFile.exists()) {
          const cardData = await cardFile.json() as CAHCardData;
          game.deck.blackCards = cardData.blackCards;
          game.deck.whiteCards = cardData.whiteCards;
        } else {
          console.warn(`Cards Against Humanity data file not found at: ${filePath}. Using placeholder data.`);
          // Fallback to placeholder data if file not found
          game.deck.blackCards = [
            { id: 'b1', text: 'Why can\'t I sleep at night?', pick: 1 },
            { id: 'b2', text: 'What\'s that smell?', pick: 1 },
            { id: 'b3', text: 'I got 99 problems but _____ ain\'t one.', pick: 1 },
          ];
          game.deck.whiteCards = [
            { id: 'w1', text: 'Being on fire.' },
            { id: 'w2', text: 'Racism.' },
            { id: 'w3', text: 'Old-people smell.' },
            { id: 'w4', text: 'A micropenis.' },
            { id: 'w5', text: 'Women in yogurt commercials.' },
            { id: 'w6', text: 'Classist undertones.' },
            { id: 'w7', text: 'Not giving a fuck.' },
            { id: 'w8', text: 'Sexting.' },
            { id: 'w9', text: 'Roofies.' },
            { id: 'w10', text: 'A man on the brink of orgasm.' },
          ];
        }
      } catch (error) {
        console.error(`Error loading Cards Against Humanity data: ${error}`);
        // Fallback to placeholder data on error
        game.deck.blackCards = [
          { id: 'b1', text: 'Why can\'t I sleep at night?', pick: 1 },
          { id: 'b2', text: 'What\'s that smell?', pick: 1 },
          { id: 'b3', text: 'I got 99 problems but _____ ain\'t one.', pick: 1 },
        ];
        game.deck.whiteCards = [
          { id: 'w1', text: 'Being on fire.' },
          { id: 'w2', text: 'Racism.' },
          { id: 'w3', text: 'Old-people smell.' },
          { id: 'w4', text: 'A micropenis.' },
          { id: 'w5', text: 'Women in yogurt commercials.' },
          { id: 'w6', text: 'Classist undertones.' },
          { id: 'w7', text: 'Not giving a fuck.' },
          { id: 'w8', text: 'Sexting.' },
          { id: 'w9', text: 'Roofies.' },
          { id: 'w10', text: 'A man on the brink of orgasm.' },
        ];
      }

      // Shuffle decks
      game.deck.blackCards = shuffleArray(game.deck.blackCards);
      game.deck.whiteCards = shuffleArray(game.deck.whiteCards);

      // Start first round if we have enough players
      if (game.players.filter(p => p.connected).length >= 3) {
        game.waitingForPlayers = false;
        startNewRound(game);
      }

      broadcastToGame(ws, "game_state", { game });
    },

    submit_cards: async (ws, data) => {
      const game = getOrCreateCAHGame(ws.data.game);
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

      broadcastToGame(ws, "game_state", { game });
    },

    select_winner: async (ws, data) => {
      const game = getOrCreateCAHGame(ws.data.game);
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
      setTimeout(() => {
        if (game.currentRound >= game.maxRounds) {
          game.phase = 'game_over';
          game.gameCompleted = true;
        } else {
          startNewRound(game);
        }
        broadcastToGame(ws, "game_state", { game });
      }, 3000);

      broadcastToGame(ws, "game_state", { game });
    },

    reset_game: async (ws, data) => {
      const game = getOrCreateCAHGame(ws.data.game);

      // Reset game state
      game.phase = 'waiting';
      game.currentRound = 0;
      game.currentJudge = null;
      game.currentBlackCard = null;
      game.submittedCards = [];
      game.roundWinner = null;
      game.waitingForPlayers = true;
      game.gameCompleted = false;

      // Reset all players
      game.players.forEach(player => {
        player.score = 0;
        player.hand = [];
        player.isJudge = false;
      });

      broadcastToGame(ws, "game_state", { game });
    },

    ping: async (ws, data) => {
      // Simple ping handler
      broadcastToGame(ws, "pong", {});
    },
  };

  return {
    type: "cards-against-humanity",
    handlers,
  };
}
