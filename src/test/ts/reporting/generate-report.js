/**
 * Custom HTML report — interactive Chart.js pie + drill-down.
 * Reads target/cucumber-report.json, emits target/cucumber-html.html.
 *
 *   - Pie slices: green=passed, red=failed, gold=skipped/undefined
 *   - Click a slice → scenario list filters to that status
 *   - Click a scenario → expands to show steps with status + duration + error
 */

const fs = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..', '..', '..', '..');
const JSON_IN    = path.join(ROOT, 'target', 'cucumber-report.json');
const HTML_OUT   = path.join(ROOT, 'target', 'cucumber-html.html');
const FEATURE_DIR = path.join(ROOT, 'src', 'test', 'resources', 'features');

if (!fs.existsSync(JSON_IN)) {
  console.error(`cucumber JSON not found: ${JSON_IN}\nRun "npm test" first.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(JSON_IN, 'utf-8'));

/**
 * Walk the .feature files and collect every (feature, scenario, steps) tuple,
 * so we can show scenarios that were skipped by tag-filtering in addition to
 * the ones cucumber actually executed.
 */
function walkFeatures(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { out.push(...walkFeatures(p)); continue; }
    if (!entry.name.endsWith('.feature')) continue;
    out.push(...parseFeature(p));
  }
  return out;
}

function parseFeature(file) {
  const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
  const items = [];
  let feature = path.basename(file, '.feature');
  let scenario = null;
  let bgSteps = [];
  let inBackground = false;
  const stepKw = /^\s*(Given|When|Then|And|But)\b\s*(.*)$/;
  for (const ln of lines) {
    const fm = ln.match(/^Feature:\s*(.+)$/);
    if (fm) { feature = fm[1].trim(); continue; }
    if (/^\s*Background:/.test(ln))            { inBackground = true;  bgSteps = []; continue; }
    const sm = ln.match(/^\s*Scenario(?: Outline)?:\s*(.+)$/);
    if (sm) {
      inBackground = false;
      if (scenario) items.push(scenario);
      scenario = { feature, name: sm[1].trim(), steps: [...bgSteps] };
      continue;
    }
    const km = ln.match(stepKw);
    if (km) {
      const step = { keyword: km[1], name: km[2].trim() };
      if (inBackground) bgSteps.push(step);
      else if (scenario) scenario.steps.push(step);
    }
  }
  if (scenario) items.push(scenario);
  return items;
}

const allDeclared = walkFeatures(FEATURE_DIR);

/** @returns 'passed' | 'failed' | 'skipped' */
function scenarioStatus(steps = []) {
  if (steps.some(s => s.result?.status === 'failed'))    return 'failed';
  if (steps.some(s => s.result?.status === 'undefined')) return 'failed';
  if (steps.length === 0)                                return 'skipped';
  if (steps.every(s => s.result?.status === 'skipped'))  return 'skipped';
  return 'passed';
}

const scenarios = [];
const executedKeys = new Set();
for (const feat of raw) {
  for (const sc of feat.elements || []) {
    if (sc.type !== 'scenario') continue;
    const steps = (sc.steps || []).map(s => ({
      keyword:  (s.keyword || '').trim(),
      name:     s.name,
      status:   s.result?.status || 'unknown',
      duration: ((s.result?.duration || 0) / 1e9).toFixed(3),
      error:    s.result?.error_message || '',
    }));
    const totalNs = (sc.steps || []).reduce((a, s) => a + (s.result?.duration || 0), 0);
    scenarios.push({
      feature:  feat.name,
      name:     sc.name,
      status:   scenarioStatus(sc.steps),
      duration: (totalNs / 1e9).toFixed(2),
      steps,
    });
    executedKeys.add(`${feat.name}|${sc.name}`);
  }
}

// Any scenario declared in a .feature file but absent from the JSON was
// filtered out by tags (or otherwise skipped). Add it as a skipped entry.
for (const dec of allDeclared) {
  if (executedKeys.has(`${dec.feature}|${dec.name}`)) continue;
  scenarios.push({
    feature:  dec.feature,
    name:     dec.name,
    status:   'skipped',
    duration: '0.00',
    steps: dec.steps.map(s => ({
      keyword:  s.keyword,
      name:     s.name,
      status:   'skipped',
      duration: '0.000',
      error:    '',
    })),
  });
}

const counts = {
  passed:  scenarios.filter(s => s.status === 'passed').length,
  failed:  scenarios.filter(s => s.status === 'failed').length,
  skipped: scenarios.filter(s => s.status === 'skipped').length,
};

const totalDuration = scenarios.reduce((a, s) => a + parseFloat(s.duration), 0).toFixed(2);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cucumber Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js"></script>
<style>
  :root {
    --green:   #28a745;
    --red:     #dc3545;
    --gold:    #ffc107;
    --bg:      #f5f7fa;
    --card:    #ffffff;
    --text:    #2c3e50;
    --muted:   #6c757d;
    --border:  #e1e4e8;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: var(--bg); color: var(--text); }
  header { background: linear-gradient(135deg, #1f3864, #2c5282); color: #fff; padding: 24px 32px; }
  header h1 { margin: 0; font-size: 22px; font-weight: 600; }
  header .meta { margin-top: 6px; font-size: 13px; opacity: 0.85; }
  main { max-width: 1200px; margin: 24px auto; padding: 0 24px; display: grid;
         grid-template-columns: 380px 1fr; gap: 24px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px;
          padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px; }
  .stat { text-align: center; padding: 12px 6px; border-radius: 6px; cursor: pointer;
          transition: transform 0.1s; }
  .stat:hover { transform: scale(1.04); }
  .stat.active { outline: 2px solid var(--text); }
  .stat .n { font-size: 28px; font-weight: 700; }
  .stat .l { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat.passed  { background: rgba(40, 167, 69, 0.12); color: var(--green); }
  .stat.failed  { background: rgba(220, 53, 69, 0.12); color: var(--red); }
  .stat.skipped { background: rgba(255, 193, 7, 0.18); color: #b88600; }
  #pie { max-width: 320px; max-height: 320px; margin: 0 auto; }
  .filter-bar { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
  .filter-bar span { color: var(--muted); font-size: 13px; }
  .btn { padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px;
         background: #fff; cursor: pointer; font-size: 13px; }
  .btn.active { background: var(--text); color: #fff; border-color: var(--text); }
  .scenario { border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px;
              overflow: hidden; transition: box-shadow 0.1s; }
  .scenario:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .scenario summary { padding: 12px 16px; cursor: pointer; display: flex; align-items: center;
                       gap: 12px; user-select: none; list-style: none; }
  .scenario summary::-webkit-details-marker { display: none; }
  .scenario summary::before { content: "▸"; color: var(--muted); transition: transform 0.2s;
                               display: inline-block; }
  .scenario[open] summary::before { transform: rotate(90deg); }
  .scenario .feature { color: var(--muted); font-size: 12px; }
  .scenario .name { flex: 1; font-weight: 500; }
  .scenario .duration { color: var(--muted); font-size: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px;
           text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .badge.passed  { background: rgba(40, 167, 69, 0.15);  color: var(--green); }
  .badge.failed  { background: rgba(220, 53, 69, 0.15);  color: var(--red); }
  .badge.skipped { background: rgba(255, 193, 7, 0.2);   color: #b88600; }
  .steps { padding: 4px 16px 16px 38px; background: #fafbfc; border-top: 1px solid var(--border); }
  .step { padding: 6px 0; border-bottom: 1px dashed var(--border); display: flex; gap: 10px;
          align-items: baseline; }
  .step:last-child { border-bottom: none; }
  .step .kw { font-weight: 600; color: var(--muted); min-width: 50px; }
  .step .nm { flex: 1; }
  .step .du { color: var(--muted); font-size: 12px; }
  .step.passed  .nm { color: var(--text); }
  .step.failed  .nm { color: var(--red); font-weight: 500; }
  .step.skipped .nm { color: var(--muted); font-style: italic; }
  .step .err { width: 100%; margin-top: 6px; padding: 8px; background: #fff5f5;
               border-left: 3px solid var(--red); color: #842029; font-family: monospace;
               font-size: 12px; white-space: pre-wrap; }
  .empty { text-align: center; padding: 40px; color: var(--muted); }
</style>
</head>
<body>
<header>
  <h1>Cucumber Report — Appium Android</h1>
  <div class="meta">
    Generated ${new Date().toLocaleString()}
    · ${scenarios.length} scenarios · ${totalDuration}s total
  </div>
</header>

<main>
  <aside class="card">
    <canvas id="pie"></canvas>
    <div class="stats">
      <div class="stat passed"  data-status="passed"  onclick="setFilter('passed')">
        <div class="n">${counts.passed}</div><div class="l">Passed</div>
      </div>
      <div class="stat failed"  data-status="failed"  onclick="setFilter('failed')">
        <div class="n">${counts.failed}</div><div class="l">Failed</div>
      </div>
      <div class="stat skipped" data-status="skipped" onclick="setFilter('skipped')">
        <div class="n">${counts.skipped}</div><div class="l">Skipped</div>
      </div>
    </div>
  </aside>

  <section class="card">
    <div class="filter-bar">
      <span>Filter:</span>
      <button class="btn active" data-filter="all"     onclick="setFilter('all')">All</button>
      <button class="btn"        data-filter="passed"  onclick="setFilter('passed')">Passed</button>
      <button class="btn"        data-filter="failed"  onclick="setFilter('failed')">Failed</button>
      <button class="btn"        data-filter="skipped" onclick="setFilter('skipped')">Skipped</button>
    </div>
    <div id="scenarios"></div>
  </section>
</main>

<script>
const DATA = ${JSON.stringify(scenarios)};
const COUNTS = ${JSON.stringify(counts)};
let currentFilter = 'all';

function render() {
  const container = document.getElementById('scenarios');
  const filtered = currentFilter === 'all'
    ? DATA
    : DATA.filter(s => s.status === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">No scenarios match this filter.</div>';
    return;
  }

  container.innerHTML = filtered.map(sc => \`
    <details class="scenario" \${sc.status === 'failed' ? 'open' : ''}>
      <summary>
        <span class="badge \${sc.status}">\${sc.status}</span>
        <span class="feature">\${escape(sc.feature)} ›</span>
        <span class="name">\${escape(sc.name)}</span>
        <span class="duration">\${sc.duration}s</span>
      </summary>
      <div class="steps">
        \${sc.steps.map(st => \`
          <div class="step \${st.status}">
            <span class="kw">\${escape(st.keyword)}</span>
            <span class="nm">\${escape(st.name)}</span>
            <span class="du">\${st.duration}s</span>
            \${st.error ? '<div class="err">' + escape(st.error) + '</div>' : ''}
          </div>
        \`).join('')}
      </div>
    </details>
  \`).join('');
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === f));
  document.querySelectorAll('.stat').forEach(s =>
    s.classList.toggle('active', s.dataset.status === f));
  render();
}

new Chart(document.getElementById('pie'), {
  type: 'doughnut',
  data: {
    labels: ['Passed', 'Failed', 'Skipped'],
    datasets: [{
      data: [COUNTS.passed, COUNTS.failed, COUNTS.skipped],
      backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
      borderWidth: 2, borderColor: '#fff',
    }],
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } },
      tooltip: { callbacks: {
        label: ctx => \`\${ctx.label}: \${ctx.parsed} (\${
          (ctx.parsed / (COUNTS.passed + COUNTS.failed + COUNTS.skipped) * 100).toFixed(1)
        }%)\`
      } },
    },
    onClick: (_evt, els) => {
      if (!els.length) return;
      const status = ['passed', 'failed', 'skipped'][els[0].index];
      setFilter(status);
    },
  },
});

render();
</script>
</body>
</html>
`;

fs.writeFileSync(HTML_OUT, html);
console.log(`HTML report written → ${path.relative(ROOT, HTML_OUT)}`);
console.log(`  ${counts.passed} passed · ${counts.failed} failed · ${counts.skipped} skipped`);
