import { test, expect } from '@playwright/test';

// Philosophy: UI reflects server state; client sends events only
// This test ensures Reset Game clears CAH state and returns to pack selection

test.describe('Cards Against Humanity - Reset reflects server state', () => {
  test('Reset Game returns to pack selection (server-driven UI)', async ({ browser }) => {
    const context = await browser.newContext();

    // Ensure debug controls are visible so we can click Reset Game
    await context.addInitScript(() => {
      try {
        localStorage.setItem('settings', JSON.stringify({ show_debug: true }));
        localStorage.setItem('player_name', 'Playwright');
      } catch {}
    });

    const page = await context.newPage();
    const gameId = `cah-reset-${Date.now()}`;

    // Join the CAH game page
    await page.goto(`/play/${gameId}/cards-against-humanity`);

    // Initially we should see pack selection (empty selectedPacks on server)
    await expect(page.getByRole('heading', { name: 'Select Card Packs' })).toBeVisible();

    // Start the game by selecting packs (base pack is preselected by UI)
    const startButton = page.getByRole('button', { name: 'Start Game' });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // After starting, we should be in waiting phase (packs selected, waiting for players)
    await expect(page.getByText('Waiting for Players', { exact: false })).toBeVisible();

    // Use the debug control to reset the game (sends reset_game event to server)
    const resetButton = page.getByRole('button', { name: 'Reset Game' });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // UI should reflect server reset: pack selection visible again
    await expect(page.getByRole('heading', { name: 'Select Card Packs' })).toBeVisible();

    await context.close();
  });
});
