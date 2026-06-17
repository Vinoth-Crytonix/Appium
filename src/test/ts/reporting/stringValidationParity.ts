/**
 * stringValidationParity - device-free name-parity check between the two
 * string files in src/test/resources/stringValidation/.
 *
 * Parses strings.en.xml and strings.my.xml and reports any `name` key present
 * in one file but missing from the other. This is the fast feedback loop: it
 * needs no Appium session and runs in milliseconds.
 *
 * Run via `npm run test:stringValidation:parity`. Exits 1 when keys are out of
 * sync so it can gate CI; exits 0 when the files agree (or aren't present yet).
 */

import { getStringsRepository, EN_PATH, MY_PATH } from '../support/stringsRepository';

function main(): number {
  const repo = getStringsRepository();
  if (!repo.isLoaded) {
    console.log('string validation parity: no string resources found.');
    console.log(`  expected English: ${EN_PATH}`);
    console.log(`  expected Myanmar: ${MY_PATH}`);
    console.log('  Add both files (or set STRING_VALIDATION_EN_PATH / STRING_VALIDATION_MY_PATH) and re-run.');
    return 0;
  }

  const { missingInMy, missingInEn, enCount, myCount } = repo.parityReport();
  console.log(`string validation parity: English keys=${enCount}, Myanmar keys=${myCount}`);

  if (missingInMy.length === 0 && missingInEn.length === 0) {
    console.log('  OK - every name is mapped in both languages.');
    return 0;
  }

  if (missingInMy.length) {
    console.log(`\n  Missing from Myanmar (${missingInMy.length}):`);
    for (const n of missingInMy) console.log(`    - ${n}`);
  }
  if (missingInEn.length) {
    console.log(`\n  Missing from English (${missingInEn.length}):`);
    for (const n of missingInEn) console.log(`    - ${n}`);
  }
  return 1;
}

process.exit(main());
