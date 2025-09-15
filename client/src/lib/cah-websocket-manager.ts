import { env } from '$env/dynamic/public';
import { LocalPlayer } from '$lib/player';
import { Status, type CAHGameState, type CAHPlayer } from '$lib/types';

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
	private socket: WebSocket | null = null;
	private config: CAHWebSocketManagerConfig;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 10;
	private reconnectTimeout: number | null = null;
	private isReconnecting = false;
	private packsSelected = false;

	constructor(config: CAHWebSocketManagerConfig) {
		this.config = config;
	}

	connect(): void {
		if (this.socket) return;

		// Clear any pending reconnect timeout
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		const sock_url = env.PUBLIC_SOCKET_URL ?? 'ws://localhost:3000/';
		const sock_params = `?playing=cards-against-humanity&game=${this.config.gameId}&player=${this.config.playerId}`;

		try {
			this.socket = new WebSocket(sock_url + sock_params);
			this.setupEventListeners();
		} catch (e) {
			console.error('Failed to create WebSocket:', e);
			this.config.onError('Unable to establish connection - please check the server URL and your network connection');
			this.scheduleReconnect();
		}
	}

	private setupEventListeners(): void {
		if (!this.socket) return;

		this.socket.addEventListener('open', () => {
			this.config.onConnectionChange(Status.CONNECTED, false, 0);
			this.isReconnecting = false;
			this.reconnectAttempts = 0;
			this.config.onError(''); // Clear any error

			this.socket?.send(
				JSON.stringify({
					op: 'join_game',
					create: true,
					playername: this.config.playerName
				})
			);

			// Send selected packs if available
			if (this.config.selectedPackIds && this.config.selectedPackIds.length > 0 && !this.packsSelected) {
				setTimeout(() => {
					this.socket?.send(
						JSON.stringify({
							op: 'select_packs',
							packIds: this.config.selectedPackIds
						})
					);
					this.packsSelected = true;
				}, 500);
			}
		});

		this.socket.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);

				if (!data.op) {
					console.warn('Received message without operation:', data);
					return;
				}

				switch (data.op) {
					case 'game_state':
						if (!data.game) {
							console.warn('Received game_state message without game data');
							return;
						}
						this.config.onGameState(data.game);
						break;

					case 'error':
						this.config.onError(data.message || 'Server error');
						break;

					case 'pong':
						// Handle ping response
						break;

					default:
						console.log('Unhandled message operation:', data.op, data);
				}
			} catch (e) {
				console.error('Failed to parse WebSocket message:', e, 'Raw message:', event.data);
				this.config.onError('Received invalid message from server');
			}
		});

		this.socket.addEventListener('close', (event) => {
			this.config.onConnectionChange(Status.DISCONNECTED);
			this.socket = null;

			// Provide specific error messages based on close code
			let errorMessage = '';
			switch (event.code) {
				case 1000:
					console.log('WebSocket closed cleanly');
					break;
				case 1001:
					errorMessage = 'Server is shutting down';
					break;
				case 1006:
					errorMessage = 'Connection lost unexpectedly';
					break;
				case 1008:
					errorMessage = 'Server rejected the connection';
					break;
				case 1011:
					errorMessage = 'Server encountered an error';
					break;
				default:
					errorMessage = `Connection closed (code: ${event.code})`;
			}

			if (errorMessage && event.code !== 1000) {
				console.log(`WebSocket closed: ${errorMessage}`);
				this.config.onError(errorMessage);
			}

			// Only attempt reconnection if it's not a clean close
			if (event.code !== 1000 && !this.isReconnecting) {
				console.log('Attempting to reconnect...');
				this.scheduleReconnect();
			}
		});

		this.socket.addEventListener('error', (event) => {
			console.error('WebSocket error:', event);
			this.config.onConnectionChange(Status.DISCONNECTED);
			this.config.onError('Network connection error - please check your internet connection');
			this.socket = null;

			// Attempt to reconnect on error
			if (!this.isReconnecting) {
				this.scheduleReconnect();
			}
		});
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.config.onError('Failed to reconnect after multiple attempts. Please refresh the page.');
			this.config.onConnectionChange(Status.DISCONNECTED, false, this.reconnectAttempts);
			this.isReconnecting = false;
			return;
		}

		this.isReconnecting = true;
		this.config.onConnectionChange(Status.CONNECTING, true, this.reconnectAttempts);

		// Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc. (max 30s)
		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

		this.reconnectTimeout = window.setTimeout(() => {
			this.reconnectAttempts++;
			console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
			this.connect();
		}, delay);
	}

	sendMessage(op: string, data: any = {}): void {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify({ op, ...data }));
		}
	}

	disconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.socket) {
			try {
				this.socket.close(1000, 'Component unmounting');
			} catch (e) {
				console.warn('Error closing WebSocket:', e);
			}
			this.socket = null;
		}

		this.isReconnecting = false;
		this.reconnectAttempts = 0;
	}

	isConnected(): boolean {
		return this.socket?.readyState === WebSocket.OPEN;
	}

	getReconnectStatus() {
		return {
			isReconnecting: this.isReconnecting,
			attempts: this.reconnectAttempts,
			maxAttempts: this.maxReconnectAttempts
		};
	}

	// CAH-specific methods
	submitCards(cardIds: string[]): void {
		this.sendMessage('submit_cards', { cardIds });
	}

	selectWinner(winnerPlayerId: string): void {
		this.sendMessage('select_winner', { winnerPlayerId });
	}

	resetGame(): void {
		this.sendMessage('reset_game');
	}

	ping(): void {
		this.sendMessage('ping');
	}

	selectPacks(packIds: string[]): void {
		this.sendMessage('select_packs', { packIds });
	}

	joinGame(create: boolean = true): void {
		this.sendMessage('join_game', {
			create,
			playername: this.config.playerName
		});
	}
}