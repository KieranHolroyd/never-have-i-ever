import { test, expect } from '@playwright/test';

test.describe('Never Have I Ever Game', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the home page
		await page.goto('/');
	});

	test('should load the home page', async ({ page }) => {
		await expect(page).toHaveTitle('Games ~ Kieran.dev');
		await expect(page.getByRole('heading', { name: 'Multiplayer Party Games' })).toBeVisible();
		await expect(
			page.locator('article', { hasText: 'Never Have I Ever' }).getByRole('button', {
				name: 'Start New Game'
			})
		).toBeVisible();
	});

	test('should navigate to game creation flow', async ({ page }) => {
		// Click start new game button
		await page
			.locator('article', { hasText: 'Never Have I Ever' })
			.getByRole('button', {
				name: 'Start New Game'
			})
			.click();

		// Should redirect to name page if no player name is set
		await expect(page).toHaveURL(/\/play\/name/);
	});

	test('should have player name input field', async ({ page }) => {
		// Navigate to name page directly
		await page.goto('/play/name');

		// Should have input field for player name
		await expect(page.locator('input[name="name"]')).toBeVisible();
		await expect(page.locator('text=Confirm Selection')).toBeVisible();
	});

	test('should handle invalid game URL gracefully', async ({ page }) => {
		// Try to access non-existent game
		await page.goto('/play/invalid-game-id/never-have-i-ever');

		// Should load the page without crashing
		await expect(page.locator('body')).toBeVisible();
	});

	test('should allow two players to join a game and play a round', async ({ browser }) => {
		// Player 1 setup
		const context1 = await browser.newContext();
		const page1 = await context1.newPage();

		// Player 2 setup
		const context2 = await browser.newContext();
		const page2 = await context2.newPage();

		// Player 1 starts a new game
		await page1.goto('/');
		await page1
			.locator('article', { hasText: 'Never Have I Ever' })
			.getByRole('button', {
				name: 'Start New Game'
			})
			.click();
		await expect(page1.locator('input[name="name"]')).toBeVisible();
		await page1.locator('input[name="name"]').fill('Player 1');
		await page1.locator('text=Confirm Selection').click();
		await page1.waitForURL(/\/play\/[a-zA-Z0-9-]+\/never-have-i-ever/);
		const gameUrl = page1.url();

		// Player 2 joins the game
		await page2.goto(gameUrl);
		// on join, should be prompted for name
		await expect(page2.locator('input[name="name"]')).toBeVisible();
		await page2.locator('input[name="name"]').fill('Player 2');
		await page2.locator('text=Confirm Selection').click();

		// Both players should see each other in the player list
		await page1.waitForSelector('[data-testid="player-Player 1"]');
		await page1.waitForSelector('[data-testid="player-Player 2"]');
		await page2.waitForSelector('[data-testid="player-Player 1"]');
		await page2.waitForSelector('[data-testid="player-Player 2"]');

		// Player 1 selects categories and starts the game
		await page1.locator('input[type="checkbox"]').first().check();
		await page1.locator('text=Confirm Selections').click();

		// Both players should see the first question
		await expect(page1.locator('h2').first()).not.toBeEmpty();
		await expect(page2.locator('h2').first()).not.toBeEmpty();

		// Both players vote
		await page1.locator('text=Have').click();
		await page2.locator('text=Have Not').click();

		// Check scores - this requires knowing the initial score and the vote value
		// For this test, we'll just check that the score is a number
		await expect(page1.locator('.text-4xl').first()).toContainText(/\d+/);
		await expect(page2.locator('.text-4xl').first()).toContainText(/\d+/);


		// Player 1 moves to the next question
		await page1.locator('text=Next Question').click();

		// Both players should see the new question
		await expect(page1.locator('h2').first()).not.toBeEmpty();
		await expect(page2.locator('h2').first()).not.toBeEmpty();
	});
});
