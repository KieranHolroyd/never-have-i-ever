import { test as base, expect, Page } from '@playwright/test';

/**
 * Enhanced test setup with proper isolation and mocking
 */
export const test = base.extend<{
  mockWebSocket: void;
  mockAPI: void;
  cleanState: void;
}>({
  // Clean browser state before each test
  cleanState: [async ({ page }, use) => {
    // Clear localStorage and sessionStorage
    await page.context().addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear any existing cookies
    await page.context().clearCookies();

    await use();
  }, { scope: 'test', auto: true }],

  // Mock WebSocket connections for unit tests
  mockWebSocket: [async ({ page }, use) => {
    await page.addInitScript(() => {
      // Mock WebSocket for testing
      const OriginalWebSocket = window.WebSocket;

      window.WebSocket = class MockWebSocket extends EventTarget {
        url: string;
        readyState = 1; // OPEN
        CONNECTING = 0;
        OPEN = 1;
        CLOSING = 2;
        CLOSED = 3;

        constructor(url: string) {
          super();
          this.url = url;

          // Simulate connection
          setTimeout(() => {
            this.dispatchEvent(new Event('open'));
          }, 10);
        }

        send(data: string) {
          // Mock send - could trigger mock responses
          console.log('[MockWS] Sent:', data);
        }

        close() {
          this.readyState = this.CLOSED;
          this.dispatchEvent(new Event('close'));
        }
      } as any;
    });

    await use();
  }, { scope: 'test' }],

  // Mock API calls for unit tests
  mockAPI: [async ({ page }, use) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/game')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-game',
            players: [],
            phase: 'waiting',
            currentQuestion: null,
            categories: ['test-category']
          })
        });
      } else if (url.includes('/api/categories')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'test-cat-1', name: 'Test Category 1', questions: [] },
            { id: 'test-cat-2', name: 'Test Category 2', questions: [] }
          ])
        });
      } else if (url.includes('/api/cah-packs')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'test-pack-1',
              name: 'Test Pack',
              blackCards: 10,
              whiteCards: 20,
              isOfficial: false,
              isNSFW: false
            }
          ])
        });
      } else {
        await route.continue();
      }
    });

    await use();
  }, { scope: 'test' }]
});

/**
 * Test utilities for common operations
 */
export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for component to be ready (not loading)
   */
  async waitForReady(selector: string = '[data-testid="app-ready"]') {
    await this.page.waitForSelector(selector, { timeout: 10000 });
  }

  /**
   * Mock a successful WebSocket connection
   */
  async mockSuccessfulConnection() {
    await this.page.evaluate(() => {
      // Trigger connection success in components that listen for it
      window.dispatchEvent(new CustomEvent('ws-connected'));
    });
  }

  /**
   * Simulate WebSocket message
   */
  async simulateWSMessage(type: string, data: any) {
    await this.page.evaluate(({ type, data }) => {
      window.dispatchEvent(new CustomEvent('ws-message', {
        detail: { type, data }
      }));
    }, { type, data });
  }

  /**
   * Wait for specific UI state
   */
  async waitForUIState(state: string, timeout = 5000) {
    await this.page.waitForFunction(
      (state) => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes(state);
      },
      state,
      { timeout }
    );
  }

  /**
   * Take a screenshot with descriptive name
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/debug-${name}-${Date.now()}.png`
    });
  }
}

/**
 * Create test utils instance
 */
export const createTestUtils = (page: Page) => new TestUtils(page);

// Re-export expect for convenience
export { expect };
