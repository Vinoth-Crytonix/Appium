/**
 * PersonalProfilePage — drives More → My Profile → Personal Profile, the
 * footer Edit affordance, and the email edit + submit.
 *
 * Global login is handled by the AfterStep loginHooks, so this page does not
 * inject LoginPage — same arrangement as {@link ReportsPage}.
 *
 * No PNGs are taken here: per the suite convention, mid-flow captures are
 * page-source dumps (`dump()`), and screenshots are reserved for receipts and
 * the on-failure hook.
 */

import { BasePage } from './basePage';
import { PERSONAL_PROFILE_LOCATORS as L } from '../locators/personalProfile.locators';
import { HOME_TAB } from '../locators/common.locators';
import { waitForPresent } from '../support/waits';
import { scrollIntoView, backNavigateUntil } from '../support/navigation';
import { randomAlnum } from '../support/random';

export class PersonalProfilePage extends BasePage {
  // Typed as `string`, not left to infer the literal: BusinessProfilePage
  // extends this class and needs its own dump prefix, which a literal type
  // would forbid.
  protected readonly dumpPrefix: string = 'personal-profile';

  /** The value the last edit typed — asserted after submit. */
  private lastEmail = '';

  /**
   * Wall-clock limit shared by every settleAndTap call within ONE step.
   *
   * Set by withStepDeadline(); nested retries all honour it, which is what
   * stops composed retry budgets from overrunning cucumber's step timeout.
   */
  private stepDeadline: number | undefined;

  // ---- Launch helper -----------------------------------------------------

  async isOnHome(timeoutMs = 1_500): Promise<boolean> {
    return waitForPresent(this.ui, HOME_TAB, timeoutMs);
  }

  // ---- Shared tap helper -------------------------------------------------

  /**
   * Tap something that may be off-screen or not yet rendered.
   *
   * Every tap in these flows used to be "scroll blindly, then click", and that
   * is precisely how the footer Edit icon failed on the first cycle of a run:
   * the form was still fetching, the swipe loop shuffled a half-rendered screen
   * around, and the click timed out with "still not displayed". The same shape
   * existed at six other call sites, so the sequence is centralised here:
   *
   *   1. WAIT for the element to exist  — never scroll a screen that has not
   *      rendered; that is the step that actually removes the flakiness
   *   2. scroll to it natively when a UiScrollable selector is available
   *      (one device-side command, no swipe-and-probe)
   *   3. fall back to the generic swipe loop — the only path that scrolls UP
   *   4. click, and retry once from the top if it does not land
   *
   * `presence` exists for elements whose tappable form is a clickable ancestor:
   * waiting on the ancestor can succeed before the child has drawn, so the
   * plain id is used for the readiness check.
   */
  protected async settleAndTap(selector: string, opts: {
    presence?: string;
    scrollTo?: string;
    what: string;
    timeoutMs?: number;
    /**
     * Marker proving the tap actually did something.
     *
     * Retrying only a THROWN click is not enough: a tap on a screen that has
     * just been drawn is regularly accepted by the driver and then ignored by
     * the app, so the click "succeeds" and nothing happens. That is the residual
     * flake on this suite — the More tab reporting success while the app stayed
     * on Home. With `expect`, the tap is only considered done once the target
     * screen appears, and is otherwise re-issued.
     */
    expect?: string;
    expectTimeoutMs?: number;
  }): Promise<void> {
    const {
      presence = selector, scrollTo, what,
      timeoutMs = 8_000, expect, expectTimeoutMs = 6_000,
    } = opts;

    // A SHARED deadline for the whole step, not a per-call budget.
    //
    // Tuning per-call numbers failed twice, because the calls NEST: tapMyProfile
    // retries twice, and each of its attempts can invoke this helper twice (the
    // More re-entry guard, then the row). Multiplying budgets gave 4 × ~28s ≈
    // 112s against cucumber's 90s step limit, so the step was killed with
    // "function timed out" before any diagnostic could be produced — twice, for
    // the same underlying reason.
    //
    // stepDeadline is set once per STEP and honoured by every nested call, so no
    // combination of retries can overrun. When it passes, the helper gives up
    // immediately and reports properly instead of being killed mid-flight.
    const deadline = this.stepDeadline ?? Date.now() + 70_000;
    const ATTEMPTS = 2;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      // Never start work that cannot finish inside the step's budget.
      const left = deadline - Date.now();
      if (left <= 0) {
        await this.dump(`tap-out-of-time-${what.replace(/\s+/g, '-').toLowerCase()}`);
        throw new Error(`ran out of time before tapping ${what}`);
      }
      await waitForPresent(this.ui, presence, Math.min(timeoutMs, left));
      if (!(await this.ui.isDisplayed(selector))) {
        if (scrollTo) await this.ui.isPresent(scrollTo);   // the find IS the scroll
        if (!(await this.ui.isDisplayed(selector))) await scrollIntoView(this.ui, selector);
      }

      let clicked = false;
      try {
        await this.ui.click(selector);
        clicked = true;
      } catch (e) {
        if (attempt === ATTEMPTS) {
          await this.dump(`tap-failed-${what.replace(/\s+/g, '-').toLowerCase()}`);
          throw new Error(`could not tap ${what}: ${(e as Error).message.split('\n')[0]}`);
        }
      }

      // No marker to check — the click landing is all we can assert.
      if (clicked && !expect) return;
      if (clicked && await waitForPresent(
        this.ui, expect!, Math.min(expectTimeoutMs, Math.max(0, deadline - Date.now())))) return;

      if (attempt === ATTEMPTS) {
        await this.dump(`tap-had-no-effect-${what.replace(/\s+/g, '-').toLowerCase()}`);
        throw new Error(
          `tapped ${what} ${ATTEMPTS} times but the expected screen never appeared`);
      }
      await this.ui.pause(700);   // let the screen settle, then re-tap
    }
  }

  /**
   * Run `body` under a shared deadline, so however the retries inside it nest,
   * the step finishes before cucumber's own timeout kills it.
   */
  protected async withStepDeadline<T>(budgetMs: number, body: () => Promise<T>): Promise<T> {
    this.stepDeadline = Date.now() + budgetMs;
    try {
      return await body();
    } finally {
      this.stepDeadline = undefined;
    }
  }

  // ---- Navigation: Home → More → My Profile → Personal Profile -----------

  // Each tap below is followed by a polling waitFor…Screen, so the fixed sleep
  // only has to let the tap register — the poll does the actual waiting. These
  // were ~1s each and, across four taps and N cycles, dominated the flow's
  // runtime while adding nothing the poll wasn't already doing.
  async tapMore(): Promise<void> {
    await this.settleAndTap(L.MORE_TILE_UIA, {
      what: 'the More tab', expect: L.MORE_SCREEN_HEADER });
    await this.ui.pause(200);
  }

  async waitForMoreScreen(timeoutMs = 15_000): Promise<boolean> {
    const shown = await waitForPresent(this.ui, L.MORE_SCREEN_HEADER, timeoutMs);
    if (!shown) await this.dump('more-not-shown');
    return shown;
  }

  async tapMyProfile(): Promise<void> {
    // 70s of cucumber's 90s step budget, leaving headroom for the dumps and
    // the error path. Every nested settleAndTap honours this same deadline.
    return this.withStepDeadline(70_000, async () => {
    // Re-enter More if the app has slipped back to Home.
    //
    // On the FIRST cycle of a run this happened regularly: the Before hook's
    // navigateToHome() taps the Home tab and waits only 400ms, and on a cold
    // app that selection is still settling when the scenario taps More. The
    // queued Home tap then lands AFTER the More transition and snaps the app
    // back — so "the More screen should be displayed" passes, and a moment
    // later the My Profile row is gone because Home is showing again. Cycle 2
    // never saw it, because by then the app is warm and the tap completes
    // inside the 400ms.
    //
    // Rather than widen that shared timeout (which would slow every flow), the
    // step simply checks it is still where it expects to be, and taps More
    // again if not.
    // The guard is INSIDE the retry loop on purpose. Checking it once before
    // the first attempt is not enough: if the app slips back to Home, the row
    // vanishes and settleAndTap's own retry just re-clicks a selector that is
    // no longer on screen — both attempts then fail with "could not tap the My
    // Profile row", which is exactly what was observed. Re-establishing More
    // before EACH attempt is what makes the step recover.
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (!(await this.ui.isPresent(L.MORE_SCREEN_HEADER))) {
        await this.settleAndTap(L.MORE_TILE_UIA, {
          what: 'the More tab (app had slipped back to Home)',
          expect: L.MORE_SCREEN_HEADER,
        });
      }
      try {
        // The More screen is a long grid — My Profile can sit below the fold.
        await this.settleAndTap(L.MY_PROFILE_OPTION, {
          presence: L.MY_PROFILE_LABEL, what: 'the My Profile row',
          expect: L.MY_PROFILE_SCREEN_HEADER });
        await this.ui.pause(250);
        return;
      } catch (e) {
        lastError = e;
        await this.ui.pause(500);   // let the screen settle, then re-enter More
      }
      }
      throw lastError;
    });
  }

  async waitForMyProfileScreen(timeoutMs = 15_000): Promise<boolean> {
    const shown = await waitForPresent(this.ui, L.MY_PROFILE_SCREEN_HEADER, timeoutMs);
    if (!shown) await this.dump('my-profile-not-shown');
    return shown;
  }

  async tapPersonalProfile(): Promise<void> {
    await this.settleAndTap(L.PERSONAL_PROFILE_OPTION, {
      what: 'the Personal Profile row', expect: L.PERSONAL_PROFILE_SCREEN_HEADER });
    await this.ui.pause(250);
  }

  async waitForPersonalProfileScreen(timeoutMs = 15_000): Promise<boolean> {
    const shown = await waitForPresent(this.ui, L.PERSONAL_PROFILE_SCREEN_HEADER, timeoutMs);
    if (!shown) await this.dump('personal-profile-not-shown');
    return shown;
  }

  // ---- Edit mode ---------------------------------------------------------

  /**
   * Tap the Edit icon in the FOOTER. The footer can be off-screen on a short
   * viewport, so the icon is scrolled into view before the tap — clicking an
   * element that exists in the source but not in the viewport is the classic
   * "element not displayed" failure on this build.
   */
  async tapFooterEditIcon(): Promise<void> {
    // Two attempts. The first cycle of a run opens the profile on a form that
    // is still fetching account data, so the footer is not laid out yet; the
    // old code went straight into a blind swipe loop and the click then timed
    // out with "still not displayed". Waiting for the icon to EXIST before
    // scrolling fixes that, and the retry covers a scroll that lands short.
    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.bringEditIconIntoView();
      try {
        // Indexed UiSelector, not the XPath union: the union re-walks the whole
        // form on every probe and click, which measured ~38s per cycle here.
        await this.ui.click(L.FOOTER_EDIT_ICON_UIA);
      } catch {
        if (attempt === 2) throw new Error(
          'the footer Edit icon never became tappable on the Personal Profile form');
        continue;   // re-settle and try once more
      }
      await this.ui.pause(300);
      // Either the gate dialog appeared (and was cleared) or edit mode opened
      // directly — both mean the tap landed.
      if (await this.tapWhenPresent(L.EDIT_CONFIRM_DIALOG, L.EDIT_CONFIRM_BUTTON, 6_000)) return;
      if (await this.ui.isPresent(L.EDIT_MODE_MARKER)) return;
    }
  }

  /**
   * Get the footer Edit icon on screen, tolerating a form that is still
   * rendering.
   *
   * Order matters: WAIT for the icon to exist in the source first — scrolling a
   * half-loaded form just moves an empty view around — then let UiAutomator
   * scroll to it in one device-side command, and only fall back to the generic
   * swipe loop if that selector finds nothing.
   */
  private async bringEditIconIntoView(): Promise<void> {
    // Straight to the scroll — deliberately NO "wait for the icon to exist"
    // first. Android only keeps RENDERED rows in the accessibility tree, so
    // while the footer is below the fold the icon genuinely does not exist to
    // query, and waiting for it burned the full 20s timeout on every cycle
    // before any scrolling even started (~20s of a ~31s step).
    //
    // The form's readiness is already proven by the preceding step, which
    // asserts the Personal Profile header, so there is nothing left to wait
    // for. UiScrollable then scrolls until the icon appears — that search IS
    // the wait, and it exits as soon as the icon is found.
    if (await this.ui.isDisplayed(L.FOOTER_EDIT_ICON_UIA)) return;
    await this.ui.isPresent(L.FOOTER_EDIT_ICON_SCROLL_TO);   // the find IS the scroll
    if (await this.ui.isDisplayed(L.FOOTER_EDIT_ICON_UIA)) return;
    await scrollIntoView(this.ui, L.FOOTER_EDIT_ICON_UIA);   // last-resort swipe loop
  }

  async waitForEditMode(timeoutMs = 15_000): Promise<boolean> {
    const editable = await waitForPresent(this.ui, L.EDIT_MODE_MARKER, timeoutMs);
    if (!editable) await this.dump('edit-mode-not-entered');
    return editable;
  }

  // ---- Email field -------------------------------------------------------

  /**
   * Scroll the profile form until the email field is in the viewport.
   *
   * Fast path first: finding EMAIL_FIELD_SCROLL_TO makes UiAutomator scroll the
   * container itself, on the device, in one command. The old approach ran the
   * generic swipe loop TWICE per cycle — once for the label, once for the input
   * — and each swipe cost a 600ms settle plus an XPath probe, which is where
   * most of this flow's per-cycle time went.
   *
   * The generic loop is kept as a fallback: it is the only path that also
   * scrolls back UP, so a form that starts below the field still recovers.
   */
  async scrollToEmailField(): Promise<boolean> {
    if (await this.ui.isPresent(L.EMAIL_FIELD)) return true;   // already in view

    await this.ui.isPresent(L.EMAIL_FIELD_SCROLL_TO);          // the find IS the scroll
    if (await this.ui.isPresent(L.EMAIL_FIELD)) return true;

    await scrollIntoView(this.ui, L.EMAIL_FIELD);
    const found = await this.ui.isPresent(L.EMAIL_FIELD);
    if (!found) await this.dump('email-field-not-found');
    return found;
  }

  async isEmailFieldDisplayed(timeoutMs = 10_000): Promise<boolean> {
    return waitForPresent(this.ui, L.EMAIL_FIELD, timeoutMs);
  }

  /**
   * Type a new address into the email field.
   *
   * A `{random}` token in `template` is replaced with a 5-character suffix, so
   * a repeated run never resubmits the address already on the account — this
   * build rejects an unchanged email as "nothing to update". Returns the value
   * actually typed.
   */
  async editEmail(template: string): Promise<string> {
    const value = template.replace('{random}', randomAlnum(5).toLowerCase());
    await this.ui.sendKeys(L.EMAIL_FIELD, value);
    await this.ui.hideKeyboard();
    await this.ui.pause(200);
    this.lastEmail = value;
    return value;
  }

  /** The address typed by the last {@link editEmail} call. */
  get submittedEmail(): string {
    return this.lastEmail;
  }

  // ---- Submit ------------------------------------------------------------

  /**
   * Submit the form and see the commit all the way through.
   *
   * Submitting is a THREE-tap sequence on this build, not one:
   *   1. the form's Submit control
   *   2. "Are you sure you want to update?"  -> Update
   *   3. the acknowledgement popup           -> OK
   *
   * Stopping after tap 1 leaves a confirmation dialog on screen and the change
   * uncommitted, which is what made the acceptance check fail while everything
   * looked fine up to that point.
   */
  async submitDetails(): Promise<void> {
    await this.settleAndTap(L.SUBMIT_BUTTON, { what: 'the Submit control' });
    await this.ui.pause(500);
    await this.tapWhenPresent(L.SUBMIT_CONFIRM_DIALOG, L.SUBMIT_CONFIRM_BUTTON);
    await this.tapWhenPresent(L.SUBMIT_OK_BUTTON, L.SUBMIT_OK_BUTTON);
  }

  /**
   * Tap `target` once `marker` shows up, or return quietly if it never does.
   *
   * Polled rather than assumed: these dialogs are conditional (account level,
   * build), and hard-failing on one that legitimately did not appear would
   * break the flow for the wrong reason.
   */
  protected async tapWhenPresent(marker: string, target: string, timeoutMs = 10_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.ui.isPresent(marker)) {
        await this.ui.click(target);
        await this.ui.pause(500);
        return true;
      }
      await this.ui.pause(250);
    }
    return false;
  }

  /**
   * True once the update is accepted — either an explicit success message, or
   * the form falling back to read-only (the footer Edit icon on offer again).
   * The toast is short-lived, so both signals are polled together rather than
   * waiting out the first one.
   */
  async waitForSubmitAccepted(timeoutMs = 20_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.ui.isPresent(L.SUBMIT_SUCCESS)) return true;
      // Observed on this build: acknowledging the update popup closes the whole
      // profile stack and drops the app back on Home. That IS the accepted
      // outcome — checked before the read-only test below, which can never pass
      // once the form itself is gone.
      if (await this.ui.isPresent(HOME_TAB)) return true;
      if (!(await this.ui.isPresent(L.EDIT_MODE_MARKER))
        && await this.ui.isPresent(L.FOOTER_EDIT_ICON)) return true;
      await this.ui.pause(300);
    }
    await this.dump('submit-not-accepted');
    return false;
  }

  // ---- Back navigation ---------------------------------------------------

  /** Leave the profile stack so the next scenario starts from Home. */
  async returnToHome(maxBacks = 6): Promise<boolean> {
    const home = await backNavigateUntil(this.ui, HOME_TAB, maxBacks);
    if (!home) await this.dump('exit-not-home');
    return home;
  }
}
