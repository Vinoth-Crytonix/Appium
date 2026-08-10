/**
 * startServers — launch one Appium server per device, on any host OS.
 *
 * Replaces the Windows-only `start "..." cmd /c npx appium ...` chain, which is
 * the single piece of this suite that was not portable: `start` does not exist
 * on macOS/Linux, so `npm run appium:servers` failed there while everything
 * else ran fine.
 *
 * Usage:
 *   ts-node startServers.ts [count] [--port 4723] [--foreground]
 *
 *   count         how many servers (default: the number of connected devices,
 *                 so it matches what the runner will actually use)
 *   --port N      base port; server i listens on N + i (default 4723)
 *   --foreground  keep them attached to this terminal (Ctrl+C stops all);
 *                 otherwise they are detached and outlive this process
 *
 * Ports line up with the runner's --server-per-device, which sends device i to
 * base + i — so the defaults pair up with no arguments on either side.
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { availableUdids } from '../support/devices';

const DEFAULT_BASE_PORT = 4723;

/**
 * Absolute path to Appium's entry script, so it can be run with `node` directly
 * (see the spawn below for why the CLI shim is unusable here).
 *
 * Looks in the local node_modules first, then wherever npm keeps global
 * packages — this project does not depend on appium itself, so on most machines
 * it is the global install that is in play.
 */
function resolveAppiumEntry(): string {
  const candidates: string[] = [path.resolve('node_modules', 'appium')];
  try {
    candidates.push(path.join(
      execSync('npm root -g', { encoding: 'utf8' }).trim(), 'appium'));
  } catch { /* npm not on PATH — fall through to the error below */ }

  for (const dir of candidates) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.appium;
      const entry = path.join(dir, rel ?? 'index.js');
      if (fs.existsSync(entry)) return entry;
    } catch { /* not here — try the next candidate */ }
  }
  throw new Error(
    'Could not find the appium package (looked in ./node_modules and `npm root -g`).\n' +
    'Install it with:  npm install -g appium',
  );
}

function main(): void {
  const argv = process.argv.slice(2);
  let basePort = DEFAULT_BASE_PORT;
  let background = false;
  let count = 0;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') basePort = Number(argv[++i]) || DEFAULT_BASE_PORT;
    else if (a === '--background') background = true;
    // Accepted for compatibility; foreground is now the default.
    else if (a === '--foreground') background = false;
    else if (!a.startsWith('-')) count = Math.max(1, Number(a) || 0);
  }

  // Background mode is refused on Windows, not merely discouraged.
  //
  // A detached process there has NO console, and Windows gives every console
  // child it spawns a brand-new window. Appium shells out to adb constantly, so
  // a detached server flashes up a terminal every few seconds — hundreds during
  // a run. Foreground costs one terminal and produces none of that, so there is
  // no case where background is the better trade on Windows.
  if (background && process.platform === 'win32') {
    console.error(
      '[servers] --background is not supported on Windows.\n' +
      '  A detached Appium server has no console, so every adb call it makes opens\n' +
      '  a new terminal window (hundreds over a run). Run without --background and\n' +
      '  leave this terminal open; start your suite in a second terminal.',
    );
    process.exit(2);
  }

  // Default to one server per connected device — the count the runner needs.
  if (count === 0) count = Math.max(1, availableUdids().length);

  const appiumEntry = resolveAppiumEntry();
  console.log(`[servers] starting ${count} Appium server(s) from port ${basePort} ` +
    `(host: ${process.platform})`);

  const pids: number[] = [];
  for (let i = 0; i < count; i++) {
    const port = basePort + i;
    // Spawn node against Appium's own entry script, NOT the `appium`/`npx`
    // shim: modern Node refuses to spawn a .cmd without a shell ("spawn
    // EINVAL"), and a shell would re-introduce a console window.
    const child = spawn(
      process.execPath,
      [appiumEntry, '--port', String(port), '--relaxed-security'],
      {
        detached: background,
        stdio: background ? 'ignore' : 'inherit',
        windowsHide: true,
      },
    );
    if (background) child.unref();
    if (child.pid) pids.push(child.pid);
    console.log(`[servers]   port ${port} → pid ${child.pid ?? '(unknown)'}`);
  }

  if (!background) {
    console.log('[servers] running in THIS terminal — keep it open for the whole run.');
    console.log('[servers] Ctrl+C here stops all of them. Start your suite in another terminal.');
    if (process.platform === 'win32') {
      console.log('[servers] (Windows: background mode is avoided on purpose — a detached, ' +
        'console-less Appium spawns a NEW command-prompt window for every adb call it makes, ' +
        'which is hundreds over a long run. Use --background only if you accept that.)');
    }
    return;   // stay attached; the child processes keep this process alive
  }

  {
    console.log('[servers] running in the background. Check with: curl http://127.0.0.1:' +
      `${basePort}/status`);
    // The pids are printed above precisely so the servers can be stopped WITHOUT
    // pattern-matching: a naive `-match 'appium'` also matches every test
    // process, because the project itself lives under an "Appium" directory —
    // so "stop the servers" would silently kill the running suite too. The
    // fallback patterns below match the appium ENTRY SCRIPT path, not the word.
    console.log('[servers] stop them with:  ' + (process.platform === 'win32'
      ? `Stop-Process -Id ${pids.join(',')} -Force`
      : `kill ${pids.join(' ')}`));
    console.log('[servers]   ...or by entry script: ' + (process.platform === 'win32'
      ? 'Get-CimInstance Win32_Process -Filter "Name=\'node.exe\'" | ' +
        'Where-Object { $_.CommandLine -match \'node_modules.appium.index\' } | ' +
        'ForEach-Object { Stop-Process -Id $_.ProcessId -Force }'
      : "pkill -f 'node_modules/appium/index'"));
  }
}

main();
