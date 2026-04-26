import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const API_BASE_URL = process.env.PUBLIC_API_URL || 'http://localhost:3000/';

async function createPlayerContext(browser: Browser, name: string, playerId: string): Promise<BrowserContext> {
	const context = await browser.newContext();
	await context.addInitScript(
		({ seededName, seededId }) => {
			localStorage.setItem('player_name', seededName);
			localStorage.setItem('player_id', seededId);
			localStorage.setItem('settings', JSON.stringify({ no_tutorials: true }));
		},
		{ seededName: name, seededId: playerId }
	);
	return context;
}

async function setRoomPassword(page: Page, gameId: string, password: string) {
	await expect
		.poll(async () => {
			const response = await page.request.get(`${API_BASE_URL}api/game?id=${gameId}`);
			return response.ok();
		}, { timeout: 10000 })
		.toBe(true);

	await expect(page.getByText('Room password')).toBeVisible();
	await page.getByPlaceholder('Set a password').fill(password);
	await page.getByRole('button', { name: 'Set password' }).click();
	await expect
		.poll(async () => {
			const response = await page.request.get(`${API_BASE_URL}api/game?id=${gameId}`);
			if (!response.ok()) {
				return false;
			}

			const game = (await response.json()) as { passwordProtected?: boolean };
			return game.passwordProtected === true;
		}, { timeout: 10000 })
		.toBe(true);
}

test.describe('Room password protection', () => {
	test('requires the correct password before a second player can join a protected room', async ({ browser }) => {
		const gameId = `pw-${Date.now()}`;
		const hostContext = await createPlayerContext(browser, 'Host', `host-${gameId}`);
		const guestContext = await createPlayerContext(browser, 'Guest', `guest-${gameId}`);

		const hostPage = await hostContext.newPage();
		const guestPage = await guestContext.newPage();

		try {
			await hostPage.goto(`/play/${gameId}/never-have-i-ever`);
			await expect(hostPage.getByText('Connected')).toBeVisible({ timeout: 15000 });
			await setRoomPassword(hostPage, gameId, 'secret123');

			await guestPage.goto(`/play/${gameId}/never-have-i-ever`);
			await expect(guestPage.getByRole('heading', { name: 'Enter room password' })).toBeVisible();

			await guestPage.getByLabel('Password').fill('secret123');
			await guestPage.getByRole('button', { name: 'Join game' }).click();

			await expect(guestPage.getByText('Connected')).toBeVisible({ timeout: 15000 });
			await expect(hostPage.getByText('(2)')).toBeVisible({ timeout: 15000 });
		} finally {
			await hostContext.close();
			await guestContext.close();
		}
	});
});