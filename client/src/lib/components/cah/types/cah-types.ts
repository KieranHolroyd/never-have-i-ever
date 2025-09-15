import type { CAHGameState, CAHPlayer } from '$lib/types';

export interface GameComponentProps {
	gameState: CAHGameState;
	currentPlayer: CAHPlayer | null;
	onCardSelect: (cardId: string) => void;
	onSubmitCards: (cardIds: string[]) => void;
	onSelectWinner: (playerId: string) => void;
	onResetGame: () => void;
	selectedCardIds: string[];
}

export interface PlayerDisplayProps {
	player: CAHPlayer;
	isCurrentUser: boolean;
	isJudge: boolean;
	showHandSize?: boolean;
	rank?: number;
}

export interface PhaseIndicatorProps {
	phase: CAHGameState['phase'];
}