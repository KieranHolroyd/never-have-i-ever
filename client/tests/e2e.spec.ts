import { test, expect } from '@playwright/test';

test.describe('End-to-End Game Flow', () => {
	test('should navigate through main application routes', async ({ page }) => {
		// Start at home page
		await page.goto('/');

		// Navigate to game creation
		await page
			.locator('article', { hasText: 'Never Have I Ever' })
			.getByRole('button', {
				name: 'Start New Game'
			})
			.click();

		// Should remain functional
		await expect(page.locator('body')).toBeVisible();

		// Go back to home
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Multiplayer Party Games' })).toBeVisible();
	});

	test('should handle direct navigation to routes', async ({ page }) => {
		// Direct navigation to name page
		await page.goto('/play/name');
		await expect(page.locator('input[name="name"]')).toBeVisible();

		// Direct navigation to invalid game
		await page.goto('/play/invalid-game-id/never-have-i-ever');
		await expect(page.locator('body')).toBeVisible();
	});

	test('should handle basic navigation', async ({ page }) => {
		// Navigate to home
		await page.goto('/');

		// Navigate to name page
		await page
			.locator('article', { hasText: 'Never Have I Ever' })
			.getByRole('button', {
				name: 'Start New Game'
			})
			.click();

		// Page should remain functional
		await expect(page.locator('body')).toBeVisible();
	});
});
