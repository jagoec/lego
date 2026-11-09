/**
 * Pure popover-placement strategy: absolutely position the popover near
 * its anchor token, flipping above the anchor when there is no room
 * below, and aligning to the anchor's right edge when it sits near the
 * viewport's right side. No external positioning library.
 */

export type Placement = {
  vertical: 'below' | 'above';
  horizontal: 'start' | 'end';
};

/** Conservative popover size estimate used for the flip decision. */
const ESTIMATED_WIDTH = 352; // max-width 22rem
const ESTIMATED_HEIGHT = 240;

export function choosePlacement(
  anchor: { top: number; bottom: number; left: number; right: number },
  viewport: { width: number; height: number },
): Placement {
  const vertical: Placement['vertical'] =
    anchor.bottom + ESTIMATED_HEIGHT <= viewport.height ? 'below' : 'above';
  const horizontal: Placement['horizontal'] =
    anchor.left + ESTIMATED_WIDTH <= viewport.width ? 'start' : 'end';
  return { vertical, horizontal };
}
