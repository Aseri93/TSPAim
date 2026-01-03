import { defineConfig, devices } from '@playwright/test';

/**
 * TSPAim E2E Testing Configuration
 * Tests behavior at multiple resolutions to catch viewport-related regressions
 */
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    /* Test across multiple viewports */
    projects: [
        {
            name: 'Desktop 4K',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 3840, height: 2160 },
            },
        },
        {
            name: 'Desktop 1440p',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 2560, height: 1440 },
            },
        },
        {
            name: 'Desktop 1080p',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
            },
        },
        {
            name: 'Desktop 720p',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 },
            },
        },
        {
            name: 'Small Desktop',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 800, height: 600 },
            },
        },
        {
            name: 'Mobile',
            use: {
                ...devices['iPhone 13'],
            },
        },
    ],

    /* Run dev server before tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
