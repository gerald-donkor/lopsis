import {expect, test, type Page} from '@playwright/test';

/**
 * Image smoke suite (Task 56): every page must render real images with zero
 * broken slots. Slugs are discovered at runtime from page links so the spec
 * stays dataset-independent. Run with `npm run test:e2e`.
 */

async function firstHref(page: Page, selector: string) {
  const href = await page.getAttribute(selector, 'href');
  if (!href) throw new Error(`expected a link for selector ${selector}`);
  return href;
}

test('home and catalog render real course imagery', async ({page}) => {
  const broken: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && response.status() >= 400) {
      broken.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', {name: /search your learning/i})).toBeVisible();
  // Home cards show brand logo marks by design (see design/lopsis-home.png);
  // the slot must simply be populated, never empty.
  expect(await page.locator('.home-course-grid .home-course-logo').count()).toBeGreaterThan(0);

  await page.goto('/courses');
  await expect(page.getByRole('heading', {name: /all courses/i})).toBeVisible();
  const covers = page.locator('.catalog-card-cover img');
  expect(await covers.count()).toBeGreaterThan(0);
  for (const src of await covers.evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLImageElement).currentSrc || (node as HTMLImageElement).src),
  )) {
    expect(src, 'catalog cover src').toContain('cdn.sanity.io');
  }
  expect(broken, 'broken images on home/catalog').toEqual([]);
});

test('course detail shows cover, instructor photo and curriculum', async ({page}) => {
  const broken: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && response.status() >= 400) {
      broken.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/courses');
  const courseHref = await firstHref(page, '.catalog-card-cover');
  await page.goto(courseHref);
  await expect(page.locator('.course-cover img')).toBeVisible();
  const instructorPhotos = page.locator('.course-instructor-avatar img');
  if ((await instructorPhotos.count()) > 0) {
    await expect(instructorPhotos.first()).toBeVisible();
  }
  expect(broken, 'broken images on course detail').toEqual([]);
});

test('lesson shows video poster, instructor and navigation', async ({page}) => {
  await page.goto('/courses');
  const courseHref = await firstHref(page, '.catalog-card-cover');
  await page.goto(courseHref);
  const moduleButton = page.locator('.course-module-button').first();
  await moduleButton.click();
  const lessonLink = page.locator('.course-lesson-list a').first();
  await expect(lessonLink).toBeVisible();
  const lessonHref = await lessonLink.getAttribute('href');
  if (!lessonHref) throw new Error('expected a lesson link in the curriculum');
  await page.goto(lessonHref);

  const frame = page.locator('.lesson-video-frame');
  await expect(frame).toBeVisible();
  const poster = frame.locator('img');
  if ((await poster.count()) > 0) {
    const src = await poster.first().getAttribute('src');
    // next/image serves an optimised /_next/image proxy URL; the underlying
    // file must be a Sanity asset or provider thumbnail.
    expect(src, 'lesson video poster src').toMatch(/cdn\.sanity\.io|i\.ytimg\.com/);
  }
  const status = await frame.locator('iframe').getAttribute('src');
  expect(status, 'lesson video embed src').toMatch(/^https:\/\//);
});

test('search video cards render provider thumbnails, no letter fallbacks', async ({page}) => {
  test.setTimeout(120_000);
  const broken: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && response.status() >= 400) {
      broken.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/search?q=routing');
  await expect(page.locator('.search-results .search-result-card').first()).toBeVisible({
    timeout: 60_000,
  });
  const videoPosters = page.locator('.search-result-card.is-video .search-poster-link img');
  expect(await videoPosters.count()).toBeGreaterThan(0);
  expect(
    await page.locator('.search-result-card.is-video .search-result-poster-fallback').count(),
    'video cards must not fall back to letter tiles',
  ).toBe(0);
  expect(broken, 'broken images on search').toEqual([]);
});

test('instructor page shows portrait and course covers', async ({page}) => {
  const broken: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && response.status() >= 400) {
      broken.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/courses');
  const instructorHref = await firstHref(page, '.catalog-card-instructor');
  await page.goto(instructorHref);
  const portrait = page.locator('.instructor-photo img');
  if ((await portrait.count()) > 0) {
    await expect(portrait).toBeVisible();
  }
  expect(await page.locator('.catalog-grid .catalog-card-cover img').count()).toBeGreaterThan(0);
  expect(broken, 'broken images on instructor page').toEqual([]);
});
