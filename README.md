# Appium + Playwright + Cucumber-TS (Maven-style layout)

Mobile + Web BDD framework. Directory hierarchy mirrors the Karate_MMQR
reference: `src/test/{ts,resources}`, features grouped by domain, build output
under `target/`.

```
appium-android-project/
├── .github/workflows/ci.yml          GitHub Actions
├── .gitignore
├── .mcp.json                         MCP client config (Playwright + Appium MCP)
├── Jenkinsfile                       Declarative pipeline
├── README.md
├── cucumber.config.js                Cucumber-JS runtime config
├── package.json                      (Node-stack equivalent of pom.xml)
├── tsconfig.json
├── mcp/
│   └── appium-mcp-stub.js            Minimal MCP server exposing Appium tools
└── src/test/
    ├── ts/                           (mirrors Karate's src/test/java/)
    │   ├── base/
    │   │   ├── AppiumDriver.ts       WDIO Appium session lifecycle
    │   │   ├── PlaywrightDriver.ts   Playwright Chromium lifecycle
    │   │   ├── DriverManager.ts      Channel switch (mobile / web)
    │   │   └── BasePage.ts           Shared mobile actions
    │   ├── pages/                    Page Object Model
    │   │   ├── HomePage.ts
    │   │   ├── PayPage.ts
    │   │   ├── LoginPage.ts
    │   │   ├── ConfirmationPage.ts
    │   │   └── ReceiptPage.ts
    │   ├── steps/
    │   │   ├── PayTo.steps.ts
    │   │   └── Login.steps.ts
    │   ├── hooks/Hooks.ts            tag-aware (@mobile / @web)
    │   ├── support/World.ts          Cucumber world
    │   └── reporting/generate-report.js
    └── resources/
        ├── features/
        │   ├── PayTo/
        │   │   └── PayToSubmit.feature
        │   └── Login/
        │       └── LoginAuth.feature
        ├── config/
        │   ├── android.caps.json     Appium UiAutomator2 capabilities
        │   └── playwright.config.ts  Browser/viewport defaults
        ├── data/
        │   └── testdata.json         JSON-driven test data
        └── logback-test.xml          Placeholder for Maven-aware tooling
```

## Run

```pwsh
npm install
appium --base-path /                  # in a separate terminal
npm test                              # everything
npm run test:mobile                   # all @mobile features
npm run test:payto                    # just PayTo
npm run test:login                    # just Login
npm run test:web                      # all @web features (Playwright)
npm run report                        # target/cucumber-html.html
```

Reports + screenshots + logs all land in `target/` (matching the Maven build
output convention).

## Stack

| Layer        | Tool                                          |
|--------------|-----------------------------------------------|
| Mobile       | **Appium** UiAutomator2 via **WebdriverIO 9** |
| Web          | **Playwright** (Chromium)                     |
| BDD harness  | **Cucumber-JS 11** + **TypeScript**           |
| Architecture | **Page Object Model**                         |
| Test data    | **JSON** (`src/test/resources/data/`)         |
| MCP          | `.mcp.json` + `mcp/appium-mcp-stub.js`        |
| CI/CD        | **Jenkinsfile** + GitHub Actions              |
| Reporting    | Cucumber JSON + HTML + failure screenshots    |
