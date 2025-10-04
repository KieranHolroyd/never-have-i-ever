// Legacy CAH WebSocket Manager - now uses unified WebSocketManager
// This file is kept for backward compatibility but delegates to the unified manager

import { WebSocketManager } from './websocket-manager';
import { Status, type CAHGameState, type CAHPlayer } from './types';

export interface CAHWebSocketManagerConfig {
	gameId: string;
	playerId: string;
	playerName: string;
	selectedPackIds?: string[];
	onGameState: (gameState: CAHGameState) => void;
	onError: (error: string) => void;
	onConnectionChange: (status: Status, isReconnecting?: boolean, attempts?: number) => void;
}

export class CAHWebSocketManager {
	private wsManager: WebSocketManager;

	constructor(config: CAHWebSocketManagerConfig) {
		this.wsManager = new WebSocketManager({
			gameId: config.gameId,
			playerId: config.playerId,
			playerName: config.playerName,
			gameType: 'cards-against-humanity',
			selectedPackIds: config.selectedPackIds,
			onGameState: config.onGameState,
			onError: config.onError,
			onConnectionChange: config.onConnectionChange
		});
	}

	connect(): void {
		this.wsManager.connect();
	}

	sendMessage(op: string, data: any = {}): void {
		this.wsManager.sendMessage(op, data);
	}

	disconnect(): void {
		this.wsManager.disconnect();
	}

	isConnected(): boolean {
		return this.wsManager.isConnected();
	}

	getReconnectStatus() {
		return this.wsManager.getReconnectStatus();
	}

	// CAH-specific methods
	submitCards(cardIds: string[]): void {
		this.wsManager.submitCards(cardIds);
	}

	selectWinner(winnerPlayerId: string): void {
		this.wsManager.selectWinner(winnerPlayerId);
	}

	resetGame(): void {
		this.wsManager.resetGame();
	}

	ping(): void {
		this.wsManager.ping();
	}

	selectPacks(packIds: string[]): void {
		this.wsManager.selectPacks(packIds);
	}

	joinGame(create: boolean = true): void {
		this.wsManager.joinGame(create);
	}
}