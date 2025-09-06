import { test, expect } from '@playwright/test';

test.describe('Multiplayer Functionality', () => {
  test('should support multiple browser contexts', async ({ browser }) => {
    // Create two browser contexts (simulating two players)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both players navigate to the home page
      await page1.goto('/');
      await page2.goto('/');

      // Both should see the same content
      await expect(page1.locator('.menu-container h1')).toContainText('Never Have I Ever');
      await expect(page2.locator('.menu-container h1')).toContainText('Never Have I Ever');

    } finally {
      // Clean up
      await context1.close();
      await context2.close();
    }
  });

  test('should handle multiple pages simultaneously', async ({ context }) => {
    // Create multiple pages in the same context
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Both pages navigate to different routes
    await page1.goto('/');
    await page2.goto('/play/name');

    // Verify they load correctly
    await expect(page1.locator('.menu-container h1')).toContainText('Never Have I Ever');
    await expect(page2.locator('input[name="name"]')).toBeVisible();
  });
});
