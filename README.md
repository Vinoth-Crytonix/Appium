# Appium Android — Cucumber-TS framework

Mobile BDD framework for the OK$ (DigitalKyats) Android app: native UI driven
by Appium UiAutomator2, scenarios written in Gherkin, glue in TypeScript.
Directory layout mirrors a Maven-style `src/test/{ts,resources}` project.

```
appium-android-project/
├── .github/workflows/ci.yml                GitHub Actions (self-hosted)
├── .gitignore
├── .mcp.json                               MCP client config (Appium stub)
├── README.md
├── cucumber.config.js                      Cucumber-JS runtime config
├── package.json
├── tsconfig.json
├── mcp/
│   └── appium-mcp-stub.js                  Minimal Appium MCP server
└── src/test/
    ├── ts/
    │   ├── support/world.ts                Driver lifecycle, hooks, low-level helpers
    │   ├── steps/
    │   │   ├── PayTo.steps.ts              Owns the whole payment flow
    │   │   └── Login.steps.ts              Credentials + Login button only
    │   └── reporting/
    │       ├── generate-report.js          Interactive HTML report (Chart.js pie)
    │       └── generate-excel.ts           XLSX report (Summary + Steps sheets)
    └── resources/
        ├── features/
        │   ├── PayTo/PayToSubmit.feature   default suite (one payment)
        │   └── Login/LoginAuth.feature     @login-only — opt-in
        ├── config/
        │   └── android.caps.json           Appium UiAutomator2 capabilities
        └── data/
            └── testdata.json               JSON-driven test data
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

No Page Object Model classes, no separate `base/` / `hooks/` / `pages/` folders
— the steps own their locators, the World owns the driver lifecycle and the
low-level Appium helpers.

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
