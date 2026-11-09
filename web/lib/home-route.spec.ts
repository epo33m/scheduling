import { describe, expect, it } from 'vitest';
import { homeRouteForRole } from './home-route';

describe('homeRouteForRole', () => {
  it('sends a manager to the dashboard', () => {
    expect(homeRouteForRole('manager')).toBe('/manager/dashboard');
  });

  it('sends staff to their own schedule', () => {
    expect(homeRouteForRole('staff')).toBe('/staff/schedule');
  });
});
