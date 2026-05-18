/**
 * MerchantPaymentPage — replays the recorded merchant-payment coordinate flow.
 *
 * The journey itself is data ({@link MERCHANT_FLOW} in the locators module):
 * this class is the *engine* that walks that data — gate on each screen,
 * settle the UI, replay taps, fill the form, authorize when prompted.
 *
 * Open/Closed: re-capturing the flow or inserting a screen is an edit to the
 * MERCHANT_FLOW data, never to this replay engine.
 */

import { BasePage, type PageContext } from './BasePage';
import type { LoginPage } from './LoginPage';
import {
  MERCHANT_LOCATORS as L,
  MERCHANT_FLOW,
  type MerchantScreen,
} from '../locators/merchant.locators';
import { SESSION_EXPIRED } from '../locators/common.locators';
import { waitForScreen, waitForStableUi } from '../utils/waits';
import { randomInt, randomAlnum } from '../utils/random';

export class MerchantPaymentPage extends BasePage {
  protected readonly dumpPrefix = 'merchant';

  constructor(ctx: PageContext, private readonly login: LoginPage) {
    super(ctx);
  }

  /** Walk the recorded flow screen by screen, tap by tap. */
  async runTapSequence(): Promise<void> {
    let formFilled = false;
    let globalTapNo = 0;

    for (const screen of MERCHANT_FLOW) {
      console.log(`\n   === ${screen.name} ===`);
      await this.reachScreen(screen);
      await this.dump(this.slug(screen.name));
      this.assertNotSessionExpired(screen.name);

      // Confirmation screen — click the Pay button by locator.
      if (screen.clickPay) {
        await this.ui.waitForDisplayed(L.PAY_BUTTON, 30_000);
        console.log(`   [${screen.name}] clicking Pay button`);
        await this.ui.click(L.PAY_BUTTON);
        await waitForStableUi(this.ui);
        await this.handleLoginIfPrompted();
        continue;
      }

      // Replay this screen's coordinate taps.
      for (const tap of screen.taps) {
        globalTapNo++;
        console.log(`   tap ${globalTapNo} [${screen.name}] → (${tap.x}, ${tap.y})`);
        await this.ui.tapAt(tap.x, tap.y);
        await waitForStableUi(this.ui);

        // Pay screen — fill the form the first time the Amount field appears.
        if (screen.fillForm && !formFilled && await this.ui.isPresent(L.AMOUNT_FIELD)) {
          console.log('   merchant form detected — filling Amount / Reference / Remarks');
          await this.fillForm();
          formFilled = true;
        }

        // The login screen can follow any tap on / after the Pay screen.
        await this.handleLoginIfPrompted();
      }
    }
  }

  /** Capture the final receipt screenshot. */
  async captureReceipt(): Promise<void> {
    await this.diagnostics.screenshot('merchant-payment.png');
  }

  // ----- internals -------------------------------------------------------

  /** Gate before tapping: wait for the screen marker, or for the UI to settle. */
  private async reachScreen(screen: MerchantScreen): Promise<void> {
    if (screen.marker) {
      const ok = await waitForScreen(this.ui, screen.marker, 60_000);
      console.log(ok
        ? `   reached ${screen.name}`
        : `   ⚠ ${screen.name} marker not found in 60s — proceeding anyway`);
    } else {
      await waitForStableUi(this.ui, { timeoutMs: 60_000 });
    }
  }

  /** Fail clearly if the app raised a "Session Expired" dialog. */
  private async assertNotSessionExpired(screenName: string): Promise<void> {
    if (!(await this.ui.isPresent(SESSION_EXPIRED))) return;
    await this.dump('session-expired');
    throw new Error(
      `App raised "Session Expired" before the ${screenName} — the login ` +
      `session timed out. Taps for this screen onward would land on the ` +
      `error dialog. See target/merchant-session-expired.xml.`,
    );
  }

  /** Fill the merchant payment form: Amount, Reference ID, Remarks. */
  private async fillForm(): Promise<void> {
    const amount = String(randomInt(100, 1000));   // 100–999
    console.log(`   amount = ${amount}`);
    await this.ui.sendKeys(L.AMOUNT_FIELD, amount);
    await this.ui.performImeDone();
    await this.ui.pause(600);

    const refId = randomAlnum(10);
    console.log(`   reference id = ${refId}`);
    await this.ui.sendKeys(L.REFERENCE_FIELD, refId);
    await this.ui.performImeDone();
    await this.ui.pause(600);

    await this.ui.sendKeys(L.REMARKS_FIELD, 'Test Merchant payment');
    await this.ui.hideKeyboard();
    await this.ui.pause(600);
  }

  /** Authorize via the shared LoginPage and wait for the next screen. */
  private async handleLoginIfPrompted(): Promise<void> {
    if (!(await this.login.isPrompted())) return;
    console.log('   login screen detected — running performLogin');
    await this.login.performLogin();

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline && await this.login.isPrompted()) {
      await this.ui.pause(1000);
    }
    console.log('   login dismissed — waiting for the next screen to settle');
    await waitForStableUi(this.ui, { timeoutMs: 60_000, stableHits: 4 });
  }

  private slug(name: string): string {
    return name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  }
}
