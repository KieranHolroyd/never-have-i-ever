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

  function getGame(gameId: string): CAHGameState | null {
    return cahGames.get(gameId) || null;
  }

  function createCAHGame(gameId: string): CAHGameState {
    const game: CAHGameState = {
      id: gameId,
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
    cahGames.set(gameId, game);
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

  function handleDisconnect(ws: GameSocket): void {
    const game = getGame(ws.data.game);
    if (!game) return;

    const player = game.players.find(p => p.id === ws.data.player);
    if (player) {
      player.connected = false;
      console.log(`Player ${player.name} (${player.id}) disconnected from CAH game ${ws.data.game}`);

      // If the disconnected player was the judge, reassign judge
      if (player.isJudge) {
        checkAndReassignJudge(game);
      }

      // Broadcast updated game state
      broadcastToGame(ws, "game_state", { game });
    }
  }

  const handlers: Record<string, (ws: GameSocket, data: any) => Promise<void>> = {
    join_game: async (ws, data) => {
      const { create, playername } = data;
      let game = getGame(ws.data.game);

      if (!game) {
        if (!create) {
          throw new Error("Game not found");
        }
        game = createCAHGame(ws.data.game);
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
        const wasDisconnected = !player.connected;
        player.connected = true;

        // Re-deal cards if game has started and player was disconnected
        if (game.selectedPacks.length > 0 && game.phase !== 'waiting' && wasDisconnected) {
          dealCards(game, player);
        }

        console.log(`Player ${player.name} (${player.id}) reconnected to CAH game ${ws.data.game}`);
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

      broadcastToGame(ws, "game_state", { game });
    },

    select_packs: async (ws, data) => {
      const game = getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }
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
            { id: 'b4', text: 'What would grandma find disturbing, yet oddly charming?', pick: 1 },
            { id: 'b5', text: '_____. It\'s a trap!', pick: 1 },
            { id: 'b6', text: 'When I am a billionaire, _____ will be my first purchase.', pick: 1 },
            { id: 'b7', text: 'I never truly understood _____ until I encountered _____.', pick: 2 },
            { id: 'b8', text: 'The class field trip was completely ruined by _____.', pick: 1 },
            { id: 'b9', text: 'In the distant future, historians will agree that _____ was humanity\'s greatest invention.', pick: 1 },
            { id: 'b10', text: '_____. That\'s why I can\'t have nice things.', pick: 1 },
            { id: 'b11', text: '_____. It\'s just _____ all the way down.', pick: 2 },
            { id: 'b12', text: 'What\'s the new fad diet?', pick: 1 },
            { id: 'b13', text: '_____. High five, bro.', pick: 1 },
            { id: 'b14', text: '_____. That\'s how I want to die.', pick: 1 },
            { id: 'b15', text: 'The Five Stages of Grief: Denial, Anger, Bargaining, _____, Acceptance.', pick: 1 }
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
            { id: 'w11', text: 'Being a busy adult with many important things to do.' },
            { id: 'w12', text: 'Pretending to be happy.' },
            { id: 'w13', text: 'A slightly shittier parallel universe.' },
            { id: 'w14', text: 'A sad fat dragon with no friends.' },
            { id: 'w15', text: 'Fucking up the moon landing.' },
            { id: 'w16', text: 'Having a penis for a face.' },
            { id: 'w17', text: 'Being paralyzed from the neck down.' },
            { id: 'w18', text: 'A disappointing birthday party.' },
            { id: 'w19', text: 'A windmill full of corpses.' },
            { id: 'w20', text: 'A lifetime of sadness.' },
            { id: 'w21', text: 'A haunted orphanage for orphaned ghosts.' },
            { id: 'w22', text: 'An ass disaster.' },
            { id: 'w23', text: 'Some kind of bird-man.' },
            { id: 'w24', text: 'A horde of skeletons.' },
            { id: 'w25', text: 'A micropig wearing a tiny raincoat and booties.' },
            { id: 'w26', text: 'A slightly shittier parallel universe.' },
            { id: 'w27', text: 'A sad fat dragon with no friends.' },
            { id: 'w28', text: 'Fucking up the moon landing.' },
            { id: 'w29', text: 'Having a penis for a face.' },
            { id: 'w30', text: 'Being paralyzed from the neck down.' },
            { id: 'w31', text: 'A disappointing birthday party.' },
            { id: 'w32', text: 'A windmill full of corpses.' },
            { id: 'w33', text: 'A lifetime of sadness.' },
            { id: 'w34', text: 'A haunted orphanage for orphaned ghosts.' },
            { id: 'w35', text: 'An ass disaster.' },
            { id: 'w36', text: 'Some kind of bird-man.' },
            { id: 'w37', text: 'A horde of skeletons.' },
            { id: 'w38', text: 'A micropig wearing a tiny raincoat and booties.' },
            { id: 'w39', text: 'Becoming the President of the United States.' },
            { id: 'w40', text: 'A sad clown.' },
            { id: 'w41', text: 'A lonely, desperate, middle-aged man.' },
            { id: 'w42', text: 'A cloud of acid.' },
            { id: 'w43', text: 'A tiny, adorable child.' },
            { id: 'w44', text: 'A beautiful, radiant unicorn.' },
            { id: 'w45', text: 'A magical, mystical, mysterious unicorn.' },
            { id: 'w46', text: 'Being so rich that it hurts.' },
            { id: 'w47', text: 'A lifetime of crippling debt.' },
            { id: 'w48', text: 'Getting married, having children, and dying alone.' },
            { id: 'w49', text: 'The entire Mormon Tabernacle Choir.' },
            { id: 'w50', text: 'The female orgasm.' },
            { id: 'w51', text: 'The sweet release of death.' },
            { id: 'w52', text: 'Hot people.' },
            { id: 'w53', text: 'The inevitable heat death of the universe.' },
            { id: 'w54', text: 'My inner demons.' },
            { id: 'w55', text: 'Smallpox and genocide.' },
            { id: 'w56', text: 'A defective condom.' },
            { id: 'w57', text: 'The chronic pain of existence.' },
            { id: 'w58', text: 'Getting so angry that you pop a boner.' },
            { id: 'w59', text: 'The systematic destruction of an entire people and their way of life.' },
            { id: 'w60', text: 'Powerful thighs.' },
            { id: 'w61', text: 'The boy who cried wolf.' },
            { id: 'w62', text: 'An older woman who knows her way around the bedroom.' },
            { id: 'w63', text: 'A cat with trust issues.' },
            { id: 'w64', text: 'Being a motherfucking sorcerer.' },
            { id: 'w65', text: 'A sad handjob.' },
            { id: 'w66', text: 'Robots who just want to party.' },
            { id: 'w67', text: 'A mopey zoo lion.' },
            { id: 'w68', text: 'A magic hippie love cloud.' },
            { id: 'w69', text: 'A killer robot sent from the future.' },
            { id: 'w70', text: 'The government.' },
            { id: 'w71', text: 'A time travel paradox.' },
            { id: 'w72', text: 'Authentic Mexican cuisine.' },
            { id: 'w73', text: 'Doing the right thing.' },
            { id: 'w74', text: 'The Pope.' },
            { id: 'w75', text: 'A bleached asshole.' },
            { id: 'w76', text: 'Horse meat.' },
            { id: 'w77', text: 'Sunshine and rainbows.' },
            { id: 'w78', text: 'A sensible salad.' },
            { id: 'w79', text: 'A bitch slap.' },
            { id: 'w80', text: 'Pure, concentrated evil.' },
            { id: 'w81', text: 'A big black dick.' },
            { id: 'w82', text: 'A beached whale.' },
            { id: 'w83', text: 'A bloody pacifier.' },
            { id: 'w84', text: 'A crappy little hand.' },
            { id: 'w85', text: 'A low standard of living.' },
            { id: 'w86', text: 'A nuanced critique.' },
            { id: 'w87', text: 'Panty raids.' },
            { id: 'w88', text: 'One Ring to rule them all.' },
            { id: 'w89', text: 'A Super Soaker full of cat pee.' },
            { id: 'w90', text: 'Figgy pudding.' },
            { id: 'w91', text: 'Seppuku.' },
            { id: 'w92', text: 'An army of skeletons.' },
            { id: 'w93', text: 'A fetus.' },
            { id: 'w94', text: 'A sea of troubles.' },
            { id: 'w95', text: 'A good sniff.' },
            { id: 'w96', text: 'A dingo eating your baby.' },
            { id: 'w97', text: 'The thin veneer of situational causality that underlies porn.' },
            { id: 'w98', text: 'Girls that always be textin\'.' },
            { id: 'w99', text: 'Blowing up Parliament.' },
            { id: 'w100', text: 'A spontaneous conga line.' }
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
        ];
      }

      // Shuffle decks
      game.deck.blackCards = shuffleArray(game.deck.blackCards);
      game.deck.whiteCards = shuffleArray(game.deck.whiteCards);

      // Start first round if we have enough players
      if (game.players.filter(p => p.connected).length >= 3) {
        game.waitingForPlayers = false;
        startNewRound(ws, game);
      }

      broadcastToGame(ws, "game_state", { game });
    },

    submit_cards: async (ws, data) => {
      const game = getGame(ws.data.game);
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

      broadcastToGame(ws, "game_state", { game });
    },

    select_winner: async (ws, data) => {
      const game = getGame(ws.data.game);
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
      setTimeout(() => {
        if (game.currentRound >= game.maxRounds) {
          game.phase = 'game_over';
          game.gameCompleted = true;
        } else {
          startNewRound(ws, game);
        }
        broadcastToGame(ws, "game_state", { game });
      }, 3000);

      broadcastToGame(ws, "game_state", { game });
    },

    reset_game: async (ws, data) => {
      const game = getGame(ws.data.game);
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

    disconnect: async (ws, data) => {
      handleDisconnect(ws);
    },
  };

  return {
    type: "cards-against-humanity",
    handlers,
  };
}
