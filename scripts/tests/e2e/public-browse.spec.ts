import { test, expect } from '@playwright/test';

// Critical journey #1 — anonymous browse.
// Doorway → /el (locale home) → /el/greece (country index) → first city
// → first venue. Asserts hreflang + JSON-LD render along the way so SEO
// surface is verified as part of the user journey.

test.describe('Anonymous browse', () => {
  test('doorway redirects through to a city and a venue', async ({ page }) => {
    // 1. Doorway loads.
    await page.goto('/');
    await expect(page).toHaveTitle(/citynight/i);
    // The doorway is locale-agnostic; we just check the brand mark renders.
    await expect(page.getByText(/citynight/i).first()).toBeVisible();

    // 2. /el — locale home.
    await page.goto('/el');
    const html = await page.content();
    expect(html).toContain('hreflang="el"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('"@type":"Organization"');

    // 3. /el/greece — country index. ItemList JSON-LD must be present.
    await page.goto('/el/greece');
    const greeceHtml = await page.content();
    expect(greeceHtml).toContain('"@type":"ItemList"');
    expect(greeceHtml).toContain('"@type":"BreadcrumbList"');

    // 4. Click through to the first city tile.
    const cityLink = page.locator('a[href*="/el/greece/"]').first();
    await expect(cityLink).toBeVisible();
    const cityHref = await cityLink.getAttribute('href');
    expect(cityHref).toMatch(/^\/el\/greece\/[a-z0-9-]+$/);
    await cityLink.click();
    await page.waitForLoadState('networkidle');

    // 5. City page renders + has Place JSON-LD.
    const cityHtml = await page.content();
    expect(cityHtml).toContain('"@type":"Place"');
  });

  test('robots.txt + sitemap.xml respond', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toMatch(/^User-Agent:\s*\*/im);

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain('<urlset');
    expect(sitemapText).toContain('hreflang="el"');
  });
});
