import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { MIDDLE_CLOSING_NOTICE } from '../lib/request-labels';
import { formatWeekRange } from '../lib/share';
import { E2E_EMAILS } from '../lib/e2e-fixtures';
import { runningMondayIso, targetMondayIso } from '@repo/weeks';

/**
 * The T9 end-to-end criterion: one full weekly cycle lands green. Kiki asks
 * for a Tuesday libur, Maya approves, drafts, validates and publishes, and the
 * staff read their own weeks through the shared link's page: Dila picks up the
 * automatic Tuesday middle with the dapur-tutup marker, Kiki sees her libur,
 * and the weekly totals come from the shift_type hours.
 */

const opened: BrowserContext[] = [];

// Same origin as baseURL in playwright.config.ts: a link path becomes a full
// href for the cold-visit goto and the landing URL check.
const ORIGIN = 'http://localhost:3210';

/**
 * Open the shared link (`path`) as one fixture account in a fresh context.
 * A cold visitor is first bounced to the login page carrying the link, the
 * step the staff take when they tap it in the WhatsApp message; the E2E-only
 * password route then plays the sign-in that returns them there.
 * One context per person: sessions must not leak between roles.
 */
async function loginTo(
  browser: Browser,
  email: string,
  path: string,
): Promise<Page> {
  const context = await browser.newContext();
  opened.push(context);
  const page = await context.newPage();
  const link = new URL(path, ORIGIN);

  await page.goto(link.pathname + link.search);
  await expect(page).toHaveURL(/\/login\?next=/);

  const href =
    '/auth/e2e-login?email=' +
    encodeURIComponent(email) +
    '&next=' +
    encodeURIComponent(link.pathname + link.search);
  await page.goto(href);
  await expect(page).toHaveURL(link.href);

  return page;
}

/** The section for one published week, found by its period heading. */
function weekSection(page: Page, monday: string) {
  return page.locator('section').filter({
    has: page.getByRole('heading', {
      name: `Minggu ${formatWeekRange(monday)}`,
    }),
  });
}

test.afterEach(async () => {
  await Promise.all(opened.splice(0).map((context) => context.close()));
});

test('full weekly cycle: request, approve, draft, validate, publish, staff view', async ({
  browser,
}) => {
  test.slow(); // five signed-in round-trips through the real stack

  const target = targetMondayIso();
  const running = runningMondayIso();

  // 1. Kiki requests Tuesday off in the open jendela request.
  const kikiRequest = await loginTo(
    browser,
    E2E_EMAILS.kitchenA,
    '/staff/request',
  );
  await kikiRequest
    .getByRole('button', { name: 'Selasa', exact: true })
    .click();
  await expect(kikiRequest.getByText('Request libur tersimpan.')).toBeVisible();

  // 2. Maya sees it on the dashboard and approves. The decide control
  // unmounts once the row is decided, so the outcome text is the proof.
  const maya = await loginTo(browser, E2E_EMAILS.manager, '/manager/dashboard');
  await expect(maya.getByText('Libur Selasa')).toBeVisible();
  await maya.getByRole('button', { name: 'Setujui' }).click();
  await expect(maya.getByText('Disetujui', { exact: true })).toBeVisible();

  // 3. Draft from last week; coverage validates with warnings, never blocks.
  await maya.goto('/manager/draft');
  await expect(
    maya.getByRole('heading', { name: 'Susun jadwal' }),
  ).toBeVisible();
  await maya
    .getByRole('button', { name: 'Buat draft dari minggu lalu' })
    .click();
  await expect(maya.getByText('Draft dibuat dari minggu lalu.')).toBeVisible();
  await expect(
    maya.getByRole('heading', { name: 'Validasi coverage' }),
  ).toBeVisible();
  // One bar staff across the busy days is deliberately short-staffed.
  await expect(maya.getByText(/belum ada yang masuk/).first()).toBeVisible();

  // 4. Publish opens the week to staff.
  await maya.getByRole('button', { name: 'Publish jadwal' }).click();
  await expect(maya.getByText(/Sudah dipublish/).first()).toBeVisible();

  // 5. Dila, the lone kitchen worker on Tuesday, gets the automatic middle.
  const dila = await loginTo(browser, E2E_EMAILS.kitchenB, '/staff/schedule');
  await expect(dila.getByRole('heading', { level: 2 })).toHaveCount(2);
  const dilaTarget = weekSection(dila, target);
  await expect(dilaTarget.getByText('Middle, 11.00–19.00')).toBeVisible();
  await expect(dilaTarget.getByText(MIDDLE_CLOSING_NOTICE)).toBeVisible();
  await expect(dilaTarget.getByText('Total jam kerja: 56 jam')).toBeVisible();
  await expect(
    weekSection(dila, running).getByText('Total jam kerja: 56 jam'),
  ).toBeVisible();

  // 6. Kiki sees her libur and the shorter week; her peer's middle is not on
  // her screen, because the api only ever sends her own placements.
  const kiki = await loginTo(browser, E2E_EMAILS.kitchenA, '/staff/schedule');
  const kikiTarget = weekSection(kiki, target);
  await expect(kikiTarget.getByText('Libur', { exact: true })).toBeVisible();
  await expect(kikiTarget.getByText('Middle, 11.00–19.00')).toHaveCount(0);
  await expect(kikiTarget.getByText('Total jam kerja: 48 jam')).toBeVisible();
  await expect(
    weekSection(kiki, running).getByText('Total jam kerja: 56 jam'),
  ).toBeVisible();

  // 7. Rian (bar) never gets the kitchen marker on any day.
  const rian = await loginTo(browser, E2E_EMAILS.bar, '/staff/schedule');
  await expect(rian.getByText('Dapur tutup')).toHaveCount(0);
  await expect(
    weekSection(rian, target).getByText('Total jam kerja: 56 jam'),
  ).toBeVisible();
});
