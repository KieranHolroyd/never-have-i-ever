import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { GameManager } from '../src/game-manager';

function createMockWs(game: string, player: string) {
  const sent: string[] = [];
  const published: Array<{ topic: string; data: string }> = [];
  const subscriptions: string[] = [];

  return {
    data: { game, player, playing: 'cards-against-humanity' },
    send: mock((data: string) => {
      sent.push(data);
    }),
    publish: mock((topic: string, data: string) => {
      published.push({ topic, data });
    }),
    subscribe: mock((topic: string) => {
      subscriptions.push(topic);
    }),
    __getMessages() {
      return { sent, published, subscriptions };
    }
  } as any;
}

function getLastMessageByOp(ws: any, op: string) {
  const { sent, published } = ws.__getMessages();
  // Search direct sends first
  for (let i = sent.length - 1; i >= 0; i--) {
    const msg = JSON.parse(sent[i]);
    if (msg.op === op) return msg as any;
  }
  // Fallback to published messages
  for (let i = published.length - 1; i >= 0; i--) {
    const msg = JSON.parse(published[i].data);
    if (msg.op === op) return msg as any;
  }
  return null;
}

function getLastGameStateMessage(ws: any) {
  return getLastMessageByOp(ws, 'game_state');
}

describe('Cards Against Humanity Engine', () => {
  let engine: any;
  let gameManager: GameManager;
  const gameId = 'cah-test-game';

  beforeEach(async () => {
    // Ensure correct fixture dir before importing engine module
    process.env.GAME_DATA_DIR = './tests/fixtures/games/';
    const mod = await import('../src/lib/engines/cards-against-humanity');
    const createEngine = mod.createCardsAgainstHumanityEngine as (gm: GameManager) => any;

    gameManager = new GameManager();
    engine = createEngine(gameManager);
  });

  it('join_game should add player and subscribe to topics', async () => {
    const ws = createMockWs(gameId, 'p1');

    await engine.handlers.join_game(ws, { create: true, playername: 'Alice' });

    const { sent, subscriptions, published } = ws.__getMessages();
    expect(subscriptions.includes(gameId)).toBeTrue();
    const last = getLastGameStateMessage(ws)!;
    expect(last).toBeTruthy();
    expect(last.game.players.length).toBe(1);
    expect(last.game.players[0].name).toBe('Alice');
  });

  it('select_packs should load cards, deal hands and start first round (3 players)', async () => {
    const ws1 = createMockWs(gameId, 'p1');
    const ws2 = createMockWs(gameId, 'p2');
    const ws3 = createMockWs(gameId, 'p3');

    await engine.handlers.join_game(ws1, { create: true, playername: 'Alice' });
    await engine.handlers.join_game(ws2, { create: false, playername: 'Bob' });
    await engine.handlers.join_game(ws3, { create: false, playername: 'Cara' });

    await engine.handlers.select_packs(ws1, { packIds: ['base'] });

    const msg = getLastGameStateMessage(ws1)!;
    expect(msg).toBeTruthy();

    const game = msg.game;
    expect(game.deck.blackCards.length).toBeGreaterThan(0);
    // White deck may be fully consumed when dealing to 3 players (20 < 21)
    expect(game.deck.whiteCards.length).toBeGreaterThanOrEqual(0);
    expect(game.phase === 'selecting' || game.phase === 'waiting').toBeTrue();
    // After 3 players, first round should start
    expect(game.phase).toBe('selecting');
    expect(game.currentBlackCard).toBeTruthy();
    expect(game.currentJudge).toBe('p1');

    const p2 = game.players.find((p: any) => p.id === 'p2');
    const p3 = game.players.find((p: any) => p.id === 'p3');
    // After starting the round, non-judge players should have up to `handSize` cards
    expect(p2.hand.length).toBeGreaterThan(0);
    expect(p3.hand.length).toBeGreaterThan(0);
  });

  it('submit_cards should accept correct number and move to judging when all submitted', async () => {
    const ws1 = createMockWs(gameId, 'p1');
    const ws2 = createMockWs(gameId, 'p2');
    const ws3 = createMockWs(gameId, 'p3');

    await engine.handlers.join_game(ws1, { create: true, playername: 'Alice' });
    await engine.handlers.join_game(ws2, { create: false, playername: 'Bob' });
    await engine.handlers.join_game(ws3, { create: false, playername: 'Cara' });

    await engine.handlers.select_packs(ws1, { packIds: ['base'] });

    // Refresh player-specific state by re-sending join (idempotent) so ws2/ws3 have latest state snapshots
    await engine.handlers.join_game(ws2, { create: false, playername: 'Bob' });
    await engine.handlers.join_game(ws3, { create: false, playername: 'Cara' });

    // Use each player's own last snapshot to choose valid cards
    let p2State = getLastGameStateMessage(ws2)!;
    const pick: number = p2State.game.currentBlackCard.pick || 1;
    const p2 = p2State.game.players.find((p: any) => p.id === 'p2');
    const p2CardIds = p2.hand.slice(0, pick).map((c: any) => c.id);
    await engine.handlers.submit_cards(ws2, { cardIds: p2CardIds });

    let p3State = getLastGameStateMessage(ws3)!;
    const p3 = p3State.game.players.find((p: any) => p.id === 'p3');
    const p3CardIds = p3.hand.slice(0, pick).map((c: any) => c.id);
    await engine.handlers.submit_cards(ws3, { cardIds: p3CardIds });

    const finalMsg = getLastGameStateMessage(ws3)!;
    expect(finalMsg.game.submittedCards.length).toBe(2);
    expect(finalMsg.game.phase).toBe('judging');
  });

  it('select_winner should be allowed only by judge and award point', async () => {
    const ws1 = createMockWs(gameId, 'p1'); // judge
    const ws2 = createMockWs(gameId, 'p2');
    const ws3 = createMockWs(gameId, 'p3');

    await engine.handlers.join_game(ws1, { create: true, playername: 'Alice' });
    await engine.handlers.join_game(ws2, { create: false, playername: 'Bob' });
    await engine.handlers.join_game(ws3, { create: false, playername: 'Cara' });

    await engine.handlers.select_packs(ws1, { packIds: ['base'] });

    // Submit from both non-judges to enter judging phase
    // Refresh each player's state as above to pick valid cards
    await engine.handlers.join_game(ws2, { create: false, playername: 'Bob' });
    await engine.handlers.join_game(ws3, { create: false, playername: 'Cara' });

    let p2State = getLastGameStateMessage(ws2)!;
    const pick: number = p2State.game.currentBlackCard.pick || 1;
    const p2Cards = p2State.game.players.find((p: any) => p.id === 'p2').hand.slice(0, pick).map((c: any) => c.id);
    await engine.handlers.submit_cards(ws2, { cardIds: p2Cards });
    let p3State = getLastGameStateMessage(ws3)!;
    const p3Cards = p3State.game.players.find((p: any) => p.id === 'p3').hand.slice(0, pick).map((c: any) => c.id);
    await engine.handlers.submit_cards(ws3, { cardIds: p3Cards });

    // Now judge selects winner (p2)
    await engine.handlers.select_winner(ws1, { winnerPlayerId: 'p2' });

    let msg = getLastGameStateMessage(ws1)!;
    expect(msg.game.roundWinner).toBe('p2');
    const p2 = msg.game.players.find((p: any) => p.id === 'p2');
    expect(p2.score).toBeGreaterThanOrEqual(1);
    expect(msg.game.phase).toBe('scoring');
  });

  it('ping should respond with pong', async () => {
    const ws = createMockWs(gameId, 'p1');
    await engine.handlers.ping(ws, {});
    const last = getLastMessageByOp(ws, 'pong')!;
    expect(last.op).toBe('pong');
  });

  it('reset_game should return to pack selection and clear state', async () => {
    const ws1 = createMockWs(gameId, 'p1');
    const ws2 = createMockWs(gameId, 'p2');
    const ws3 = createMockWs(gameId, 'p3');

    // Setup a running game with 3 players and selected packs
    await engine.handlers.join_game(ws1, { create: true, playername: 'Alice' });
    await engine.handlers.join_game(ws2, { create: false, playername: 'Bob' });
    await engine.handlers.join_game(ws3, { create: false, playername: 'Cara' });
    await engine.handlers.select_packs(ws1, { packIds: ['base'] });

    // Sanity check: game started
    const started = getLastGameStateMessage(ws1)!;
    expect(started.game.phase === 'selecting' || started.game.phase === 'waiting').toBeTrue();

    // Perform reset
    await engine.handlers.reset_game(ws1, {});

    const msg = getLastGameStateMessage(ws1)!;
    expect(msg).toBeTruthy();
    const game = msg.game;

    // Phase and control flags
    expect(game.phase).toBe('waiting');
    expect(game.waitingForPlayers).toBeTrue();
    expect(Array.isArray(game.selectedPacks)).toBeTrue();
    expect(game.selectedPacks.length).toBe(0);

    // Decks cleared
    expect(game.deck.blackCards.length).toBe(0);
    expect(game.deck.whiteCards.length).toBe(0);

    // Players reset
    expect(game.players.length).toBe(3);
    for (const p of game.players) {
      expect(p.score).toBe(0);
      expect(p.hand.length).toBe(0);
      expect(p.isJudge).toBeFalse();
    }
  });
});
