/**
 * BusinessProfilePage — More → My Profile → Business Profile, the footer Edit
 * affordance, the Add Business Photo control and the submit chain.
 *
 * Extends {@link PersonalProfilePage} rather than restating it: everything from
 * Home down to My Profile is the same journey, and so are the edit gate, the
 * update confirmation and the OK popup — those are app-wide profile controls.
 * Inheriting them means the two flows cannot drift apart, and a build that
 * changes the gate is fixed once.
 *
 * Only the Business-specific screens are added here.
 *
 * No PNGs are taken: per the suite convention, mid-flow captures are page-source
 * dumps (`dump()`), and screenshots are reserved for receipts and the
 * on-failure hook.
 */

import { PersonalProfilePage } from './personalProfilePage';
import { BUSINESS_PROFILE_LOCATORS as L } from '../locators/businessProfile.locators';
import { waitForPresent } from '../support/waits';
import { scrollIntoView } from '../support/navigation';

export class BusinessProfilePage extends PersonalProfilePage {
  protected readonly dumpPrefix = 'business-profile';

  // ---- My Profile → Business Profile -------------------------------------

  async tapBusinessProfile(): Promise<void> {
    // The My Profile screen lists several profile types; Business can sit below
    // the fold. settleAndTap waits for the row to exist before scrolling —
    // scrolling a screen that has not rendered is what made the equivalent tap
    // on the Personal Profile form fail on a run's first cycle.
    await this.settleAndTap(L.BUSINESS_PROFILE_OPTION, {
      what: 'the Business Profile row', expect: L.BUSINESS_PROFILE_SCREEN_HEADER });
    await this.ui.pause(400);
  }

  async waitForBusinessProfileScreen(timeoutMs = 15_000): Promise<boolean> {
    const shown = await waitForPresent(this.ui, L.BUSINESS_PROFILE_SCREEN_HEADER, timeoutMs);
    if (!shown) await this.dump('business-profile-not-shown');
    return shown;
  }

  // ---- Add Business Photo -------------------------------------------------

  /**
   * Scroll the form down to the Add Business Photo control and tap it.
   *
   * The tap opens the photo picker; this flow does NOT attach an image — the
   * scenario backs straight out again (see {@link pressBack}). The point is to
   * exercise opening and dismissing the picker, then submitting, without
   * depending on device gallery contents that differ per handset.
   */
  async tapAddBusinessPhoto(): Promise<void> {
    await this.settleAndTap(L.ADD_BUSINESS_PHOTO, { what: 'Add Business Photo' });
    await this.ui.pause(1_500);
  }

  async isAddBusinessPhotoDisplayed(timeoutMs = 10_000): Promise<boolean> {
    const shown = await waitForPresent(this.ui, L.ADD_BUSINESS_PHOTO, timeoutMs);
    if (!shown) await this.dump('add-business-photo-not-found');
    return shown;
  }

  /** Device Back — dismisses whatever the photo control opened. */
  async pressBack(): Promise<void> {
    await this.ui.back();
    await this.ui.pause(1_200);
  }

  /**
   * Back on the Business Profile form after the photo detour.
   *
   * Asserted before submitting: if Back left us somewhere else entirely, the
   * submit that follows would tap whatever happens to match instead, and the
   * scenario would fail somewhere far from the real cause.
   */
  async isBackOnForm(timeoutMs = 10_000): Promise<boolean> {
    const shown = await waitForPresent(this.ui, L.BUSINESS_PROFILE_SCREEN_HEADER, timeoutMs);
    if (!shown) await this.dump('not-back-on-business-form');
    return shown;
  }
}
