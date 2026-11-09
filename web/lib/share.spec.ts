import { describe, expect, it } from 'vitest';
import { formatWeekRange, scheduleShareText, whatsappShareHref } from './share';

const link = 'https://kyne.test/staff/schedule';
const nextWindow = {
  weekStartDate: '2026-11-16',
  requestDeadline: '2026-11-15T04:00:00.000Z',
};

describe('schedule share text (F6)', () => {
  it('names the period, the link, and the request deadline', () => {
    const message = scheduleShareText('2026-11-09', nextWindow, link);

    expect(message).toContain(
      'Jadwal Kyne 9 sampai 15 November 2026 sudah terbit.',
    );
    expect(message).toContain(`Lihat jadwalmu: ${link}`);
    expect(message).toContain(
      'Request libur dan shift untuk minggu 16 November 2026 paling lambat Minggu, 15 November 2026 pukul 12.00 WITA.',
    );
  });

  it('spells out both months when the week crosses one', () => {
    expect(formatWeekRange('2026-11-30')).toBe(
      '30 November sampai 6 Desember 2026',
    );
  });

  it('opens WhatsApp with the message already filled', () => {
    const href = whatsappShareHref('2026-11-09', nextWindow, link);

    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(href.slice('https://wa.me/?text='.length))).toBe(
      scheduleShareText('2026-11-09', nextWindow, link),
    );
  });
});
