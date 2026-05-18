#!/usr/bin/env node
/**
 * Wrapper around cucumber-js that ALWAYS regenerates the HTML + Excel
 * reports afterwards, regardless of test success or failure. Without this,
 * npm's `posttest` hook only fires on a green run, so failing runs leave
 * stale reports on disk.
 *
 * Forwards every argv after this script to cucumber-js, then runs
 * `npm run report` (which produces both HTML and Excel), then exits with
 * cucumber's own exit code.
 *
 *   "test": "node src/test/ts/reporting/run-and-report.js --config cucumber.config.js"
 */

const { spawnSync } = require('child_process');

const cucumberArgs = process.argv.slice(2);

function run(cmd, args) {
  // shell:true so npm.cmd / cucumber-js.cmd resolve on Windows.
  return spawnSync(cmd, args, { stdio: 'inherit', shell: true }).status ?? 1;
}

const testStatus   = run('cucumber-js', cucumberArgs);
const reportStatus = run('npm', ['run', 'report']);

// Surface cucumber's exit code so CI still flags failed runs;
// fall back to the reporter's status only if cucumber succeeded.
process.exit(testStatus !== 0 ? testStatus : reportStatus);
