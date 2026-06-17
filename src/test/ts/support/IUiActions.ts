/**
 * The interaction contract every page object and sync utility depends on.
 *
 * Defining an interface (not the concrete {@link UiActions} class) is the
 * Dependency-Inversion seam of the suite: pages and utilities are written
 * against this abstraction, so the WebdriverIO driver could be swapped for a
 * fake or a different automation backend without touching a single page.
 *
 * It is deliberately narrow (Interface-Segregation): only the primitive
 * gestures the rest of the suite genuinely needs are exposed. Composite
 * behaviours (scroll-into-view, stable-UI waits, back-navigation) are built
 * on top of these primitives in the utils/ layer.
 */
export interface IUiActions {
  /** Wait for the element to be displayed, then tap it. */
  click(selector: string, timeoutMs?: number): Promise<void>;

  /** Tap the field, clear it, and type `text` via the standard keyboard. */
  sendKeys(selector: string, text: string, timeoutMs?: number): Promise<void>;

  /** Type digits via Android keycodes — for custom canvas-drawn keypads. */
  typeDigits(selector: string, digits: string, timeoutMs?: number): Promise<void>;

  /** True if the element exists anywhere in the current page source. */
  isPresent(selector: string): Promise<boolean>;

  /** True if the element is present AND within the visible viewport. */
  isDisplayed(selector: string): Promise<boolean>;

  /** Block until the element is displayed (throws on timeout). */
  waitForDisplayed(selector: string, timeoutMs?: number): Promise<void>;

  /** Dismiss the soft keyboard (best-effort). */
  hideKeyboard(): Promise<void>;

  /** Trigger the keyboard's "Done" / IME action (best-effort). */
  performImeDone(): Promise<void>;

  /** Fixed pause — use sparingly; prefer the waits in utils/. */
  pause(ms: number): Promise<void>;

  /** Press the Android system Back button. */
  back(): Promise<void>;

  /** Replay a single coordinate tap as a W3C pointer down/up. */
  tapAt(x: number, y: number): Promise<void>;

  /** Scroll the screen one page in the given direction. */
  scroll(direction: 'up' | 'down' | 'left' | 'right'): Promise<void>;

  /** The current screen's XML page source. */
  getPageSource(): Promise<string>;

  /** A PNG screenshot of the current screen, base64-encoded. */
  takeScreenshot(): Promise<string>;
}
