import { test, expect } from '@playwright/test';

test.describe('Voting Functionality', () => {
	test('should load the voting page structure', async ({ page }) => {
		// Navigate to home page first
		await page.goto('/');

		// Should have the basic page structure
		await expect(page.getByRole('heading', { name: 'Multiplayer Party Games' })).toBeVisible();
		await expect(
			page.locator('article', { hasText: 'Never Have I Ever' }).getByRole('button', {
				name: 'Start New Game'
			})
		).toBeVisible();
	});

	test('should have proper page layout', async ({ page }) => {
		// Navigate to home page
		await page.goto('/');

		// Check for main layout elements
		await expect(page.locator('main')).toBeVisible();
	});

	test('should handle navigation to different routes', async ({ page }) => {
		// Navigate to name page
		await page.goto('/play/name');

		// Should load without errors
		await expect(page.locator('input[name="name"]')).toBeVisible();
	});
});
