/**
 * Reads target/cucumber-report.json and emits target/cucumber-report.xlsx
 * with one row per step plus a "Summary" sheet.
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const JSON_FILE = path.join(ROOT, 'target', 'cucumber-report.json');
const OUT       = path.join(ROOT, 'target', 'cucumber-report.xlsx');

type CucStep   = { keyword: string; name: string; result?: { status: string; duration?: number; error_message?: string } };
type CucElement = { name: string; type: string; steps: CucStep[] };
type CucFeature = { uri: string; name: string; elements: CucElement[] };

async function main() {
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`cucumber JSON not found: ${JSON_FILE}\nRun "npm test" first.`);
    process.exit(1);
  }

  const features: CucFeature[] = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  const wb = new ExcelJS.Workbook();
  wb.creator = 'appium-android-project';
  wb.created = new Date();

  // ----- Summary sheet -----
  const summary = wb.addWorksheet('Summary');
  summary.columns = [
    { header: 'Feature',    key: 'feature',  width: 40 },
    { header: 'Scenario',   key: 'scenario', width: 60 },
    { header: 'Status',     key: 'status',   width: 12 },
    { header: 'Steps',      key: 'steps',    width: 8  },
    { header: 'Passed',     key: 'passed',   width: 8  },
    { header: 'Failed',     key: 'failed',   width: 8  },
    { header: 'Skipped',    key: 'skipped',  width: 8  },
    { header: 'Duration s', key: 'duration', width: 12 },
  ];

  // ----- Steps sheet -----
  const stepsWs = wb.addWorksheet('Steps');
  stepsWs.columns = [
    { header: 'Feature',    key: 'feature',  width: 40 },
    { header: 'Scenario',   key: 'scenario', width: 50 },
    { header: 'Keyword',    key: 'keyword',  width: 10 },
    { header: 'Step',       key: 'step',     width: 80 },
    { header: 'Status',     key: 'status',   width: 12 },
    { header: 'Duration s', key: 'duration', width: 12 },
    { header: 'Error',      key: 'error',    width: 80 },
  ];

  let totalScenarios = 0, totalPassed = 0, totalFailed = 0;

  for (const feat of features) {
    for (const sc of feat.elements || []) {
      if (sc.type !== 'scenario') continue;
      totalScenarios++;

      let passed = 0, failed = 0, skipped = 0, durationNs = 0;

      for (const step of sc.steps || []) {
        const status = step.result?.status ?? 'unknown';
        const dur = step.result?.duration ?? 0;
        durationNs += dur;
        if (status === 'passed')  passed++;
        if (status === 'failed')  failed++;
        if (status === 'skipped') skipped++;

        const row = stepsWs.addRow({
          feature:  feat.name,
          scenario: sc.name,
          keyword:  step.keyword?.trim(),
          step:     step.name,
          status,
          duration: (dur / 1e9).toFixed(3),
          error:    step.result?.error_message?.split('\n')[0] ?? '',
        });
        colourRow(row, status);
      }

      const scStatus = failed > 0 ? 'failed' : (passed > 0 ? 'passed' : 'skipped');
      if (scStatus === 'passed') totalPassed++;
      if (scStatus === 'failed') totalFailed++;

      const row = summary.addRow({
        feature:  feat.name,
        scenario: sc.name,
        status:   scStatus,
        steps:    (sc.steps || []).length,
        passed, failed, skipped,
        duration: (durationNs / 1e9).toFixed(3),
      });
      colourRow(row, scStatus);
    }
  }

  // Header style
  [summary, stepsWs].forEach(ws => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } } as any;
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  // Totals row
  summary.addRow({});
  const totals = summary.addRow({
    feature:  'TOTAL',
    scenario: `${totalScenarios} scenarios`,
    status:   totalFailed === 0 ? 'passed' : 'failed',
    passed:   totalPassed,
    failed:   totalFailed,
  });
  totals.font = { bold: true };

  await wb.xlsx.writeFile(OUT);
  console.log(`Excel report written → ${path.relative(ROOT, OUT)}`);
}

function colourRow(row: ExcelJS.Row, status: string) {
  const fillColor =
    status === 'passed'  ? 'FFD4EDDA' :
    status === 'failed'  ? 'FFF8D7DA' :
    status === 'skipped' ? 'FFFFF3CD' : 'FFE2E3E5';
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } as any;
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
