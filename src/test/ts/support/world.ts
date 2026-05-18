/**
 * TestWorld — the per-scenario Cucumber context, and the composition root.
 *
 * Single Responsibility: the World no longer *implements* Appium helpers or
 * manages the driver. It does one job — hold the scenario's collaborators and
 * wire them together. Low-level gestures live in {@link UiActions}, the
 * session lifecycle in {@link DriverManager}, and screen logic in the page
 * objects under pages/.
 *
 * Collaborators are exposed as lazy getters: they are built the first time a
 * step touches them, by which point the Before hook has attached `driver`.
 */

import { setWorldConstructor, setDefaultTimeout, World, IWorldOptions } from '@cucumber/cucumber';
import type { Browser } from 'webdriverio';

import type { IUiActions } from './IUiActions';
import { UiActions } from './UiActions';
import { Diagnostics } from '../utils/diagnostics';
import type { PageContext } from '../pages/BasePage';
import { LoginPage } from '../pages/LoginPage';
import { PayToPage } from '../pages/PayToPage';
import { MerchantPaymentPage } from '../pages/MerchantPaymentPage';
import { RequestMoneyPage } from '../pages/RequestMoneyPage';

setDefaultTimeout(120_000);

export class TestWorld extends World {
  /** The shared Appium session, attached by the Before hook. */
  driver!: Browser;

  private _ui?: UiActions;
  private _diagnostics?: Diagnostics;
  private _login?: LoginPage;
  private _payTo?: PayToPage;
  private _merchant?: MerchantPaymentPage;
  private _requestMoney?: RequestMoneyPage;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Low-level interaction layer over the shared driver. */
  get ui(): IUiActions {
    this._ui ??= new UiActions(this.driver);
    return this._ui;
  }

  /** Screenshot / page-source recorder. */
  get diagnostics(): Diagnostics {
    this._diagnostics ??= new Diagnostics(this.ui);
    return this._diagnostics;
  }

  private get pageContext(): PageContext {
    return { ui: this.ui, diagnostics: this.diagnostics };
  }

  get login(): LoginPage {
    this._login ??= new LoginPage(this.pageContext);
    return this._login;
  }

  get payTo(): PayToPage {
    this._payTo ??= new PayToPage(this.pageContext, this.login);
    return this._payTo;
  }

  get merchant(): MerchantPaymentPage {
    this._merchant ??= new MerchantPaymentPage(this.pageContext, this.login);
    return this._merchant;
  }

  get requestMoney(): RequestMoneyPage {
    this._requestMoney ??= new RequestMoneyPage(this.pageContext, this.login);
    return this._requestMoney;
  }
}

setWorldConstructor(TestWorld);
