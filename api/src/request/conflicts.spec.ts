import { detectConflicts } from './conflicts';

// Dates are YYYY-MM-DD in a known week: 2026-11-09 is a Senin, so 2026-11-13
// is Jumat, 2026-11-14 Sabtu, and 2026-11-10 Selasa.
const BAR4 = { bar: 4, kitchen: 2 };

describe('detectConflicts', () => {
  it('flags 3 bar staff requesting PAGI on Sabtu: the SORE slot needs both of the remaining 2', () => {
    const conflicts = detectConflicts({
      offRequests: [],
      shiftRequests: [
        { id: 'a', position: 'bar', tanggal: '2026-11-14', shiftCode: 'PAGI', status: 'pending' },
        { id: 'b', position: 'bar', tanggal: '2026-11-14', shiftCode: 'PAGI', status: 'pending' },
        { id: 'c', position: 'bar', tanggal: '2026-11-14', shiftCode: 'PAGI', status: 'pending' },
      ],
      staffByPosition: BAR4,
    });

    expect(conflicts.shiftRequestIds.sort()).toEqual(['a', 'b', 'c']);
    expect(conflicts.offRequestIds).toEqual([]);
  });

  it('flags two kitchen staff requesting the same Selasa off, and stays quiet once one is rejected', () => {
    const input = {
      offRequests: [
        { id: 'k1', position: 'kitchen' as const, tanggal: '2026-11-10', status: 'pending' as const },
        { id: 'k2', position: 'kitchen' as const, tanggal: '2026-11-10', status: 'pending' as const },
      ],
      shiftRequests: [],
      staffByPosition: BAR4,
    };

    expect(detectConflicts(input).offRequestIds.sort()).toEqual(['k1', 'k2']);

    expect(
      detectConflicts({
        ...input,
        offRequests: [
          input.offRequests[0]!,
          { ...input.offRequests[1]!, status: 'rejected' as const },
        ],
      }).offRequestIds,
    ).toEqual([]);
  });

  it('leaves 2 bar staff requesting PAGI on Senin alone: Senin bar splits 3+1 at worst', () => {
    const conflicts = detectConflicts({
      offRequests: [],
      shiftRequests: [
        { id: 'a', position: 'bar', tanggal: '2026-11-09', shiftCode: 'PAGI', status: 'pending' },
        { id: 'b', position: 'bar', tanggal: '2026-11-09', shiftCode: 'PAGI', status: 'pending' },
      ],
      staffByPosition: BAR4,
    });
    expect(conflicts.shiftRequestIds).toEqual([]);
  });

  it('shrinks the slots once a Kamis libur is approved: 3 remaining PAGI picks would empty SORE', () => {
    const conflicts = detectConflicts({
      offRequests: [
        { id: 'o1', position: 'bar', tanggal: '2026-11-12', status: 'approved' },
      ],
      shiftRequests: [
        { id: 'a', position: 'bar', tanggal: '2026-11-12', shiftCode: 'PAGI', status: 'pending' },
        { id: 'b', position: 'bar', tanggal: '2026-11-12', shiftCode: 'PAGI', status: 'pending' },
        { id: 'c', position: 'bar', tanggal: '2026-11-12', shiftCode: 'PAGI', status: 'pending' },
      ],
      staffByPosition: BAR4,
    });
    expect(conflicts.shiftRequestIds.sort()).toEqual(['a', 'b', 'c']);
  });

  it('flags both kitchen staff wanting the same Selasa shift: SORE would be left empty', () => {
    const conflicts = detectConflicts({
      offRequests: [],
      shiftRequests: [
        { id: 'k1', position: 'kitchen', tanggal: '2026-11-10', shiftCode: 'PAGI', status: 'pending' },
        { id: 'k2', position: 'kitchen', tanggal: '2026-11-10', shiftCode: 'PAGI', status: 'pending' },
      ],
      staffByPosition: BAR4,
    });
    expect(conflicts.shiftRequestIds.sort()).toEqual(['k1', 'k2']);
  });

  it('quietly skips the last kitchen worker on a Kamis: they become MIDDLE and the request gugur anyway', () => {
    const conflicts = detectConflicts({
      offRequests: [
        { id: 'o1', position: 'kitchen', tanggal: '2026-11-12', status: 'approved' },
      ],
      shiftRequests: [
        { id: 'k1', position: 'kitchen', tanggal: '2026-11-12', shiftCode: 'PAGI', status: 'pending' },
      ],
      staffByPosition: BAR4,
    });
    expect(conflicts.shiftRequestIds).toEqual([]);
  });
});
