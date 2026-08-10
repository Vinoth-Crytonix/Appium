# Appium Android — Cucumber-TS framework

Mobile BDD framework for the OK$ (DigitalKyats) Android app: native UI driven
by Appium UiAutomator2, scenarios written in Gherkin, glue in TypeScript.
Directory layout mirrors a Maven-style `src/test/{ts,resources}` project.

```
appium-android-project/
├── .github/workflows/ci.yml                    GitHub Actions (self-hosted)
├── .gitignore
├── .mcp.json                                   MCP client config (Appium stub)
├── README.md
├── cucumber.config.js                          Cucumber-JS runtime config
├── package.json
├── tsconfig.json
├── mcp/
│   └── appium-mcp-stub.js                      Minimal Appium MCP server
└── src/test/
    ├── ts/
    │   ├── pages/                              Page Objects — one per module
    │   │   ├── BasePage.ts                     Shared page primitives
    │   │   ├── LoginPage.ts
    │   │   ├── payToPage.ts
    │   │   ├── RequestMoneyPage.ts
    │   │   ├── MerchantPaymentPage.ts
    │   │   ├── electricityPage.ts
    │   │   ├── myanmarPayPersonalPage.ts
    │   │   ├── myanmarPayHistoryPage.ts
    │   │   ├── recentTransactionsPage.ts
    │   │   └── reportsPage.ts
    │   ├── locators/                           Selectors, one file per module
    │   │   ├── common.locators.ts
    │   │   ├── popups.locators.ts
    │   │   └── <module>.locators.ts            login, payto, requestMoney, merchant,
    │   │                                       electricity, myanmarPay*, reports, …
    │   ├── steps/                              Cucumber glue, one folder per module
    │   │   ├── login/  payTo/  requestMoney/
    │   │   ├── merchantPayment/  electricity/
    │   │   ├── myanmarPay/  recentTransactions/  reports/
    │   │   └── validation/                     api, common, device, perf, security steps
    │   ├── hooks/                              Before/After hooks
    │   │   ├── appiumHooks.ts                  Driver lifecycle
    │   │   ├── loginHooks.ts
    │   │   ├── popupHooks.ts
    │   │   ├── perfHooks.ts
    │   │   ├── screenshotHooks.ts
    │   │   └── stringValidationHooks.ts
    │   ├── support/                            Driver, UI actions, shared utilities
    │   │   ├── world.ts                        Cucumber World
    │   │   ├── DriverManager.ts                Appium session lifecycle
    │   │   ├── UiActions.ts / IUiActions.ts    UI action layer + interface
    │   │   ├── navigation.ts  waits.ts  random.ts
    │   │   ├── popupHandler.ts  diagnostics.ts  transactionLog.ts
    │   │   ├── apiActions.ts  deviceActions.ts  perfHookUtils.ts
    │   │   └── stringsRepository.ts  stringValidationAuditor.ts
    │   ├── runner/                             Custom sequence runners
    │   │   ├── runner.ts
    │   │   ├── runElectricitySequence.js
    │   │   └── runStringValidationAudit.ts
    │   └── reporting/
    │       ├── generate-report.js             Interactive HTML report (Chart.js pie)
    │       ├── generate-excel.ts              XLSX report (Summary + Steps sheets)
    │       ├── run-and-report.js              Run cucumber then build reports
    │       └── stringValidationParity.ts
    └── resources/
        ├── features/                          Gherkin features, one folder per module
        │   ├── login/login.feature
        │   ├── payTo/payTo.feature
        │   ├── requestMoney/requestMoney.feature
        │   ├── merchantPayment/merchantPayment.feature
        │   ├── electricity/electricity.feature
        │   ├── myanmarPay/myanmarPayPersonal.feature
        │   ├── myanmarPay/myanmarPayHistory.feature
        │   ├── recentTransactions/recentTransactions.feature
        │   ├── reports/allTransactionDetails.feature
        │   └── validation/                     12 cross-cutting validation features
        ├── config/
        │   └── android.caps.json              Appium UiAutomator2 capabilities
        ├── data/
        │   └── testdata.json                  JSON-driven test data
        └── stringValidation/                  EN/MY string-parity resources
            ├── strings.en.xml
            ├── strings.my.xml
            └── README.md
```

## Stack

| Layer        | Tool                                              |
|--------------|---------------------------------------------------|
| Mobile       | **Appium 2 / UiAutomator2** via **WebdriverIO 9** |
| BDD harness  | **Cucumber-JS 11** + **TypeScript**               |
| Test data    | JSON (`src/test/resources/data/testdata.json`)    |
| MCP          | `.mcp.json` + `mcp/appium-mcp-stub.js`            |
| Reporting    | Custom HTML (Chart.js pie) + Excel (ExcelJS)      |
| CI           | GitHub Actions (self-hosted runner)               |

Layered Page Object Model: `features/` describe behaviour, `steps/` bind Gherkin
to `pages/`, `pages/` drive the UI through `locators/` and the `support/` action
layer (`UiActions`), `hooks/` own the cross-cutting lifecycle (driver, login,
popups, screenshots, perf), and the World wires the driver into each scenario.

## Behaviour

### PayTo feature (default)
End-to-end payment in a single scenario:

```
Given I am on the home screen
When  I tap the Pay tab
And   I enter the configured account number
And   I enter a random amount with at most 3 digits
And   I enter remarks "Test"
And   I tap Submit
Then  the payment is completed and the receipt is captured
```

The final step transparently:
1. detects the login screen and calls `performLogin()` (just enters the
   password and taps the Login button — no payment work);
2. taps **Pay** on the confirmation screen;
3. saves `target/receipt.png`;
4. taps **Home**;
5. asserts we're back on the home tab.

### Login feature (`@login-only`, opt-in)
Tests the login screen in isolation — no payment side effects:

```
Given the login screen is shown
When  I log in with the configured password
Then  the login screen is dismissed
```

Excluded from the default run (`tags: 'not @login-only'` in
`cucumber.config.js`). The Login hook does **not** restart the app — the device
is expected to already be on the login screen.

## Scripts

```pwsh
npm install
appium --base-path /          # in a separate terminal

npm test                      # default — runs PayTo only (one payment)
npm run test:payto            # explicit path, same effect
npm run test:login            # @login-only feature (must be on login screen)
npm run test:all              # both features (two payments)
npm run test:dry              # validate step bindings without driving the device

npm run report                # HTML + Excel
npm run report:html           # target/cucumber-html.html
npm run report:excel          # target/cucumber-report.xlsx

npm run typecheck             # tsc --noEmit
```

## Reports

| File | What |
|------|------|
| `target/cucumber-html.html`   | Interactive HTML — clickable pie chart, status filter, drill-down to steps |
| `target/cucumber-report.xlsx` | Summary sheet + Steps sheet, colour-coded by status |
| `target/cucumber-report.json` | Raw Cucumber JSON — input to the two reporters |
| `target/receipt.png`          | Screenshot of the receipt screen |
| `target/failure-*.png`        | Failure screenshots (After-hook, per scenario) |

## MCP

`.mcp.json` registers an Appium MCP server (the small stub in
`mcp/appium-mcp-stub.js`) for interactive driving from LLM-aware clients
(Claude Code, Cursor). It is not part of the test run.

## Capabilities

Edit `src/test/resources/config/android.caps.json` to match your device. The
critical fields are `appium:udid`, `appium:platformVersion`, `appium:appPackage`
and `appium:appActivity`. `appium:noReset: true` preserves account state across
runs.
