#!/usr/bin/env node
/**
 * Run the three Electricity scenarios as separate cucumber-js processes so
 * each one gets a fresh Appium session. Continues to the next scenario even
 * if the previous one fails — the goal is to attempt every Examples row,
 * not abort on the first flake.
 */
const { spawnSync } = require('node:child_process');

const scenarios = [
  'Not Updated Number',
  'Duplicate Meter Payment Flow',
  'Other Meter Payment Flow',
];

const results = [];
for (const name of scenarios) {
  console.log(`\n=== Running scenario: "${name}" ===\n`);
  // Call cucumber-js's bin directly via Node (skip the `npx` wrapper's
  // ~1-2s lookup + node-startup overhead per invocation).
  const cucumberBin = require('node:path').resolve(
    'node_modules/@cucumber/cucumber/bin/cucumber.js',
  );
  const r = spawnSync(
    process.execPath,
    [cucumberBin, '--config', 'cucumber.config.js', '--profile', 'all', '--name', name],
    { stdio: 'inherit' },
  );
  results.push({ name, code: r.status });
}

console.log('\n=== Electricity sequence summary ===');
for (const { name, code } of results) {
  console.log(`  ${code === 0 ? 'PASS' : 'FAIL'}  ${name}`);
}
const failed = results.filter(r => r.code !== 0).length;
process.exit(failed === 0 ? 0 : 1);
