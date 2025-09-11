import { test, expect } from '@playwright/test';

test.describe('WebSocket Game Functionality', () => {
	test('should load game page without errors', async ({ page }) => {
		await page.goto('/play/test-game-123/never-have-i-ever');
		await expect(page.locator('body')).toBeVisible();
	});

	test('should handle page reload on game page', async ({ page }) => {
		await page.goto('/play/test-game-456/never-have-i-ever');
		await page.reload();
		await expect(page.locator('body')).toBeVisible();
	});

	test('should handle multiple browser contexts', async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();
		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		await page1.goto('/play/game1/never-have-i-ever');
		await page2.goto('/play/game2/never-have-i-ever');

		await expect(page1.locator('body')).toBeVisible();
		await expect(page2.locator('body')).toBeVisible();

		await context1.close();
		await context2.close();
	});
});
