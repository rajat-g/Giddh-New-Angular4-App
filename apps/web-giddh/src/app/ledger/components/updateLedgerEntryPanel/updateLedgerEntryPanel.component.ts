import { animate, state, style, transition, trigger } from '@angular/animations';
import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { select, Store } from '@ngrx/store';
import { ResizedEvent } from 'angular-resize-event';
import { Configuration, Subvoucher } from 'apps/web-giddh/src/app/app.constant';
import { GIDDH_DATE_FORMAT } from 'apps/web-giddh/src/app/shared/helpers/defaultDateFormat';
import { saveAs } from 'file-saver';
import * as moment from 'moment/moment';
import { BsDatepickerDirective, ModalDirective, PopoverDirective } from 'ngx-bootstrap';
import { UploaderOptions, UploadInput, UploadOutput } from 'ngx-uploader';
import { createSelector } from 'reselect';
import { combineLatest as observableCombineLatest, Observable, of as observableOf, ReplaySubject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { LedgerActions } from '../../../actions/ledger/ledger.actions';
import { SettingsTagActions } from '../../../actions/settings/tag/settings.tag.actions';
import { RCM_ACTIONS, RcmModalConfiguration } from '../../../common/rcm-modal/rcm-modal.interface';
import { LoaderService } from '../../../loader/loader.service';
import { cloneDeep, filter, last, orderBy } from '../../../lodash-optimized';
import { AccountResponse } from '../../../models/api-models/Account';
import { ICurrencyResponse, TaxResponse } from '../../../models/api-models/Company';
import { PettyCashResonse } from '../../../models/api-models/Expences';
import { DownloadLedgerRequest, LedgerResponse } from '../../../models/api-models/Ledger';
import { SalesOtherTaxesCalculationMethodEnum, SalesOtherTaxesModal } from '../../../models/api-models/Sales';
import { TagRequest } from '../../../models/api-models/settingsTags';
import { IFlattenAccountsResultItem } from '../../../models/interfaces/flattenAccountsResultItem.interface';
import { ILedgerTransactionItem } from '../../../models/interfaces/ledger.interface';
import { AccountService } from '../../../services/account.service';
import { LEDGER_API } from '../../../services/apiurls/ledger.api';
import { GeneralService } from '../../../services/general.service';
import { LedgerService } from '../../../services/ledger.service';
import { ToasterService } from '../../../services/toaster.service';
import { SettingsUtilityService } from '../../../settings/services/settings-utility.service';
import { base64ToBlob, giddhRoundOff } from '../../../shared/helpers/helperFunctions';
import { AppState } from '../../../store';
import { IOption } from '../../../theme/ng-virtual-select/sh-options.interface';
import { ShSelectComponent } from '../../../theme/ng-virtual-select/sh-select.component';
import { TaxControlComponent } from '../../../theme/tax-control/tax-control.component';
import { UpdateLedgerDiscountComponent } from '../updateLedgerDiscount/updateLedgerDiscount.component';
import { UpdateLedgerVm } from './updateLedger.vm';

@Component({
    selector: 'update-ledger-entry-panel',
    templateUrl: './updateLedgerEntryPanel.component.html',
    styleUrls: ['./updateLedgerEntryPanel.component.scss'],
    animations: [
        trigger('slideInOut', [
            state('in', style({
                transform: 'translate3d(0, 0, 0)'
            })),
            state('out', style({
                transform: 'translate3d(100%, 0, 0)'
            })),
            transition('in => out', animate('400ms ease-in-out')),
            transition('out => in', animate('400ms ease-in-out'))
        ]),
    ]
})
export class UpdateLedgerEntryPanelComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
    public vm: UpdateLedgerVm;
    @Output() public closeUpdateLedgerModal: EventEmitter<boolean> = new EventEmitter();
    @Output() public showQuickAccountModalFromUpdateLedger: EventEmitter<boolean> = new EventEmitter();
    @Output() public toggleOtherTaxesAsideMenu: EventEmitter<UpdateLedgerVm> = new EventEmitter();

    @Input() isPettyCash: boolean = false;
    @Input() pettyCashEntry: any;
    @Input() pettyCashBaseAccountTypeString: string;
    @Input() pettyCashBaseAccountUniqueName: string;
    /** True, if RCM should be displayed */
    @Input() public shouldShowRcmEntry: boolean;

    @ViewChild('deleteAttachedFileModal') public deleteAttachedFileModal: ModalDirective;
    @ViewChild('deleteEntryModal') public deleteEntryModal: ModalDirective;
    @ViewChild('discount') public discountComponent: UpdateLedgerDiscountComponent;
    @ViewChild('tax') public taxControll: TaxControlComponent;
    @ViewChild('updateBaseAccount') public updateBaseAccount: ModalDirective;
    @ViewChild(BsDatepickerDirective) public datepickers: BsDatepickerDirective;

    /** RCM popup instance */
    @ViewChild('rcmPopup') public rcmPopup: PopoverDirective;

    /** Warehouse data for warehouse drop down */
    public warehouses: Array<any>;
    /** Currently selected warehouse */
    public selectedWarehouse: string;
    /** Default warehouse of a company */
    private defaultWarehouse: string;
    /** True, if warehouse drop down should be displayed */
    public shouldShowWarehouse: boolean;
    /** True, if subvoucher is RCM */
    public isRcmEntry: boolean = false;
    /** RCM modal configuration */
    public rcmConfiguration: RcmModalConfiguration;
    public tags$: Observable<TagRequest[]>;
    public sessionKey$: Observable<string>;
    public companyName$: Observable<string>;
    public isFileUploading: boolean = false;
    public accountUniqueName: string;
    public entryUniqueName$: Observable<string>;
    public editAccUniqueName$: Observable<string>;
    public entryUniqueName: string;
    public uploadInput: EventEmitter<UploadInput>;
    public fileUploadOptions: UploaderOptions;
    public isDeleteTrxEntrySuccess$: Observable<boolean>;
    public isTxnUpdateInProcess$: Observable<boolean>;
    public isTxnUpdateSuccess$: Observable<boolean>;
    public flattenAccountListStream$: Observable<IFlattenAccountsResultItem[]>;
    public selectedLedgerStream$: Observable<LedgerResponse>;
    public companyProfile$: Observable<any>;
    public activeAccount$: Observable<AccountResponse>;
    public activeAccount: AccountResponse;
    public destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
    public showAdvanced: boolean;
    public currentAccountApplicableTaxes: string[] = [];

    public baseCurrency: string = null;
    public isChangeAcc: boolean = false;
    public firstBaseAccountSelected: string;
    public existingTaxTxn: any[] = [];
    public baseAccount$: Observable<any> = observableOf(null);
    public baseAcc: string;
    public baseAccountChanged: boolean = false;
    public changedAccountUniq: any = null;
    public invoiceList: any[] = [];
    public openDropDown: boolean = false;
    public totalAmount: any;
    public baseAccountName$: Observable<string> = observableOf(null);
    public giddhDateFormat: string = GIDDH_DATE_FORMAT;
    public profileObj: any;
    public keydownClassAdded: boolean = false;
    public tcsOrTds: 'tcs' | 'tds' = 'tcs';
    public totalTdElementWidth: number = 0;
    public multiCurrencyAccDetails: IFlattenAccountsResultItem = null;
    public selectedPettycashEntry$: Observable<PettyCashResonse>;
    public accountPettyCashStream: any;

    constructor(
        private _accountService: AccountService,
        private _ledgerService: LedgerService,
        private generalService: GeneralService,
        private _ledgerAction: LedgerActions,
        private _loaderService: LoaderService,
        private _settingsTagActions: SettingsTagActions,
        private settingsUtilityService: SettingsUtilityService,
        private store: Store<AppState>,
        private _toasty: ToasterService
    ) {

        this.vm = new UpdateLedgerVm();

        this.entryUniqueName$ = this.store.select(p => p.ledger.selectedTxnForEditUniqueName).pipe(takeUntil(this.destroyed$));
        this.editAccUniqueName$ = this.store.select(p => p.ledger.selectedAccForEditUniqueName).pipe(takeUntil(this.destroyed$));
        this.selectedLedgerStream$ = this.store.select(p => p.ledger.transactionDetails).pipe(takeUntil(this.destroyed$));
        this.companyProfile$ = this.store.select(p => p.settings.profile).pipe(takeUntil(this.destroyed$));
        this.flattenAccountListStream$ = this.store.select(p => p.general.flattenAccounts).pipe(takeUntil(this.destroyed$));
        this.vm.companyTaxesList$ = this.store.select(p => p.company.taxes).pipe(takeUntil(this.destroyed$));
        this.sessionKey$ = this.store.select(p => p.session.user.session.id).pipe(takeUntil(this.destroyed$));
        this.companyName$ = this.store.select(p => p.session.companyUniqueName).pipe(takeUntil(this.destroyed$));
        this.isDeleteTrxEntrySuccess$ = this.store.select(p => p.ledger.isDeleteTrxEntrySuccessfull).pipe(takeUntil(this.destroyed$));
        this.isTxnUpdateInProcess$ = this.store.select(p => p.ledger.isTxnUpdateInProcess).pipe(takeUntil(this.destroyed$));
        this.isTxnUpdateSuccess$ = this.store.select(p => p.ledger.isTxnUpdateSuccess).pipe(takeUntil(this.destroyed$));
        this.closeUpdateLedgerModal.pipe(takeUntil(this.destroyed$));
        this.vm.currencyList$ = this.store.pipe(select(s => s.session.currencies), takeUntil(this.destroyed$));
        this.store.dispatch(this._settingsTagActions.GetALLTags());
        this.selectedPettycashEntry$ = this.store.pipe(select(p => p.expense.pettycashEntry), takeUntil(this.destroyed$));
    }

    Shown: boolean = true;
    isHide: boolean = false;
    condition: boolean = true;
    condition2: boolean = false;

    toggleShow() {
        this.condition = !this.condition;
        this.condition2 = !this.condition;
        this.Shown = !this.Shown;
        this.isHide = !this.isHide;
    }

    public ngOnInit() {
        this.store.pipe(select(appState => appState.warehouse.warehouses), take(1)).subscribe((warehouses: any) => {
            if (warehouses) {
                const warehouseData = this.settingsUtilityService.getFormattedWarehouseData(warehouses.results);
                this.warehouses = warehouseData.formattedWarehouses;
                this.defaultWarehouse = (warehouseData.defaultWarehouse) ? warehouseData.defaultWarehouse.uniqueName : '';
            }
        });
        this.showAdvanced = false;
        this.vm.selectedLedger = new LedgerResponse();
        this.vm.selectedLedger.otherTaxModal = new SalesOtherTaxesModal();
        // this.totalAmount = this.vm.totalAmount;
        this.tags$ = this.store.pipe(select(createSelector([(st: AppState) => st.settings.tags], (tags) => {
            if (tags && tags.length) {
                _.map(tags, (tag) => {
                    tag.label = tag.name;
                    tag.value = tag.name;
                });
                return _.orderBy(tags, 'name');
            }
        })), takeUntil(this.destroyed$));

        if (this.isPettyCash) {
            this.selectedPettycashEntry$.pipe(takeUntil(this.destroyed$)).subscribe(res => {
                if (res) {
                    // this.accountPettyCashStream = res;
                    // this.editAccUniqueName$ = observableOf(this.accountPettyCashStream.baseAccount.uniqueName);
                    this.entryUniqueName = res.uniqueName;
                    this.accountUniqueName = res.particular.uniqueName;
                    this.selectedLedgerStream$ = observableOf(res as LedgerResponse);
                }
            });
        }

        // get entry name and ledger account uniqueName
        observableCombineLatest(this.entryUniqueName$, this.editAccUniqueName$).subscribe((resp: any[]) => {
            if (resp[0] && resp[1]) {
                this.entryUniqueName = resp[0];
                this.accountUniqueName = resp[1];
                this.store.dispatch(this._ledgerAction.getLedgerTrxDetails(this.accountUniqueName, this.entryUniqueName));
                // this.firstBaseAccountSelected = this.accountUniqueName;
            }
        });

        // emit upload event
        this.uploadInput = new EventEmitter<UploadInput>();
        // set file upload options
        this.fileUploadOptions = { concurrency: 0 };

        // get flatten_accounts list && get transactions list && get ledger account list
        observableCombineLatest(this.flattenAccountListStream$, this.selectedLedgerStream$, this._accountService.GetAccountDetailsV2(this.accountUniqueName), this.companyProfile$)
            .subscribe((resp: any[]) => {
                if (resp[0] && resp[1] && resp[3]) {

                    // insure we have account details, if we are normal ledger mode and not petty cash mode ( special case for others entry in petty cash )
                    if (this.isPettyCash && this.accountUniqueName && resp[2].status !== 'success') {
                        return;
                    }

                    //#region flatten group list assign process
                    this.vm.flatternAccountList = resp[0];
                    this.activeAccount = cloneDeep(resp[2].body);
                    this.profileObj = resp[3];
                    this.vm.giddhBalanceDecimalPlaces = resp[3].balanceDecimalPlaces;
                    this.vm.inputMaskFormat = this.profileObj.balanceDisplayFormat ? this.profileObj.balanceDisplayFormat.toLowerCase() : '';

                    // special check if we have petty cash mode and we receive an entry whose uniquename is null
                    // so it means it's other account entry of petty cash
                    // so for that we have to add a dummy account in flatten account array
                    if (this.isPettyCash) {
                        if (resp[1].othersCategory) {
                            // check we already have others account in flatten account, then don't do anything
                            const isThereOthersAcc = this.vm.flatternAccountList.some(d => d.uniqueName === 'others');
                            if (!isThereOthersAcc) {
                                // add new dummy account in flatten account array
                                this.vm.flatternAccountList.push({
                                    name: 'Others', uniqueName: 'others', applicableTaxes: [],
                                    parentGroups: [], isFixed: false, isDummy: true, mergedAccounts: ''
                                });
                            }
                        }
                    }

                    // set account details for multi currency account
                    this.prepareMultiCurrencyObject(resp[1].particular.uniqueName);
                    // end multi currency assign

                    let stockListFormFlattenAccount: IFlattenAccountsResultItem;
                    if (this.vm.flatternAccountList && this.vm.flatternAccountList.length && this.activeAccount) {
                        stockListFormFlattenAccount = resp[0].find((acc) => acc.uniqueName === this.activeAccount.uniqueName);
                    }

                    let isStockableAccount: boolean = false;

                    if (this.activeAccount) {
                        if (this.activeAccount.currency && this.vm.isMultiCurrencyAvailable) {
                            this.baseCurrency = this.activeAccount.currency;
                        }

                        // check if current account category is type 'income' or 'expenses'
                        let parentAcc = this.activeAccount.parentGroups[0].uniqueName;
                        let incomeAccArray = ['revenuefromoperations', 'otherincome'];
                        let expensesAccArray = ['operatingcost', 'indirectexpenses'];
                        let incomeAndExpensesAccArray = [...incomeAccArray, ...expensesAccArray];

                        if (incomeAndExpensesAccArray.indexOf(parentAcc) > -1) {
                            let appTaxes = [];
                            this.activeAccount.applicableTaxes.forEach(app => appTaxes.push(app.uniqueName));
                            this.currentAccountApplicableTaxes = appTaxes;
                        }

                        // check if account is stockable
                        isStockableAccount = this.activeAccount.uniqueName !== 'roundoff' ? incomeAndExpensesAccArray.includes(parentAcc) : false;
                    }

                    this.vm.getUnderstandingText(resp[1].particularType, resp[1].particular.name);

                    let accountsArray: IOption[] = [];
                    let accountsForBaseAccountArray: IOption[] = [];
                    if (isStockableAccount) {
                        // stocks from ledger account
                        this.vm.flatternAccountList.map(acc => {
                            // normal entry
                            accountsArray.push({ value: acc.uniqueName, label: acc.name, additional: acc });

                            // normal merge account entry
                            if (acc.mergedAccounts && acc.mergedAccounts !== '') {
                                let mergeAccs = acc.mergedAccounts.split(',');
                                mergeAccs.map(m => m.trim()).forEach(ma => {
                                    accountsArray.push({
                                        value: ma,
                                        label: ma,
                                        additional: acc
                                    });
                                });
                            }

                            // check if taxable or round off account then don't assign stocks
                            let notRoundOff = acc.uniqueName === 'roundoff';
                            let isTaxAccount = acc.uNameStr.indexOf('dutiestaxes') > -1;
                            if (!isTaxAccount && !notRoundOff && stockListFormFlattenAccount && stockListFormFlattenAccount.stocks) {
                                stockListFormFlattenAccount.stocks.map(as => {
                                    // stock entry
                                    accountsArray.push({
                                        value: `${acc.uniqueName}#${as.uniqueName}`,
                                        label: acc.name + '(' + as.uniqueName + ')',
                                        additional: Object.assign({}, acc, { stock: as })
                                    });
                                    // normal merge account entry
                                    if (acc.mergedAccounts && acc.mergedAccounts !== '') {
                                        let mergeAccs = acc.mergedAccounts.split(',');
                                        mergeAccs.map(m => m.trim()).forEach(ma => {
                                            accountsArray.push({
                                                value: `${ma}#${as.uniqueName}`,
                                                label: ma + '(' + as.uniqueName + ')',
                                                additional: Object.assign({}, acc, { stock: as })
                                            });
                                        });
                                    }
                                });
                            }

                            // add current account entry in base account array
                            accountsForBaseAccountArray.push({ value: acc.uniqueName, label: acc.name, additional: acc });
                        });

                    } else {
                        this.vm.flatternAccountList.map(acc => {
                            if (acc.stocks) {
                                acc.stocks.map(as => {
                                    accountsArray.push({
                                        value: `${acc.uniqueName}#${as.uniqueName}`,
                                        label: `${acc.name} (${as.uniqueName})`,
                                        additional: Object.assign({}, acc, { stock: as })
                                    });
                                });
                                accountsArray.push({ value: acc.uniqueName, label: acc.name, additional: acc });
                            } else {
                                accountsArray.push({ value: acc.uniqueName, label: acc.name, additional: acc });

                                // add current account entry in base account array
                                accountsForBaseAccountArray.push({ value: acc.uniqueName, label: acc.name, additional: acc });
                            }
                            // normal merge account entry
                            if (acc.mergedAccounts && acc.mergedAccounts !== '') {
                                let mergeAccs = acc.mergedAccounts.split(',');
                                mergeAccs.map(m => m.trim()).forEach(ma => {
                                    accountsArray.push({
                                        value: ma,
                                        label: ma,
                                        additional: acc
                                    });
                                });
                            }
                        });
                    }

                    this.vm.flatternAccountList4Select = observableOf(orderBy(accountsArray, 'label'));
                    this.vm.flatternAccountList4BaseAccount = orderBy(accountsForBaseAccountArray, 'label');
                    //#endregion

                    //#region transaction assignment process
                    this.vm.selectedLedger = resp[1];
                    this.isRcmEntry = (this.vm.selectedLedger.subVoucher === Subvoucher.ReverseCharge);

                    if (this.isPettyCash) {
                        // create missing property for petty cash
                        this.vm.selectedLedger.transactions.forEach(f => {
                            f.isDiscount = false;
                            f.isTax = false;

                            // special case in petty cash mode
                            // others account entry
                            // need to assign dummy particular, when we found particular uniquename as null
                            if (!f.particular.uniqueName) {
                                f.particular.uniqueName = 'others';
                                f.particular.name = 'others';
                            }

                        });
                        this.vm.selectedLedger.taxes = [];
                        this.vm.selectedLedger.discounts = [];
                        this.vm.selectedLedger.attachedFile = '';
                        this.vm.selectedLedger.voucher = { name: '', shortCode: '' };
                        this.vm.selectedLedger.invoicesToBePaid = [];
                    }

                    this.vm.selectedLedger.exchangeRateForDisplay = giddhRoundOff(this.vm.selectedLedger.exchangeRate, this.vm.giddhBalanceDecimalPlaces);
                    // this.vm.selectedLedger.exchangeRate = giddhRoundOff(this.vm.selectedLedger.exchangeRate, 4);

                    // divide actual amount with exchangeRate because currently we are getting actualAmount in company currency
                    this.vm.selectedLedger.actualAmount = giddhRoundOff(this.vm.selectedLedger.actualAmount / this.vm.selectedLedger.exchangeRate, this.vm.giddhBalanceDecimalPlaces);

                    // other taxes assigning process
                    let companyTaxes: TaxResponse[] = [];
                    this.vm.companyTaxesList$.pipe(take(1)).subscribe(taxes => companyTaxes = taxes);

                    let otherTaxesModal = new SalesOtherTaxesModal();
                    otherTaxesModal.itemLabel = resp[1].particular.name;

                    let tax: TaxResponse;
                    if (resp[1].tcsTaxes && resp[1].tcsTaxes.length) {
                        tax = companyTaxes.find(f => f.uniqueName === resp[1].tcsTaxes[0]);
                        this.vm.selectedLedger.otherTaxType = 'tcs';
                    } else if (resp[1].tdsTaxes && resp[1].tdsTaxes.length) {
                        tax = companyTaxes.find(f => f.uniqueName === resp[1].tdsTaxes[0]);
                        this.vm.selectedLedger.otherTaxType = 'tds';
                    }

                    if (tax) {
                        otherTaxesModal.appliedOtherTax = { name: tax.name, uniqueName: tax.uniqueName };
                    }

                    // otherTaxesModal.appliedOtherTax = (resp[1].tcsTaxes.length ? resp[1].tcsTaxes : resp[1].tdsTaxes) || [];
                    otherTaxesModal.tcsCalculationMethod = resp[1].tcsCalculationMethod || SalesOtherTaxesCalculationMethodEnum.OnTaxableAmount;

                    this.vm.selectedLedger.isOtherTaxesApplicable = !!(tax);
                    this.vm.selectedLedger.otherTaxModal = otherTaxesModal;

                    this.baseAccount$ = observableOf(resp[1].particular);
                    this.baseAccountName$ = resp[1].particular.uniqueName;
                    this.baseAcc = resp[1].particular.uniqueName;
                    this.firstBaseAccountSelected = resp[1].particular.uniqueName;

                    this.vm.selectedLedger.transactions.map(t => {

                        if (this.vm.selectedLedger.discounts.length > 0 && !t.isTax && t.particular.uniqueName !== 'roundoff') {
                            let category = this.vm.getCategoryNameFromAccount(t.particular.uniqueName);
                            if (this.vm.isValidCategory(category)) {
                                t.amount = this.vm.selectedLedger.actualAmount;
                            }
                        }

                        // if (!this.isMultiCurrencyAvailable) {
                        //   this.isMultiCurrencyAvailable = !!t.convertedAmountCurrency;
                        // }
                        if (t.inventory) {
                            let findStocks = accountsArray.find(f => f.value === t.particular.uniqueName + '#' + t.inventory.stock.uniqueName);
                            if (findStocks) {
                                let findUnitRates = findStocks.additional.stock;
                                if (findUnitRates && findUnitRates.accountStockDetails && findUnitRates.accountStockDetails.unitRates.length) {
                                    let tempUnitRates = findUnitRates.accountStockDetails.unitRates;
                                    tempUnitRates.map(tmp => tmp.code = tmp.stockUnitCode);
                                    t.unitRate = tempUnitRates;
                                } else {
                                    t.unitRate = [{
                                        code: t.inventory.unit.code,
                                        rate: t.inventory.rate,
                                        stockUnitCode: t.inventory.unit.code
                                    }];
                                }
                            } else {
                                t.unitRate = [{
                                    code: t.inventory.unit.code,
                                    rate: t.inventory.rate,
                                    stockUnitCode: t.inventory.unit.code
                                }];
                            }
                            t.particular.uniqueName = `${t.particular.uniqueName}#${t.inventory.stock.uniqueName}`;
                            // Show warehouse dropdown only for stock items
                            const warehouseDetails = t.inventory.warehouse;
                            if (warehouseDetails) {
                                this.selectedWarehouse = warehouseDetails.uniqueName;
                            } else {
                                // If warehouse details are not received show default warehouse
                                this.selectedWarehouse = String(this.defaultWarehouse);
                            }
                            this.shouldShowWarehouse = true;
                        }
                    });
                    this.vm.isInvoiceGeneratedAlready = this.vm.selectedLedger.voucherGenerated;

                    // check if entry allows to show discount and taxes box
                    // first check with opened lager
                    if (this.vm.checkDiscountTaxesAllowedOnOpenedLedger(this.activeAccount)) {
                        this.vm.showNewEntryPanel = true;
                    } else {
                        // now check if we transactions array have any income/expense/fixed assets entry
                        let incomeExpenseEntryLength = this.vm.isThereIncomeOrExpenseEntry();
                        this.vm.showNewEntryPanel = incomeExpenseEntryLength === 1;
                    }

                    this.vm.reInitilizeDiscount(resp[1]);

                    this.vm.selectedLedger.transactions.push(this.vm.blankTransactionItem('CREDIT'));
                    this.vm.selectedLedger.transactions.push(this.vm.blankTransactionItem('DEBIT'));

                    if (this.vm.stockTrxEntry) {
                        this.vm.inventoryPriceChanged(this.vm.stockTrxEntry.inventory.rate);
                    }
                    this.existingTaxTxn = _.filter(this.vm.selectedLedger.transactions, (o) => o.isTax);
                    //#endregion

                    this.vm.generatePanelAmount();
                }
            });

        // check if delete entry is success
        this.isDeleteTrxEntrySuccess$.subscribe(del => {
            if (del) {
                this.store.dispatch(this._ledgerAction.resetDeleteTrxEntryModal());
                this.closeUpdateLedgerModal.emit(true);
                this.baseAccountChanged = false;
            }
        });

        // check if update entry is success
        this.isTxnUpdateSuccess$.subscribe(upd => {
            if (upd) {
                this.store.dispatch(this._ledgerAction.ResetUpdateLedger());
                this.baseAccountChanged = false;
                // this.closeUpdateLedgerModal.emit(true);
            }
        });
    }

    private prepareMultiCurrencyObject(accountUniqueName) {
        this.multiCurrencyAccDetails = cloneDeep(this.vm.flatternAccountList.find(f => f.uniqueName === accountUniqueName));

        this.vm.isMultiCurrencyAvailable = this.multiCurrencyAccDetails ?
            !!(this.multiCurrencyAccDetails.currency && this.multiCurrencyAccDetails.currency !== this.profileObj.baseCurrency)
            : false;

        this.vm.foreignCurrencyDetails = { code: this.profileObj.baseCurrency, symbol: this.profileObj.baseCurrencySymbol };

        if (this.vm.isMultiCurrencyAvailable) {
            let currencies: ICurrencyResponse[] = [];
            let multiCurrencyAccCurrency: ICurrencyResponse;

            this.vm.currencyList$.pipe(take(1)).subscribe(res => currencies = res);
            multiCurrencyAccCurrency = currencies.find(f => f.code === this.multiCurrencyAccDetails.currency);
            this.vm.baseCurrencyDetails = { code: multiCurrencyAccCurrency.code, symbol: multiCurrencyAccCurrency.symbol };
        } else {
            this.vm.baseCurrencyDetails = this.vm.foreignCurrencyDetails;
        }
        this.vm.selectedCurrency = 0;
        this.vm.selectedCurrencyForDisplay = this.vm.selectedCurrency;
        this.assignPrefixAndSuffixForCurrency();
    }

    public ngAfterViewInit() {
        this.vm.discountComponent = this.discountComponent;
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['isPettyCash']) {
            this.isPettyCash = changes['isPettyCash'].currentValue;
        }
        if (changes['pettyCashEntry'] && changes['pettyCashEntry'].currentValue !== changes['pettyCashEntry'].previousValue) {
            this.accountPettyCashStream = changes['pettyCashEntry'].currentValue.body;
        }

        // skip pettyCashBaseAccountUniqueName changes if its first time
        // because we have already done this in get transaction response observable
        // so no need to do this
        // we will just check for account change in petty cash entry details screen
        if (changes['pettyCashBaseAccountUniqueName']
            && !changes['pettyCashBaseAccountUniqueName'].firstChange
            && changes['pettyCashBaseAccountUniqueName'].currentValue
            !== changes['pettyCashBaseAccountUniqueName'].previousValue) {
            if (this.isPettyCash) {
                this.accountUniqueName = changes['pettyCashBaseAccountUniqueName'].currentValue;

                if (this.accountUniqueName) {
                    this.pettyCashAccountChanged();
                }
            }
        }
    }

    public addBlankTrx(type: string = 'DEBIT', txn: ILedgerTransactionItem, event: Event) {

        if (Number(txn.amount) === 0) {
            txn.amount = undefined;
        }
        let lastTxn = last(filter(this.vm.selectedLedger.transactions, p => p.type === type));
        if (txn.particular.uniqueName && lastTxn.particular.uniqueName) {
            let blankTrxnRow = this.vm.blankTransactionItem(type);
            this.vm.selectedLedger.transactions.push(blankTrxnRow);
        }
    }

    public onUploadOutputUpdate(output: UploadOutput): void {
        if (output.type === 'allAddedToQueue') {
            let sessionKey = null;
            let companyUniqueName = null;
            this.sessionKey$.pipe(take(1)).subscribe(a => sessionKey = a);
            this.companyName$.pipe(take(1)).subscribe(a => companyUniqueName = a);
            const event: UploadInput = {
                type: 'uploadAll',
                url: Configuration.ApiUrl + LEDGER_API.UPLOAD_FILE.replace(':companyUniqueName', companyUniqueName),
                method: 'POST',
                fieldName: 'file',
                data: { company: companyUniqueName },
                headers: { 'Session-Id': sessionKey },
            };
            this.uploadInput.emit(event);
        } else if (output.type === 'start') {
            this.isFileUploading = true;
            this._loaderService.show();
        } else if (output.type === 'done') {
            this._loaderService.hide();
            if (output.file.response.status === 'success') {
                // this.isFileUploading = false;
                this.vm.selectedLedger.attachedFile = output.file.response.body.uniqueName;
                this.vm.selectedLedger.attachedFileName = output.file.response.body.name;
                this._toasty.successToast('file uploaded successfully');
            } else {
                this.isFileUploading = false;
                this.vm.selectedLedger.attachedFile = '';
                this.vm.selectedLedger.attachedFileName = '';
                this._toasty.errorToast(output.file.response.message);
            }
        }
    }

    public onResized(event: ResizedEvent) {
        this.totalTdElementWidth = event.newWidth + 10;
    }

    public selectAccount(e: IOption, txn: ILedgerTransactionItem, selectCmp: ShSelectComponent) {
        if (!e.value) {
            // if there's no selected account set selectedAccount to null
            txn.selectedAccount = null;
            txn.inventory = null;
            txn.particular.name = undefined;

            // check if need to showEntryPanel
            // first check with opened ledger
            if (this.vm.checkDiscountTaxesAllowedOnOpenedLedger(this.activeAccount)) {
                this.vm.showNewEntryPanel = true;
            } else {
                // now check if we transactions array have any income/expense/fixed assets entry
                let incomeExpenseEntryLength = this.vm.isThereIncomeOrExpenseEntry();
                this.vm.showNewEntryPanel = incomeExpenseEntryLength === 1;
            }

            return;
        } else {
            if (!txn.isUpdated) {
                if (this.vm.selectedLedger.taxes.length && !txn.isTax) {
                    txn.isUpdated = true;
                }
            }
            // check if txn.selectedAccount is aleready set so it means account name is changed without firing deselect event
            if (txn.selectedAccount) {
                // check if discount is added and update component as needed
                this.vm.discountArray.map(d => {
                    if (d.particular === txn.selectedAccount.uniqueName) {
                        d.amount = 0;
                    }
                });
            }
            // if ther's stock entry
            if (e.additional.stock) {
                // check if we aleready have stock entry
                if (this.vm.isThereStockEntry(e.value)) {
                    selectCmp.clear();
                    txn.particular.uniqueName = null;
                    txn.particular.name = null;
                    txn.selectedAccount = null;
                    this._toasty.warningToast('you can\'t add multiple stock entry');
                    return;
                } else {
                    // add unitArrys in txn for stock entry
                    txn.selectedAccount = e.additional;
                    let rate = 0;
                    let unitCode = '';
                    let unitName = '';
                    let stockName = '';
                    let stockUniqueName = '';
                    let unitArray = [];
                    let defaultUnit = {
                        stockUnitCode: e.additional.stock.stockUnit.name,
                        code: e.additional.stock.stockUnit.code,
                        rate: 0
                    };
                    if (e.additional.stock.accountStockDetails && e.additional.stock.accountStockDetails.unitRates) {
                        let cond = e.additional.stock.accountStockDetails.unitRates.find(p => p.stockUnitCode === e.additional.stock.stockUnit.code);
                        if (cond) {
                            defaultUnit.rate = cond.rate;
                            rate = defaultUnit.rate;
                        }
                        unitArray = unitArray.concat(e.additional.stock.accountStockDetails.unitRates.map(p => {
                            return {
                                stockUnitCode: p.stockUnitCode,
                                code: p.stockUnitCode,
                                rate: p.rate
                            };
                        }));
                        if (unitArray.findIndex(p => p.code === defaultUnit.code) === -1) {
                            unitArray.push(defaultUnit);
                        }
                    } else {
                        unitArray.push(defaultUnit);
                    }
                    txn.unitRate = unitArray;
                    stockName = e.additional.stock.name;
                    stockUniqueName = e.additional.stock.uniqueName;
                    unitName = e.additional.stock.stockUnit.name;
                    unitCode = e.additional.stock.stockUnit.code;

                    if (stockName && stockUniqueName) {
                        txn.inventory = {
                            stock: {
                                name: stockName,
                                uniqueName: stockUniqueName,
                            },
                            quantity: 1,
                            unit: {
                                stockUnitCode: unitCode,
                                code: unitCode,
                                rate
                            },
                            amount: 0,
                            rate
                        };
                        // Stock item, show the warehouse drop down
                        if (!this.shouldShowWarehouse) {
                            this.shouldShowWarehouse = true;
                        }
                    }
                    if (rate > 0 && txn.amount === 0) {
                        txn.amount = rate;
                    }
                }
            } else {
                // directly assign additional property
                txn.selectedAccount = e.additional;
                delete txn.inventory;
                // Non stock item got selected, search if there is any stock item along with non-stock item
                const isStockItemPresent = this.isStockItemPresent();
                if (!isStockItemPresent) {
                    // None of the item were stock item, hide the warehouse section which is applicable only for stocks
                    this.shouldShowWarehouse = false;
                }
            }

            // check if need to showEntryPanel
            // first check with opened lager
            if (this.vm.checkDiscountTaxesAllowedOnOpenedLedger(this.activeAccount)) {
                this.vm.showNewEntryPanel = true;
            } else {
                // now check if we transactions array have any income/expense/fixed assets entry
                let incomeExpenseEntryLength = this.vm.isThereIncomeOrExpenseEntry();
                this.vm.showNewEntryPanel = incomeExpenseEntryLength === 1;
            }

            // commented for now after discussion with @shubhendra and @aditya soni

            // if multi-currency is not available then check if selected account allows multi-currency
            // if (!this.vm.isMultiCurrencyAvailable) {
            //   this.vm.isMultiCurrencyAvailable = e.additional.currency && e.additional.currency !== this.profileObj.baseCurrency;
            //
            //   this.vm.foreignCurrencyDetails = {code: this.profileObj.baseCurrency, symbol: this.profileObj.baseCurrencySymbol};
            //
            //   if (this.vm.isMultiCurrencyAvailable) {
            //     let currencies: ICurrencyResponse[] = [];
            //     let multiCurrencyAccCurrency: ICurrencyResponse;
            //
            //     this.vm.currencyList$.pipe(take(1)).subscribe(res => currencies = res);
            //     multiCurrencyAccCurrency = currencies.find(f => f.code === e.additional.currency);
            //     this.vm.baseCurrencyDetails = {code: multiCurrencyAccCurrency.code, symbol: multiCurrencyAccCurrency.symbol};
            //
            //     let rate = await this.getCurrencyRate();
            //     this.vm.selectedLedger = {...this.vm.selectedLedger, exchangeRate: rate ? rate.body : 1};
            //
            //   } else {
            //     this.vm.baseCurrencyDetails = this.vm.foreignCurrencyDetails;
            //   }
            //   this.vm.selectedCurrency = 0;
            //   this.vm.selectedCurrencyForDisplay = this.vm.selectedCurrency;
            //   this.assignPrefixAndSuffixForCurrency();
            // }

            this.vm.onTxnAmountChange(txn);
        }
    }

    public onTxnAmountChange(txn: ILedgerTransactionItem) {
        if (!txn.selectedAccount) {
            this.vm.flatternAccountList4Select.pipe(take(1)).subscribe((accounts) => {
                if (accounts && accounts.length) {
                    let selectedAcc = accounts.find(acc => acc.value === txn.particular.uniqueName);
                    if (selectedAcc) {
                        txn.selectedAccount = selectedAcc.additional;
                    }
                }
            });
        }

        txn.convertedAmount = this.vm.calculateConversionRate(txn.amount);
        txn.isUpdated = true;
        this.vm.onTxnAmountChange(txn);
    }

    public showDeleteAttachedFileModal() {
        this.deleteAttachedFileModal.show();
    }

    public hideDeleteAttachedFileModal() {
        this.deleteAttachedFileModal.hide();
    }

    public showDeleteEntryModal() {
        this.deleteEntryModal.show();
    }

    public hideDeleteEntryModal() {
        this.deleteEntryModal.hide();
    }

    public deleteTrxEntry() {
        let uniqueName = this.vm.selectedLedger.particular.uniqueName;
        this.store.dispatch(this._ledgerAction.deleteTrxEntry(uniqueName, this.entryUniqueName));
        this.hideDeleteEntryModal();
    }

    public deleteAttachedFile() {
        this.vm.selectedLedger.attachedFile = '';
        this.vm.selectedLedger.attachedFileName = '';
        this.hideDeleteAttachedFileModal();
    }

    public saveLedgerTransaction() {
        // due to date picker of Tx entry date format need to change
        if (this.vm.selectedLedger.entryDate) {
            if (!moment(this.vm.selectedLedger.entryDate, 'DD-MM-YYYY').isValid()) {
                this._toasty.errorToast('Invalid Date Selected.Please Select Valid Date');
                this._loaderService.hide();
                return;
            } else {
                this.vm.selectedLedger.entryDate = moment(this.vm.selectedLedger.entryDate, 'DD-MM-YYYY').format('DD-MM-YYYY');
            }
        }

        // due to date picker of Tx chequeClearance date format need to change
        if (this.vm.selectedLedger.chequeClearanceDate) {
            if (!moment(this.vm.selectedLedger.chequeClearanceDate, 'DD-MM-YYYY').isValid()) {
                this._toasty.errorToast('Invalid Date Selected In Cheque Clearance Date.Please Select Valid Date');
                this._loaderService.hide();
                return;
            } else {
                this.vm.selectedLedger.chequeClearanceDate = moment(this.vm.selectedLedger.chequeClearanceDate, 'DD-MM-YYYY').format('DD-MM-YYYY');
            }
        }
        let requestObj: LedgerResponse = this.vm.prepare4Submit();

        // special case for is petty cash mode
        // remove dummy others account from transaction.particular.uniqueName
        // added because we want to handle others account case in petty cash entry
        if (this.isPettyCash) {
            let isThereOthersDummyAcc = this.vm.flatternAccountList.some(d => d.uniqueName === 'others' && d.isDummy);
            if (isThereOthersDummyAcc) {
                let isThereDummyOtherTrx = requestObj.transactions.some(s => s.particular.uniqueName === 'others');
                if (isThereDummyOtherTrx) {
                    this._toasty.errorToast('Please select a valid account in transaction');
                    return;
                }
            }
        }
        if (this.isRcmEntry && requestObj.taxes.length === 0) {
            // Taxes are mandatory for RCM entries
            this.taxControll.taxInputElement.nativeElement.classList.add('error-box');
            return;
        }

        requestObj.valuesInAccountCurrency = this.vm.selectedCurrency === 0;
        requestObj.exchangeRate = (this.vm.selectedCurrencyForDisplay !== this.vm.selectedCurrency) ? (1 / this.vm.selectedLedger.exchangeRate) : this.vm.selectedLedger.exchangeRate;
        requestObj.subVoucher = (this.isRcmEntry) ? Subvoucher.ReverseCharge : '';
        requestObj.transactions = requestObj.transactions.filter(f => !f.isDiscount);
        requestObj.transactions = requestObj.transactions.filter(tx => !tx.isTax);
        requestObj.transactions.map((transaction) => {
            if (transaction.inventory && this.shouldShowWarehouse) {
                // Update the warehouse details in update ledger flow
                if (transaction.inventory.warehouse) {
                    transaction.inventory.warehouse.uniqueName = this.selectedWarehouse;
                } else {
                    transaction.inventory.warehouse = { name: '', uniqueName: '' };
                    transaction.inventory.warehouse.uniqueName = this.selectedWarehouse;
                }
            }
        });
        if (this.tcsOrTds === 'tds') {
            delete requestObj['tcsCalculationMethod'];
        }
        delete requestObj['tdsTaxes'];
        delete requestObj['tcsTaxes'];

        // if no petty cash mode then do normal update ledger request
        if (!this.isPettyCash) {
            if (this.baseAccountChanged) {
                this.store.dispatch(this._ledgerAction.updateTxnEntry(requestObj, this.firstBaseAccountSelected, this.entryUniqueName + '?newAccountUniqueName=' + this.changedAccountUniq));
            } else {
                this.store.dispatch(this._ledgerAction.updateTxnEntry(requestObj, this.firstBaseAccountSelected, this.entryUniqueName));
            }
        } else {
            // for petty cash approve request, just return request object
            return requestObj;
        }
    }

    /**
     * Unsubscribe to all the listeners to avoid memory leaks
     *
     * @memberof UpdateLedgerEntryPanelComponent
     */
    public ngOnDestroy(): void {
        this.vm.resetVM();
        this.destroyed$.next(true);
        this.destroyed$.complete();
        // Remove the transaction details for ledger once the component is destroyed
        this.store.dispatch(this._ledgerAction.resetLedgerTrxDetails());
    }

    public downloadAttachedFile(fileName: string, e: Event) {
        e.stopPropagation();
        this._ledgerService.DownloadAttachement(fileName).subscribe(d => {
            if (d.status === 'success') {
                let blob = base64ToBlob(d.body.uploadedFile, `image/${d.body.fileType}`, 512);
                return saveAs(blob, d.body.name);
            } else {
                this._toasty.errorToast(d.message);
            }
        });
    }

    public downloadInvoice(invoiceName: string, voucherType: string, e: Event) {
        e.stopPropagation();
        let downloadRequest = new DownloadLedgerRequest();
        downloadRequest.invoiceNumber = [invoiceName];
        downloadRequest.voucherType = voucherType;

        this._ledgerService.DownloadInvoice(downloadRequest, this.activeAccount.uniqueName).subscribe(d => {
            if (d.status === 'success') {
                let blob = base64ToBlob(d.body, 'application/pdf', 512);
                return saveAs(blob, `${this.activeAccount.name} - ${invoiceName}.pdf`);
            } else {
                this._toasty.errorToast(d.message);
            }
        });
    }

    public showQuickAccountModal() {
        this.showQuickAccountModalFromUpdateLedger.emit(true);
    }

    public changeBaseAccount(acc) {
        this.openDropDown = false;
        if (!acc) {
            this._toasty.errorToast('Account not changed');
            this.hideBaseAccountModal();
            return;
        }
        if (acc === this.baseAcc) {
            this._toasty.errorToast('Account not changed');
            this.hideBaseAccountModal();
            return;
        }
        this.changedAccountUniq = acc.value;
        this.baseAccountChanged = true;
        this.saveLedgerTransaction();
        this.hideBaseAccountModal();
    }

    public openBaseAccountModal() {
        if (this.vm.selectedLedger.voucherGenerated) {
            this._toasty.errorToast('You are not permitted to change base account. Voucher is already Generated');
            return;
        }
        this.updateBaseAccount.show();
        //
    }

    public hideBaseAccountModal() {
        this.updateBaseAccount.hide();
        //
    }

    public getInvoiveListsData(e: any) {
        if (e.value === 'rcpt') {
            if (this.isPettyCash && !this.accountUniqueName) {
                this._toasty.errorToast('Please Select ' + this.pettyCashBaseAccountTypeString + '  for entry..');
                return;
            }

            this.invoiceList = [];
            this._ledgerService.GetInvoiceList({ accountUniqueName: this.accountUniqueName, status: 'unpaid' }).subscribe((res: any) => {
                _.map(res.body.invoiceList, (o) => {
                    this.invoiceList.push({ label: o.invoiceNumber, value: o.invoiceNumber, isSelected: false });
                });
            });
        } else {
            this.invoiceList = [];
        }
    }

    public getInvoiveLists() {
        if (this.vm.selectedLedger.voucher.shortCode === 'rcpt') {
            if (this.isPettyCash && !this.accountUniqueName) {
                this._toasty.errorToast('Please Select ' + this.pettyCashBaseAccountTypeString + '  for entry..');
                return;
            }

            this.invoiceList = [];
            this._ledgerService.GetInvoiceList({ accountUniqueName: this.accountUniqueName, status: 'unpaid' }).subscribe((res: any) => {
                _.map(res.body.invoiceList, (o) => {
                    this.invoiceList.push({ label: o.invoiceNumber, value: o.invoiceNumber, isSelected: false });
                });
            });
        } else {
            this.invoiceList = [];
        }
    }

    public selectInvoice(invoiceNo, ev) {
        invoiceNo.isSelected = ev.target.checked;
        if (ev.target.checked) {
            this.vm.selectedLedger.invoicesToBePaid.push(invoiceNo.label);
        } else {
            let indx = this.vm.selectedLedger.invoicesToBePaid.indexOf(invoiceNo.label);
            this.vm.selectedLedger.invoicesToBePaid.splice(indx, 1);
        }
    }

    public openHeaderDropDown() {
        if (!this.vm.selectedLedger.voucherGenerated) {
            this.openDropDown = true;
        } else {
            this.openDropDown = false;
            this._toasty.errorToast('You are not permitted to change base account. Voucher is already Generated');
            return;
        }
    }

    public keydownPressed(e) {
        if (e.code === 'ArrowDown') {
            this.keydownClassAdded = true;
        } else if (e.code === 'Enter' && this.keydownClassAdded) {
            this.keydownClassAdded = true;
            this.toggleAsidePaneOpen();
        } else {
            this.keydownClassAdded = false;
        }

    }

    public toggleAsidePaneOpen() {
        if (document.getElementById('createNewId')) {
            document.getElementById('createNewId').click();
            this.keydownClassAdded = false;
        }
        if (document.getElementById('createNewId2')) {
            document.getElementById('createNewId2').click();
            this.keydownClassAdded = false;
        }
    }

    public hideDiscountTax(): void {
        if (this.discountComponent) {
            this.discountComponent.discountMenu = false;
        }
        if (this.taxControll) {
            this.taxControll.showTaxPopup = false;
        }
    }

    public hideDiscount(): void {
        if (this.discountComponent) {
            this.discountComponent.change();
            this.discountComponent.discountMenu = false;
        }
    }

    public hideTax(): void {
        if (this.taxControll) {
            this.taxControll.change();
            this.taxControll.showTaxPopup = false;
        }
    }

    public async toggleCurrency() {
        this.vm.selectedCurrencyForDisplay = this.vm.selectedCurrencyForDisplay === 1 ? 0 : 1;
        let rate = 0;
        if (Number(this.vm.selectedLedger.exchangeRateForDisplay)) {
            rate = 1 / this.vm.selectedLedger.exchangeRate;
        }
        this.vm.selectedLedger = { ...this.vm.selectedLedger, exchangeRate: rate, exchangeRateForDisplay: giddhRoundOff(rate, this.vm.giddhBalanceDecimalPlaces) };
    }

    public exchangeRateChanged() {
        this.vm.selectedLedger.exchangeRate = Number(this.vm.selectedLedger.exchangeRateForDisplay) || 0;
        this.vm.inventoryAmountChanged();
    }

    /**
     * Toggle the RCM checkbox based on user confirmation
     *
     * @param {*} event Click event
     * @memberof UpdateLedgerEntryPanelComponent
     */
    public toggleRcmCheckbox(event: any): void {
        event.preventDefault();
        this.rcmConfiguration = this.generalService.getRcmConfiguration(event.target.checked);
    }

    /**
     * RCM change handler, triggerreed when the user performs any
     * action with the RCM popup
     *
     * @param {string} action Action performed by user
     * @memberof UpdateLedgerEntryPanelComponent
     */
    public handleRcmChange(action: string): void {
        if (action === RCM_ACTIONS.YES) {
            // Toggle the state of RCM as user accepted the terms of RCM modal
            this.isRcmEntry = !this.isRcmEntry;
        }
        if (this.rcmPopup) {
            this.rcmPopup.hide();
        }
    }

    // petty cash account changes, change all things related to account uniquename
    // like multi currency account, base account etc...
    private pettyCashAccountChanged() {
        // set account details for multi currency account
        this.prepareMultiCurrencyObject(this.accountUniqueName);
        // end multi currency assign
    }

    private assignPrefixAndSuffixForCurrency() {
        this.vm.isPrefixAppliedForCurrency = this.vm.isPrefixAppliedForCurrency = !(['AED'].includes(this.vm.selectedCurrency === 0 ? this.vm.baseCurrencyDetails.code : this.vm.foreignCurrencyDetails.code));
        this.vm.selectedPrefixForCurrency = this.vm.isPrefixAppliedForCurrency ? this.vm.selectedCurrency === 0 ? this.vm.baseCurrencyDetails.symbol : this.vm.foreignCurrencyDetails.symbol : '';
        this.vm.selectedSuffixForCurrency = this.vm.isPrefixAppliedForCurrency ? '' : this.vm.selectedCurrency === 0 ? this.vm.baseCurrencyDetails.symbol : this.vm.foreignCurrencyDetails.symbol;
    }

    private getCurrencyRate() {
        let from = this.vm.selectedCurrency === 0 ? this.vm.baseCurrencyDetails.code : this.vm.foreignCurrencyDetails.code;
        let to = this.vm.selectedCurrency === 0 ? this.vm.foreignCurrencyDetails.code : this.vm.baseCurrencyDetails.code;
        let date = moment().format('DD-MM-YYYY');
        return this._ledgerService.GetCurrencyRateNewApi(from, to, date).toPromise();
    }

    /**
     * Returns true, if any of the single item is stock
     *
     * @private
     * @returns {boolean} True, if item array contains stock item
     * @memberof UpdateLedgerEntryPanelComponent
     */
    private isStockItemPresent(): boolean {
        for (let index = 0; index < this.vm.selectedLedger.transactions.length; index++) {
            if (this.vm.selectedLedger.transactions[index].inventory) {
                return true;
            }
        }
        return false;
    }
}
