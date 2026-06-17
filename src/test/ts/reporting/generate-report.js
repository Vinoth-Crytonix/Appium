/**
 * Custom HTML report - interactive Chart.js doughnut + drill-down.
 * Reads target/cucumber-report.json, emits target/cucumber-html.html.
 *
 * Design principles followed:
 *   - Semantic HTML (header / main / aside / section / article / nav).
 *   - WCAG contrast on every color combination; status colors paired with
 *     icons + text so meaning isn't carried by color alone.
 *   - Keyboard-navigable (tab order, focus rings, Enter/Space activates).
 *   - aria-live region announces filter changes to screen readers.
 *   - Single self-contained HTML file - no external CSS/JS bundling needed.
 *
 * Interaction:
 *   - Doughnut slices: green=passed, red=failed, gold=skipped.
 *     Click a slice -> scenario list filters to that status.
 *   - Stat cards mirror the slices (click to filter).
 *   - Filter chips at the top of the list (All / Passed / Failed / Skipped).
 *   - Search box filters by scenario name or feature name.
 *   - Failed scenarios auto-expanded; click any scenario to toggle steps.
 *   - Steps show keyword, name, duration, and error message (if any).
 */

const fs = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..', '..', '..', '..');
const JSON_IN     = path.join(ROOT, 'target', 'cucumber-report.json');
const HTML_OUT    = path.join(ROOT, 'target', 'cucumber-html.html');
const FEATURE_DIR = path.join(ROOT, 'src', 'test', 'resources', 'features');

// Tolerate missing/empty cucumber JSON. This happens when a BeforeAll hook
// errors out before cucumber writes anything (e.g. Appium server down) — we
// still want the report-regen hook to exit cleanly so it doesn't mask the
// real failure with a SyntaxError stack trace.
let raw = [];
try {
  if (fs.existsSync(JSON_IN)) {
    const text = fs.readFileSync(JSON_IN, 'utf-8').trim();
    if (text.length > 0) raw = JSON.parse(text);
  }
} catch (e) {
  console.warn(`[generate-report] cucumber JSON is unreadable (${e.message}); writing empty report.`);
  raw = [];
}

// =========================================================================
// Walk .feature files so scenarios filtered out by tags still appear (skipped)
// =========================================================================

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

function scenarioStatus(steps = []) {
  if (steps.some(s => s.result?.status === 'failed'))    return 'failed';
  if (steps.some(s => s.result?.status === 'undefined')) return 'failed';
  if (steps.some(s => s.result?.status === 'ambiguous')) return 'failed';
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
const total = scenarios.length;
const totalDuration = scenarios.reduce((a, s) => a + parseFloat(s.duration), 0).toFixed(2);
const passRate = total > 0 ? ((counts.passed / total) * 100).toFixed(1) : '0.0';

const featureGroups = [...new Set(scenarios.map(s => s.feature))].sort()
  .map(name => ({
    name,
    passed:  scenarios.filter(s => s.feature === name && s.status === 'passed').length,
    failed:  scenarios.filter(s => s.feature === name && s.status === 'failed').length,
    skipped: scenarios.filter(s => s.feature === name && s.status === 'skipped').length,
  }));

// =========================================================================
// HTML
// =========================================================================

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cucumber Report - Appium Android</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js"></script>
<style>
  :root {
    --green:        #2ea043;
    --green-bg:     #dafbe1;
    --green-text:   #1a7f37;
    --red:          #cf222e;
    --red-bg:       #ffebe9;
    --red-text:     #a40e26;
    --gold:         #d4a72c;
    --gold-bg:      #fff8c5;
    --gold-text:    #7d4e00;
    --bg:           #f6f8fa;
    --card:         #ffffff;
    --text:         #1f2328;
    --muted:        #57606a;
    --border:       #d0d7de;
    --border-soft:  #eaeef2;
    --accent:       #0969da;
    --accent-soft:  #ddf4ff;
    --shadow:       0 1px 0 rgba(31,35,40,0.04), 0 8px 24px rgba(140,149,159,0.2);
    --header-grad:  linear-gradient(135deg, #1a2332 0%, #2c5282 100%);
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto,
                 "Helvetica Neue", Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    font-size: 14px;
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  .visually-hidden {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }

  header.page-header {
    background: var(--header-grad);
    color: #fff;
    padding: 28px 32px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  .page-header h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .page-header .meta {
    margin-top: 8px;
    font-size: 13px;
    opacity: 0.9;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
  }
  .page-header .meta strong { font-weight: 600; }
  .pass-rate-banner {
    margin-top: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.12);
    backdrop-filter: blur(4px);
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
  }

  main {
    max-width: 1280px;
    margin: 24px auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 24px;
  }
  @media (max-width: 900px) {
    main { grid-template-columns: 1fr; }
  }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    box-shadow: var(--shadow);
  }
  .card h2 {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ---- Pie + stats sidebar ---- */
  aside { position: sticky; top: 24px; align-self: start; }
  .chart-wrap { position: relative; max-width: 280px; margin: 0 auto 16px; }
  .chart-center {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    pointer-events: none;
  }
  .chart-center .big   { font-size: 32px; font-weight: 700; color: var(--text); }
  .chart-center .small { font-size: 11px; color: var(--muted); text-transform: uppercase;
                         letter-spacing: 0.08em; margin-top: 2px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .stat {
    text-align: center;
    padding: 14px 6px;
    border-radius: 10px;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
    border: 2px solid transparent;
    background: var(--bg);
    user-select: none;
  }
  .stat:hover  { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .stat:active { transform: translateY(0); }
  .stat.active { border-color: var(--text); }
  .stat .icon { font-size: 18px; line-height: 1; margin-bottom: 4px; }
  .stat .n    { font-size: 26px; font-weight: 700; line-height: 1.1; }
  .stat .l    { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
                color: var(--muted); margin-top: 2px; }
  .stat.passed  { background: var(--green-bg); }
  .stat.failed  { background: var(--red-bg); }
  .stat.skipped { background: var(--gold-bg); }
  .stat.passed  .n { color: var(--green-text); }
  .stat.failed  .n { color: var(--red-text); }
  .stat.skipped .n { color: var(--gold-text); }

  .features-nav {
    margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-soft);
  }
  .features-nav ul { list-style: none; padding: 0; margin: 0; max-height: 240px; overflow-y: auto; }
  .features-nav li { font-size: 13px; padding: 6px 0; display: flex; align-items: center;
                     gap: 10px; border-bottom: 1px dashed var(--border-soft); }
  .features-nav li:last-child { border-bottom: none; }
  .features-nav .fname { flex: 1; color: var(--text); }
  .features-nav .pill { display: inline-block; padding: 1px 6px; border-radius: 10px;
                        font-size: 10px; font-weight: 600; min-width: 18px; text-align: center; }
  .pill.p { background: var(--green-bg); color: var(--green-text); }
  .pill.f { background: var(--red-bg);   color: var(--red-text); }
  .pill.s { background: var(--gold-bg);  color: var(--gold-text); }

  /* ---- Scenario list ---- */
  .controls {
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
    margin-bottom: 16px;
    position: sticky; top: 0; background: var(--card); padding-bottom: 12px;
    z-index: 1; border-bottom: 1px solid var(--border-soft);
  }
  .search {
    flex: 1; min-width: 200px;
    padding: 8px 12px;
    border: 1px solid var(--border); border-radius: 6px;
    font-size: 13px; color: var(--text); background: #fff;
  }
  .search:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px var(--accent-soft); }
  .chip {
    padding: 6px 12px; border: 1px solid var(--border); border-radius: 999px;
    background: #fff; cursor: pointer; font-size: 12px; font-weight: 500;
    color: var(--text); transition: all 0.12s;
  }
  .chip:hover { background: var(--bg); border-color: var(--muted); }
  .chip.active { background: var(--text); color: #fff; border-color: var(--text); }
  .chip.active.passed  { background: var(--green); border-color: var(--green); }
  .chip.active.failed  { background: var(--red);   border-color: var(--red); }
  .chip.active.skipped { background: var(--gold);  border-color: var(--gold); color: #422a00; }

  .scenario {
    border: 1px solid var(--border-soft); border-radius: 8px; margin-bottom: 8px;
    overflow: hidden; transition: box-shadow 0.12s, border-color 0.12s; background: #fff;
  }
  .scenario:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-color: var(--border); }
  .scenario summary {
    padding: 12px 16px; cursor: pointer;
    display: flex; align-items: center; gap: 12px;
    user-select: none; list-style: none;
  }
  .scenario summary::-webkit-details-marker { display: none; }
  .scenario summary::before {
    content: "▸"; color: var(--muted); transition: transform 0.18s;
    display: inline-block; width: 12px;
  }
  .scenario[open] summary::before { transform: rotate(90deg); }
  .scenario .feature { color: var(--muted); font-size: 12px; font-weight: 500; }
  .scenario .name    { flex: 1; font-weight: 500; min-width: 0; }
  .scenario .duration {
    color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .scenario.failed  { border-left: 4px solid var(--red); }
  .scenario.passed  { border-left: 4px solid var(--green); }
  .scenario.skipped { border-left: 4px solid var(--gold); }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 999px; font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
  }
  .badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; }
  .badge.passed  { background: var(--green-bg); color: var(--green-text); }
  .badge.failed  { background: var(--red-bg);   color: var(--red-text); }
  .badge.skipped { background: var(--gold-bg);  color: var(--gold-text); }
  .badge.passed::before  { background: var(--green); }
  .badge.failed::before  { background: var(--red); }
  .badge.skipped::before { background: var(--gold); }

  .steps {
    padding: 4px 16px 14px 40px;
    background: var(--bg);
    border-top: 1px solid var(--border-soft);
  }
  .step {
    padding: 7px 0;
    border-bottom: 1px dashed var(--border-soft);
    display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap;
  }
  .step:last-child { border-bottom: none; }
  .step .kw {
    font-weight: 600; color: var(--muted); min-width: 52px;
    font-variant-caps: small-caps;
  }
  .step .nm { flex: 1; min-width: 0; }
  .step .du {
    color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .step.passed  .nm { color: var(--text); }
  .step.failed  .nm { color: var(--red-text); font-weight: 500; }
  .step.skipped .nm { color: var(--muted); font-style: italic; }
  .step.undefined .nm { color: var(--gold-text); font-style: italic; }
  .step.passed::before  { content: "✓"; color: var(--green); width: 14px; }
  .step.failed::before  { content: "✗"; color: var(--red);   width: 14px; }
  .step.skipped::before { content: "-"; color: var(--muted); width: 14px; }
  .step.undefined::before { content: "?"; color: var(--gold-text); width: 14px; }
  .step .err {
    width: 100%; margin-top: 8px; padding: 10px 12px;
    background: #fff; border: 1px solid var(--red-bg); border-left: 3px solid var(--red);
    color: var(--red-text); font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 12px; white-space: pre-wrap; border-radius: 4px;
  }

  .empty {
    text-align: center; padding: 48px 24px; color: var(--muted);
    font-size: 14px;
  }
  .empty::before { content: "∅"; display: block; font-size: 32px; margin-bottom: 8px; opacity: 0.6; }

  footer {
    text-align: center; color: var(--muted);
    font-size: 12px; padding: 32px 24px; opacity: 0.8;
  }
</style>
</head>
<body>

<header class="page-header" role="banner">
  <h1>Cucumber Report &mdash; Appium Android</h1>
  <p class="meta">
    <span>Generated <strong>${new Date().toLocaleString()}</strong></span>
    <span aria-hidden="true">&middot;</span>
    <span><strong>${total}</strong> scenarios</span>
    <span aria-hidden="true">&middot;</span>
    <span>Total time <strong>${totalDuration}s</strong></span>
  </p>
  <div class="pass-rate-banner" role="status" aria-label="Overall pass rate">
    <span aria-hidden="true">●</span>
    <span><strong>${passRate}%</strong> pass rate</span>
  </div>
</header>

<main>

  <aside aria-label="Test summary and filters">
    <div class="card">
      <h2>Summary</h2>
      <div class="chart-wrap">
        <canvas id="pie" role="img" aria-label="Doughnut chart of scenario outcomes"></canvas>
        <div class="chart-center" aria-hidden="true">
          <div class="big">${total}</div>
          <div class="small">Total</div>
        </div>
      </div>

      <div class="stats" role="group" aria-label="Click a status to filter the scenario list">
        <button type="button" class="stat passed" data-status="passed" aria-label="${counts.passed} passed; filter list">
          <div class="icon" aria-hidden="true">✓</div>
          <div class="n">${counts.passed}</div>
          <div class="l">Passed</div>
        </button>
        <button type="button" class="stat failed" data-status="failed" aria-label="${counts.failed} failed; filter list">
          <div class="icon" aria-hidden="true">✗</div>
          <div class="n">${counts.failed}</div>
          <div class="l">Failed</div>
        </button>
        <button type="button" class="stat skipped" data-status="skipped" aria-label="${counts.skipped} skipped; filter list">
          <div class="icon" aria-hidden="true">-</div>
          <div class="n">${counts.skipped}</div>
          <div class="l">Skipped</div>
        </button>
      </div>

      <nav class="features-nav" aria-label="Per-feature breakdown">
        <h2>By feature</h2>
        <ul>
          ${featureGroups.map(f => `
            <li>
              <span class="fname">${escapeHtml(f.name)}</span>
              ${f.passed  ? `<span class="pill p" title="${f.passed} passed">${f.passed}</span>`  : ''}
              ${f.failed  ? `<span class="pill f" title="${f.failed} failed">${f.failed}</span>`  : ''}
              ${f.skipped ? `<span class="pill s" title="${f.skipped} skipped">${f.skipped}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </nav>
    </div>
  </aside>

  <section class="card" aria-label="Scenario list">
    <h2>Scenarios</h2>
    <div class="controls" role="toolbar" aria-label="Filter scenarios">
      <input type="search" class="search" id="search"
             placeholder="Search scenarios or features..."
             aria-label="Search scenarios by name or feature">
      <button type="button" class="chip active" data-filter="all"     aria-pressed="true">All (${total})</button>
      <button type="button" class="chip"        data-filter="passed"  aria-pressed="false">Passed</button>
      <button type="button" class="chip"        data-filter="failed"  aria-pressed="false">Failed</button>
      <button type="button" class="chip"        data-filter="skipped" aria-pressed="false">Skipped</button>
    </div>
    <div id="scenarios" aria-live="polite" aria-atomic="false"></div>
  </section>

</main>

<footer>
  Custom report &middot; <code>src/test/ts/reporting/generate-report.js</code>
</footer>

<script>
const DATA   = ${JSON.stringify(scenarios)};
const COUNTS = ${JSON.stringify(counts)};
const TOTAL  = ${total};
let currentFilter = 'all';
let currentSearch = '';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function render() {
  const container = document.getElementById('scenarios');
  const q = currentSearch.toLowerCase();
  const filtered = DATA.filter(s => {
    if (currentFilter !== 'all' && s.status !== currentFilter) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.feature.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">No scenarios match the current filter or search.</div>';
    return;
  }

  container.innerHTML = filtered.map(sc => \`
    <details class="scenario \${sc.status}" \${sc.status === 'failed' ? 'open' : ''}>
      <summary>
        <span class="badge \${sc.status}">\${sc.status}</span>
        <span class="feature">\${escapeHtml(sc.feature)}</span>
        <span class="name">\${escapeHtml(sc.name)}</span>
        <span class="duration">\${sc.duration}s</span>
      </summary>
      <div class="steps">
        \${sc.steps.map(st => \`
          <div class="step \${st.status}">
            <span class="kw">\${escapeHtml(st.keyword)}</span>
            <span class="nm">\${escapeHtml(st.name)}</span>
            <span class="du">\${st.duration}s</span>
            \${st.error ? '<div class="err" role="alert">' + escapeHtml(st.error) + '</div>' : ''}
          </div>
        \`).join('')}
      </div>
    </details>
  \`).join('');
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.chip').forEach(b => {
    const active = b.dataset.filter === f;
    b.classList.toggle('active', active);
    b.classList.toggle('passed',  f === 'passed'  && active);
    b.classList.toggle('failed',  f === 'failed'  && active);
    b.classList.toggle('skipped', f === 'skipped' && active);
    b.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.stat').forEach(s =>
    s.classList.toggle('active', s.dataset.status === f));
  render();
}

document.querySelectorAll('.chip').forEach(b =>
  b.addEventListener('click', () => setFilter(b.dataset.filter)));
document.querySelectorAll('.stat').forEach(s =>
  s.addEventListener('click', () => setFilter(s.dataset.status)));

document.getElementById('search').addEventListener('input', (e) => {
  currentSearch = e.target.value;
  render();
});

new Chart(document.getElementById('pie'), {
  type: 'doughnut',
  data: {
    labels: ['Passed', 'Failed', 'Skipped'],
    datasets: [{
      data: [COUNTS.passed, COUNTS.failed, COUNTS.skipped],
      backgroundColor: ['#2ea043', '#cf222e', '#d4a72c'],
      borderWidth: 3, borderColor: '#fff',
      hoverOffset: 8,
    }],
  },
  options: {
    responsive: true,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(31,35,40,0.95)',
        padding: 10, cornerRadius: 6,
        callbacks: {
          label: ctx => \`\${ctx.label}: \${ctx.parsed} (\${
            TOTAL > 0 ? ((ctx.parsed / TOTAL) * 100).toFixed(1) : '0.0'
          }%)\`
        }
      },
    },
    onClick: (_evt, els) => {
      if (!els.length) return;
      setFilter(['passed', 'failed', 'skipped'][els[0].index]);
    },
    onHover: (evt, els) => { evt.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
  },
});

render();
</script>
</body>
</html>
`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

fs.mkdirSync(path.dirname(HTML_OUT), { recursive: true });
fs.writeFileSync(HTML_OUT, html);
console.log(`HTML report written -> ${path.relative(ROOT, HTML_OUT)}`);
console.log(`  ${counts.passed} passed | ${counts.failed} failed | ${counts.skipped} skipped` +
  `  (${passRate}% pass rate, ${totalDuration}s total)`);
