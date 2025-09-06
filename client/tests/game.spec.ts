import { test, expect } from '@playwright/test';

test.describe('Never Have I Ever Game', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test('should load the home page', async ({ page }) => {
    await expect(page).toHaveTitle('Games ~ Kieran.dev');
    await expect(page.locator('.menu-container h1')).toContainText('Never Have I Ever');
    await expect(page.locator('text=Start New Game')).toBeVisible();
  });

  test('should navigate to game creation flow', async ({ page }) => {
    // Click start new game button
    await page.locator('text=Start New Game').click();

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
});
