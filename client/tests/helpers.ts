import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Use the base test without server process management
export const test = base;

// Helper functions for common test operations
export class GameHelper {
	constructor(private page: Page) {}

	async startNewGame(playerName: string = 'Test Player') {
		await this.page.goto('/');
		await this.page.getByRole('button', { name: /Never Have I Ever/i }).click();

		// Handle name input if redirected
		if (this.page.url().includes('/play/name')) {
			await this.page.locator('input[name="name"]').fill(playerName);
			await this.page.getByRole('button', { name: /continue/i }).click();
		}

		return this.page.url();
	}

	async goToCategorySelection() {
		const chooseBtn = this.page.getByRole('button', { name: 'Choose categories' });
		if (await chooseBtn.isVisible()) {
			await chooseBtn.click();
		}
		await this.page.waitForSelector('[data-testid="nhie-categories"]');
	}

	async selectCategories(categoryIndices: number[] = [0]) {
		await this.goToCategorySelection();

		const chips = this.page.locator('[data-testid="category-chip"]');
		for (const index of categoryIndices) {
			await chips.nth(index).click();
		}

		await this.page.getByRole('button', { name: /Start game/i }).click();
	}

	async waitForQuestion() {
		await this.page.waitForSelector('[data-testid="question-content"]');
	}

	async vote(option: 'Have' | 'Kinda' | 'Have not') {
		if (option === 'Have') {
			await this.page.locator('[data-testid="have-button"]').click();
		} else if (option === 'Have not') {
			await this.page.locator('[data-testid="have-not-button"]').click();
		} else {
			await this.page.getByRole('button', { name: 'Kinda', exact: true }).click();
		}
	}

	async nextQuestion() {
		await this.page.getByRole('button', { name: /Next question/i }).click();
	}

	async startCah() {
		await this.page.goto('/');
		await this.page.getByRole('button', { name: /Cards Against Humanity/i }).click();
		if (this.page.url().includes('/play/name')) {
			await this.page.locator('input[name="name"]').fill('Test Player');
			await this.page.getByRole('button', { name: /nickname/i }).click();
		}
	}

	async selectCahPacks(indices: number[] = [0]) {
		await this.page.waitForSelector('[data-testid="cah-pack-selection"]');
		const chips = this.page.locator('[data-testid="cah-pack-selection"] button').filter({
			has: this.page.locator('h3')
		});
		for (const index of indices) {
			await chips.nth(index).click();
		}
		await this.page.getByRole('button', { name: /Start game/i }).click();
	}

	async getPlayerScore(playerName: string) {
		const scoreElement = this.page.locator(`[data-testid="player-score-${playerName}"]`);
		return await scoreElement.textContent();
	}

	async waitForConnection() {
		await this.page.waitForSelector('text=Connected', { timeout: 10000 });
	}
}

// Export helper factory
export const createGameHelper = (page: Page) => new GameHelper(page);

// Re-export expect for convenience
export { expect };
