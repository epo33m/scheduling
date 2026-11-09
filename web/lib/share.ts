import type { OpenWindow } from '@repo/types';

const WITA = 'Asia/Makassar';
const DAY_MS = 86_400_000;

/** "16 November 2026" for a `YYYY-MM-DD` day. */
export function formatDayMonth(tanggal: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${tanggal}T00:00:00.000Z`));
}

/** "Senin, 9 November 2026, 19.04 WITA" for a stored instant. */
export function formatInstant(instant: string): string {
  const stamped = new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));

  return `${stamped} WITA`;
}

/** "16 sampai 22 November 2026" for the seven days a week covers. */
export function formatWeekRange(monday: string): string {
  const start = new Date(`${monday}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const day = (date: Date) =>
    new Intl.DateTimeFormat('id-ID', { timeZone: WITA, day: 'numeric' }).format(
      date,
    );
  const month = (date: Date) =>
    new Intl.DateTimeFormat('id-ID', { timeZone: WITA, month: 'long' }).format(
      date,
    );
  const year = end.getUTCFullYear();

  return month(start) === month(end)
    ? `${day(start)} sampai ${day(end)} ${month(end)} ${year}`
    : `${day(start)} ${month(start)} sampai ${day(end)} ${month(end)} ${year}`;
}

/**
 * The message the manager forwards to the WhatsApp group (F6): the period the
 * published week covers, the link to the staff screen, and the deadline of the
 * request window the publish just opened. Plain text, because that is what
 * WhatsApp sends.
 */
export function scheduleShareText(
  weekStartDate: string,
  nextWindow: OpenWindow,
  scheduleLink: string,
): string {
  return [
    `Jadwal Kyne ${formatWeekRange(weekStartDate)} sudah terbit.`,
    `Lihat jadwalmu: ${scheduleLink}`,
    `Request libur dan shift untuk minggu ${formatDayMonth(nextWindow.weekStartDate)} paling lambat ${formatInstant(nextWindow.requestDeadline)}.`,
  ].join('\n');
}

/** The same message as a WhatsApp share link, ready to open with the text filled. */
export function whatsappShareHref(
  weekStartDate: string,
  nextWindow: OpenWindow,
  scheduleLink: string,
): string {
  const message = scheduleShareText(weekStartDate, nextWindow, scheduleLink);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
