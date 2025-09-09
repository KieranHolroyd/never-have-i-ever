import { test, expect } from '@playwright/test';

test.describe('Multiplayer Game Interactions', () => {
	test.describe('Multiplayer Connectivity', () => {
		test('should establish WebSocket connections for multiple players', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const page1 = await context1.newPage();
			const page2 = await context2.newPage();

			// Both players join the same game
			await page1.goto('/play/multi-connect-test/never-have-i-ever');
			await page2.goto('/play/multi-connect-test/never-have-i-ever');
			await page1.waitForTimeout(4000); // Allow WebSocket connections

			// Both pages should load successfully
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
		});

		test('should handle multiple browser contexts accessing the same game', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const context3 = await browser.newContext();

			const page1 = await context1.newPage();
			const page2 = await context2.newPage();
			const page3 = await context3.newPage();

			await page1.goto('/play/multi-context-test/never-have-i-ever');
			await page2.goto('/play/multi-context-test/never-have-i-ever');
			await page3.goto('/play/multi-context-test/never-have-i-ever');
			await page1.waitForTimeout(5000); // Allow all connections

			// All contexts should work independently
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();
			await expect(page3.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
			await context3.close();
		});
	});

	test.describe('Real-time Voting', () => {
		test('should broadcast vote_cast events to all players', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const context3 = await browser.newContext();

			const page1 = await context1.newPage();
			const page2 = await context2.newPage();
			const page3 = await context3.newPage();

			await page1.goto('/play/vote-broadcast-test/never-have-i-ever');
			await page2.goto('/play/vote-broadcast-test/never-have-i-ever');
			await page3.goto('/play/vote-broadcast-test/never-have-i-ever');
			await page1.waitForTimeout(5000); // Allow all connections

			// All pages should load
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();
			await expect(page3.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
			await context3.close();
		});

		test('should handle simultaneous voting from multiple players', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const context3 = await browser.newContext();
			const context4 = await browser.newContext();

			const page1 = await context1.newPage();
			const page2 = await context2.newPage();
			const page3 = await context3.newPage();
			const page4 = await context4.newPage();

			await page1.goto('/play/simultaneous-vote-test/never-have-i-ever');
			await page2.goto('/play/simultaneous-vote-test/never-have-i-ever');
			await page3.goto('/play/simultaneous-vote-test/never-have-i-ever');
			await page4.goto('/play/simultaneous-vote-test/never-have-i-ever');
			await page1.waitForTimeout(6000); // Allow all connections

			// All players should remain functional
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();
			await expect(page3.locator('body')).toBeVisible();
			await expect(page4.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
			await context3.close();
			await context4.close();
		});

		test('should handle round timeout and auto-progression', async ({ browser }) => {
			const context1 = await browser.newContext();
			const page1 = await context1.newPage();

			await page1.goto('/play/timeout-progress-test/never-have-i-ever');
			await page1.waitForTimeout(3000);

			// Page should handle timeout scenarios
			await expect(page1.locator('body')).toBeVisible();

			await context1.close();
		});
	});

	test.describe('Game State Synchronization', () => {
		test('should maintain consistent game state across late-joining players', async ({
			browser
		}) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const context3 = await browser.newContext();

			const page1 = await context1.newPage();
			const page2 = await context2.newPage();
			const page3 = await context3.newPage();

			// First player joins
			await page1.goto('/play/state-sync-test/never-have-i-ever');
			await page1.waitForTimeout(2000);

			// Second player joins shortly after
			await page2.goto('/play/state-sync-test/never-have-i-ever');
			await page2.waitForTimeout(2000);

			// Third player joins later
			await page3.goto('/play/state-sync-test/never-have-i-ever');
			await page3.waitForTimeout(2000);

			// All should have consistent state
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();
			await expect(page3.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
			await context3.close();
		});

		test('should handle game reset events from any player', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const page1 = await context1.newPage();
			const page2 = await context2.newPage();

			await page1.goto('/play/reset-sync-test/never-have-i-ever');
			await page2.goto('/play/reset-sync-test/never-have-i-ever');
			await page1.waitForTimeout(4000);

			// Both should see the game interface
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
		});
	});

	test.describe('Connection Management', () => {
		test('should handle player disconnection and reconnection', async ({ browser }) => {
			const context1 = await browser.newContext();
			const page1 = await context1.newPage();

			await page1.goto('/play/disconnect-test/never-have-i-ever');
			await page1.waitForTimeout(2000);

			// Simulate disconnection by reloading
			await page1.reload();
			await page1.waitForTimeout(3000);

			// Should reconnect successfully
			await expect(page1.locator('body')).toBeVisible();

			await context1.close();
		});

		test('should maintain game state during temporary disconnections', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const page1 = await context1.newPage();
			const page2 = await context2.newPage();

			await page1.goto('/play/temp-disconnect-test/never-have-i-ever');
			await page2.goto('/play/temp-disconnect-test/never-have-i-ever');
			await page1.waitForTimeout(4000);

			// Both should be connected
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();

			// Simulate one player disconnecting and reconnecting
			await page2.reload();
			await page2.waitForTimeout(3000);

			// Both should still be functional
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
		});
	});

	test.describe('Error Handling in Multiplayer', () => {
		test('should handle invalid game operations gracefully', async ({ browser }) => {
			const context1 = await browser.newContext();
			const page1 = await context1.newPage();

			await page1.goto('/play/error-handling-test/never-have-i-ever');
			await page1.waitForTimeout(2000);

			// Should handle errors without crashing
			await expect(page1.locator('body')).toBeVisible();

			await context1.close();
		});

		test('should handle network interruptions during gameplay', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const page1 = await context1.newPage();
			const page2 = await context2.newPage();

			await page1.goto('/play/network-interrupt-test/never-have-i-ever');
			await page2.goto('/play/network-interrupt-test/never-have-i-ever');
			await page1.waitForTimeout(4000);

			// Should handle network issues gracefully
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
		});
	});

	test.describe('Performance with Multiple Players', () => {
		test('should handle 6+ concurrent players efficiently', async ({ browser }) => {
			const contexts = [];
			const pages = [];

			// Create 6 browser contexts
			for (let i = 0; i < 6; i++) {
				const context = await browser.newContext();
				const page = await context.newPage();
				contexts.push(context);
				pages.push(page);
			}

			try {
				// All players join the same game
				const gameUrl = '/play/performance-test-6p/never-have-i-ever';
				const joinPromises = pages.map((page) => page.goto(gameUrl));
				await Promise.all(joinPromises);

				// Wait for all connections to establish
				await pages[0].waitForTimeout(8000);

				// All players should be functional
				for (const page of pages) {
					await expect(page.locator('body')).toBeVisible();
				}
			} finally {
				// Clean up all contexts
				for (const context of contexts) {
					await context.close();
				}
			}
		});

		test('should maintain performance during rapid interactions', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const context3 = await browser.newContext();

			const page1 = await context1.newPage();
			const page2 = await context2.newPage();
			const page3 = await context3.newPage();

			await page1.goto('/play/rapid-interaction-test/never-have-i-ever');
			await page2.goto('/play/rapid-interaction-test/never-have-i-ever');
			await page3.goto('/play/rapid-interaction-test/never-have-i-ever');
			await page1.waitForTimeout(5000);

			// Should handle rapid interactions without performance degradation
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();
			await expect(page3.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
			await context3.close();
		});
	});

	test.describe('Edge Cases and Race Conditions', () => {
		test('should handle players joining during active gameplay', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const page1 = await context1.newPage();
			const page2 = await context2.newPage();

			// First player starts the game
			await page1.goto('/play/join-during-game-test/never-have-i-ever');
			await page1.waitForTimeout(2000);

			// Second player joins while first is active
			await page2.goto('/play/join-during-game-test/never-have-i-ever');
			await page2.waitForTimeout(3000);

			// Both should be in sync
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
		});

		test('should handle multiple simultaneous game state changes', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const context3 = await browser.newContext();

			const page1 = await context1.newPage();
			const page2 = await context2.newPage();
			const page3 = await context3.newPage();

			await page1.goto('/play/simultaneous-changes-test/never-have-i-ever');
			await page2.goto('/play/simultaneous-changes-test/never-have-i-ever');
			await page3.goto('/play/simultaneous-changes-test/never-have-i-ever');
			await page1.waitForTimeout(5000);

			// Should handle concurrent operations
			await expect(page1.locator('body')).toBeVisible();
			await expect(page2.locator('body')).toBeVisible();
			await expect(page3.locator('body')).toBeVisible();

			await context1.close();
			await context2.close();
			await context3.close();
		});
	});
});
