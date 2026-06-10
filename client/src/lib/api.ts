import { env } from '$env/dynamic/public';
import type {
	ActiveGamePlayerSummary,
	ActiveGameStatus,
	ActiveGameSummary,
	ActiveGamesResponse,
	CAHBlackCard,
	CAHGameState,
	CAHPlayer,
	CAHSubmission,
	CAHWhiteCard,
	CardPack,
	Catagories,
	ClientCAHGameState,
	ClientNHIEGameState,
	GameHistoryEntry,
	NHIEPlayer,
	NHIEGameState,
	Question
} from '$lib/types';

const nhiePhases = ['category_select', 'waiting', 'game_over'] as const;
const cahPhases = ['waiting', 'selecting', 'judging', 'scoring', 'game_over'] as const;
const activeGameStatuses = ['waiting', 'in-progress', 'completed'] as const;
const gameTypes = ['never-have-i-ever', 'cards-against-humanity'] as const;

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function parseQuestion(raw: unknown): Question {
	const q = asRecord(raw);
	return {
		catagory: String(q.catagory ?? ''),
		content: String(q.content ?? '')
	};
}

function parsePlayer(raw: unknown): NHIEPlayer {
	const p = asRecord(raw);
	const round = asRecord(p.this_round ?? p.thisRound);
	const vote = round.vote;

	return {
		id: String(p.id ?? ''),
		name: String(p.name ?? ''),
		score: Number(p.score ?? 0),
		connected: Boolean(p.connected),
		this_round: {
			vote: vote == null ? null : String(vote),
			voted: Boolean(round.voted)
		}
	};
}

function parsePhase(raw: unknown): NHIEGameState['phase'] {
	const phase = String(raw ?? 'category_select');
	return nhiePhases.includes(phase as (typeof nhiePhases)[number])
		? (phase as NHIEGameState['phase'])
		: 'category_select';
}

function parseHistoryEntry(raw: unknown): GameHistoryEntry {
	const entry = asRecord(raw);
	return {
		question: parseQuestion(entry.question),
		players: Array.isArray(entry.players) ? entry.players.map(parsePlayer) : []
	};
}

/** Parse REST or WebSocket payloads into the shared NHIE game-state shape. */
export function parseNHIEGameState(raw: unknown): NHIEGameState {
	const g = asRecord(raw);

	return {
		id: String(g.id ?? ''),
		gameType: 'never-have-i-ever',
		phase: parsePhase(g.phase ?? (g.catagory_select ? 'category_select' : undefined)),
		players: Array.isArray(g.players) ? g.players.map(parsePlayer) : [],
		maxPlayers: Number(g.maxPlayers ?? g.max_players ?? 20),
		creatorPlayerId: (g.creatorPlayerId ?? g.creator_player_id ?? null) as string | null,
		passwordProtected: Boolean(g.passwordProtected ?? g.password_protected),
		catagories: Array.isArray(g.catagories) ? g.catagories.map(String) : [],
		current_question: parseQuestion(g.current_question ?? g.currentQuestion),
		history: Array.isArray(g.history) ? g.history.map(parseHistoryEntry) : [],
		waitingForPlayers: Boolean(g.waitingForPlayers ?? g.waiting_for_players),
		gameCompleted: Boolean(g.gameCompleted ?? g.game_completed),
		timeout_start: Number(g.timeout_start ?? g.timeoutStart ?? 0),
		timeout_duration: Number(g.timeout_duration ?? g.timeoutDuration ?? 0)
	};
}

export function parseClientNHIEGameState(raw: unknown): ClientNHIEGameState {
	const g = asRecord(raw);
	return {
		...parseNHIEGameState(g),
		active: g.active !== undefined ? Boolean(g.active) : undefined
	};
}

function parseCAHWhiteCard(raw: unknown): CAHWhiteCard {
	const card = asRecord(raw);
	return {
		id: String(card.id ?? ''),
		text: String(card.text ?? '')
	};
}

function parseCAHBlackCard(raw: unknown): CAHBlackCard {
	const card = asRecord(raw);
	return {
		id: String(card.id ?? ''),
		text: String(card.text ?? ''),
		pick: Number(card.pick ?? 1)
	};
}

function parseCAHPlayer(raw: unknown): CAHPlayer {
	const player = asRecord(raw);
	return {
		id: String(player.id ?? ''),
		name: String(player.name ?? ''),
		score: Number(player.score ?? 0),
		connected: Boolean(player.connected),
		hand: Array.isArray(player.hand) ? player.hand.map(parseCAHWhiteCard) : [],
		isJudge: Boolean(player.isJudge ?? player.is_judge)
	};
}

function parseCAHSubmission(raw: unknown): CAHSubmission {
	const submission = asRecord(raw);
	return {
		playerId: String(submission.playerId ?? submission.player_id ?? ''),
		playerName: String(submission.playerName ?? submission.player_name ?? ''),
		cards: Array.isArray(submission.cards) ? submission.cards.map(parseCAHWhiteCard) : []
	};
}

function parseCAHPhase(raw: unknown): CAHGameState['phase'] {
	const phase = String(raw ?? 'waiting');
	return cahPhases.includes(phase as (typeof cahPhases)[number])
		? (phase as CAHGameState['phase'])
		: 'waiting';
}

/** Parse REST or WebSocket payloads into the shared CAH game-state shape. */
export function parseCAHGameState(raw: unknown): CAHGameState {
	const g = asRecord(raw);
	const deck = asRecord(g.deck);
	const selectedPacksRaw = g.selectedPacks ?? g.selected_packs;
	const submittedCardsRaw = g.submittedCards ?? g.submitted_cards;
	const blackCardsRaw = deck.blackCards ?? deck.black_cards;
	const whiteCardsRaw = deck.whiteCards ?? deck.white_cards;
	const currentBlackCardRaw = g.currentBlackCard ?? g.current_black_card;

	return {
		id: String(g.id ?? ''),
		players: Array.isArray(g.players) ? g.players.map(parseCAHPlayer) : [],
		selectedPacks: Array.isArray(selectedPacksRaw) ? selectedPacksRaw.map(String) : [],
		maxPlayers: Number(g.maxPlayers ?? g.max_players ?? 20),
		creatorPlayerId: (g.creatorPlayerId ?? g.creator_player_id ?? null) as string | null,
		passwordProtected: Boolean(g.passwordProtected ?? g.password_protected),
		phase: parseCAHPhase(g.phase),
		currentJudge: (g.currentJudge ?? g.current_judge ?? null) as string | null,
		currentBlackCard:
			currentBlackCardRaw != null ? parseCAHBlackCard(currentBlackCardRaw) : null,
		submittedCards: Array.isArray(submittedCardsRaw)
			? submittedCardsRaw.map(parseCAHSubmission)
			: [],
		roundWinner: (g.roundWinner ?? g.round_winner ?? null) as string | null,
		deck: {
			blackCards: Array.isArray(blackCardsRaw) ? blackCardsRaw.map(parseCAHBlackCard) : [],
			whiteCards: Array.isArray(whiteCardsRaw) ? whiteCardsRaw.map(parseCAHWhiteCard) : []
		},
		handSize: Number(g.handSize ?? g.hand_size ?? 7),
		maxRounds: Number(g.maxRounds ?? g.max_rounds ?? 10),
		currentRound: Number(g.currentRound ?? g.current_round ?? 0),
		waitingForPlayers: Boolean(g.waitingForPlayers ?? g.waiting_for_players),
		gameCompleted: Boolean(g.gameCompleted ?? g.game_completed)
	};
}

export function parseClientCAHGameState(raw: unknown): ClientCAHGameState {
	const g = asRecord(raw);
	return {
		...parseCAHGameState(g),
		active: g.active !== undefined ? Boolean(g.active) : undefined
	};
}

function parseCatagory(raw: unknown) {
	const c = asRecord(raw);
	const flags = asRecord(c.flags);
	const isHidden = flags.is_hidden ?? flags.isHidden;

	return {
		flags: {
			is_nsfw: Boolean(flags.is_nsfw ?? flags.isNsfw),
			...(isHidden !== undefined ? { is_hidden: Boolean(isHidden) } : {})
		},
		questions: Array.isArray(c.questions) ? c.questions.map(String) : []
	};
}

export function parseCatagories(raw: unknown): Catagories | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const result: Catagories = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		result[key] = parseCatagory(value);
	}
	return result;
}

function parseActiveGamePlayer(raw: unknown): ActiveGamePlayerSummary {
	const player = asRecord(raw);
	return {
		id: String(player.id ?? ''),
		name: String(player.name ?? ''),
		connected: Boolean(player.connected)
	};
}

function parseActiveGameStatus(raw: unknown): ActiveGameStatus {
	const status = String(raw ?? 'waiting');
	return activeGameStatuses.includes(status as ActiveGameStatus)
		? (status as ActiveGameStatus)
		: 'waiting';
}

export function parseActiveGameSummary(raw: unknown): ActiveGameSummary {
	const game = asRecord(raw);
	const gameType = String(game.gameType ?? game.game_type ?? 'never-have-i-ever');

	return {
		id: String(game.id ?? ''),
		gameType: gameTypes.includes(gameType as (typeof gameTypes)[number])
			? (gameType as ActiveGameSummary['gameType'])
			: 'never-have-i-ever',
		title: String(game.title ?? ''),
		primaryPlayerName: String(game.primaryPlayerName ?? game.primary_player_name ?? ''),
		passwordProtected: Boolean(game.passwordProtected ?? game.password_protected),
		phase: String(game.phase ?? ''),
		status: parseActiveGameStatus(game.status),
		maxPlayers: Number(game.maxPlayers ?? game.max_players ?? 20),
		playerCount: Number(game.playerCount ?? game.player_count ?? 0),
		connectedPlayerCount: Number(game.connectedPlayerCount ?? game.connected_player_count ?? 0),
		players: Array.isArray(game.players) ? game.players.map(parseActiveGamePlayer) : [],
		createdAt: String(game.createdAt ?? game.created_at ?? ''),
		href: String(game.href ?? '')
	};
}

export function parseCardPack(raw: unknown): CardPack {
	const pack = asRecord(raw);
	return {
		id: String(pack.id ?? ''),
		name: String(pack.name ?? ''),
		blackCards: Number(pack.blackCards ?? pack.black_cards ?? 0),
		whiteCards: Number(pack.whiteCards ?? pack.white_cards ?? 0),
		isOfficial: Boolean(pack.isOfficial ?? pack.is_official),
		isNSFW: Boolean(pack.isNSFW ?? pack.is_nsfw)
	};
}

/** @deprecated Use parseNHIEGameState instead */
export const normalizeNHIEGameState = parseNHIEGameState;

/** Build an absolute or root-relative API URL regardless of trailing slashes. */
export function apiUrl(path: string): string {
	const normalizedPath = path.replace(/^\//, '');
	const base = env.PUBLIC_API_URL?.trim() ?? '';

	if (!base) {
		return `/${normalizedPath}`;
	}

	const normalizedBase = base.endsWith('/') ? base : `${base}/`;
	return `${normalizedBase}${normalizedPath}`;
}

export async function fetchCatagories(fetchFn: typeof fetch = fetch): Promise<Catagories | null> {
	try {
		const response = await fetchFn(apiUrl('api/catagories'));
		if (!response.ok) {
			return null;
		}

		return parseCatagories(await response.json());
	} catch {
		return null;
	}
}

export async function fetchGame(
	gameId: string,
	fetchFn: typeof fetch = fetch
): Promise<ClientNHIEGameState | null> {
	try {
		const response = await fetchFn(apiUrl(`api/game?id=${encodeURIComponent(gameId)}`));
		if (!response.ok) {
			return null;
		}

		return parseClientNHIEGameState(await response.json());
	} catch {
		return null;
	}
}

export async function fetchCAHGame(
	gameId: string,
	fetchFn: typeof fetch = fetch
): Promise<ClientCAHGameState | null> {
	try {
		const response = await fetchFn(apiUrl(`api/cah-game?id=${encodeURIComponent(gameId)}`));
		if (!response.ok) {
			return null;
		}

		return parseClientCAHGameState(await response.json());
	} catch {
		return null;
	}
}

export async function fetchCardPacks(fetchFn: typeof fetch = fetch): Promise<CardPack[]> {
	try {
		const response = await fetchFn(apiUrl('api/cah-packs'));
		if (!response.ok) {
			return [];
		}

		const raw = await response.json();
		return Array.isArray(raw) ? raw.map(parseCardPack) : [];
	} catch {
		return [];
	}
}

export async function fetchActiveGames(
	fetchFn: typeof fetch = fetch
): Promise<ActiveGamesResponse> {
	try {
		const response = await fetchFn(apiUrl('api/active-games'));
		if (!response.ok) {
			return { games: [] };
		}

		const raw = asRecord(await response.json());
		const games = Array.isArray(raw.games) ? raw.games.map(parseActiveGameSummary) : [];
		return { games };
	} catch {
		return { games: [] };
	}
}
