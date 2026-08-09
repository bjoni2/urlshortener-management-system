import { Pipe, PipeTransform } from '@angular/core';

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | null | undefined, fallback = 'Never'): string {
    if (!value) {
      return fallback;
    }

    const target = new Date(value).getTime();
    if (Number.isNaN(target)) {
      return fallback;
    }

    const deltaMs = target - Date.now();
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

    for (const [unit, ms] of UNITS) {
      if (Math.abs(deltaMs) >= ms) {
        return formatter.format(Math.round(deltaMs / ms), unit);
      }
    }
    return formatter.format(Math.round(deltaMs / 1000), 'second');
  }
}
