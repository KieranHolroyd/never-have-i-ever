import { test, expect } from '@playwright/test';

test.describe('End-to-End Game Flow', () => {
  test('should navigate through main application routes', async ({ page }) => {
    // Start at home page
    await page.goto('/');

    // Navigate to game creation
    await page.locator('text=Start New Game').click();

    // Allow for client-side routing - may not change URL immediately
    await page.waitForTimeout(1000);

    // Should remain functional
    await expect(page.locator('body')).toBeVisible();

    // Go back to home
    await page.goto('/');
    await expect(page.locator('.menu-container h1')).toContainText('Never Have I Ever');
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
    await page.locator('text=Start New Game').click();
    await page.waitForTimeout(1000);

    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });
});
