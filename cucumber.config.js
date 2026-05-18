const common = {
  requireModule: ['ts-node/register', 'tsconfig-paths/register'],
  require: [
    'src/test/ts/support/**/*.ts',
    'src/test/ts/steps/**/*.ts',
  ],
  paths: ['src/test/resources/features/**/*.feature'],
  format: [
    'progress-bar',
    'json:target/cucumber-report.json',
    'summary',
  ],
  formatOptions: { snippetInterface: 'async-await' },
  timeout: 240000,
};

module.exports = {
  // Default: PayTo + Request Money. @login-only and @merchant-payment are
  // opt-in (the former re-runs PayTo in its Background; the latter is a
  // long recorded coordinate flow).
  default: { ...common, tags: 'not @login-only and not @merchant-payment' },

  // Opt-in profiles
  login:    { ...common, tags: '@login-only' },
  request:  { ...common, tags: '@request-money' },
  merchant: { ...common, tags: '@merchant-payment' },
  all:      { ...common },   // no tag filter — runs everything
};
