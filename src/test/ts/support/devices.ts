/**
 * devices - resolves which devices to run on, from the config list intersected
 * with what `adb` reports as actually connected.
 *
 * Shared by the runner (to size --parallel) and DriverManager (to pick each
 * worker's udid), so both agree on the same ordered device list. This is what
 * makes a single-device run target the device that is REALLY connected rather
 * than blindly the first one listed in config.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { capsFileName, isIos } from './platform';

const CONFIG = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../resources/config', capsFileName()),
    'utf8',
  ),
) as Record<string, unknown>;

/** Device udids declared in config (the `devices` list, or a single inline udid). */
const CONFIGURED_UDIDS: string[] =
  Array.isArray(CONFIG.devices) && CONFIG.devices.length > 0
    ? (CONFIG.devices as string[])
    : CONFIG['appium:udid']
      ? [String(CONFIG['appium:udid'])]
      : [];

/** Udids currently in `adb devices` and in the 'device' (ready) state. */
function connectedAndroidUdids(): string[] {
  try {
    const out = execSync('adb devices', { encoding: 'utf8' });
    return out
      .split(/\r?\n/)
      // `.+` not `\S+`: a re-announced wireless device can be registered with a
      // SPACE in its udid, e.g. "adb-<serial>-6qprry (2)._adb-tls-connect._tcp".
      // `\S+` silently failed to match those, so the phone was invisible to the
      // runner even though `adb devices` listed it — one device short, with no
      // error to explain why.
      .map(line => /^(.+)\tdevice$/.exec(line)?.[1]?.trim())
      .filter((u): u is string => Boolean(u));
  } catch {
    // adb missing/unreachable - let the caller decide (empty = nothing ready).
    return [];
  }
}

/**
 * UDIDs of physically attached iOS devices.
 *
 * `xcrun xctrace list devices` prints both real devices and simulators; the
 * "== Simulator ==" section is dropped so a soak targets real hardware, which
 * is the point of this suite. Falls back to `idevice_id -l` (libimobiledevice)
 * when xctrace is unavailable.
 *
 * Line shape: `iPhone 14 (17.4) (00008110-000A4D2E0C88801E)`
 */
function connectedIosUdids(): string[] {
  try {
    const out = execSync('xcrun xctrace list devices', { encoding: 'utf8' });
    const devicesSection = out.split(/==\s*Simulators\s*==/i)[0];
    return devicesSection
      .split(/\r?\n/)
      .map(line => /\(([0-9A-Fa-f-]{25,})\)\s*$/.exec(line.trim())?.[1])
      .filter((u): u is string => Boolean(u));
  } catch {
    try {
      return execSync('idevice_id -l', { encoding: 'utf8' })
        .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}

/** Connected devices for the platform this run targets. */
export function connectedUdids(): string[] {
  return isIos() ? connectedIosUdids() : connectedAndroidUdids();
}

/**
 * The hardware serial inside a udid, so the SAME handset matches however it is
 * attached. adb reports a device differently over USB and wireless:
 *
 *   USB      -> X8HIDUAQSWGYPVGE
 *   wireless -> adb-X8HIDUAQSWGYPVGE-GLb21v._adb-tls-connect._tcp
 *
 * Comparing those as plain strings means a device that is replugged, or that
 * flips between USB and wireless mid-session, silently stops matching config —
 * and because the intersection below just gets shorter, the run quietly
 * proceeds on FEWER devices instead of failing. That has been mistaken for a
 * broken device more than once; matching on the serial removes the trap.
 */
function serialOf(udid: string): string {
  return /^adb-(.+?)-[^-]*\._adb-tls-connect\._tcp$/.exec(udid)?.[1] ?? udid;
}

/**
 * The devices to actually run on, in order: configured devices that are also
 * connected, matched by hardware serial so USB and wireless forms are
 * interchangeable. The CONNECTED spelling is returned, since that is what adb
 * and Appium need.
 *
 * If none of the configured devices are connected (e.g. a brand-new udid not
 * yet added to config), fall back to whatever IS connected so the run still
 * proceeds on the available hardware.
 */
/**
 * True if adb can still talk to this exact udid spelling.
 *
 * A wireless device can end up registered TWICE — e.g. `adb-<serial>-xxx._tcp`
 * alongside `adb-<serial>-xxx (2)._tcp` — when it re-announces itself without
 * the old entry being reaped. One of those is stale, and binding a session to
 * it fails every command with "device not found", which surfaces as the very
 * first step of the scenario failing. Probing is cheap and picks the live one.
 */
function respondsToAdb(udid: string): boolean {
  try {
    // Quoted: a udid can contain a space (see connectedAndroidUdids).
    return execSync(`adb -s "${udid}" get-state`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim() === 'device';
  } catch {
    return false;
  }
}

/**
 * Choose between two registrations of the SAME phone.
 *
 * Wireless debugging can advertise one device twice — the same IP on two ports,
 * mDNS naming the second one "…-6qprry (2)". BOTH answer adb, so liveness alone
 * cannot separate them, but Appium can only use one of them:
 *
 *     Device adb-…-6qprry (2)._adb-tls-connect._tcp was not in the list of
 *     connected devices
 *
 * UiAutomator2 fails to match a udid containing a SPACE against its own device
 * list, so a spaced registration is unusable no matter how healthy it is.
 * Preference order is therefore: no space first, then one that answers adb.
 */
function preferUdid(candidate: string, current: string): boolean {
  const spaced = (u: string) => u.includes(' ');
  if (spaced(current) !== spaced(candidate)) return !spaced(candidate);
  return !respondsToAdb(current) && respondsToAdb(candidate);
}

export function availableUdids(): string[] {
  const connected = connectedUdids();
  // Deduplicate by hardware serial, preferring a spelling that actually
  // answers: `adb devices` lists stale registrations as happily as live ones.
  const bySerial = new Map<string, string>();
  for (const udid of connected) {
    const serial = serialOf(udid);
    const existing = bySerial.get(serial);
    if (!existing) { bySerial.set(serial, udid); continue; }
    if (preferUdid(udid, existing)) bySerial.set(serial, udid);
  }
  const configuredAndConnected = CONFIGURED_UDIDS
    .map(u => bySerial.get(serialOf(u)))
    .filter((u): u is string => Boolean(u));
  return configuredAndConnected.length > 0 ? configuredAndConnected : connected;
}
