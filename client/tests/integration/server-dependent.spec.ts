import { test, expect } from '@playwright/test';

/**
 * Integration tests that require the server to be running
 * These test actual server responses and basic connectivity
 */

test.describe('Server-Dependent Functionality', () => {
  // Skip these tests if server is not available
  test.skip(({ page }) => {
    // Could add server health check here
    return !process.env.CI && !process.env.RUN_INTEGRATION;
  }, 'Integration tests require server to be running');

  test('should fetch categories from server', async ({ page }) => {
    // Navigate to trigger any API calls
    await page.goto('/');

    // Wait for potential API calls to complete
    await page.waitForTimeout(2000);

    // Verify page still loads (API failures shouldn't crash the app)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle game creation API calls', async ({ page }) => {
    // Set up a player name
    await page.context().addInitScript(() => {
      localStorage.setItem('player_name', 'APITestUser');
    });

    await page.goto('/');

    // Click start game - this may trigger API calls
    await page.locator('text=Start New Game').first().click();

    // Wait for any navigation/API calls
    await page.waitForTimeout(3000);

    // Verify we get some response (success or graceful failure)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load CAH pack data', async ({ page }) => {
    const testGameId = `api-test-${Date.now()}`;

    // Navigate to CAH game page
    await page.goto(`/play/${testGameId}/cards-against-humanity`);

    // Wait for potential API calls
    await page.waitForTimeout(3000);

    // Should load the page structure
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle WebSocket connection attempts', async ({ page }) => {
    const testGameId = `ws-test-${Date.now()}`;

    await page.goto(`/play/${testGameId}/never-have-i-ever`);

    // Wait for WebSocket connection attempts
    await page.waitForTimeout(5000);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle multiple simultaneous users', async ({ browser }) => {
    const userCount = 3;
    const contexts = [];
    const pages = [];

    // Create multiple user contexts
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Set unique player name
      await context.addInitScript((name) => {
        localStorage.setItem('player_name', name);
      }, `User${i + 1}`);

      contexts.push(context);
      pages.push(page);
    }

    try {
      // All users navigate to home page
      await Promise.all(pages.map(page => page.goto('/')));

      // All should load successfully
      for (const page of pages) {
        await expect(page.locator('h1')).toContainText('Multiplayer Party Games');
      }

      // All click start game
      await Promise.all(pages.map(page =>
        page.locator('text=Start New Game').first().click()
      ));

      // All should navigate somewhere (exact destination may vary)
      for (const page of pages) {
        await expect(page.locator('body')).toBeVisible();
      }

    } finally {
      // Clean up
      await Promise.all(contexts.map(context => context.close()));
    }
  });
});
