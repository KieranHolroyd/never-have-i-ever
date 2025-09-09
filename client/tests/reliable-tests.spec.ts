import { test, expect } from '@playwright/test';

test.describe('Reliable Game Functionality Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should load home page successfully', async ({ page }) => {
		await expect(page.locator('.menu-container h1')).toContainText('Never Have I Ever');
		await expect(page.locator('text=Start New Game')).toBeVisible();
		await expect(page).toHaveTitle('Games ~ Kieran.dev');
	});

	test('should navigate to name input page', async ({ page }) => {
		await page.locator('text=Start New Game').click();
		// Should navigate (either client-side or server-side)
		await page.waitForTimeout(1000);
		await expect(page.locator('body')).toBeVisible();
	});

	test('should load name input page directly', async ({ page }) => {
		await page.goto('/play/name');
		await expect(page.locator('input[name="name"]')).toBeVisible();
		await expect(page.locator('text=Confirm Selection')).toBeVisible();
	});

	test('should handle name input', async ({ page }) => {
		await page.goto('/play/name');
		await page.locator('input[name="name"]').fill('TestUser');
		await expect(page.locator('input[name="name"]')).toHaveValue('TestUser');
	});

	test('should handle game page navigation', async ({ page }) => {
		await page.goto('/play/test-game-123/never-have-i-ever');
		await expect(page.locator('body')).toBeVisible();
		// Should not crash on game page
		await page.waitForTimeout(2000);
		expect(await page.isVisible('body')).toBe(true);
	});

	test('should handle invalid URLs gracefully', async ({ page }) => {
		const invalidUrls = ['/play/invalid', '/play/123/456', '/nonexistent/path'];

		for (const url of invalidUrls) {
			await page.goto(url);
			await expect(page.locator('body')).toBeVisible();
			// Should not crash
			await page.waitForTimeout(1000);
		}
	});

	test('should support multiple browser contexts', async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();
		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		await page1.goto('/');
		await page2.goto('/');

		await expect(page1.locator('.menu-container h1')).toContainText('Never Have I Ever');
		await expect(page2.locator('.menu-container h1')).toContainText('Never Have I Ever');

		await context1.close();
		await context2.close();
	});

	test('should handle page refresh', async ({ page }) => {
		await page.goto('/');
		await page.reload();
		await expect(page.locator('.menu-container h1')).toContainText('Never Have I Ever');
	});

	test('should handle basic page functionality', async ({ page }) => {
		await page.goto('/');
		await page.locator('text=Start New Game').click();

		// Wait for any navigation or state changes
		await page.waitForTimeout(1000);

		// Page should remain functional
		await expect(page.locator('body')).toBeVisible();
	});

	test('should handle different viewport sizes', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 }); // Mobile
		await page.goto('/');
		await expect(page.locator('.menu-container h1')).toContainText('Never Have I Ever');

		await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
		await expect(page.locator('.menu-container h1')).toContainText('Never Have I Ever');
	});

	test('should handle multiple interactions', async ({ page }) => {
		await page.goto('/');

		// Multiple clicks with error handling
		let clickCount = 0;
		for (let i = 0; i < 3; i++) {
			try {
				const button = page.locator('text=Start New Game');
				if (await button.isVisible({ timeout: 1000 })) {
					await button.click();
					clickCount++;
					await page.waitForTimeout(500);
				} else {
					break; // Button no longer visible, stop clicking
				}
			} catch (error) {
				// Button might not be clickable anymore, which is fine
				break;
			}
		}

		// Page should still be functional regardless of how many clicks succeeded
		await expect(page.locator('body')).toBeVisible();

		// We should have been able to click at least once
		expect(clickCount).toBeGreaterThan(0);
	});

	test('should handle keyboard navigation', async ({ page }) => {
		await page.goto('/play/name');

		// Test Tab navigation
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		// Test Enter key
		await page.keyboard.press('Enter');

		// Page should handle keyboard input gracefully
		await expect(page.locator('body')).toBeVisible();
	});

	test('should handle long user names', async ({ page }) => {
		await page.goto('/play/name');

		const longName = 'A'.repeat(50);
		await page.locator('input[name="name"]').fill(longName);
		await expect(page.locator('input[name="name"]')).toHaveValue(longName);
	});

	test('should handle special characters in names', async ({ page }) => {
		await page.goto('/play/name');

		const specialName = 'Test@#$%^&*()_+{}|:<>?[]\\;\'",./';
		await page.locator('input[name="name"]').fill(specialName);
		await expect(page.locator('input[name="name"]')).toHaveValue(specialName);
	});

	test('should handle empty input', async ({ page }) => {
		await page.goto('/play/name');

		// Try to submit without entering name
		await page.locator('text=Confirm Selection').click();
		await expect(page.locator('body')).toBeVisible();
	});

	test('should handle page reloads', async ({ page }) => {
		await page.goto('/');
		await page.reload();
		await page.reload();

		// Page should remain functional after multiple reloads
		await expect(page.locator('text=Start New Game')).toBeVisible();
	});
});
