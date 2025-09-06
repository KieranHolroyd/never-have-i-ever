import { test, expect } from '@playwright/test';

test.describe('End-to-End Game Flow', () => {
  test('should navigate through main application routes', async ({ page }) => {
    // Start at home page
    await page.goto('/');

    // Navigate to game creation
    await page.locator('text=Start New Game').click();
    await expect(page).toHaveURL(/\/play\/name/);

    // Go back to home
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Never Have I Ever');
  });

  test('should handle direct navigation to routes', async ({ page }) => {
    // Direct navigation to name page
    await page.goto('/play/name');
    await expect(page.locator('input[name="playerName"]')).toBeVisible();

    // Direct navigation to invalid game
    await page.goto('/play/invalid-game-id/never-have-i-ever');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should maintain page state across navigation', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    const initialTitle = await page.title();

    // Navigate to name page and back
    await page.locator('text=Start New Game').click();
    await page.goBack();

    // Should maintain state
    await expect(page).toHaveTitle(initialTitle);
  });
});
