// baseRequires: shared cucumber-js config that does NOT set paths or tags.
// Profiles that should run all features layer on the default-paths glob via
// `common`; the `isolated` profile uses baseRequires directly so the runner
// can supply paths/tags from the CLI without the profile widening them.
// Where this process writes its cucumber JSON. Concurrent device processes must
// NOT share one path or they overwrite each other's results — the runner sets
// RUN_REPORT_JSON per device/iteration and merges them back into
// target/cucumber-report.json afterwards, so the HTML/Excel reporters (which
// read that fixed path) keep working unchanged.
const REPORT_JSON = process.env.RUN_REPORT_JSON || 'target/cucumber-report.json';

const baseRequires = {
  requireModule: ['ts-node/register/transpile-only', 'tsconfig-paths/register'],
  require: [
    'src/test/ts/support/**/*.ts',
    'src/test/ts/hooks/**/*.ts',
    'src/test/ts/steps/**/*.ts',
  ],
  format: [
    'progress-bar',
    // Quoted form: cucumber-js deprecates the bare `json:<path>` spelling once
    // the path itself contains a colon (a Windows drive letter, e.g. D:/...).
    `"json":"${REPORT_JSON}"`,
    'summary',
  ],
  formatOptions: { snippetInterface: 'async-await' },
  timeout: 240000,
};

const common = {
  ...baseRequires,
  paths: ['src/test/resources/features/**/*.feature'],
};

module.exports = {
  // Default keeps existing behaviour: PayTo + Request Money, both flow features.
  // Validation features are opt-in via their @ui / @device / ... tags.
  default: {
    ...common,
    tags: 'not @login-only and not @merchant-payment and not @validation and not @voucher-login and not @app-version and not @personal-profile',
  },

  // Flow profiles
  login:    { ...common, tags: '@login-only' },
  // Repeated login via the Voucher module — opt-in, it is a 15-cycle loop.
  voucher:  { ...common, tags: '@voucher-login' },
  // Installed-build guard — opt-in, it is a loop like the voucher one.
  appVersion: { ...common, tags: '@app-version' },
  // Profile edit path — opt-in: it writes to the account (email change).
  personalProfile: { ...common, tags: '@personal-profile' },
  request:  { ...common, tags: '@request-money' },
  merchant: { ...common, tags: '@merchant-payment' },

  // All app-flow features in one run: login, payTo, request money, merchant
  // payment and recent transactions. Explicit file paths so this profile is
  // not affected by tag drift in feature files.
  flows: {
    ...common,
    paths: [
      'src/test/resources/features/login/login.feature',
      'src/test/resources/features/payTo/payTo.feature',
      'src/test/resources/features/requestMoney/requestMoney.feature',
      'src/test/resources/features/merchantPayment/merchantPayment.feature',
      'src/test/resources/features/recentTransactions/recentTransactions.feature',
    ],
  },

  // Validation profiles - run one validation area at a time
  ui:            { ...common, tags: '@ui' },
  functional:    { ...common, tags: '@functional' },
  navigation:    { ...common, tags: '@navigation' },
  api:           { ...common, tags: '@api' },
  device:        { ...common, tags: '@device' },
  permission:    { ...common, tags: '@permission' },
  network:       { ...common, tags: '@network' },
  security:      { ...common, tags: '@security' },
  performance:   { ...common, tags: '@performance' },
  notification:  { ...common, tags: '@notification' },
  interruption:  { ...common, tags: '@interruption' },
  localization:  { ...common, tags: '@localization' },

  // Aggregate profile - all validation areas in one run.
  validation:    { ...common, tags: '@ui or @functional or @navigation or @api or @device or @permission or @network or @security or @performance or @notification or @interruption or @localization' },

  all:           { ...common },

  // Isolated profile used by the runner (--feature / --tags / --sequence).
  // No paths or tags here — the runner supplies them on the CLI, so each
  // step executes exactly the feature(s) it was asked to.
  isolated:      { ...baseRequires, require: [
    'src/test/ts/support/**/*.ts',
    'src/test/ts/hooks/**/*.ts',
    'src/test/ts/steps/**/*.ts',
  ] },

  // Flow-only isolated profile: loads ONLY flow step definitions, skipping
  // reports/ and validation/. Used when running the 7-flow sequence (so
  // reports' duplicate `User clicks on {string}` / Transaction-Detail
  // matchers don't collide with the flow steps).
  isolatedFlows: { ...baseRequires, require: [
    'src/test/ts/support/**/*.ts',
    'src/test/ts/hooks/**/*.ts',
    'src/test/ts/steps/login/**/*.ts',
    'src/test/ts/steps/payTo/**/*.ts',
    'src/test/ts/steps/requestMoney/**/*.ts',
    'src/test/ts/steps/merchantPayment/**/*.ts',
    'src/test/ts/steps/myanmarPay/**/*.ts',
    'src/test/ts/steps/electricity/**/*.ts',
    'src/test/ts/steps/recentTransactions/**/*.ts',
  ] },
};
