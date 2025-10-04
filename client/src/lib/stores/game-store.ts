import { writable } from 'svelte/store';
import type { CAHGameState, Player, GameData } from '../types';

// Generic game state store
export interface GameState {
	// Common properties
	id: string;
	players: Player[] | any[];
	phase?: string;
	currentRound?: number;
	gameCompleted?: boolean;
	waitingForPlayers?: boolean;

	// CAH specific
	selectedPacks?: string[];
	currentJudge?: string | null;
	currentBlackCard?: any;
	submittedCards?: any[];
	roundWinner?: string | null;
	deck?: any;
	handSize?: number;
	maxRounds?: number;

	// Never Have I Ever specific
	catagories?: string[];
	current_question?: any;
	history?: any[];
	catagory_select?: boolean;
	data?: any;
	timeout_start?: number;
	timeout_duration?: number;
}

export const gameStore = writable<GameState | null>(null);

// Connection state store
export interface ConnectionState {
	status: 'connecting' | 'connected' | 'disconnected';
	isReconnecting: boolean;
	reconnectAttempts: number;
	ping: number;
}

export const connectionStore = writable<ConnectionState>({
	status: 'connecting',
	isReconnecting: false,
	reconnectAttempts: 0,
	ping: 0
});

// Error state store
export interface ErrorState {
	message: string;
	timestamp: number;
}

export const errorStore = writable<ErrorState | null>(null);

// Current player store
export interface CurrentPlayer {
	id: string;
	name: string;
	score: number;
	connected: boolean;
	// Game-specific properties
	hand?: any[];
	isJudge?: boolean;
	this_round?: any;
}

export const currentPlayerStore = writable<CurrentPlayer | null>(null);

// Helper functions
export function clearError() {
	errorStore.set(null);
}

export function setError(message: string) {
	errorStore.set({
		message,
		timestamp: Date.now()
	});
}

export function updateConnection(status: 'connecting' | 'connected' | 'disconnected', isReconnecting = false, attempts = 0) {
	connectionStore.set({
		status,
		isReconnecting,
		reconnectAttempts: attempts,
		ping: 0 // Will be updated separately
	});
}

export function updatePing(ping: number) {
	connectionStore.update(state => ({
		...state,
		ping
	}));
}