/**
 * PersonalProfilePage — drives More → My Profile → Personal Profile, the
 * footer Edit affordance, and the email edit + submit.
 *
 * Login is handled BOTH globally and inline. The AfterStep loginHooks dismiss a
 * re-auth prompt between steps, but this app expires the session mid-step on a
 * long soak: a navigation step that takes ~80s can start on the More screen and
 * find the LOGIN screen by the time it looks for its target. The hook cannot
 * help there — it only runs between steps — so the prompt is also cleared
 * inline, the same "defense in depth" PayToPage uses. Without it, roughly one
 * profile cycle in ten failed with "the More tab is still not displayed",
 * because the login screen has no bottom navigation at all.
 *
 * No PNGs are taken here: per the suite convention, mid-flow captures are
 * page-source dumps (`dump()`), and screenshots are reserved for receipts and
 * the on-failure hook.
 */

import { BasePage, type PageContext } from './basePage';
import type { LoginPage } from './loginPage';
import { PERSONAL_PROFILE_LOCATORS as L } from '../locators/personalProfile.locators';
import {
  HOME_TAB,
  HOME_SELECTED,
  HOME_NAV_BUTTON,
  HOME_NAV_BUTTON_UIA,
} from '../locators/common.locators';
import { waitForPresent } from '../support/waits';
import { scrollIntoView, backNavigateUntil } from '../support/navigation';
import { randomAlnum } from '../support/random';

/**
 * Must match the `LONG` timeout the step definitions use. The page's internal
 * deadline is derived from it so the two cannot drift apart: a smaller internal
 * limit silently truncates recovery, a larger one lets cucumber kill the step
 * before it can report anything useful. Both mistakes happened here.
 */
const STEP_BUDGET_MS = 180_000;
/** Left for the page-source dump and the error path after the deadline hits. */
const DEADLINE_HEADROOM_MS = 20_000;

export class PersonalProfilePage extends BasePage {
  // Typed as `string`, not left to infer the literal: BusinessProfilePage
  // extends this class and needs its own dump prefix, which a literal type
  // would forbid.
  protected readonly dumpPrefix: string = 'personal-profile';

  constructor(ctx: PageContext, protected readonly login: LoginPage) {
    super(ctx);
  }

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
    const deadline = this.stepDeadline
      ?? Date.now() + (STEP_BUDGET_MS - DEADLINE_HEADROOM_MS);
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

      // The session can expire mid-step, replacing the screen with the login
      // prompt — which has no bottom nav, so the target is simply "not
      // displayed" and no amount of scrolling or retrying finds it.
      await this.dismissLoginIfPrompted();

      let clicked = false;
      let clickError: Error | undefined;
      try {
        await this.ui.click(selector);
        clicked = true;
      } catch (e) {
        clickError = e as Error;
      }

      // Judge the outcome by the SCREEN, not by what the click reported.
      //
      // A click can throw and still have landed: the tap registers, the app
      // navigates, and the element goes stale mid-call, so the driver reports
      // "still not displayed" for a tap that in fact worked. Gating this check
      // on `clicked` meant that case was never detected — the retry re-tapped a
      // row that no longer existed, burned another 15s, and failed the step on a
      // screen the flow had ALREADY reached. Confirmed from a dump taken at the
      // failure: the app was on My Profile while the step was still trying to
      // tap the My Profile row.
      //
      // After a thrown click the marker has either appeared already or it never
      // will, so probe it briefly rather than waiting the full budget.
      if (expect) {
        const budget = clicked ? expectTimeoutMs : 1_500;
        if (await waitForPresent(
          this.ui, expect, Math.min(budget, Math.max(0, deadline - Date.now())))) return;
      } else if (clicked) {
        return;   // no marker to check — the click landing is all we can assert
      }

      if (attempt === ATTEMPTS) {
        if (clickError) {
          await this.dump(`tap-failed-${what.replace(/\s+/g, '-').toLowerCase()}`);
          throw new Error(`could not tap ${what}: ${clickError.message.split('\n')[0]}`);
        }
        await this.dump(`tap-had-no-effect-${what.replace(/\s+/g, '-').toLowerCase()}`);
        throw new Error(
          `tapped ${what} ${ATTEMPTS} times but the expected screen never appeared`);
      }
      await this.ui.pause(700);   // let the screen settle, then re-tap
    }
  }

  /**
   * Clear a re-authentication prompt if one is up. Best-effort: a flaky probe
   * must never turn a passing step into a failure.
   */
  protected async dismissLoginIfPrompted(): Promise<void> {
    try {
      if (await this.login.isPrompted()) await this.login.performLogin();
    } catch { /* ignore — the caller's own wait/retry still applies */ }
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
    // Derived from the STEP budget, not an independent number. Hard-coding 70s
    // while the step allowed 180s meant the helper gave up with "ran out of
    // time" after 70s even though 110s of budget remained — the recovery was
    // cut short by my own limit rather than by cucumber's.
    return this.withStepDeadline(STEP_BUDGET_MS - DEADLINE_HEADROOM_MS, async () => {
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
      // Already arrived — a retry triggered by a slow screen transition must not
      // undo a tap that in fact landed.
      if (await this.ui.isPresent(L.MY_PROFILE_SCREEN_HEADER)) return;

      if (!(await this.ui.isPresent(L.MORE_SCREEN_HEADER))) {
        // "Not on More" has TWO causes, and they need opposite responses:
        //   - the app slipped BACK to Home  → the More tab is on screen, tap it
        //   - the app ran AHEAD to a sub-screen → there is no bottom nav at all,
        //     so tapping More is impossible and the attempt burns its full 15s
        //     timeout before failing. Measured at 0/10 cycles on one device once
        //     it settled into that state.
        // Assuming the first cause is what made this step fail. Back out until
        // the bottom nav is actually on screen — the device back button is the
        // only way off a sub-screen — and only then reach for the More tab.
        if (!(await this.ui.isPresent(HOME_TAB))) {
          await backNavigateUntil(this.ui, HOME_TAB, 4);
        }
        await this.settleAndTap(L.MORE_TILE_UIA, {
          what: 'the More tab',
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

  /**
   * Leave the profile stack so the next scenario starts from Home.
   *
   * Acknowledging the update popup does NOT reliably land on Home: sometimes it
   * closes the whole stack down to the grid, sometimes it drops back onto the
   * More screen. Waiting for HOME_TAB cannot tell those apart — that locator
   * matches the bottom-nav Home BUTTON, which is rendered on every tab — so the
   * old check passed while the app sat on More, and this step reported a
   * redirect that had not happened.
   *
   * So: back out until the nav bar exists, tap Home, and confirm Home is the
   * SELECTED tab, which is the only reading that proves the grid is showing.
   *
   * The tap is unconditional on purpose. Skipping it when Home already looks
   * selected is the trap documented on HOME_SELECTED: the profile screens are
   * reached FROM the Home tab, so the nav still reports Home as selected while a
   * sub-screen is displayed, and trusting that reading measured 37% failures.
   * One redundant tap costs well under a second; a wrong reading costs a cycle.
   */
  async returnToHome(maxBacks = 6): Promise<boolean> {
    // Back FIRST, tap second — and the order is not interchangeable. If the
    // session has expired the app is on the login screen, which renders no
    // bottom nav at all: there is no Home icon to tap there, so any attempt to
    // reach one fails. The device back button is the only way off that screen,
    // and backNavigateUntil presses exactly that until the nav bar reappears.
    // Only then is there a Home icon to tap.
    const nav = await backNavigateUntil(this.ui, HOME_TAB, maxBacks);
    if (!nav) {
      await this.dump('exit-no-nav-bar');
      return false;
    }
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.tapHomeIcon();
      if (await this.ui.isPresent(HOME_SELECTED)) return true;
    }
    await this.dump('exit-not-home');
    return false;
  }

  /** Tap the bottom-nav Home icon, XPath first then UiSelector. */
  private async tapHomeIcon(): Promise<void> {
    for (const selector of [HOME_NAV_BUTTON, HOME_NAV_BUTTON_UIA]) {
      try {
        if (!(await this.ui.isPresent(selector))) continue;
        await this.ui.click(selector, 5_000);
        await this.ui.pause(700);
        return;
      } catch { /* try the next selector */ }
    }
    await this.ui.pause(400);
  }
}
