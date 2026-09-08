import { describe, expect, it } from 'vitest';
import { isMouseWheel } from './useCadPanZoom';

describe('isMouseWheel', () => {
  it('treats line/page delta modes as a mouse wheel', () => {
    expect(isMouseWheel({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toBe(true); // DOM_DELTA_LINE
    expect(isMouseWheel({ deltaX: 0, deltaY: 1, deltaMode: 2 })).toBe(true); // DOM_DELTA_PAGE
  });

  it('treats large, purely-vertical integer pixel notches as a mouse wheel', () => {
    expect(isMouseWheel({ deltaX: 0, deltaY: 100, deltaMode: 0 })).toBe(true);
    expect(isMouseWheel({ deltaX: 0, deltaY: -120, deltaMode: 0 })).toBe(true);
  });

  it('treats a horizontal component as a trackpad swipe', () => {
    expect(isMouseWheel({ deltaX: 4, deltaY: 80, deltaMode: 0 })).toBe(false);
  });

  it('treats small or fractional vertical deltas as a trackpad swipe', () => {
    expect(isMouseWheel({ deltaX: 0, deltaY: 12, deltaMode: 0 })).toBe(false); // too small
    expect(isMouseWheel({ deltaX: 0, deltaY: 66.5, deltaMode: 0 })).toBe(false); // fractional momentum
  });
});
