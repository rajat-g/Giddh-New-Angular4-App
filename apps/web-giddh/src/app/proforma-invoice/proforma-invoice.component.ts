import { AfterViewInit, Component, EventEmitter, HostListener, Input, NgZone, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { BsModalRef, BsModalService, ModalDirective } from 'ngx-bootstrap';
import { select, Store } from '@ngrx/store';
import { AppState } from '../store';
import { AccountService } from '../services/account.service';
import { SalesActions } from '../actions/sales/sales.action';
import { CompanyActions } from '../actions/company.actions';
import { ActivatedRoute, Router } from '@angular/router';
import { LedgerActions } from '../actions/ledger/ledger.actions';
import { SalesService } from '../services/sales.service';
import { ToasterService } from '../services/toaster.service';
import { GeneralActions } from '../actions/general/general.actions';
import { InvoiceActions } from '../actions/invoice/invoice.actions';
import { SettingsDiscountActions } from '../actions/settings/discount/settings.discount.action';
import { InvoiceReceiptActions } from '../actions/invoice/receipt/receipt.actions';
import { SettingsProfileActions } from '../actions/settings/profile/settings.profile.action';
import { AccountDetailsClass, GenericRequestForGenerateSCD, IForceClear, IStockUnit, SalesEntryClass, SalesTransactionItemClass, VOUCHER_TYPE_LIST, VoucherClass } from '../models/api-models/Sales';
import { auditTime, take, takeUntil } from 'rxjs/operators';
import { IOption } from '../theme/ng-select/option.interface';
import { combineLatest, Observable, of as observableOf, ReplaySubject } from 'rxjs';
import { ElementViewContainerRef } from '../shared/helpers/directives/elementViewChild/element.viewchild.directive';
import { NgForm } from '@angular/forms';
import { DiscountListComponent } from '../sales/discount-list/discountList.component';
import { IContentCommon, IInvoiceTax } from '../models/api-models/Invoice';
import { TaxResponse } from '../models/api-models/Company';
import { INameUniqueName } from '../models/interfaces/nameUniqueName.interface';
import { AccountResponseV2 } from '../models/api-models/Account';
import { GIDDH_DATE_FORMAT } from '../shared/helpers/defaultDateFormat';
import { IFlattenAccountsResultItem } from '../models/interfaces/flattenAccountsResultItem.interface';
import * as moment from 'moment/moment';
import { UploaderOptions, UploadInput, UploadOutput } from 'ngx-uploader';
import * as _ from '../lodash-optimized';
import { InvoiceSetting } from '../models/interfaces/invoice.setting.interface';
import { SalesShSelectComponent } from '../theme/sales-ng-virtual-select/sh-select.component';
import { EMAIL_REGEX_PATTERN } from '../shared/helpers/universalValidations';
import { BaseResponse } from '../models/api-models/BaseResponse';
import { LedgerDiscountClass } from '../models/api-models/SettingsDiscount';
import { Configuration } from '../app.constant';
import { LEDGER_API } from '../services/apiurls/ledger.api';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';

const THEAD_ARR_READONLY = [
  {
    display: true,
    label: '#'
  },
  {
    display: true,
    label: 'Product/Service  Description '
  },
  {
    display: true,
    label: 'Qty/Unit'
  },
  {
    display: true,
    label: 'Rate'
  },
  {
    display: true,
    label: 'Amount'
  },
  {
    display: true,
    label: 'Discount'
  },
  {
    display: true,
    label: 'Tax'
  },
  {
    display: true,
    label: 'Total'
  },
  {
    display: true,
    label: ''
  }
];

@Component({
  selector: 'proforma-invoice-component',
  templateUrl: './proforma-invoice.component.html',
  styleUrls: [`./proforma-invoice.component.scss`],
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

export class ProformaInvoiceComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() public isPurchaseInvoice: boolean = false;
  @Input() public accountUniqueName: string = '';

  @ViewChild(ElementViewContainerRef) public elementViewContainerRef: ElementViewContainerRef;
  @ViewChild('createGroupModal') public createGroupModal: ModalDirective;
  @ViewChild('createAcModal') public createAcModal: ModalDirective;
  @ViewChild('bulkItemsModal') public bulkItemsModal: ModalDirective;

  @ViewChild('invoiceForm') public invoiceForm: NgForm;
  @ViewChild('discountComponent') public discountComponent: DiscountListComponent;

  public invoiceNo = '';
  public invoiceType: string;
  public isUpdateMode = false;
  public selectedAcc: boolean = false;
  public customerCountryName: string = '';
  public hsnDropdownShow: boolean = false;

  public isGenDtlCollapsed: boolean = true;
  public isMlngAddrCollapsed: boolean = true;
  public isOthrDtlCollapsed: boolean = false;
  public typeaheadNoResultsOfCustomer: boolean = false;
  public invFormData: VoucherClass;
  public customerAcList$: Observable<IOption[]>;
  public bankAccounts$: Observable<IOption[]>;
  public salesAccounts$: Observable<IOption[]> = observableOf(null);
  public accountAsideMenuState: string = 'out';
  public asideMenuStateForProductService: string = 'out';
  public asideMenuStateForRecurringEntry: string = 'out';
  public theadArrReadOnly: IContentCommon[] = THEAD_ARR_READONLY;
  public companyTaxesList: TaxResponse[] = [];
  public showCreateAcModal: boolean = false;
  public showCreateGroupModal: boolean = false;
  public createAcCategory: string = null;
  public newlyCreatedAc$: Observable<INameUniqueName>;
  public newlyCreatedStockAc$: Observable<INameUniqueName>;
  public countrySource: IOption[] = [];
  public statesSource: IOption[] = [];
  public activeAccount$: Observable<AccountResponseV2>;
  public autoFillShipping: boolean = true;
  public toggleFieldForSales: boolean = true;
  public dueAmount: number = 0;
  public giddhDateFormat: string = GIDDH_DATE_FORMAT;
  public flattenAccountListStream$: Observable<IFlattenAccountsResultItem[]>;
  public voucherDetails$: Observable<VoucherClass>;
  public createAccountIsSuccess$: Observable<boolean>;
  public forceClear$: Observable<IForceClear> = observableOf({status: false});
  // modals related
  public modalConfig = {
    animated: true,
    keyboard: false,
    backdrop: 'static',
    ignoreBackdropClick: true
  };
  public pageList: IOption[] = VOUCHER_TYPE_LIST;
  public selectedPage: string = VOUCHER_TYPE_LIST[0].value;
  public toggleActionText: string = VOUCHER_TYPE_LIST[0].value;
  public universalDate: any;
  public moment = moment;
  public GIDDH_DATE_FORMAT = GIDDH_DATE_FORMAT;
  public activeIndx: number;
  public selectedPageLabel: string = VOUCHER_TYPE_LIST[0].additional.label;
  public isCustomerSelected = false;
  public voucherNumber: string;
  public depositAccountUniqueName: string;
  public dropdownisOpen: boolean = false;
  public fileUploadOptions: UploaderOptions;

  public stockTaxList = []; // New
  public uploadInput: EventEmitter<UploadInput>;
  public sessionKey$: Observable<string>;
  public companyName$: Observable<string>;
  public isFileUploading: boolean = false;
  public selectedFileName: string = '';
  public file: any = null;
  public isSalesInvoice: boolean = true;
  public invoiceDataFound: boolean = false;
  public isUpdateDataInProcess: boolean = false;
  public isMobileView: boolean = false;

  public modalRef: BsModalRef;
  // private below
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private selectedAccountDetails$: Observable<AccountResponseV2>;
  private entryIdx: number;
  private updateAccount: boolean = false;
  private companyUniqueName$: Observable<string>;
  private sundryDebtorsAcList: IOption[] = [];
  private sundryCreditorsAcList: IOption[] = [];
  private prdSerAcListForDeb: IOption[] = [];
  private prdSerAcListForCred: IOption[] = [];

  constructor(
    private modalService: BsModalService,
    private store: Store<AppState>,
    private accountService: AccountService,
    private salesAction: SalesActions,
    private companyActions: CompanyActions,
    private router: Router,
    private ledgerActions: LedgerActions,
    private salesService: SalesService,
    private _toasty: ToasterService,
    private _generalActions: GeneralActions,
    private _invoiceActions: InvoiceActions,
    private _settingsDiscountAction: SettingsDiscountActions,
    public route: ActivatedRoute,
    private invoiceReceiptActions: InvoiceReceiptActions,
    private _settingsProfileActions: SettingsProfileActions,
    private _zone: NgZone,
    private _breakpointObserver: BreakpointObserver
  ) {

    this.store.dispatch(this._settingsProfileActions.GetProfileInfo());
    this.store.dispatch(this.companyActions.getTax());
    this.store.dispatch(this.ledgerActions.GetDiscountAccounts());
    this.store.dispatch(this._invoiceActions.getInvoiceSetting());
    this.store.dispatch(this._settingsDiscountAction.GetDiscount());
    this.store.dispatch(this.salesAction.resetAccountDetailsForSales());

    this.invFormData = new VoucherClass();
    this.companyUniqueName$ = this.store.pipe(select(s => s.session.companyUniqueName), takeUntil(this.destroyed$));
    this.activeAccount$ = this.store.pipe(select(p => p.groupwithaccounts.activeAccount), takeUntil(this.destroyed$));
    this.newlyCreatedAc$ = this.store.pipe(select(p => p.groupwithaccounts.newlyCreatedAccount), takeUntil(this.destroyed$));
    this.newlyCreatedStockAc$ = this.store.pipe(select(p => p.sales.newlyCreatedStockAc), takeUntil(this.destroyed$));
    this.flattenAccountListStream$ = this.store.pipe(select(p => p.general.flattenAccounts), takeUntil(this.destroyed$));
    this.voucherDetails$ = this.store.pipe(select(p => (p.receipt.voucher as VoucherClass)), takeUntil(this.destroyed$));
    this.selectedAccountDetails$ = this.store.pipe(select(p => p.sales.acDtl), takeUntil(this.destroyed$));
    this.createAccountIsSuccess$ = this.store.pipe(select(p => p.groupwithaccounts.createAccountIsSuccess), takeUntil(this.destroyed$));
    this.sessionKey$ = this.store.pipe(select(p => p.session.user.session.id), takeUntil(this.destroyed$));
    this.companyName$ = this.store.pipe(select(p => p.session.companyUniqueName), takeUntil(this.destroyed$));

    // bind state sources
    this.store.pipe(select(p => p.general.states), takeUntil(this.destroyed$)).subscribe((states) => {
      let arr: IOption[] = [];
      if (states) {
        states.forEach(d => {
          arr.push({label: `${d.name}`, value: d.code});
        });
      }
      this.statesSource = arr;
    });
  }

  public ngOnDestroy() {
    this.store.dispatch(this.invoiceReceiptActions.ResetVoucherDetails());
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  public ngAfterViewInit() {
    // fristElementToFocus to focus on customer search box
    setTimeout(function () {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < $('.fristElementToFocus').length; i++) {
        if ($('.fristElementToFocus')[i].tabIndex === 0) {
          $('.fristElementToFocus')[i].focus();
        }
      }
    }, 200);
    // this.fristElementToFocus.nativeElement.focus(); // not working
  }

  public ngOnInit() {
    this.invoiceNo = '';
    this.isUpdateMode = false;

    // get user country from his profile
    this.store.pipe(select(s => s.settings.profile), takeUntil(this.destroyed$)).subscribe(profile => {
      if (profile) {
        this.customerCountryName = profile.country;
      } else {
        this.customerCountryName = '';
      }
    });

    this.route.params.pipe(takeUntil(this.destroyed$)).subscribe(parmas => {
      if (parmas['accUniqueName']) {
        this.accountUniqueName = parmas['accUniqueName'];
        this.isUpdateMode = false;

        this.getAccountDetails(parmas['accUniqueName']);
      }

      if (parmas['invoiceNo'] && parmas['accUniqueName'] && parmas['invoiceType']) {
        this.accountUniqueName = parmas['accUniqueName'];
        this.invoiceNo = parmas['invoiceNo'];
        this.invoiceType = parmas['invoiceType'];
        this.isUpdateMode = true;
        this.isUpdateDataInProcess = true;

        let voucherType = VOUCHER_TYPE_LIST.find(f => f.value.toLowerCase() === this.invoiceType);
        this.selectedPage = voucherType.value;
        this.selectedPageLabel = voucherType.additional.label;
        this.isSalesInvoice = this.selectedPage === 'Sales';
        this.toggleFieldForSales = (!(this.selectedPage === VOUCHER_TYPE_LIST[2].value || this.selectedPage === VOUCHER_TYPE_LIST[1].value));

        this.store.dispatch(this.invoiceReceiptActions.GetVoucherDetails(this.accountUniqueName, {
          invoiceNumber: this.invoiceNo,
          voucherType: this.invoiceType
        }));
      }
    });

    // get account details and set it to local var
    this.selectedAccountDetails$.subscribe(o => {
      if (o && !this.isUpdateMode) {
        this.assignAccountDetailsValuesInForm(o);
      }
    });

    // get tax list and assign values to local vars
    this.store.pipe(select(p => p.company.taxes), takeUntil(this.destroyed$)).subscribe((o: TaxResponse[]) => {
      if (o) {
        this.companyTaxesList = o;
        this.theadArrReadOnly.forEach((item: IContentCommon) => {
          // show tax label
          if (item.label === 'Tax') {
            item.display = true;
          }
          return item;
        });
      } else {
        this.companyTaxesList = [];
      }
    });

    // listen for new add account utils
    this.newlyCreatedAc$.pipe(takeUntil(this.destroyed$)).subscribe((o: INameUniqueName) => {
      if (o && this.accountAsideMenuState === 'in') {
        let item: IOption = {
          label: o.name,
          value: o.uniqueName
        };
        this.onSelectCustomer(item);
      }
    });

    // create account success then hide aside pane
    this.createAccountIsSuccess$.pipe(takeUntil(this.destroyed$)).subscribe((o) => {
      if (o && this.accountAsideMenuState === 'in') {
        this.toggleAccountAsidePane();
      }
    });

    // listen for universal date
    this.store.pipe(select((p: AppState) => p.session.applicationDate)).subscribe((dateObj: Date[]) => {
      if (dateObj) {
        try {
          this.universalDate = moment(dateObj[1]).toDate();
          this.assignDates();
        } catch (e) {
          this.universalDate = new Date();
        }
      }
    });

    this.addBlankRow(null);
    this.store.pipe(select((s: AppState) => s.invoice.settings), takeUntil(this.destroyed$)).subscribe((setting: InvoiceSetting) => {
      if (setting && setting.invoiceSettings) {
        this.invFormData.voucherDetails.dueDate = setting.invoiceSettings.duePeriod ?
          moment().add(setting.invoiceSettings.duePeriod, 'days') : moment().toDate();
      }
    });

    this.uploadInput = new EventEmitter<UploadInput>();
    this.fileUploadOptions = {concurrency: 0};

    // combine get voucher details && all flatten A/c's
    combineLatest([this.flattenAccountListStream$, this.voucherDetails$])
      .pipe(takeUntil(this.destroyed$), auditTime(700))
      .subscribe(results => {

        // create mode because voucher details are not available
        if (results[0]) {
          let flattenAccounts: IFlattenAccountsResultItem[] = results[0];
          // assign flatten A/c's
          let bankaccounts: IOption[] = [];
          this.sundryDebtorsAcList = [];
          this.sundryCreditorsAcList = [];
          this.prdSerAcListForDeb = [];
          this.prdSerAcListForCred = [];

          flattenAccounts.forEach(item => {

            if (item.parentGroups.some(p => p.uniqueName === 'sundrydebtors')) {
              this.sundryDebtorsAcList.push({label: item.name, value: item.uniqueName});
            }

            if (item.parentGroups.some(p => p.uniqueName === 'sundrycreditors')) {
              this.sundryCreditorsAcList.push({label: item.name, value: item.uniqueName});
            }

            if (item.parentGroups.some(p => p.uniqueName === 'bankaccounts' || p.uniqueName === 'cash')) {
              bankaccounts.push({label: item.name, value: item.uniqueName});
            }

            if (item.parentGroups.some(p => p.uniqueName === 'otherincome' || p.uniqueName === 'revenuefromoperations')) {
              if (item.stocks) {
                // normal entry
                this.prdSerAcListForDeb.push({value: item.uniqueName, label: item.name, additional: item});

                // stock entry
                item.stocks.map(as => {
                  this.prdSerAcListForDeb.push({
                    value: `${item.uniqueName}#${as.uniqueName}`,
                    label: `${item.name} (${as.name})`,
                    additional: Object.assign({}, item, {stock: as})
                  });
                });
              } else {
                this.prdSerAcListForDeb.push({value: item.uniqueName, label: item.name, additional: item});
              }
            }

            if (item.parentGroups.some(p => p.uniqueName === 'operatingcost' || p.uniqueName === 'indirectexpenses')) {
              if (item.stocks) {
                // normal entry
                this.prdSerAcListForCred.push({value: item.uniqueName, label: item.name, additional: item});

                // stock entry
                item.stocks.map(as => {
                  this.prdSerAcListForCred.push({
                    value: `${item.uniqueName}#${as.uniqueName}`,
                    label: `${item.name} (${as.name})`,
                    additional: Object.assign({}, item, {stock: as})
                  });
                });
              } else {
                this.prdSerAcListForCred.push({value: item.uniqueName, label: item.name, additional: item});
              }
            }

          });

          this.makeCustomerList();
          bankaccounts = _.orderBy(bankaccounts, 'label');
          this.bankAccounts$ = observableOf(bankaccounts);

          if (this.invFormData.accountDetails && !this.invFormData.accountDetails.uniqueName) {
            if (bankaccounts) {
              if (bankaccounts.length > 0) {
                this.invFormData.accountDetails.uniqueName = 'cash';
              } else if (bankaccounts.length === 1) {
                this.depositAccountUniqueName = 'cash';
              }
            }
          }
        }

        // update mode because voucher details is available
        if (results[0] && results[1]) {
          if (results[1].voucherDetails) {
            let obj: VoucherClass = _.cloneDeep(results[1]);

            if (obj.entries.length) {

              obj.entries = obj.entries.map((entry, index) => {
                this.activeIndx = index;
                entry.entryDate = moment(entry.entryDate, GIDDH_DATE_FORMAT).toDate();

                entry.discounts = this.parseDiscountFromResponse(entry);

                entry.transactions = entry.transactions.map(trx => {
                  let newTrxObj: SalesTransactionItemClass = new SalesTransactionItemClass();

                  newTrxObj.accountName = trx.accountName;
                  newTrxObj.amount = trx.amount;
                  newTrxObj.description = trx.description;
                  newTrxObj.stockDetails = trx.stockDetails;
                  newTrxObj.taxableValue = trx.taxableValue;
                  newTrxObj.hsnNumber = trx.hsnNumber;
                  newTrxObj.isStockTxn = trx.isStockTxn;
                  newTrxObj.taxableValue = trx.taxableValue;

                  // check if stock details is available then assign uniquename as we have done while creating option
                  if (trx.isStockTxn) {
                    newTrxObj.accountUniqueName = `${trx.accountUniqueName}#${trx.stockDetails.uniqueName}`;
                    newTrxObj.fakeAccForSelect2 = `${trx.accountUniqueName}#${trx.stockDetails.uniqueName}`;

                    // stock unit assign process
                    let flattenAccs: IFlattenAccountsResultItem[] = results[0];
                    // get account from flatten account
                    let selectedAcc = flattenAccs.find(d => {
                      return (d.uniqueName === trx.accountUniqueName);
                    });

                    if (selectedAcc) {
                      // get stock from flatten account
                      let stock = selectedAcc.stocks.find(s => s.uniqueName === trx.stockDetails.uniqueName);

                      if (stock) {
                        let stockUnit: IStockUnit = {
                          id: stock.stockUnit.code,
                          text: stock.stockUnit.name
                        };

                        newTrxObj.stockList = [];
                        if (stock.accountStockDetails.unitRates.length) {
                          newTrxObj.stockList = this.prepareUnitArr(stock.accountStockDetails.unitRates);
                        } else {
                          newTrxObj.stockList.push(stockUnit);
                        }
                      }
                    }

                    newTrxObj.quantity = trx.quantity;
                    newTrxObj.rate = trx.rate;
                    newTrxObj.stockUnit = trx.stockUnit;

                  } else {
                    newTrxObj.accountUniqueName = trx.accountUniqueName;
                    newTrxObj.fakeAccForSelect2 = trx.accountUniqueName;
                  }

                  return newTrxObj;
                });
                return entry;
              });
            }
            if (obj.voucherDetails.voucherDate) {
              obj.voucherDetails.voucherDate = moment(obj.voucherDetails.voucherDate, 'DD-MM-YYYY').toDate();
            }
            if (obj.voucherDetails.dueDate) {
              obj.voucherDetails.dueDate = moment(obj.voucherDetails.dueDate, 'DD-MM-YYYY').toDate();
            }

            this.isCustomerSelected = true;
            this.invoiceDataFound = true;
            this.invFormData = obj;
          } else {
            this.invoiceDataFound = false;
          }

          this.isUpdateDataInProcess = false;
        }
      });

    // listen for newly added stock and assign value
    combineLatest(this.newlyCreatedStockAc$, this.salesAccounts$).subscribe((resp: any[]) => {
      let o = resp[0];
      let acData = resp[1];
      if (o && acData) {
        let result: IOption = _.find(acData, (item: IOption) => item.additional.uniqueName === o.linkedAc && item.additional && item.additional.stock && item.additional.stock.uniqueName === o.uniqueName);
        if (result && !_.isUndefined(this.entryIdx)) {
          this.invFormData.entries[this.entryIdx].transactions[0].fakeAccForSelect2 = result.value;
          this.onSelectSalesAccount(result, this.invFormData.entries[this.entryIdx].transactions[0]);
        }
      }
    });

    this._breakpointObserver
      .observe(['(max-width: 1440px)'])
      .pipe(takeUntil(this.destroyed$))
      .subscribe((st: BreakpointState) => {
        this.isMobileView = st.matches;
      });
  }

  public assignDates() {
    let date = _.cloneDeep(this.universalDate);
    this.invFormData.voucherDetails.voucherDate = date;

    this.invFormData.entries.forEach((entry: SalesEntryClass) => {
      entry.transactions.forEach((txn: SalesTransactionItemClass) => {
        if (!txn.accountUniqueName) {
          entry.entryDate = date;
        }
      })
    });
  }

  public makeCustomerList() {
    // sales case || Credit Note
    if (this.selectedPage === VOUCHER_TYPE_LIST[0].value || this.selectedPage === VOUCHER_TYPE_LIST[1].value) {
      this.customerAcList$ = observableOf(_.orderBy(this.sundryDebtorsAcList, 'label'));
      this.salesAccounts$ = observableOf(_.orderBy(this.prdSerAcListForDeb, 'label'));
    } else if (this.selectedPage === VOUCHER_TYPE_LIST[2].value || VOUCHER_TYPE_LIST[3].value) {
      this.customerAcList$ = observableOf(_.orderBy(this.sundryCreditorsAcList, 'label'));
      this.salesAccounts$ = observableOf(_.orderBy(this.prdSerAcListForCred, 'label'));
    }
  }

  public pageChanged(val: string, label: string) {
    this.selectedPage = val;
    this.selectedPageLabel = label;
    this.isSalesInvoice = this.selectedPage === 'Sales';
    this.makeCustomerList();
    this.toggleFieldForSales = (!(this.selectedPage === VOUCHER_TYPE_LIST[2].value || this.selectedPage === VOUCHER_TYPE_LIST[1].value));
  }

  public getAllFlattenAc() {
    // call to get flatten account from store
    this.store.dispatch(this._generalActions.getFlattenAccount());
  }

  public assignAccountDetailsValuesInForm(data: AccountResponseV2) {
    // toggle all collapse
    this.isGenDtlCollapsed = false;
    this.isMlngAddrCollapsed = false;
    this.isOthrDtlCollapsed = false;

    // auto fill all the details
    this.invFormData.accountDetails = new AccountDetailsClass(data);
  }

  public getStateCode(type: string, statesEle: SalesShSelectComponent) {
    let gstVal = _.cloneDeep(this.invFormData.accountDetails[type].gstNumber);
    if (gstVal.length >= 2) {
      let s = this.statesSource.find(item => item.value === gstVal.substr(0, 2));
      if (s) {
        this.invFormData.accountDetails[type].stateCode = s.value;
      } else {
        this.invFormData.accountDetails[type].stateCode = null;
        this._toasty.clearAllToaster();
        this._toasty.warningToast('Invalid GSTIN.');
      }
      statesEle.disabled = true;

    } else {
      statesEle.disabled = false;
      this.invFormData.accountDetails[type].stateCode = null;
    }
  }

  public resetInvoiceForm(f: NgForm) {
    f.form.reset();
    this.invFormData = new VoucherClass();
    this.typeaheadNoResultsOfCustomer = false;
    // toggle all collapse
    this.isGenDtlCollapsed = true;
    this.isMlngAddrCollapsed = true;
    this.isOthrDtlCollapsed = false;
    this.forceClear$ = observableOf({status: true});
    this.isCustomerSelected = false;
    this.selectedFileName = '';
  }

  public triggerSubmitInvoiceForm(f: NgForm, isUpdate) {
    this.updateAccount = isUpdate;
    this.onSubmitInvoiceForm(f);
  }

  public autoFillShippingDetails() {
    // auto fill shipping address
    if (this.autoFillShipping) {
      this.invFormData.accountDetails.shippingDetails = _.cloneDeep(this.invFormData.accountDetails.billingDetails);
    }
  }

  public convertDateForAPI(val: any): string {
    if (val) {
      try {
        return moment(val).format(GIDDH_DATE_FORMAT);
      } catch (error) {
        return '';
      }
    } else {
      return '';
    }
  }

  public onSubmitInvoiceForm(f?: NgForm) {
    let data: VoucherClass = _.cloneDeep(this.invFormData);

    data.entries = data.entries.filter((entry, indx) => {
      if (!entry.transactions[0].accountUniqueName && indx !== 0) {
        this.invFormData.entries.splice(indx, 1);
      }
      return entry.transactions[0].accountUniqueName;
    });

    // filter active discounts
    data.entries = data.entries.map(entry => {
      entry.discounts = entry.discounts.filter(dis => dis.isActive);
      return entry;
    });

    let txnErr: boolean;
    // before submit request making some validation rules
    // check for account uniqueName
    if (data.accountDetails) {
      if (!data.accountDetails.uniqueName) {
        if (this.typeaheadNoResultsOfCustomer) {
          this._toasty.warningToast('Need to select Bank/Cash A/c or Customer Name');
        } else {
          this._toasty.warningToast('Customer Name can\'t be empty');
        }
        return;
      }
      if (data.accountDetails.email) {
        if (!EMAIL_REGEX_PATTERN.test(data.accountDetails.email)) {
          this._toasty.warningToast('Invalid Email Address.');
          return;
        }
      }
    }


    // replace /n to br for (shipping and billing)

    if (data.accountDetails.shippingDetails.address && data.accountDetails.shippingDetails.address.length && data.accountDetails.shippingDetails.address[0].length > 0) {
      data.accountDetails.shippingDetails.address[0] = data.accountDetails.shippingDetails.address[0].replace(/\n/g, '<br />');
      data.accountDetails.shippingDetails.address = data.accountDetails.shippingDetails.address[0].split('<br />');
    }
    if (data.accountDetails.billingDetails.address && data.accountDetails.billingDetails.address.length && data.accountDetails.billingDetails.address[0].length > 0) {
      data.accountDetails.billingDetails.address[0] = data.accountDetails.billingDetails.address[0].replace(/\n/g, '<br />');
      data.accountDetails.billingDetails.address = data.accountDetails.billingDetails.address[0].split('<br />');
    }

    // convert date object
    data.voucherDetails.voucherDate = this.convertDateForAPI(data.voucherDetails.voucherDate);
    data.voucherDetails.dueDate = this.convertDateForAPI(data.voucherDetails.dueDate);
    data.templateDetails.other.shippingDate = this.convertDateForAPI(data.templateDetails.other.shippingDate);

    // check for valid entries and transactions
    if (data.entries) {
      _.forEach(data.entries, (entry) => {
        _.forEach(entry.transactions, (txn: SalesTransactionItemClass) => {
          // convert date object
          // txn.date = this.convertDateForAPI(txn.date);
          entry.entryDate = this.convertDateForAPI(entry.entryDate);
          // will get errors of string and if not error then true boolean
          if (!txn.isValid()) {
            this._toasty.warningToast('Product/Service can\'t be empty');
            txnErr = true;
            return false;
          } else {
            txnErr = false;
          }
        });
      });
    } else {
      this._toasty.warningToast('At least a single entry needed to generate sales-invoice');
      return;
    }

    // if txn has errors
    if (txnErr) {
      return false;
    }

    // set voucher type
    data.entries = data.entries.map((entry) => {
      entry.voucherType = this.pageList.find(p => p.value === this.selectedPage).label;
      entry.taxList = entry.taxes.map(m => m.uniqueName);
      return entry;
    });

    let obj: GenericRequestForGenerateSCD = {
      voucher: data,
      updateAccountDetails: this.updateAccount
    };

    if (this.dueAmount && this.dueAmount > 0) {
      obj.paymentAction = {
        action: 'paid',
        amount: this.dueAmount
      };
      if (this.isCustomerSelected) {
        obj.depositAccountUniqueName = this.depositAccountUniqueName;
      } else {
        obj.depositAccountUniqueName = data.accountDetails.uniqueName;
      }
    } else {
      obj.depositAccountUniqueName = '';
    }

    // set voucher type
    obj.voucher.voucherDetails.voucherType = this.selectedPage;

    this.salesService.generateGenericItem(obj).pipe(takeUntil(this.destroyed$)).subscribe((response: BaseResponse<any, GenericRequestForGenerateSCD>) => {
      if (response.status === 'success') {
        // reset form and other
        this.resetInvoiceForm(f);
        if (typeof response.body === 'string') {
          this._toasty.successToast(response.body);
        } else {
          try {
            this._toasty.successToast(`Entry created successfully with Voucher Number: ${response.body.voucherDetails.voucherNumber}`);
            // don't know what to do about this line
            // this.router.navigate(['/pages', 'invoice', 'preview']);
            this.voucherNumber = response.body.voucherDetails.voucherNumber;
            this.postResponseAction();
          } catch (error) {
            this._toasty.successToast('Voucher Generated Successfully');
          }
        }
        this.depositAccountUniqueName = '';
        this.dueAmount = 0;
      } else {
        this._toasty.errorToast(response.message, response.code);
      }
      this.updateAccount = false;
    });
  }

  public onNoResultsClicked(idx?: number) {
    if (_.isUndefined(idx)) {
      this.getAllFlattenAc();
    } else {
      this.entryIdx = idx;
    }
    this.asideMenuStateForProductService = this.asideMenuStateForProductService === 'out' ? 'in' : 'out';
    this.toggleBodyClass();
  }

  public toggleBodyClass() {
    if (this.asideMenuStateForProductService === 'in' || this.accountAsideMenuState === 'in' || this.asideMenuStateForRecurringEntry === 'in') {
      document.querySelector('body').classList.add('fixed');
    } else {
      document.querySelector('body').classList.remove('fixed');
    }
  }

  /**
   * checkForInfinity
   * @returns {number} always
   */
  public checkForInfinity(value): number {
    return (value === Infinity) ? 0 : value;
  }

  /**
   * generate total discount amount
   * @returns {number}
   */
  public generateTotalDiscount(list: LedgerDiscountClass[]) {
    return list.filter(l => l.isActive).reduce((pv, cv) => {
      return cv.amount ? pv + cv.amount : pv;
    }, 0);
  }

  /**
   * generate total taxable value
   * @returns {number}
   */
  public generateTotalTaxableValue(txns: SalesTransactionItemClass[]) {
    let res: number = 0;
    _.forEach(txns, (txn: SalesTransactionItemClass) => {
      res += this.checkForInfinity(txn.taxableValue);
    });
    return res;
  }

  /**
   * generate total tax amount
   * @returns {number}
   */
  public generateTotalTaxAmount(txns: SalesTransactionItemClass[]) {
    let res: number = 0;
    _.forEach(txns, (txn: SalesTransactionItemClass) => {
      if (txn.total === 0) {
        res += 0;
      } else {
        res += this.checkForInfinity((txn.total - txn.taxableValue));
      }
    });
    return res;
  }

  /**
   * generate total amounts of entries
   * @returns {number}
   */
  public generateTotalAmount(txns: SalesTransactionItemClass[]) {
    let res: number = 0;
    _.forEach(txns, (txn: SalesTransactionItemClass) => {
      if (txn.quantity && txn.rate) {
        res += this.checkForInfinity(txn.rate) * this.checkForInfinity(txn.quantity);
      } else {
        res += Number(this.checkForInfinity(txn.amount));
      }
    });
    return res;
  }

  /**
   * generate grand total
   * @returns {number}
   */
  public generateGrandTotal(txns: SalesTransactionItemClass[]) {
    return txns.reduce((pv, cv) => {
      return cv.total ? pv + cv.total : pv;
    }, 0);
  }

  public txnChangeOccurred(disc?: DiscountListComponent) {
    if (disc) {
      disc.change();
    }
    let DISCOUNT: number = 0;
    let TAX: number = 0;
    let AMOUNT: number = 0;
    let TAXABLE_VALUE: number = 0;
    let GRAND_TOTAL: number = 0;

    this.invFormData.entries.forEach((entry) => {
      // get discount
      DISCOUNT += Number(entry.discountSum);

      // get total amount of entries
      AMOUNT += Number(this.generateTotalAmount(entry.transactions));

      // get taxable value
      TAXABLE_VALUE += Number(this.generateTotalTaxableValue(entry.transactions));

      // generate total tax amount
      TAX += Number(this.generateTotalTaxAmount(entry.transactions));

      // generate Grand Total
      GRAND_TOTAL += Number(this.generateGrandTotal(entry.transactions));
    });

    this.invFormData.voucherDetails.subTotal = Number(AMOUNT);
    this.invFormData.voucherDetails.totalDiscount = Number(DISCOUNT);
    this.invFormData.voucherDetails.totalTaxableValue = Number(TAXABLE_VALUE);
    this.invFormData.voucherDetails.gstTaxesTotal = Number(TAX);
    this.invFormData.voucherDetails.grandTotal = Number(GRAND_TOTAL);

    // due amount
    this.invFormData.voucherDetails.balanceDue = Number(GRAND_TOTAL);
    if (this.dueAmount) {
      this.invFormData.voucherDetails.balanceDue = Number(GRAND_TOTAL) - Number(this.dueAmount);
    }
  }

  public onSelectSalesAccount(selectedAcc: any, txn: SalesTransactionItemClass, entryIdx?: number, entry?: any): any {
    if (selectedAcc.value && selectedAcc.additional.uniqueName) {
      this.salesAccounts$.pipe(take(1)).subscribe(idata => {
        idata.map(fa => {
          if (fa.value === selectedAcc.value) {

            let o = _.cloneDeep(fa.additional);
            txn.applicableTaxes = [];
            txn.quantity = null;
            // assign taxes and create fluctuation
            _.forEach(o.applicableTaxes, (item) => {
              txn.applicableTaxes.push(item.uniqueName);
            });
            txn.accountName = o.name;
            txn.accountUniqueName = o.uniqueName;

            if (o.stocks && (selectedAcc.additional && selectedAcc.additional.stock)) {
              // set rate auto
              txn.rate = null;
              let obj: IStockUnit = {
                id: selectedAcc.additional.stock.stockUnit.code,
                text: selectedAcc.additional.stock.stockUnit.name
              };
              txn.stockList = [];
              if (selectedAcc.additional.stock && selectedAcc.additional.stock.accountStockDetails.unitRates.length) {
                txn.stockList = this.prepareUnitArr(selectedAcc.additional.stock.accountStockDetails.unitRates);
                txn.stockUnit = txn.stockList[0].id;
                txn.rate = txn.stockList[0].rate;
              } else {
                txn.stockList.push(obj);
                if (selectedAcc.additional.stock.accountStockDetails && selectedAcc.additional.stock.accountStockDetails.unitRates && selectedAcc.additional.stock.accountStockDetails.unitRates.length > 0) {
                  txn.rate = selectedAcc.additional.stock.accountStockDetails.unitRates[0].rate;
                }
                txn.stockUnit = selectedAcc.additional.stock.stockUnit.code;
              }
              txn.stockDetails = _.omit(selectedAcc.additional.stock, ['accountStockDetails', 'stockUnit']);
              txn.isStockTxn = true;
            } else {
              txn.isStockTxn = false;
              txn.stockUnit = null;
              txn.stockDetails = null;
              txn.stockList = [];
              // reset fields
              txn.rate = null;
              txn.quantity = null;
              txn.amount = 0;
              txn.taxableValue = null;
            }
            txn.sacNumber = null;
            txn.hsnNumber = null;
            if (txn.stockDetails && txn.stockDetails.hsnNumber) {
              txn.hsnNumber = txn.stockDetails.hsnNumber;
              txn.hsnOrSac = 'hsn';
            }
            if (txn.stockDetails && txn.stockDetails.sacNumber) {
              txn.sacNumber = txn.stockDetails.sacNumber;
              txn.hsnOrSac = 'sac';
            }

            if (!selectedAcc.additional.stock && o.hsnNumber) {
              txn.hsnNumber = o.hsnNumber;
              txn.hsnOrSac = 'hsn';
            }
            if (!selectedAcc.additional.stock && o.sacNumber) {
              txn.sacNumber = o.sacNumber;
              txn.hsnOrSac = 'sac';
            }
            return txn;
          }
        });
      });
    } else {
      txn.isStockTxn = false;
      txn.amount = 0;
      txn.accountName = null;
      txn.accountUniqueName = null;
      txn.hsnOrSac = 'sac';
      txn.total = null;
      txn.rate = null;
      txn.sacNumber = null;
      txn.taxableValue = 0;
      txn.applicableTaxes = [];
      return txn;
    }
    this.selectedAcc = true;
  }

  public noResultsForCustomer(e: boolean): void {
    this.typeaheadNoResultsOfCustomer = e;
  }

  public onSelectCustomer(item: IOption): void {
    this.typeaheadNoResultsOfCustomer = false;
    if (item.value) {
      this.invFormData.voucherDetails.customerName = item.label;
      this.getAccountDetails(item.value);
      this.isCustomerSelected = true;
      this.invFormData.accountDetails.name = '';
    }
  }

  public onSelectBankCash(item: IOption) {
    if (item.value) {
      this.invFormData.accountDetails.name = item.label;
      this.getAccountDetails(item.value);
    }
  }

  public getAccountDetails(accountUniqueName: string) {
    this.store.dispatch(this.salesAction.getAccountDetailsForSales(accountUniqueName));
  }

  public toggleAccountAsidePane(event?): void {
    if (event) {
      event.preventDefault();
    }
    this.accountAsideMenuState = this.accountAsideMenuState === 'out' ? 'in' : 'out';
    this.toggleBodyClass();
  }

  public toggleRecurringAsidePane(toggle?: string): void {
    if (toggle) {
      if (toggle === 'out' && this.asideMenuStateForRecurringEntry !== 'out') {
        this.router.navigate(['/pages', 'invoice', 'recurring']);
      }
      this.asideMenuStateForRecurringEntry = toggle;
    } else {
      this.asideMenuStateForRecurringEntry = this.asideMenuStateForRecurringEntry === 'out' ? 'in' : 'out';
    }
    this.toggleBodyClass();
  }

  public addBlankRow(txn: SalesTransactionItemClass) {
    if (this.isUpdateMode) {
      return;
    }
    if (!txn) {
      let entry: SalesEntryClass = new SalesEntryClass();
      entry.entryDate = this.universalDate;
      this.invFormData.entries.push(entry);
    } else {
      // if transaction is valid then add new row else show toasty
      if (!txn.isValid()) {
        this._toasty.warningToast('Product/Service can\'t be empty');
        return;
      }
      let entry: SalesEntryClass = new SalesEntryClass();
      this.invFormData.entries.push(entry);

      // setTimeout(() => {
      this.activeIndx = this.invFormData.entries.length ? this.invFormData.entries.length - 1 : 0;
      // }, 10);
    }
  }

  public removeTransaction(entryIdx: number) {
    if (this.invFormData.entries.length > 1) {
      if (this.activeIndx === entryIdx) {
        this.activeIndx = null;
      }
      this.invFormData.entries = this.invFormData.entries.filter((entry, index) => entryIdx !== index);
    } else {
      this._toasty.warningToast('Unable to delete a single transaction');
    }
  }

  public taxAmountEvent(tax) {
    // if (!Number.isInteger(this.activeIndx)) {
    //   return;
    // }
    // let entry: SalesEntryClass = this.invFormData.entries[this.activeIndx];
    // if (!entry) {
    //   return;
    // }
    // let txn = entry.transactions[0];
    // txn.total = Number(txn.getTransactionTotal(tax, entry));
    // this.txnChangeOccurred();
    // entry.taxSum = _.sumBy(entry.taxes, (o) => {
    //   return o.amount;
    // });
  }

  public selectedTaxEvent(arr: string[]) {
    let entry: SalesEntryClass = this.invFormData.entries[this.activeIndx];
    if (!entry) {
      return;
    }
    // entry.taxList = arr;
    entry.taxes = [];
    if (arr.length > 0) {
      this.companyTaxesList.forEach((item: TaxResponse) => {
        if (arr.includes(item.uniqueName) && item.accounts.length > 0) {
          let o: IInvoiceTax = {
            accountName: item.accounts[0].name,
            accountUniqueName: item.accounts[0].uniqueName,
            rate: item.taxDetail[0].taxValue,
            amount: item.taxDetail[0].taxValue,
            uniqueName: item.uniqueName
          };
          entry.taxes.push(o);
        }
      });
    }
  }

  public selectedDiscountEvent(txn: SalesTransactionItemClass, entry: SalesEntryClass) {
    // call taxableValue method
    txn.setAmount(entry);
    // this.txnChangeOccurred();
  }

  // get action type from aside window and open respective modal
  public getActionFromAside(e?: any) {
    if (e.type === 'groupModal') {
      this.showCreateGroupModal = true;
      // delay just for ng cause
      setTimeout(() => {
        this.createGroupModal.show();
      }, 1000);
    } else {
      this.showCreateAcModal = true;
      this.createAcCategory = e.type;
      // delay just for ng cause
      setTimeout(() => {
        this.createAcModal.show();
      }, 1000);
    }
  }

  public closeCreateGroupModal(e?: any) {
    this.createGroupModal.hide();
  }

  public customMoveGroupFilter(term: string, item: IOption): boolean {
    // console.log('item.additional is :', item.additional);
    return (item.label.toLocaleLowerCase().indexOf(term) > -1 || item.value.toLocaleLowerCase().indexOf(term) > -1);
  }

  public closeCreateAcModal() {
    this.createAcModal.hide();
  }

  public closeDiscountPopup() {
    if (this.discountComponent) {
      this.discountComponent.hideDiscountMenu();
    }
  }

  public setActiveIndx(indx: number) {
    setTimeout(function () {
      if ($('.focused')) {
        $('.focused')[indx].focus();
      }
    }, 200);

    let lastIndx = this.invFormData.entries.length - 1;
    this.activeIndx = indx;
    if (indx === lastIndx) {
      this.addBlankRow(null);
    }
    this.stockTaxList = [];
    if (this.invFormData.entries[this.activeIndx].taxList) {
      this.stockTaxList = this.invFormData.entries[this.activeIndx].taxList;
    }
  }

  public doAction(action: number) {
    switch (action) {
      case 1: // Generate & Close
        this.toggleActionText = '& Close';
        break;
      case 2: // Generate & Recurring
        this.toggleActionText = '& Recurring';
        break;
      case 3: // Generate Invoice
        this.toggleActionText = '';
        break;
      default:
        break;
    }
  }

  public postResponseAction() {
    if (this.toggleActionText.includes('Close')) {
      this.router.navigate(['/pages', 'invoice', 'preview']);
    } else if (this.toggleActionText.includes('Recurring')) {
      this.toggleRecurringAsidePane();
    }
  }

  public resetCustomerName(event) {
    // console.log(event);
    if (!event.target.value) {
      this.invFormData.voucherDetails.customerName = null;
      this.isCustomerSelected = false;
      this.invFormData.accountDetails = new AccountDetailsClass();
      this.invFormData.accountDetails.uniqueName = 'cash';

      // if we are in update mode and someone changes customer name then we should reset the voucher details
      if (this.isUpdateMode) {
        this.store.dispatch(this.invoiceReceiptActions.ResetVoucherDetails());
      }
    }
  }

  public ngOnChanges(s: SimpleChanges) {
    if (s && s['isPurchaseInvoice'] && s['isPurchaseInvoice'].currentValue) {
      this.pageChanged('Purchase', 'Purchase');
      this.isSalesInvoice = false;
    }
  }

  public onSelectPaymentMode(event) {
    if (event && event.value) {
      this.depositAccountUniqueName = event.value;
    } else {
      this.depositAccountUniqueName = '';
    }
  }

  public clickedInside($event: Event) {
    $event.preventDefault();
    $event.stopPropagation();  // <- that will stop propagation on lower layers
  }

  public calculateAmount(txn, entry) {
    txn.amount = Number(((Number(txn.total) + entry.discountSum) - entry.taxSum).toFixed(2));
    if (txn.accountUniqueName) {
      if (txn.stockDetails) {
        txn.rate = Number((txn.amount / txn.quantity).toFixed(2));
      }
    }
    this.txnChangeOccurred();
  }

  @HostListener('document:click', ['$event'])
  public clickedOutside(event) {
    if (event.target.id === 'depositBoxTrigger') {
      this.dropdownisOpen = !this.dropdownisOpen;
    } else {
      this.dropdownisOpen = false;
    }
  }

  /**
   * prepareUnitArr
   */
  public prepareUnitArr(unitArr) {
    let unitArray = [];
    _.forEach(unitArr, (item) => {
      unitArray.push({id: item.stockUnitCode, text: item.stockUnitCode, rate: item.rate});
    });
    return unitArray;
  }

  /**
   * onChangeUnit
   */
  public onChangeUnit(txn, selectedUnit) {
    if (!event) {
      return;
    }
    _.find(txn.stockList, (o) => {
      if (o.id === selectedUnit) {
        return txn.rate = o.rate;
      }
    });
  }

  public onUploadOutput(output: UploadOutput): void {
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
        data: {company: companyUniqueName},
        headers: {'Session-Id': sessionKey},
      };
      this.uploadInput.emit(event);
    } else if (output.type === 'start') {
      this.isFileUploading = true;
    } else if (output.type === 'done') {
      if (output.file.response.status === 'success') {
        this.isFileUploading = false;
        this.invFormData.entries[0].attachedFile = output.file.response.body.uniqueName;
        this.invFormData.entries[0].attachedFileName = output.file.response.body.name;
        this._toasty.successToast('file uploaded successfully');
      } else {
        this.isFileUploading = false;
        this.invFormData.entries[0].attachedFile = '';
        this.invFormData.entries[0].attachedFileName = '';
        this._toasty.errorToast(output.file.response.message);
      }
    }
  }

  public cancelUpdate() {
    this.router.navigate(['/pages', 'invoice', 'preview', this.invoiceType]);
  }

  public onFileChange(event: any) {
    this.file = (event.files as FileList).item(0);
    if (this.file) {
      this.selectedFileName = this.file.name;
    } else {
      this.selectedFileName = '';
    }
  }

  public submitUpdateForm(f: NgForm) {
    let result = this.prepareDataForApi(f);
    if (!result) {
      return;
    }
    this.salesService.updateVoucher(result).pipe(takeUntil(this.destroyed$))
      .subscribe((response: BaseResponse<any, GenericRequestForGenerateSCD>) => {
        if (response.status === 'success') {
          // reset form and other
          this.resetInvoiceForm(f);
          if (typeof response.body === 'string') {
            this._toasty.successToast(response.body);
          } else {
            try {
              this._toasty.successToast(`Voucher updated successfully..`);
              // don't know what to do about this line
              // this.router.navigate(['/pages', 'invoice', 'preview']);
              this.voucherNumber = response.body.voucherDetails.voucherNumber;
              this.postResponseAction();
            } catch (error) {
              this._toasty.successToast('Voucher updated Successfully');
            }
          }
          this.depositAccountUniqueName = '';
          this.dueAmount = 0;
          this.isUpdateMode = false;
        } else {
          this._toasty.errorToast(response.message, response.code);
        }
        this.updateAccount = false;
      });
  }

  public prepareDataForApi(f: NgForm): GenericRequestForGenerateSCD {
    let data: VoucherClass = _.cloneDeep(this.invFormData);
    data.entries = data.entries.filter((entry, indx) => {
      if (!entry.transactions[0].accountUniqueName && indx !== 0) {
        this.invFormData.entries.splice(indx, 1);
      }
      return entry.transactions[0].accountUniqueName;
    });

    // filter active discounts
    data.entries = data.entries.map(entry => {
      entry.discounts = entry.discounts.filter(dis => dis.isActive);
      return entry;
    });

    let txnErr: boolean;
    // before submit request making some validation rules
    // check for account uniqueName
    if (data.accountDetails) {
      if (!data.accountDetails.uniqueName) {
        if (this.typeaheadNoResultsOfCustomer) {
          this._toasty.warningToast('Need to select Bank/Cash A/c or Customer Name');
        } else {
          this._toasty.warningToast('Customer Name can\'t be empty');
        }
        return;
      }
      if (data.accountDetails.email) {
        if (!EMAIL_REGEX_PATTERN.test(data.accountDetails.email)) {
          this._toasty.warningToast('Invalid Email Address.');
          return;
        }
      }
    }

    // replace /n to br for (shipping and billing)

    if (data.accountDetails.shippingDetails.address && data.accountDetails.shippingDetails.address.length && data.accountDetails.shippingDetails.address[0].length > 0) {
      data.accountDetails.shippingDetails.address[0] = data.accountDetails.shippingDetails.address[0].replace(/\n/g, '<br />');
      data.accountDetails.shippingDetails.address = data.accountDetails.shippingDetails.address[0].split('<br />');
    }
    if (data.accountDetails.billingDetails.address && data.accountDetails.billingDetails.address.length && data.accountDetails.billingDetails.address[0].length > 0) {
      data.accountDetails.billingDetails.address[0] = data.accountDetails.billingDetails.address[0].replace(/\n/g, '<br />');
      data.accountDetails.billingDetails.address = data.accountDetails.billingDetails.address[0].split('<br />');
    }

    // convert date object
    data.voucherDetails.voucherDate = this.convertDateForAPI(data.voucherDetails.voucherDate);
    data.voucherDetails.dueDate = this.convertDateForAPI(data.voucherDetails.dueDate);
    data.templateDetails.other.shippingDate = this.convertDateForAPI(data.templateDetails.other.shippingDate);

    // check for valid entries and transactions
    if (data.entries) {
      _.forEach(data.entries, (entry) => {
        _.forEach(entry.transactions, (txn: SalesTransactionItemClass) => {
          // convert date object
          // txn.date = this.convertDateForAPI(txn.date);
          entry.entryDate = moment(entry.entryDate, GIDDH_DATE_FORMAT).format(GIDDH_DATE_FORMAT);

          // we need to remove # from account uniqueName because we are appending # to stock for uniqueNess
          if (txn.stockList && txn.stockList.length) {
            txn.accountUniqueName = txn.accountUniqueName.slice(0, txn.accountUniqueName.indexOf('#'));
            txn.fakeAccForSelect2 = txn.fakeAccForSelect2.slice(0, txn.fakeAccForSelect2.indexOf('#'));
          }
          // will get errors of string and if not error then true boolean
          if (!txn.isValid()) {
            this._toasty.warningToast('Product/Service can\'t be empty');
            txnErr = true;
            return false;
          } else {
            txnErr = false;
          }
        });
      });
    } else {
      this._toasty.warningToast('At least a single entry needed to generate sales-invoice');
      return;
    }

    // if txn has errors
    if (txnErr) {
      return null;
    }

    // set voucher type
    data.entries = data.entries.map((entry) => {
      entry.voucherType = this.pageList.find(p => p.value === this.selectedPage).label;
      entry.taxList = entry.taxes.map(m => m.uniqueName);
      return entry;
    });

    let obj: GenericRequestForGenerateSCD = {
      voucher: data,
      entryUniqueNames: data.entries.map(m => m.uniqueName),
      updateAccountDetails: this.updateAccount
    };

    if (this.dueAmount && this.dueAmount > 0) {
      obj.paymentAction = {
        action: 'paid',
        amount: this.dueAmount
      };
      if (this.isCustomerSelected) {
        obj.depositAccountUniqueName = this.depositAccountUniqueName;
      } else {
        obj.depositAccountUniqueName = data.accountDetails.uniqueName;
      }
    } else {
      obj.depositAccountUniqueName = '';
    }

    // set voucher type
    obj.voucher.voucherDetails.voucherType = this.selectedPage.toLowerCase();
    return obj;
  }

  private parseDiscountFromResponse(entry: SalesEntryClass): LedgerDiscountClass[] {
    let discountArray: LedgerDiscountClass[] = [];
    let defaultDiscountIndex = entry.tradeDiscounts.findIndex(f => !f.discount.uniqueName);

    if (defaultDiscountIndex > -1) {
      discountArray.push({
        discountType: entry.tradeDiscounts[defaultDiscountIndex].discount.discountType,
        amount: entry.tradeDiscounts[defaultDiscountIndex].discount.discountValue,
        discountValue: entry.tradeDiscounts[defaultDiscountIndex].discount.discountValue,
        discountUniqueName: entry.tradeDiscounts[defaultDiscountIndex].discount.uniqueName,
        name: entry.tradeDiscounts[defaultDiscountIndex].discount.name,
        particular: entry.tradeDiscounts[defaultDiscountIndex].account.uniqueName,
        isActive: true
      });
    } else {
      discountArray.push({
        discountType: 'FIX_AMOUNT',
        amount: 0,
        name: '',
        particular: '',
        isActive: true,
        discountValue: 0
      });
    }

    entry.tradeDiscounts.forEach((f, ind) => {
      if (ind !== defaultDiscountIndex) {
        discountArray.push({
          discountType: f.discount.discountType,
          amount: f.discount.discountValue,
          name: f.discount.name,
          particular: f.account.uniqueName,
          isActive: true,
          discountValue: f.discount.discountValue,
          discountUniqueName: f.discount.uniqueName
        });
      }
    });
    return discountArray;
  }
}
