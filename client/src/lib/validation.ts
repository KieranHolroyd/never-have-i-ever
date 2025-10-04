// Client-side validation utilities

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export function validatePlayerName(name: string): ValidationResult {
	const errors: string[] = [];

	if (!name || name.trim().length === 0) {
		errors.push('Player name is required');
	} else if (name.trim().length < 2) {
		errors.push('Player name must be at least 2 characters long');
	} else if (name.trim().length > 20) {
		errors.push('Player name must be less than 20 characters long');
	} else if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
		errors.push('Player name can only contain letters, numbers, spaces, hyphens, and underscores');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

export function validateGameId(gameId: string): ValidationResult {
	const errors: string[] = [];

	if (!gameId || gameId.trim().length === 0) {
		errors.push('Game ID is required');
	} else if (!/^[a-zA-Z0-9\-_]+$/.test(gameId)) {
		errors.push('Game ID can only contain letters, numbers, hyphens, and underscores');
	} else if (gameId.length < 4) {
		errors.push('Game ID must be at least 4 characters long');
	} else if (gameId.length > 50) {
		errors.push('Game ID must be less than 50 characters long');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

export function validateCardSelection(selectedCards: string[], requiredCount: number): ValidationResult {
	const errors: string[] = [];

	if (selectedCards.length === 0) {
		errors.push('Please select at least one card');
	} else if (selectedCards.length !== requiredCount) {
		errors.push(`Please select exactly ${requiredCount} card${requiredCount > 1 ? 's' : ''}`);
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

export function validateCategorySelection(selectedCategories: string[]): ValidationResult {
	const errors: string[] = [];

	if (selectedCategories.length === 0) {
		errors.push('Please select at least one category');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

export function validateWebSocketMessage(data: any): ValidationResult {
	const errors: string[] = [];

	if (!data || typeof data !== 'object') {
		errors.push('Invalid message format');
		return { isValid: false, errors };
	}

	if (!data.op || typeof data.op !== 'string') {
		errors.push('Message must have an operation field');
	}

	// Validate specific operations
	switch (data.op) {
		case 'join_game':
			if (!data.playername || typeof data.playername !== 'string') {
				errors.push('join_game requires a playername');
			}
			break;
		case 'submit_cards':
			if (!Array.isArray(data.cardIds)) {
				errors.push('submit_cards requires cardIds array');
			}
			break;
		case 'select_winner':
			if (!data.winnerPlayerId || typeof data.winnerPlayerId !== 'string') {
				errors.push('select_winner requires winnerPlayerId');
			}
			break;
		case 'vote':
			if (typeof data.option !== 'number' || data.option < 1 || data.option > 3) {
				errors.push('vote requires option between 1 and 3');
			}
			break;
		case 'select_catagory':
			if (!data.catagory || typeof data.catagory !== 'string') {
				errors.push('select_catagory requires catagory');
			}
			break;
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

// Utility function to handle validation errors
export function handleValidationError(result: ValidationResult, onError: (message: string) => void): boolean {
	if (!result.isValid) {
		onError(result.errors.join(', '));
		return false;
	}
	return true;
}