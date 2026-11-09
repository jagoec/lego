import { describe, expect, it } from 'vitest';
import { choosePlacement } from './placement';

const viewport = { width: 1280, height: 800 };

describe('choosePlacement', () => {
  it('defaults to below/Start with room to spare', () => {
    expect(choosePlacement({ top: 300, bottom: 330, left: 100, right: 180 }, viewport)).toEqual({
      vertical: 'below',
      horizontal: 'start',
    });
  });

  it('flips above the anchor when there is no room below', () => {
    expect(choosePlacement({ top: 700, bottom: 730, left: 100, right: 180 }, viewport)).toEqual({
      vertical: 'above',
      horizontal: 'start',
    });
  });

  it('aligns to the right edge near the viewport right side', () => {
    expect(choosePlacement({ top: 300, bottom: 330, left: 1100, right: 1180 }, viewport)).toEqual({
      vertical: 'below',
      horizontal: 'end',
    });
  });

  it('can flip both ways at once', () => {
    expect(choosePlacement({ top: 760, bottom: 790, left: 1200, right: 1260 }, viewport)).toEqual({
      vertical: 'above',
      horizontal: 'end',
    });
  });
});
