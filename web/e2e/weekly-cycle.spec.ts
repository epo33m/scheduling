import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { MIDDLE_CLOSING_NOTICE, targetWeekDays } from '../lib/request-labels';
import { formatWeekRange } from '../lib/share';
import { E2E_EMAILS } from '../lib/e2e-fixtures';
import {
  runningMondayIso,
  targetMondayIso,
  witaCalendarDate,
} from '@repo/weeks';

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

/**
 * "Senin, 9 November 2026" for a week's Monday — the shape the draft screen's
 * week bar prints. The day cells spell only the weekday ("Senin"), and those
 * come from `targetWeekDays` in the app itself, so the spec reads them there
 * rather than formatting a second copy.
 */
function weekLabel(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${iso}T00:00:00.000Z`));
}

/**
 * One staff member's card inside a tab panel. The day labels repeat across the
 * cards, so an edit has to be aimed at one person's row. `hasText` rather than
 * a `has` locator: the inner locator of `has` is re-rooted inside each
 * candidate `li`, so a chain that starts at the panel could never match.
 */
function staffCard(panel: Locator, name: string): Locator {
  return panel.getByRole('listitem').filter({ hasText: name });
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

/**
 * The issue #20 criterion (ADR 0005): after Monday the manager still reaches
 * the minggu the staff are living through, edits today and onward, keeps the
 * WhatsApp share link, and cannot rewrite a day already past. The running week
 * is the published fixture, so the lock is the only thing standing between the
 * manager's click and a schedule staff already worked by.
 */
test('minggu berjalan toggle: reach, edit and share the running week', async ({
  browser,
}) => {
  test.slow();

  const running = runningMondayIso();
  const today = witaCalendarDate(new Date());
  const maya = await loginTo(browser, E2E_EMAILS.manager, '/manager/draft');

  const runningTab = maya.getByRole('tab', { name: 'Minggu berjalan' });
  const targetTab = maya.getByRole('tab', { name: 'Minggu target' });

  // 1. The screen lands on the minggu target, and only that one panel is in
  // the DOM: the toggle swaps panels rather than hiding them, so every label
  // has exactly one match.
  await expect(targetTab).toHaveAttribute('aria-selected', 'true');
  await expect(runningTab).toHaveAttribute('aria-selected', 'false');
  await expect(maya.getByRole('tabpanel')).toHaveCount(1);
  await expect(
    maya.getByRole('button', { name: 'Buat draft dari minggu lalu' }),
  ).toBeVisible();

  // 2. Switching to the running week swaps the whole panel. The generate
  // button belongs to the target tab only (ADR 0005), so its disappearance is
  // the proof the swap actually happened.
  await runningTab.click();
  await expect(maya.getByRole('tabpanel')).toHaveCount(1);
  await expect(
    maya.getByRole('button', { name: 'Buat draft dari minggu lalu' }),
  ).toHaveCount(0);

  const runningPanel = maya.getByRole('tabpanel', { name: 'Minggu berjalan' });
  await expect(
    runningPanel.getByText(weekLabel(running), { exact: true }),
  ).toBeVisible();

  // 3. The share link survives the Monday: the running week was published, so
  // the panel carries its outcome and the WhatsApp message, not a publish press.
  await expect(runningPanel.getByText(/Sudah dipublish/)).toBeVisible();
  await expect(
    runningPanel.getByRole('button', { name: 'Publish jadwal' }),
  ).toHaveCount(0);
  await expect(
    runningPanel.getByRole('link', { name: 'Bagikan ke WhatsApp' }),
  ).toBeVisible();

  // 4. Every day before today (WITA) is read-only and says why in words; today
  // and the days ahead stay editable. Walked across the whole week so the rule
  // holds whichever day the suite happens to run on.
  const dila = staffCard(runningPanel, 'Dila');

  for (const day of targetWeekDays(running)) {
    const select = dila.getByLabel(day.name);

    if (day.tanggal < today) {
      await expect(select, `${day.tanggal} is past`).toBeDisabled();
      // Each past day carries its own notice, so the count is the proof.
      await expect(
        dila.getByText('Sudah lewat'),
        `${day.tanggal} explains its lock`,
      ).not.toHaveCount(0);
    } else {
      await expect(select, `${day.tanggal} is live`).toBeEnabled();
    }
  }

  // 5. A live day of the running week saves like any other draft cell: the
  // lock stops at the past, it does not freeze the whole week.
  const liveDay =
    targetWeekDays(running).find((day) => day.tanggal >= today) ??
    targetWeekDays(running)[0];
  const liveSelect = dila.getByLabel(liveDay.name);
  const picked = (await liveSelect.inputValue()) === 'SORE' ? 'PAGI' : 'SORE';
  await liveSelect.selectOption({ value: picked });
  await expect(dila.getByText('Tersimpan.')).toBeVisible();

  // 6. The tab row is a keyboard-operable tablist: arrow keys move focus and
  // the selection follows focus, and the row wraps at its ends.
  await runningTab.focus();
  await runningTab.press('ArrowRight');
  await expect(targetTab).toBeFocused();
  await expect(targetTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    maya.getByRole('button', { name: 'Buat draft dari minggu lalu' }),
  ).toBeVisible();

  await targetTab.press('ArrowRight');
  await expect(runningTab).toBeFocused();
  await expect(runningTab).toHaveAttribute('aria-selected', 'true');
});
