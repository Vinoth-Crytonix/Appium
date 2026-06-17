/**
 * TestWorld â€” the per-scenario Cucumber context, and the composition root.
 *
 * Single Responsibility: the World no longer *implements* Appium helpers or
 * manages the driver. It does one job â€” hold the scenario's collaborators and
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
import { Diagnostics } from '../support/diagnostics';
import { getStringsRepository, type StringsRepository } from './stringsRepository';
import type { PageContext } from '../pages/basePage';
import { LoginPage } from '../pages/loginPage';
import { PayToPage } from '../pages/payToPage';
import { MerchantPaymentPage } from '../pages/merchantPaymentPage';
import { RequestMoneyPage } from '../pages/requestMoneyPage';
import { RecentTransactionsPage } from '../pages/recentTransactionsPage';
import { MyanmarPayPersonalPage } from '../pages/myanmarPayPersonalPage';
import { MyanmarPayHistoryPage } from '../pages/myanmarPayHistoryPage';
import { ElectricityPage } from '../pages/electricityPage';
import { ReportsPage } from '../pages/reportsPage';
import { PopupHandler } from './popupHandler';

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
  private _recentTransactions?: RecentTransactionsPage;
  private _myanmarPayPersonal?: MyanmarPayPersonalPage;
  private _myanmarPayHistory?: MyanmarPayHistoryPage;
  private _electricity?: ElectricityPage;
  private _reports?: ReportsPage;
  private _popupHandler?: PopupHandler;

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

  get recentTransactions(): RecentTransactionsPage {
    this._recentTransactions ??= new RecentTransactionsPage(this.pageContext, this.login);
    return this._recentTransactions;
  }

  get myanmarPayPersonal(): MyanmarPayPersonalPage {
    this._myanmarPayPersonal ??= new MyanmarPayPersonalPage(this.pageContext, this.login);
    return this._myanmarPayPersonal;
  }

  get myanmarPayHistory(): MyanmarPayHistoryPage {
    this._myanmarPayHistory ??= new MyanmarPayHistoryPage(this.pageContext);
    return this._myanmarPayHistory;
  }

  get electricity(): ElectricityPage {
    this._electricity ??= new ElectricityPage(this.pageContext, this.login);
    return this._electricity;
  }

  get reports(): ReportsPage {
    this._reports ??= new ReportsPage(this.pageContext);
    return this._reports;
  }

  /** Shared en/my string-resource lookup for the localization audit. */
  get strings(): StringsRepository {
    return getStringsRepository();
  }

  /** Global popup auto-dismisser. Used by hooks/popupHooks and by pages. */
  get popupHandler(): PopupHandler {
    this._popupHandler ??= new PopupHandler(this.ui, this.login);
    return this._popupHandler;
  }
}

setWorldConstructor(TestWorld);
