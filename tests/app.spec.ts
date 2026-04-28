import { test, expect } from '@playwright/test';

test.describe('EdgeFinder App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5174');
  });

  test('app loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('EdgeFinder');
  });

  test('sidebar navigation shows Assistant and Research', async ({ page }) => {
    const assistantLink = page.getByText('Assistant', { exact: false }).first();
    const researchLink = page.getByText('Research', { exact: false }).first();
    
    await expect(assistantLink).toBeVisible();
    await expect(researchLink).toBeVisible();
  });

  test('Assistant view loads Edge Dashboard', async ({ page }) => {
    await page.getByText('Assistant').first().click();
    await page.waitForTimeout(3000);
    
    await expect(page.getByRole('heading', { name: 'Edge Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Top opportunities')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Watch').first()).toBeVisible({ timeout: 10000 });
  });

  test('Research view loads Research Hub', async ({ page }) => {
    await page.getByText('Research').first().click();
    await page.waitForTimeout(3000);
    
    await expect(page.getByText('Research Hub')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Leagues', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Teams', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('fixtures are displayed in the sidebar', async ({ page }) => {
    await page.getByText('Assistant').first().click();
    await page.waitForTimeout(3000);
    
    const fixtureList = page.locator('[class*="fixture"], [class*="Fixture"]').first();
    await expect(fixtureList).toBeVisible({ timeout: 10000 });
  });

  test('navigation updates URL state', async ({ page }) => {
    await page.getByText('Assistant').first().click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/view=assistant/);

    await page.getByText('Research').first().click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/view=research/);
  });
});
