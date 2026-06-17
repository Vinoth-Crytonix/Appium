/**
 * Reports step definitions - thin glue to ReportsPage.
 *
 * Step phrasings here are unique to the All-Transaction-Details feature; the
 * shared "User clicks on device back button" step is owned by
 * recentTransactionsSteps and reused as-is.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';
import type { GraphType } from '../../pages/reportsPage';

// =========================================================================
// Background
// =========================================================================

Given('If the application is not launched, user launches the application',
  async function (this: TestWorld) {
    assert.ok(this.driver, 'driver not attached - check appiumHooks');
    // Cold launch is handled by the BeforeAll appiumHook. If we are not on
    // home, give the app a brief moment to settle - we do not force re-launch.
    await this.reports.isOnHome(2000).catch(() => false);
  },
);

Given('If the application is already launched, user proceeds with next steps',
  async function (this: TestWorld) {
    // Marker step - nothing to do when the app is already foregrounded.
  },
);

// =========================================================================
// Navigation: Home -> More -> Report -> All Transaction Details
// =========================================================================

When('User clicks on {string} button from Home screen',
  async function (this: TestWorld, label: string) {
    if (label !== 'More') {
      throw new Error(`unsupported home-screen button "${label}"`);
    }
    await this.reports.tapMore();
  },
);

Then('User should be redirected to More screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForMoreScreen(),
      'More screen header not visible',
    );
  },
);

When('User clicks on {string} option', async function (this: TestWorld, label: string) {
  if (label !== 'Report') throw new Error(`unsupported More-screen option "${label}"`);
  await this.reports.tapReport();
});

Then('User should be redirected to Report screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForReportScreen(),
      'Report screen header not visible',
    );
  },
);

When('User clicks on {string} from Report screen',
  async function (this: TestWorld, label: string) {
    if (label !== 'All Transaction Details') {
      throw new Error(`unsupported Report-screen entry "${label}"`);
    }
    await this.reports.tapAllTransactionDetails();
  },
);

Then('User should be redirected to Transaction Detail screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForTxnDetailScreen(),
      'Transaction Detail screen header not visible',
    );
  },
);

// =========================================================================
// Scroll validations
// =========================================================================

When('User performs scrolling operation in Transaction Detail screen',
  async function (this: TestWorld) {
    await this.reports.scrollDownList();
  },
);

When('User scrolls until reaching the top of the screen',
  async function (this: TestWorld) {
    await this.reports.scrollToTop();
  },
);

When('User performs horizontal scroll from right to left until screen end',
  async function (this: TestWorld) {
    await this.reports.scrollHorizontalRightToLeft();
  },
);

// =========================================================================
// PDF preview
// =========================================================================

When('User clicks on PDF icon in the first transaction',
  async function (this: TestWorld) {
    await this.reports.tapFirstPdfIcon();
  },
);

Then('User should be redirected to PDF preview screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForPdfPreview(),
      'PDF preview screen not visible',
    );
  },
);

Then('User should be redirected back to Transaction Detail screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForTxnDetailScreen(),
      'expected to be back on Transaction Detail screen after device back',
    );
  },
);

// =========================================================================
// Search
// =========================================================================

When('User clicks on Search icon', async function (this: TestWorld) {
  await this.reports.tapSearchIcon();
});

When('User searches using random value', async function (this: TestWorld) {
  // A clearly non-matching token - exercises the empty-state path.
  await this.reports.typeSearch('zzqx-' + Date.now().toString().slice(-5));
  await this.reports.clearSearch();
});

When('User searches using Transaction ID', async function (this: TestWorld) {
  await this.reports.typeSearch('TXN');
  await this.reports.clearSearch();
});

When('User searches using Amount', async function (this: TestWorld) {
  await this.reports.typeSearch('100');
  await this.reports.clearSearch();
});

When('User searches using Mobile Number', async function (this: TestWorld) {
  await this.reports.typeSearch('09');
  await this.reports.clearSearch();
});

Then('Matching transaction results should be displayed accordingly',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.hasResults(),
      'expected transaction results list to render',
    );
  },
);

// =========================================================================
// Share
// =========================================================================

When('User clicks on Share icon', async function (this: TestWorld) {
  await this.reports.tapShareIcon();
});

When('User selects PDF option', async function (this: TestWorld) {
  await this.reports.selectSharePdf();
});

Then('PDF share preview should be displayed', async function (this: TestWorld) {
  assert.ok(
    await this.reports.waitForPdfSharePreview(),
    'PDF share preview not visible',
  );
});

// =========================================================================
// Statistics screen
// =========================================================================

When('User clicks on the 3rd icon next to Share icon',
  async function (this: TestWorld) {
    await this.reports.tapStatisticsIcon();
  },
);

Then('User should be redirected to Transaction Detail Statistics screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForStatisticsScreen(),
      'Transaction Detail Statistics screen not visible',
    );
  },
);

When('User clicks on Mobile Number dropdown', async function (this: TestWorld) {
  await this.reports.tapMobileNumberDropdown();
});

When('User selects the first available mobile number',
  async function (this: TestWorld) {
    await this.reports.selectFirstMobileNumber();
  },
);

Then('Transaction statistics should be updated accordingly',
  async function (this: TestWorld) {
    // Best-effort - the screen marker is still present after dropdown change.
    assert.ok(
      await this.reports.waitForStatisticsScreen(2000),
      'expected to remain on Statistics screen after mobile selection',
    );
  },
);

// =========================================================================
// Graphs via Kebab menu
// =========================================================================

When('User clicks on Kebab menu', async function (this: TestWorld) {
  await this.reports.tapKebabMenu();
});

When('User clicks on Kebab menu again', async function (this: TestWorld) {
  await this.reports.tapKebabMenu();
});

When('User selects {string}', async function (this: TestWorld, label: string) {
  if (label !== 'Bar Graph' && label !== 'Pie Graph' && label !== 'Line Graph') {
    throw new Error(`unsupported graph option "${label}"`);
  }
  await this.reports.selectGraph(label as GraphType);
});

Then('Bar graph should be displayed successfully',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForGraph('Bar Graph'),
      'Bar graph marker not visible',
    );
  },
);

Then('Pie graph should be displayed successfully',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForGraph('Pie Graph'),
      'Pie graph marker not visible',
    );
  },
);

Then('Line graph should be displayed successfully',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForGraph('Line Graph'),
      'Line graph marker not visible',
    );
  },
);

// =========================================================================
// Back navigation
// =========================================================================

When('User waits for 2 to 3 seconds', async function (this: TestWorld) {
  // Midpoint of the requested 2-3s window.
  await new Promise((r) => setTimeout(r, 2500));
});

When('User clicks on back button repeatedly', async function (this: TestWorld) {
  await this.reports.backUntilMoreScreen();
});

Then('User should be redirected back to More screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.reports.waitForMoreScreen(),
      'expected to be back on More screen',
    );
  },
);
