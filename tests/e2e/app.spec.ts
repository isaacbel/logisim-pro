import { test, expect } from '@playwright/test';

test.describe('Logisim Pro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display toolbar', async ({ page }) => {
    await expect(page.getByTitle('Select (S)')).toBeVisible();
  });

  test('should display sidebar with components', async ({ page }) => {
    await expect(page.getByTestId('component-sidebar')).toBeVisible();
    await expect(page.getByTestId('component-sidebar').getByText('Gates')).toBeVisible();
    await expect(page.getByTestId('component-sidebar').getByText('Inputs')).toBeVisible();
  });

  test('should display canvas', async ({ page }) => {
    const canvas = page.getByTestId('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should display status bar', async ({ page }) => {
    await expect(page.locator('text=Ready')).toBeVisible();
  });
});
