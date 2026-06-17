/**
 * deviceActions - OS-shell controls (background/foreground, network, locale,
 * permissions, notifications). Backed by Appium driver capabilities; one
 * instance per scenario, constructed by the World.
 */

import type { Browser } from 'webdriverio';

export class DeviceActions {
  constructor(private readonly driver: Browser) {}

  async backgroundApp(seconds: number): Promise<void> {
    await this.driver.background(seconds);
  }

  async setNetworkConnection(value: number): Promise<void> {
    // Android only: 0=off, 1=airplane, 2=wifi, 4=data, 6=wifi+data
    await (this.driver as unknown as { setNetworkConnection: (n: number) => Promise<void> })
      .setNetworkConnection(value);
  }

  async setOffline(): Promise<void> {
    await this.setNetworkConnection(0);
  }

  async setOnline(): Promise<void> {
    await this.setNetworkConnection(6);
  }

  async grantPermission(permission: string): Promise<void> {
    await this.driver.execute('mobile: changePermissions', {
      action: 'grant',
      permissions: [permission],
    });
  }

  async denyPermission(permission: string): Promise<void> {
    await this.driver.execute('mobile: changePermissions', {
      action: 'revoke',
      permissions: [permission],
    });
  }

  async setLocale(locale: string): Promise<void> {
    await this.driver.execute('mobile: shell', {
      command: 'setprop',
      args: ['persist.sys.locale', locale],
    });
  }

  async pressKey(keycode: number): Promise<void> {
    await this.driver.execute('mobile: pressKey', { keycode });
  }
}
