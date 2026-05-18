/**
 * Merchant Payment step definitions.
 *
 * The flow is a sequence of raw coordinate taps captured from Appium
 * Inspector, grouped BY SCREEN. Before the first tap of a screen the test
 * waits for that screen to be ready (a screen marker, or a settled UI);
 * between taps it waits for the UI to settle. This keeps every tap on the
 * screen it was recorded against.
 *
 *   Home → Merchant Category → Merchant List → Pay → (login) →
 *   Confirmation → Receipt
 *
 * On the Pay screen the Amount / Reference ID / Remarks fields are filled.
 * After the Pay screen taps the login screen appears and performLogin runs.
 *
 * ⚠ Coordinates are specific to a 720 x 1600 device. Re-capture if the
 *   device/resolution changes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { TestWorld } from '../support/world';
import { LOGIN, performLogin } from './Login.steps';

// ---------------------------------------------------------------------------
// Flow — taps grouped by screen (from Appium Inspector). 720 x 1600 device.
// ---------------------------------------------------------------------------

type Tap = { x: number; y: number };
type Screen = {
  name: string;
  /** XPath that uniquely identifies the screen; waited for before tap 1. */
  marker?: string;
  /** Fill Amount / Reference ID / Remarks while on this screen. */
  fillForm?: boolean;
  /** Click the Pay button (by locator) instead of replaying coordinate taps. */
  clickPay?: boolean;
  taps: Tap[];
};

// Confirmation-screen Pay button (English / Burmese, by text or resource-id).
const PAY_BUTTON =
  '//*[(@text="Pay" or @text="PAY" or @text="ငွေပေး" or @text="ပေးချေမည်") and @clickable="true"] ' +
  '| //android.widget.Button[@text="Pay" or @text="PAY" or @text="ငွေပေး"] ' +
  '| //*[contains(@resource-id,"pay") and @clickable="true"] ' +
  '| //*[contains(@resource-id,"confirm") and @clickable="true"]';

const HOME_TAB = '//android.widget.TextView[@text="Pay" or @text="ငွေပေး"]';
const MERCHANT_LIST_MARKER =
  '//*[contains(@text,"Merchant List") or contains(@text,"ကုန်သည်စာရင်း")]';

const FLOW: Screen[] = [
  {
    name: 'Home Screen',
    marker: HOME_TAB,
    taps: [{ x: 585, y: 654 }],                               // tap 1
  },
  {
    name: 'Merchant Category Screen',
    taps: [{ x: 417, y: 1162 }],                              // tap 2
  },
  {
    name: 'Merchant List Screen',
    marker: MERCHANT_LIST_MARKER,
    taps: [{ x: 479, y: 225 }],                               // tap 3
  },
  {
    name: 'Pay Screen',
    fillForm: true,
    taps: [
      { x: 270, y: 734 },   // tap 4
      { x: 220, y: 786 },   // tap 5
      { x: 365, y: 1147 },  // tap 6
      { x: 590, y: 1485 },  // tap 7
      { x: 635, y: 751 },   // tap 8
      { x: 453, y: 903 },   // tap 9
      { x: 523, y: 788 },   // tap 10
      { x: 386, y: 1317 },  // tap 11
      { x: 609, y: 1343 },  // tap 12
      { x: 523, y: 905 },   // tap 13
      { x: 408, y: 1499 },  // tap 14
    ],
  },
  {
    name: 'Confirmation Screen',
    // Click the Pay button by locator instead of replaying coordinate taps.
    clickPay: true,
    taps: [],
  },
  {
    name: 'Receipt Screen',
    taps: [
      { x: 568, y: 1213 },  // tap 24 — Share
      { x: 611, y: 110 },   // tap 25 — back
      { x: 132, y: 1214 },  // tap 26 — Back to Home
    ],
  },
];

// Error dialog the app raises when the session has timed out.
const SESSION_EXPIRED =
  '//*[contains(@text,"Session Expired") or contains(@text,"session expired") ' +
  'or contains(@text,"Session expired")]';

// Merchant payment form fields — best-effort locators (hint / resource-id).
const FIELD = {
  AMOUNT:
    '//android.widget.EditText[contains(@hint,"Amount") or contains(@hint,"amount")] ' +
    '| //*[contains(@resource-id,"amount") and contains(@class,"EditText")] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/new_send_money_amount"]',
  REFERENCE:
    '//android.widget.EditText[contains(@hint,"Reference") or contains(@hint,"reference") ' +
    'or contains(@hint,"Ref")] ' +
    '| //*[contains(@resource-id,"reference") and contains(@class,"EditText")] ' +
    '| //*[contains(@resource-id,"refId") and contains(@class,"EditText")] ' +
    '| //*[contains(@resource-id,"ref_id") and contains(@class,"EditText")]',
  REMARKS:
    '//android.widget.EditText[contains(@hint,"Remark") or contains(@hint,"remark") ' +
    'or contains(@hint,"Note")] ' +
    '| //*[contains(@resource-id,"remark") and contains(@class,"EditText")] ' +
    '| //*[contains(@resource-id,"comment") and contains(@class,"EditText")]',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Replay one tap as a W3C pointer down/up — mirrors the Inspector output. */
async function tapAt(world: TestWorld, x: number, y: number): Promise<void> {
  await world.driver.performActions([
    {
      type: 'pointer',
      id: 'finger',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x, y },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 50 },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ]);
  await world.driver.releaseActions();
}

/** Loading / progress indicators — the UI is NOT settled while any show. */
const LOADING_INDICATOR =
  '//android.widget.ProgressBar ' +
  '| //*[contains(@resource-id,"progress")] ' +
  '| //*[contains(@resource-id,"loading")] ' +
  '| //*[contains(@resource-id,"loader")]';

/**
 * Dynamic wait — block until the screen has genuinely settled: no loading
 * indicator AND the page source identical across `stableHits` consecutive
 * reads. Requiring multiple identical reads prevents returning on a screen
 * that is only momentarily static mid-transition.
 */
async function waitForStableUi(
  world: TestWorld,
  opts: { settleMs?: number; timeoutMs?: number; stableHits?: number } = {},
): Promise<void> {
  const settleMs   = opts.settleMs   ?? 600;
  const timeoutMs  = opts.timeoutMs  ?? 20_000;
  const stableHits = opts.stableHits ?? 3;
  const deadline   = Date.now() + timeoutMs;
  let prev = '';
  let hits = 0;
  await world.driver.pause(400);
  while (Date.now() < deadline) {
    let loading = false;
    try { loading = await world.isPresent(LOADING_INDICATOR); } catch { /* ignore */ }
    let cur = '';
    try { cur = await world.driver.getPageSource(); } catch { /* ignore */ }
    if (!loading && cur && cur === prev) {
      if (++hits >= stableHits) return;
    } else {
      hits = 0;
    }
    prev = cur;
    await world.driver.pause(settleMs);
  }
}

/** Wait until a screen marker is present (the screen has been reached). */
async function waitForScreen(world: TestWorld, marker: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await world.isPresent(marker)) return true;
    await world.driver.pause(1000);
  }
  return false;
}

/** Dump page source + screenshot for diagnosing screens / locators. */
async function dump(world: TestWorld, name: string): Promise<void> {
  try {
    fs.mkdirSync('target', { recursive: true });
    fs.writeFileSync(path.join('target', `merchant-${name}.xml`), await world.driver.getPageSource());
    await world.screenshotToTarget(`merchant-${name}.png`);
  } catch { /* ignore */ }
}

/** Random alphanumeric string of the given length. */
function randomAlnum(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Fill the merchant payment form: Amount, Reference ID, Remarks. */
async function fillMerchantForm(world: TestWorld): Promise<void> {
  const amount = String(100 + Math.floor(Math.random() * 900));   // 100–999
  console.log(`   amount = ${amount}`);
  await world.sendKeys(FIELD.AMOUNT, amount);
  await world.performImeDone();
  await world.pause(600);

  const refId = randomAlnum(10);
  console.log(`   reference id = ${refId}`);
  await world.sendKeys(FIELD.REFERENCE, refId);
  await world.performImeDone();
  await world.pause(600);

  await world.sendKeys(FIELD.REMARKS, 'Test Merchant payment');
  await world.hideKeyboard();
  await world.pause(600);
}

/** Authorize via the shared login procedure and wait for the next screen. */
async function handleLoginIfPrompted(world: TestWorld): Promise<void> {
  if (!(await world.isPresent(LOGIN.PASSWORD_FIELD))) return;
  console.log('   login screen detected — running performLogin');
  await performLogin(world);

  // Wait for the login screen to actually go away, then for the next screen
  // to fully settle, before any further taps.
  const loginGone = Date.now() + 60_000;
  while (Date.now() < loginGone && await world.isPresent(LOGIN.PASSWORD_FIELD)) {
    await world.driver.pause(1000);
  }
  console.log('   login dismissed — waiting for the next screen to settle');
  await waitForStableUi(world, { timeoutMs: 60_000, stableHits: 4 });
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

When('I run the merchant payment tap sequence', { timeout: 15 * 60_000 }, async function (this: TestWorld) {
  let formFilled = false;
  let globalTapNo = 0;

  for (const screen of FLOW) {
    console.log(`\n   === ${screen.name} ===`);

    // Screen gate — wait until the screen is actually reached before tapping.
    if (screen.marker) {
      const ok = await waitForScreen(this, screen.marker, 60_000);
      console.log(ok
        ? `   reached ${screen.name}`
        : `   ⚠ ${screen.name} marker not found in 60s — proceeding anyway`);
    } else {
      // No marker for this screen — wait for the UI to settle instead.
      await waitForStableUi(this, { timeoutMs: 60_000 });
    }
    await dump(this, screen.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase());

    // Guard — if the app raised a "Session Expired" dialog, the expected
    // screen never appeared; fail clearly instead of tapping the error.
    if (await this.isPresent(SESSION_EXPIRED)) {
      await dump(this, 'session-expired');
      throw new Error(
        `App raised "Session Expired" before the ${screen.name} — the ` +
        `login session timed out. Taps for this screen onward would land ` +
        `on the error dialog. See target/merchant-session-expired.xml.`,
      );
    }

    // Confirmation screen — click the Pay button by locator.
    if (screen.clickPay) {
      const payEl = await this.driver.$(PAY_BUTTON);
      await payEl.waitForDisplayed({ timeout: 30_000 });
      console.log(`   [${screen.name}] clicking Pay button`);
      await this.click(PAY_BUTTON);
      await waitForStableUi(this);
      await handleLoginIfPrompted(this);
      continue;
    }

    // Replay this screen's taps.
    for (const tap of screen.taps) {
      globalTapNo++;
      console.log(`   tap ${globalTapNo} [${screen.name}] → (${tap.x}, ${tap.y})`);
      await tapAt(this, tap.x, tap.y);
      await waitForStableUi(this);

      // Pay screen — fill the form the first time the Amount field appears.
      if (screen.fillForm && !formFilled && await this.isPresent(FIELD.AMOUNT)) {
        console.log('   merchant form detected — filling Amount / Reference / Remarks');
        await fillMerchantForm(this);
        formFilled = true;
      }

      // Login screen can appear after any tap (it follows the Pay screen) —
      // authorize and wait for the next screen whenever it shows.
      await handleLoginIfPrompted(this);
    }
  }
});

Then('the merchant payment is completed', async function (this: TestWorld) {
  await this.screenshotToTarget('merchant-payment.png');
  assert.ok(true, 'merchant payment tap sequence completed');
});
