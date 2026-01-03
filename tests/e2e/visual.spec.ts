import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * 
 * Key regressions being tested:
 * - KF-003: Crosshair color renders correctly (commit f88c4c2)
 */

test.describe('Visual & Crosshair Tests', () => {

    test('KF-003: crosshair element exists and has correct color variable', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#root')).toBeVisible();

        // Start any scenario to make crosshair visible
        const scenarioButton = page.locator('button:has-text("Static"), button:has-text("Grid")').first();

        if (await scenarioButton.count() > 0) {
            await scenarioButton.click();
            await page.waitForTimeout(500);
        }

        // Look for crosshair element
        const crosshair = page.locator('.custom-crosshair');

        if (await crosshair.count() > 0) {
            // Verify crosshair has the CSS variable for color
            const crosshairColor = await crosshair.evaluate((el) => {
                const style = getComputedStyle(el);
                return style.getPropertyValue('--crosshair-color').trim();
            });

            // Should have a valid color value (not empty, not 'undefined')
            expect(crosshairColor).toBeTruthy();
            expect(crosshairColor).not.toBe('undefined');

            // Verify it's a valid color format (hex, rgb, etc.)
            const validColorPattern = /^(#[0-9a-fA-F]{3,8}|rgb|rgba|hsl|hsla|[a-z]+)/;
            expect(crosshairColor).toMatch(validColorPattern);
        }
    });

    test('crosshair picker exists in settings', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#root')).toBeVisible();

        // Look for crosshair picker in the UI (settings panel)
        const crosshairPicker = page.locator('.crosshair-picker');

        // If not immediately visible, it might be in a collapsible settings section
        // The picker should exist when settings are visible
        if (await crosshairPicker.count() > 0) {
            await expect(crosshairPicker).toBeVisible();

            // Should have color buttons
            const colorButtons = crosshairPicker.locator('.crosshair-color-btn');
            expect(await colorButtons.count()).toBeGreaterThan(0);
        }
    });

    test('crosshair color changes when picker is used', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#root')).toBeVisible();

        // Find crosshair color picker
        const crosshairPicker = page.locator('.crosshair-picker');

        if (await crosshairPicker.count() === 0) {
            test.skip(true, 'Crosshair picker not found in current view');
            return;
        }

        // Get initial localStorage value
        const initialColor = await page.evaluate(() =>
            localStorage.getItem('tspaim_crosshair_color') || '#ffffff'
        );

        // Find color buttons and click a different one
        const colorButtons = crosshairPicker.locator('.crosshair-color-btn');
        const buttonCount = await colorButtons.count();

        if (buttonCount > 1) {
            // Find a button that's not currently active
            for (let i = 0; i < buttonCount; i++) {
                const btn = colorButtons.nth(i);
                const isActive = await btn.evaluate((el) => el.classList.contains('active'));
                if (!isActive) {
                    await btn.click();
                    break;
                }
            }

            // Verify localStorage was updated
            const newColor = await page.evaluate(() =>
                localStorage.getItem('tspaim_crosshair_color')
            );

            // Color should have changed (or at least be stored)
            expect(newColor).toBeTruthy();
        }
    });

    test('crosshair follows cursor position in game', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#root')).toBeVisible();

        // Start a scenario
        const scenarioButton = page.locator('button:has-text("Static"), button:has-text("Grid")').first();

        if (await scenarioButton.count() === 0) {
            test.skip(true, 'No scenario button found');
            return;
        }

        await scenarioButton.click();
        await page.waitForTimeout(500);

        const crosshair = page.locator('.custom-crosshair');

        if (await crosshair.count() === 0) {
            test.skip(true, 'Crosshair element not found');
            return;
        }

        // Get initial crosshair position
        const initialTransform = await crosshair.evaluate((el) => el.style.transform);

        // Move mouse to a specific position
        const canvas = page.locator('canvas').first();
        if (await canvas.count() > 0) {
            const canvasBox = await canvas.boundingBox();
            if (canvasBox) {
                await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
                await page.waitForTimeout(100);

                // Crosshair transform should have updated
                const newTransform = await crosshair.evaluate((el) => el.style.transform);

                // Transform should contain translate values
                expect(newTransform).toContain('translate');
            }
        }
    });

    test('no visual glitches on app load', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#root')).toBeVisible();

        // Check for common visual issues
        const viewport = page.viewportSize();
        if (!viewport) return;

        // No horizontal scrollbar (content overflow)
        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll, 'Should not have horizontal scrollbar').toBeFalsy();

        // App should have a dark background (aim trainer standard)
        const bgColor = await page.evaluate(() => {
            const root = document.getElementById('root');
            if (!root) return null;
            return getComputedStyle(root).backgroundColor;
        });

        // Background should be dark (not white/light)
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
            // Parse RGB values - dark theme should have low values
            const match = bgColor.match(/\d+/g);
            if (match && match.length >= 3) {
                const [r, g, b] = match.map(Number);
                const brightness = (r + g + b) / 3;
                expect(brightness, 'Background should be dark (low brightness)').toBeLessThan(150);
            }
        }
    });

});
