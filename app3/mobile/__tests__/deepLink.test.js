import { parseAppUrl } from '../src/lib/deepLink';

describe('paywall deep link', () => {
  it('opens Paywall from beenages://paywall', () => {
    expect(parseAppUrl('beenages://paywall')).toEqual({ name: 'Paywall' });
    expect(parseAppUrl('beenages://paywall/')).toEqual({ name: 'Paywall' });
    expect(parseAppUrl('https://example.com')).toBeNull();
    expect(parseAppUrl(null)).toBeNull();
  });
});
