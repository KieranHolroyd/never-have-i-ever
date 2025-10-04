// Unified client architecture exports

// WebSocket management
export { WebSocketManager } from './websocket-manager';
export type { WebSocketManagerConfig } from './websocket-manager';

// Legacy CAH WebSocket manager (for backward compatibility)
export { CAHWebSocketManager } from './cah-websocket-manager';

// State management stores
export {
	gameStore,
	connectionStore,
	currentPlayerStore,
	errorStore,
	setError,
	updateConnection,
	updatePing,
	clearError
} from './stores/game-store';
export type {
	GameState,
	ConnectionState,
	ErrorState,
	CurrentPlayer
} from './stores/game-store';

// Validation utilities
export {
	validatePlayerName,
	validateGameId,
	validateCardSelection,
	validateCategorySelection,
	validateWebSocketMessage,
	handleValidationError
} from './validation';
export type { ValidationResult } from './validation';

// Shared components
export { default as ConnectionStatus } from './components/shared/ConnectionStatus.svelte';
export { default as ErrorDisplay } from './components/shared/ErrorDisplay.svelte';

// Re-export commonly used types
export type {
	Status,
	Player,
	CAHGameState,
	CAHPlayer,
	CAHBlackCard,
	CAHWhiteCard,
	CAHSubmission,
	CardPack,
	VoteOptions,
	Catagories,
	Catagory,
	Question,
	GameData,
	Settings
} from './types';

// Re-export utilities
export { settingsStore } from './settings';
export { LocalPlayer } from './player';
export { toast } from './toast';
export { colour_map } from './colour';