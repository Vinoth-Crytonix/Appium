const reporter = require('cucumber-html-reporter');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..');

reporter.generate({
  theme: 'bootstrap',
  jsonFile: path.join(root, 'target', 'cucumber-report.json'),
  output:   path.join(root, 'target', 'cucumber-html.html'),
  reportSuiteAsScenarios: true,
  scenarioTimestamp: true,
  launchReport: false,
  metadata: {
    'App':      'com.jas.digitalkyats',
    'Mobile':   'Appium UiAutomator2 (WebdriverIO 9)',
    'Web':      'Playwright (Chromium)',
    'BDD':      'Cucumber-JS 11 (TypeScript)',
    'Pattern':  'Page Object Model',
    'Data':     'JSON-driven',
    'MCP':      '.mcp.json (Playwright + Appium stub)',
  },
});
