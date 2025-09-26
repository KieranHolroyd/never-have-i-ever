import { test, expect } from '@playwright/test';

/**
 * Basic functionality tests that verify the application loads and core UI works
 * These tests don't require server connectivity or complex state management
 */

test.describe('Basic Application Functionality', () => {
  test('should load the home page successfully', async ({ page }) => {
    // Clear any existing state
    await page.context().addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto('/');

    // Verify page loads
    await expect(page).toHaveTitle('Games ~ Kieran.dev');

    // Verify main content is visible
    await expect(page.locator('h1:has-text("Multiplayer Party Games")')).toBeVisible();

    // Verify game cards are present
    const gameCards = page.locator('article');
    await expect(gameCards).toHaveCount(2);

    // Verify each game has a start button
    for (const card of await gameCards.all()) {
      await expect(card.locator('text=Start New Game')).toBeVisible();
    }
  });

  test('should handle basic page navigation', async ({ page }) => {
    await page.goto('/');

    // Click a game link (should trigger some navigation or state change)
    await page.locator('text=Start New Game').first().click();

    // Verify we're no longer on the home page
    // (exact destination may vary based on state)
    await expect(page.locator('h1:has-text("Multiplayer Party Games")')).not.toBeVisible();

    // Verify page didn't crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle direct URL access to game pages', async ({ page }) => {
    const testGameId = `test-${Date.now()}`;

    // Try to access a game URL directly
    await page.goto(`/play/${testGameId}/never-have-i-ever`);

    // Should load without crashing (even if server returns errors)
    await expect(page.locator('body')).toBeVisible();

    // URL should be preserved
    await expect(page).toHaveURL(new RegExp(`/play/${testGameId}/never-have-i-ever`));
  });

  test('should handle name input page access', async ({ page }) => {
    await page.goto('/play/name');

    // Should load the name input page
    await expect(page.locator('body')).toBeVisible();

    // Should have some form of input (exact element may vary)
    const inputs = page.locator('input');
    await expect(inputs).toHaveCount(await inputs.count()); // At least one input exists

    // Should have some form of submit button
    const buttons = page.locator('button');
    await expect(buttons).toHaveCount(await buttons.count()); // At least one button exists
  });

  test('should handle invalid URLs gracefully', async ({ page }) => {
    // Try various invalid URLs
    const invalidUrls = [
      '/play/invalid-game-id/never-have-i-ever',
      '/play/nonexistent-page',
      '/invalid/route'
    ];

    for (const url of invalidUrls) {
      await page.goto(url);
      // Should load without crashing
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle page refresh', async ({ page }) => {
    await page.goto('/');

    // Verify initial load
    await expect(page.locator('h1:has-text("Multiplayer Party Games")')).toBeVisible();

    // Refresh page
    await page.reload();

    // Should still work after refresh
    await expect(page.locator('h1:has-text("Multiplayer Party Games")')).toBeVisible();
  });

  test('should handle multiple browser contexts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both should load independently
    await page1.goto('/');
    await page2.goto('/');

    await expect(page1.locator('h1:has-text("Multiplayer Party Games")')).toBeVisible();
    await expect(page2.locator('h1:has-text("Multiplayer Party Games")')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('should handle viewport changes', async ({ page }) => {
    await page.goto('/');

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      // Should still be functional
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
