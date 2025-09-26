import { test, expect } from '@playwright/test';

// Philosophy: UI reflects server state; client sends events only
// This test ensures Reset Game clears CAH state and returns to pack selection

test.describe('Cards Against Humanity - Reset reflects server state', () => {
  test('Reset Game returns to pack selection (server-driven UI)', async ({ browser }) => {
    const context = await browser.newContext();

    // Clear localStorage and set up debug controls
    await context.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('settings', JSON.stringify({ show_debug: true }));
      localStorage.setItem('player_name', 'Playwright');
    });

    const page = await context.newPage();
    const gameId = `cah-reset-${Date.now()}`;

    // Join the CAH game page
    await page.goto(`/play/${gameId}/cards-against-humanity`);

    // Wait for the page to load and WebSocket connection
    await page.waitForSelector('text=Select Card Packs', { timeout: 10000 });

    // Initially we should see pack selection (empty selectedPacks on server)
    await expect(page.getByRole('heading', { name: 'Select Card Packs' })).toBeVisible();

    // Wait for WebSocket connection
    await page.waitForSelector('text=Connected', { timeout: 10000 }).catch(() => {
      console.log('WebSocket connection not established, proceeding anyway');
    });

    // Wait for card packs to load
    await page.waitForTimeout(2000); // Give time for API call

    // Check if there are any checkboxes at all
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checkboxes`);

    if (checkboxCount === 0) {
      // No packs loaded, check for error message
      const errorText = await page.textContent('body');
      console.log('Page content:', errorText);
      throw new Error('No card packs loaded');
    }

    // Try a different approach: use page.evaluate to manually set checkbox state
    console.log('Using JavaScript to set checkbox states...');
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        (checkboxes[0] as HTMLInputElement).checked = true;
        checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('Checkbox set via JavaScript');

    // Wait a moment for the UI to update
    await page.waitForTimeout(500);

    // Check if the button is now enabled
    const startButton = page.getByRole('button', { name: /^Start Game$/ });
    const startButtonEnabled = await startButton.isEnabled();
    console.log(`Start button enabled: ${startButtonEnabled}`);

    if (!startButtonEnabled) {
      // Try setting multiple checkboxes
      console.log('Setting multiple checkboxes via JavaScript...');
      await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < Math.min(checkboxes.length, 3); i++) {
          (checkboxes[i] as HTMLInputElement).checked = true;
          checkboxes[i].dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.waitForTimeout(500);

      // Check again
      const finalEnabled = await startButton.isEnabled();
      console.log(`Start button finally enabled: ${finalEnabled}`);
    }

    await expect(startButton).toBeEnabled();
    await startButton.click();
    // Allow a brief tick for optimistic waiting state to render
    await page.waitForTimeout(100);

    // Use the debug control to reset the game (sends reset_game event to server)
    const resetButton = page.getByRole('button', { name: 'Reset Game' });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // UI should reflect server reset: pack selection visible again
    await expect(page.getByRole('heading', { name: 'Select Card Packs' })).toBeVisible();

    await context.close();
  });
});
