module.exports = {
  default: {
    requireModule: ['ts-node/register', 'tsconfig-paths/register'],
    require: [
      'src/test/ts/support/**/*.ts',
      'src/test/ts/hooks/**/*.ts',
      'src/test/ts/steps/**/*.ts',
    ],
    paths: ['src/test/resources/features/**/*.feature'],
    format: [
      'progress-bar',
      'json:target/cucumber-report.json',
      'html:target/cucumber-report.html',
      'summary',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    timeout: 240000,
  },
};
