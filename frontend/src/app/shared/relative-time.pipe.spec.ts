import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  const pipe = new RelativeTimePipe();

  function inDays(days: number): string {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  it('describes a future instant', () => {
    expect(pipe.transform(inDays(3))).toBe('in 3 days');
  });

  it('describes a past instant', () => {
    expect(pipe.transform(inDays(-2))).toBe('2 days ago');
  });

  it('picks the largest unit that fits', () => {
    expect(pipe.transform(inDays(400))).toContain('year');
    expect(pipe.transform(inDays(60))).toContain('month');
    expect(pipe.transform(new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString())).toContain('hour');
    expect(pipe.transform(new Date(Date.now() + 5 * 60 * 1000).toISOString())).toContain('minute');
    expect(pipe.transform(new Date(Date.now() + 10 * 1000).toISOString())).toContain('second');
  });

  it('shows the fallback for a link with no expiry rather than an empty cell', () => {
    expect(pipe.transform(null)).toBe('Never');
    expect(pipe.transform(undefined)).toBe('Never');
    expect(pipe.transform('')).toBe('Never');
    expect(pipe.transform(null, 'Not yet')).toBe('Not yet');
  });

  it('does not render "Invalid Date" for an unparseable value', () => {
    expect(pipe.transform('not-a-date')).toBe('Never');
  });
});
