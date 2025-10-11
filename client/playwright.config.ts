import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './tests',
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Different retry strategies for different test types */
	retries: process.env.CI ? 2 : 1,
	/* Use multiple workers for speed */
	workers: process.env.CI ? 3 : 12,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: 'list',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: process.env.BASE_URL || 'http://localhost:5173',

		/* Reduce action timeout for faster tests */
		actionTimeout: 5000,

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',

		/* Take screenshot on failure */
		screenshot: 'only-on-failure'
	},

	/* Configure projects for major browsers */
	projects: process.env.CI
		? [
			{
				name: 'chromium',
				use: {
					...devices['Desktop Chrome'],
					navigationTimeout: 5000
				}
			},
		// 	{
		// 		name: 'firefox',
		// 		use: {
		// 			...devices['Desktop Firefox'],
		// 			navigationTimeout: 10000
		// 		}
		// 	},
		// 	{
		// 		name: 'webkit',
		// 		use: {
		// 			...devices['Desktop Safari'],
		// 			navigationTimeout: 10000
		// 		}
		// 	}
		]
		: [
			{
				name: 'chromium',
				use: {
					...devices['Desktop Chrome'],
					/* Reduce navigation timeout */
					navigationTimeout: 10000
				}
			}
		],

	/* Run your local dev server before starting the tests */
	webServer: [
		{
			command: process.env.CI
				? 'cd ../server && GAME_DATA_DIR=./assets/games/ VALKEY_URI=valkey://localhost:6379 bun run dev'
				: 'cd ../server && bun run dev',
			url: 'http://localhost:3000',
			reuseExistingServer: !process.env.CI,
			timeout: 120000
		},
		{
			command: 'npm run dev',
			url: 'http://localhost:5173',
			reuseExistingServer: !process.env.CI,
			timeout: 120000
		}
	]
});
