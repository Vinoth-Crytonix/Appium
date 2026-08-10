/**
 * platform — the ONE place that knows which mobile platform a run targets.
 *
 * The suite supports three combinations:
 *
 *   Windows + Android   adb device discovery, UiAutomator2
 *   macOS   + Android   identical to the above — adb is cross-platform
 *   macOS   + iOS       xcrun device discovery, XCUITest   (macOS only)
 *
 * Note the split that matters: the HOST OS (Windows/macOS) barely affects the
 * suite — Node, npx and adb all behave the same, so the Android path needs no
 * host-specific code at all. What actually changes behaviour is the TARGET
 * platform, and iOS is only reachable from macOS because Apple requires Xcode
 * for the WebDriverAgent build.
 *
 * Selected by, in order: --platform on the runner, APPIUM_PLATFORM in the
 * environment, then Android. The runner passes its choice down to each spawned
 * cucumber process via APPIUM_PLATFORM, so a device worker never has to guess.
 */

export type TargetPlatform = 'android' | 'ios';

/** The platform this process is driving. */
export function targetPlatform(): TargetPlatform {
  return (process.env.APPIUM_PLATFORM ?? '').toLowerCase() === 'ios' ? 'ios' : 'android';
}

export function isIos(): boolean {
  return targetPlatform() === 'ios';
}

/** The capabilities file for this platform, relative to resources/config. */
export function capsFileName(): string {
  return isIos() ? 'ios.caps.json' : 'android.caps.json';
}

/**
 * The per-worker port capability name.
 *
 * Each parallel worker needs its own automation port, but the two drivers spell
 * it differently: UiAutomator2 uses `appium:systemPort` for its instrumentation
 * server, XCUITest uses `appium:wdaLocalPort` for WebDriverAgent. Same purpose,
 * different key — so the port allocation logic is shared and only the name
 * changes here.
 */
export function portCapabilityName(): string {
  return isIos() ? 'appium:wdaLocalPort' : 'appium:systemPort';
}

/** Default base port per platform, when the caps file does not set one. */
export function defaultBasePort(): number {
  return isIos() ? 8100 : 8200;   // WDA conventionally 8100+, UiAutomator2 8200+
}

/**
 * Whether this platform uses `adb` — i.e. whether port-forward cleanup and the
 * adb-based recovery steps apply at all. On iOS they are meaningless and must
 * be skipped rather than failing.
 */
export function usesAdb(): boolean {
  return !isIos();
}

/** Guard: iOS automation requires macOS (Xcode / WebDriverAgent). */
export function assertPlatformSupported(): void {
  if (isIos() && process.platform !== 'darwin') {
    throw new Error(
      'iOS runs require macOS: XCUITest builds WebDriverAgent with Xcode, which ' +
      `is not available on ${process.platform}. Use --platform android here, or ` +
      'run the iOS suite from a Mac.',
    );
  }
}
