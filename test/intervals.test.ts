
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Generate valid intervals
const interval: fc.Arbitrary<Interval> = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 }))
  .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as Interval);

const intervalList = fc.array(interval);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. The output is sorted and has no overlapping or touching intervals.
  it('output intervals are sorted and disjoint', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);

        for (let i = 0; i < out.length; i++) {
          expect(out[i][0]).toBeLessThanOrEqual(out[i][1]);

          if (i > 0) {
            expect(out[i - 1][0]).toBeLessThanOrEqual(out[i][0]);
            expect(out[i - 1][1]).toBeLessThan(out[i][0]);
          }
        }
      }),
    );
  });

  // Pattern: differential. The input and output cover exactly the same points.
  it('input and output cover the same points', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);

        const covered = (intervals: Interval[], point: number) =>
          intervals.some(([start, end]) => start <= point && point <= end);

        for (let point = -20; point <= 20; point += 0.5) {
          expect(covered(out, point)).toBe(covered(xs, point));
        }
      }),
    );
  });

  // Pattern: metamorphic. Merging must not modify the original input.
  it('does not modify the input intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const original = structuredClone(xs);

        mergeIntervals(xs);

        expect(xs).toEqual(original);
      }),
    );
  });

  // Pattern: algebraic. Merging twice gives the same result as merging once.
  it('merging twice gives the same result', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        const twice = mergeIntervals(once);

        expect(twice).toEqual(once);
      }),
    );
  });

  // Pattern: conditional. Already separated intervals stay unchanged.
  it('does not change intervals that are already separated', () => {
    const separatedIntervals = fc
      .array(interval, { maxLength: 10 })
      .map(xs => [...xs].sort((a, b) => a[0] - b[0]))
      .map(xs => {
        const result: Interval[] = [];

        for (const [start, end] of xs) {
          const previous = result[result.length - 1];

          if (previous && start <= previous[1]) {
            result[result.length - 1] = [previous[0], previous[1]];
            result[result.length - 1][1] = Math.max(previous[1], end);
          } else {
            result.push([start, end]);
          }
        }

        return result;
      });

    fc.assert(
      fc.property(separatedIntervals, xs => {
        const out = mergeIntervals(xs);

        expect(out).toEqual(xs);
      }),
    );
  });
});
