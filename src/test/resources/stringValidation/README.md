# App string resources for the localization (string validation) audit

The audit compares the text the app actually shows on screen against the app's
string resources, keyed by `name`. Two files live here:

- `strings.en.xml` — the **English** resource file (Android `values/strings.xml`).
- `strings.my.xml` — the **Myanmar / Unicode** resource file (Android `values-my/strings.xml`).

Both use the flat Android format:

```xml
<resources>
  <string name="merchant_info">Merchant Information</string>
  ...
</resources>
```

## Keeping these in sync with the app

Replace the contents whenever the app's strings change — copy from the app source
`app/src/main/res/values/strings.xml` and `.../values-my/strings.xml`, or extract
them from the APK with `apktool`.

The `name` keys **must** be identical across the two files — that is exactly what
`npm run test:stringValidation:parity` verifies.

## Pointing at files elsewhere

The defaults are these two files. To point at files outside the repo, set env vars
before running:

```
STRING_VALIDATION_EN_PATH=C:\path\to\values\strings.xml
STRING_VALIDATION_MY_PATH=C:\path\to\values-my\strings.xml
```

## Running the audit & where reports go

The audit runs automatically on **every** feature run (set `STRING_VALIDATION_AUDIT=0`
to skip). It audits whatever screens the run visits and writes **fresh** report files —
nothing is ever appended.

Because the app renders one language at a time, run each feature **twice** — once per
language. The two runs are complementary halves and are stored side by side:

```
(set app to English)  npm run test:stringValidation:en -- --feature payTo
(set app to Myanmar)  npm run test:stringValidation:my -- --feature payTo
```

This produces, under `target/stringValidation/<feature>/`:

```
payTo/
  payTo_en_2026-06-16_10-30-45.html      ← English run (raw)
  payTo_en_2026-06-16_10-30-45.json
  payTo_my_2026-06-16_10-46-12-771.html      ← Myanmar run (raw)
  payTo_my_2026-06-16_10-46-12-771.json
  payTo_final_2026-06-16_10-46-12-771.html   ← auto-written after the 2nd run:
  payTo_final_2026-06-16_10-46-12-771.json      name | English | Myanmar | status
```

- Each filename carries the **feature**, the **language**, and the **execution time**
  (down to milliseconds).
- Status reads in plain terms: `matched`, `Myanmar not available`, `English not
  available` (and `not matched` when a label isn't in its own language's XML).
- The second language run auto-writes the `_final_` file by reading the two raw
  files — the raw files are never modified (no appending).
- `npm run test:sequence` (or `test:stringValidation:en` with no `--feature`) audits
  every flow and drops one file into each feature's folder.
- Under `--parallel`, files get a `.w<id>` suffix so workers don't collide.

## Notes

- Entries marked `translatable="false"` are skipped by the audit — they are signature
  flags / behavior class names, not user-facing copy.
- See `src/test/ts/support/stringsRepository.ts` (parser + lookup maps) and
  `src/test/ts/support/stringValidationAuditor.ts` (per-screen audit + per-feature
  report + auto-combine).
