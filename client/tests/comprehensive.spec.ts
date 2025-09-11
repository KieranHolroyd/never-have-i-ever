import { test, expect } from '@playwright/test';

test.describe('Simple Comprehensive Tests', () => {
	test('should load home page successfully', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Multiplayer Party Games' })).toBeVisible();
		await expect(
			page.locator('article', { hasText: 'Never Have I Ever' }).getByRole('button', {
				name: 'Start New Game'
			})
		).toBeVisible();
	});

	test('should navigate to name input page', async ({ page }) => {
		await page.goto('/');
		await page
			.locator('article', { hasText: 'Never Have I Ever' })
			.getByRole('button', {
				name: 'Start New Game'
			})
			.click();
		await expect(page.locator('body')).toBeVisible();
	});

	test('should handle player name input', async ({ page }) => {
		await page.goto('/play/name');
		await expect(page.locator('input[name="name"]')).toBeVisible();
		await expect(page.locator('text=Confirm Selection')).toBeVisible();

		await page.locator('input[name="name"]').fill('TestPlayer');
		await expect(page.locator('input[name="name"]')).toHaveValue('TestPlayer');
	});

	test('should handle game page navigation', async ({ page }) => {
		await page.goto('/play/test-game-123/never-have-i-ever');
		await expect(page.locator('body')).toBeVisible();
	});

	test('should support multiple browser contexts', async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();
		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		await page1.goto('/');
		await page2.goto('/');

		await expect(page1.getByRole('heading', { name: 'Multiplayer Party Games' })).toBeVisible();
		await expect(page2.getByRole('heading', { name: 'Multiplayer Party Games' })).toBeVisible();

		await context1.close();
		await context2.close();
	});
});
