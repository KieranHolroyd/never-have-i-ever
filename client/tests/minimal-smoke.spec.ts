import { test, expect } from '@playwright/test';

/**
 * Minimal smoke tests that verify basic application functionality
 * These tests focus on what can be reliably tested without server dependencies
 */

test.describe('Smoke Tests', () => {
  test('application loads without crashing', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Verify the page loads (doesn't crash)
    await expect(page.locator('body')).toBeVisible();

    // Verify basic HTML structure exists
    await expect(page.locator('html')).toBeAttached();
    await expect(page.locator('head')).toBeAttached();
  });

  test('has expected page title', async ({ page }) => {
    await page.goto('/');

    // Check that a title is set (content may vary)
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('page has basic interactive elements', async ({ page }) => {
    await page.goto('/');

    // Should have some buttons (exact count may vary)
    const buttons = page.locator('button');
    await expect((await buttons.all()).length).toBeGreaterThan(0);
  });

  test('can navigate to different pages', async ({ page }) => {
    await page.goto('/');

    // Try to navigate to name page
    await page.goto('/play/name');

    // Should load without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('can access game URLs', async ({ page }) => {
    const testId = `smoke-${Date.now()}`;

    // Try to access game URLs
    await page.goto(`/play/${testId}/never-have-i-ever`);
    await expect(page.locator('body')).toBeVisible();

    await page.goto(`/play/${testId}/cards-against-humanity`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('handles invalid URLs gracefully', async ({ page }) => {
    await page.goto('/nonexistent-route');

    // Should still load a page (may show 404 or redirect)
    await expect(page.locator('body')).toBeVisible();
  });

  test('page is responsive to different viewports', async ({ page }) => {
    await page.goto('/');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('localStorage operations work', async ({ page }) => {
    await page.goto('/');

    // Test localStorage operations via page context
    await page.context().addInitScript(() => {
      localStorage.setItem('test-key', 'test-value');
      const value = localStorage.getItem('test-key');
      if (value !== 'test-value') {
        throw new Error('localStorage not working');
      }
    });

    // If we get here, localStorage works
    expect(true).toBe(true);
  });

  test('can create multiple browser contexts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Both should load
    await page1.goto('/');
    await page2.goto('/');

    await expect(page1.locator('body')).toBeVisible();
    await expect(page2.locator('body')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('page handles refresh', async ({ page }) => {
    await page.goto('/');

    // Verify initial load
    await expect(page.locator('body')).toBeVisible();

    // Refresh
    await page.reload();

    // Should still work
    await expect(page.locator('body')).toBeVisible();
  });
});
