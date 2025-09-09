import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Use the base test without server process management
export const test = base;

// Helper functions for common test operations
export class GameHelper {
	constructor(private page: Page) {}

	async startNewGame(playerName: string = 'Test Player') {
		await this.page.goto('/');
		await this.page.locator('text=Start New Game').click();

		// Handle name input if redirected
		if (this.page.url().includes('/play/name')) {
			await this.page.locator('input[name="playerName"]').fill(playerName);
			await this.page.locator('text=Continue').click();
		}

		return this.page.url();
	}

	async selectCategories(categoryIndices: number[] = [0]) {
		await this.page.waitForSelector('input[type="checkbox"]');

		for (const index of categoryIndices) {
			await this.page.locator('input[type="checkbox"]').nth(index).check();
		}

		await this.page.locator('text=Continue').click();
	}

	async waitForQuestion() {
		await this.page.waitForSelector('[data-testid="question-content"]');
	}

	async vote(option: 'Have' | 'Kinda' | 'Have not') {
		await this.page.locator(`text=${option}`).click();
	}

	async nextQuestion() {
		await this.page.locator('text=Next Question').click();
	}

	async getPlayerScore(playerName: string) {
		const scoreElement = this.page.locator(`[data-testid="player-score-${playerName}"]`);
		return await scoreElement.textContent();
	}

	async waitForConnection() {
		await this.page.waitForSelector('text=connected', { timeout: 10000 });
	}
}

// Export helper factory
export const createGameHelper = (page: Page) => new GameHelper(page);

// Re-export expect for convenience
export { expect };
