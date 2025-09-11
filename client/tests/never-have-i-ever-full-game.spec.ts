import { test, expect } from '@playwright/test';

test.describe('Never Have I Ever Full Game Flow', () => {
	test('should play a full game of Never Have I Ever', async ({ page }) => {
		// Set localStorage to disable tutorials before any page loads
		await page.context().addInitScript(() => {
			localStorage.setItem('settings', JSON.stringify({ no_tutorials: true }));
		});

		// Generate a unique game ID
		const gameId = `test-game-${Date.now()}`;
		const redirectUrl = `/play/${gameId}/never-have-i-ever`;

		// 1. Directly navigate to the name input page with a redirect URL
		await page.goto(`/play/name?redirect=${encodeURIComponent(redirectUrl)}`);

		// 2. Enter a player name on the /play/name page and confirm
		await expect(page.locator('input[name="name"]')).toBeVisible();
		await page.locator('input[name="name"]').fill('TestPlayerNHIE');
		await page.locator('text=Confirm Selection').click();

		// 3. Verify navigation to the game page and initial connection status
		await page.waitForURL(redirectUrl);
		await expect(page.locator('text=Connected')).toBeVisible();

		// 4. Select a category (e.g., the first one) and confirm selections
		// Wait for categories to load
		await page.waitForSelector('text=Select Catagories');
		await page.locator('input[type="checkbox"]').nth(4).check(); // Games (smallest category)
		await page.locator('button', { hasText: 'Continue' }).click();

		// 5. Verify that a question is displayed
		await expect(page.locator('[data-testid="question-content"]')).toBeVisible();
		await expect(page.locator('[data-testid="question-category"]')).toBeVisible();

		// 6. Perform a series of votes and verify score updates
		// Initial score should be 0
		await expect(page.locator('[data-testid="player-score-TestPlayerNHIE"]')).toHaveText('0');

		const mainActionButton = page.locator('button.col-span-5');

		// Helper function to wait for the main action button to be enabled and click it
		const clickNextAction = async () => {
			if (await (mainActionButton.textContent()) === "Waiting for Votes") {
				page.locator('[data-testid="have-not-button"]').click();
				await page.waitForTimeout(10)
			}
			// Wait for the main action button's text to change to "Skip Round" or "Next Question"
			await expect(mainActionButton).toHaveText(/Skip Round|Next Question/, { timeout: 10000 });
			// Now that the text is correct, it should be enabled
			await expect(mainActionButton).toBeEnabled();
			await mainActionButton.click();
			return await page.waitForTimeout(10); // Allow time for new question to load
		};

		// Round 1: Vote "Have"
		await page.locator('[data-testid="have-button"]').click();
		await page.waitForTimeout(20); // Increased timeout here
		await expect(page.locator('[data-testid="player-score-TestPlayerNHIE"]')).toHaveText('1');
		await clickNextAction();

		// Round 2: Vote "Kinda"
		await page.locator('button', { hasText: 'Kinda' }).click();
		await page.waitForTimeout(20); // Increased timeout here
		await expect(page.locator('[data-testid="player-score-TestPlayerNHIE"]')).toHaveText('1.5');
		await clickNextAction();

		// Round 3: Vote "Have not"
		await page.locator('[data-testid="have-not-button"]').click();
		await page.waitForTimeout(20); // Increased timeout here
		await expect(page.locator('[data-testid="player-score-TestPlayerNHIE"]')).toHaveText('1.5');
		await clickNextAction();

		// 7. Simulate game completion (by exhausting questions)
		// Keep clicking "Next Question" until "There are no more questions" appears
		let questionCount = 0;
		while (questionCount < 100) { // Limit to prevent infinite loop in case of unexpected behavior
			const noMoreQuestions = page.locator('h1', { hasText: 'There are no more questions' });

			if (await noMoreQuestions.isVisible()) {
				break; // Game completed
			}

			await clickNextAction();
			questionCount++;
		}

		// 8. Verify the "no more questions" message and the option to reset
		await expect(page.locator('h1', { hasText: 'There are no more questions' })).toBeVisible();
		await expect(page.locator('button', { hasText: 'Reset Game' })).toBeVisible();

		// 9. Click "Reset Game" and confirm
		await page.locator('button', { hasText: 'Reset Game' }).click();

		// 10. Verify that the game resets to the category selection screen
		await expect(page.locator('text=Select Catagories')).toBeVisible();
		await expect(page.locator('button', { hasText: 'Continue' })).toBeVisible();
	});
});
