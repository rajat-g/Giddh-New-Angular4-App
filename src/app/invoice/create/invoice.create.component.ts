import { Observable, of as observableOf, ReplaySubject } from 'rxjs';

import { distinctUntilChanged, take, takeUntil } from 'rxjs/operators';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import * as _ from '../../lodash-optimized';
import * as moment from 'moment/moment';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/roots';
import { InvoiceActions } from '../../actions/invoice/invoice.actions';
import { GenerateInvoiceRequestClass, GstEntry, ICommonItemOfTransaction, IContent, IInvoiceTax, IInvoiceTransaction, InvoiceTemplateDetailsResponse, ISection, PreviewInvoiceResponseClass } from '../../models/api-models/Invoice';
import { InvoiceService } from '../../services/invoice.service';
import { ToasterService } from '../../services/toaster.service';
import { OtherSalesItemClass } from '../../models/api-models/Sales';
import { GIDDH_DATE_FORMAT, GIDDH_DATE_FORMAT_UI } from '../../shared/helpers/defaultDateFormat';
import { SelectComponent } from '../../theme/ng-select/ng-select';
import { IOption } from '../../theme/ng-virtual-select/sh-options.interface';
import { SalesService } from 'app/services/sales.service';
import { BaseResponse } from 'app/models/api-models/BaseResponse';
import { ActivatedRoute } from '@angular/router';
import { LedgerActions } from 'app/actions/ledger/ledger.actions';
import { ReciptRequest } from 'app/models/api-models/recipt';
import { InvoiceReceiptActions } from 'app/actions/invoice/receipt/receipt.actions';

const THEAD = [
  {
    display: false,
    label: '',
    field: 'sNo'
  },
  {
    display: true,
    label: 'Date',
    field: 'date'
  },
  {
    display: false,
    label: '',
    field: 'item'
  },
  {
    display: false,
    label: '',
    field: 'hsnSac'
  },
  {
    display: false,
    label: '',
    field: 'quantity'
  },
  {
    display: false,
    label: '',
    field: 'description'
  },
  {
    display: false,
    label: '',
    field: 'rate'
  },
  {
    display: false,
    label: '',
    field: 'discount'
  },
  // {
  //   display: false,
  //   label: '',
  //   field: 'taxableAmount'
  // },
  {
    display: false,
    label: '',
    field: 'taxableValue'
  },
  {
    display: false,
    label: '',
    field: 'taxes'
  },
  {
    display: false,
    label: '',
    field: 'total'
  }
];

@Component({
  styleUrls: ['./invoice.create.component.scss'],
  selector: 'invoice-create',
  templateUrl: './invoice.create.component.html'
})

export class InvoiceCreateComponent implements OnInit, OnDestroy {
  @Input() public showCloseButton: boolean;
  @Output() public closeEvent: EventEmitter<string> = new EventEmitter<string>();
  @Input() public isGenerateInvoice: boolean = true;
  public invFormData: any; // PreviewInvoiceResponseClass
  public tableCond: ISection;
  public headerCond: ISection;
  public templateHeader: any = {};
  public invTempCond: InvoiceTemplateDetailsResponse;
  public customThead: IContent[] = THEAD;
  public updtFlag: boolean = false;
  public totalBalance: number = null;
  public invoiceDataFound: boolean = false;
  public isInvoiceGenerated$: Observable<boolean>;
  public updateMode: boolean;
  public giddhDateFormat: string = GIDDH_DATE_FORMAT;
  public giddhDateFormatUI: string = GIDDH_DATE_FORMAT_UI;
  public autoFillShipping: boolean = false;
  public statesSource$: Observable<IOption[]> = observableOf([]);
  public maxDueDate: Date;
  public selectedVoucher: string = 'invoice';
  // public methods above
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    private store: Store<AppState>,
    private invoiceActions: InvoiceActions,
    private _toasty: ToasterService,
    private invoiceService: InvoiceService,
    private salesService: SalesService,
    private _activatedRoute: ActivatedRoute,
    private _ledgerActions: LedgerActions,
    private receiptActions: InvoiceReceiptActions
  ) {
    this.isInvoiceGenerated$ = this.store.select(state => state.invoice.isInvoiceGenerated).pipe(takeUntil(this.destroyed$), distinctUntilChanged());
  }

  public ngOnInit() {
    this._activatedRoute.params.subscribe(a => {
      if (a) {
        this.selectedVoucher = a.voucherType;
      }
    });

    this.store.select(p => p.receipt.voucher).pipe(
      takeUntil(this.destroyed$),
      distinctUntilChanged())
      .subscribe((o: any) => {
          if (o && o.voucherDetails) {
            this.invFormData = _.cloneDeep(o);
            if (o.voucherDetails.voucherDate) {
              let d = o.voucherDetails.voucherDate.split('-');
              if (d.length === 3) {
                this.invFormData.voucherDetails.voucherDate = new Date(d[2], d[1] - 1, d[0]);
              } else {
                this.invFormData.voucherDetails.voucherDate = '';
              }
              if (this.invFormData.voucherDetails.invoiceNumber === '##########') {
                this.invFormData.voucherDetails.invoiceNumber = null;
              }
            }
            if (o.voucherDetails.dueDate) {
              let d = o.voucherDetails.dueDate.split('-');
              if (d.length === 3) {
                this.invFormData.voucherDetails.dueDate = new Date(d[2], d[1] - 1, d[0]);
              } else {
                this.invFormData.voucherDetails.dueDate = '';
              }
            }
            // if address found prepare local var due to array and string issue
            this.prepareAddressForUI('billingDetails');
            this.prepareAddressForUI('shippingDetails');
            if (!this.invFormData.other) {
              this.invFormData.other = new OtherSalesItemClass();
            }

            // replace br to /n in case of message
            // if (this.invFormData.other.message2 && this.invFormData.other.message2.length > 0) {
            //   this.invFormData.other.message2 = this.invFormData.other.message2.replace(/<br \/>/g, '\n');
            // }
            this.setMaxDueDate(this.invFormData.entries);
            this.invoiceDataFound = true;
          } else {
            this.invoiceDataFound = false;
          }
        }
      );

    this.store.select(p => p.invoice.invoiceTemplateConditions).pipe(
      takeUntil(this.destroyed$),
      distinctUntilChanged())
      .subscribe((o: InvoiceTemplateDetailsResponse) => {
          if (o) {
            this.invTempCond = _.cloneDeep(o);
            let obj = _.cloneDeep(o);
            // this.tableCond = _.find(obj.sections, {sectionName: 'table'});
            // this.headerCond = _.find(obj.sections, {sectionName: 'header'});
            this.tableCond  = obj.sections;
            this.headerCond  = obj.sections;
            this.prepareThead();
            this.prepareTemplateHeader();
          }
        }
      );

    this.isInvoiceGenerated$.subscribe((o) => {
      if (o) {
        let action = (this.updateMode) ? 'update' : 'generate';
        this.closePopupEvent({action});
      }
    });

    this.store.select(state => state.invoice.visitedFromPreview).pipe(
      takeUntil(this.destroyed$),
      distinctUntilChanged())
      .subscribe((val: boolean) => {
          this.updateMode = val;
        }
      );

    // bind state sources
    this.store.select(p => p.general.states).pipe(takeUntil(this.destroyed$)).subscribe((states) => {
      let arr: IOption[] = [];
      if (states) {
        states.map(d => {
          arr.push({label: `${d.name}`, value: d.code});
        });
      }
      this.statesSource$ = observableOf(arr);
    });
  }

  public getArrayFromString(str) {
    if (str && str.length > 0) {
      return str.split('\n');
    } else {
      return [];
    }
  }

  public getStringFromArr(arr) {
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.toString().replace(RegExp(',', 'g'), '\n');
    } else {
      return null;
    }
  }

  public prepareAddressForUI(type: string) {
    this.invFormData.accountDetails[type].address = this.getStringFromArr(this.invFormData.accountDetails[type].address);
  }

  public prepareAddressForAPI(type: string) {
    this.invFormData.accountDetails[type].address = this.getArrayFromString(this.invFormData.accountDetails[type].address);
  }

  public prepareTemplateHeader() {
    this.templateHeader = _.cloneDeep(this.headerCond.header.data);
    // let obj = _.cloneDeep(this.headerCond.header.data);
    // let dummyObj = {};
    // _.forEach(obj, (item: IContent) => {
    //   dummyObj[item.field] = item;
    // });
    // // sorting object
    // Object.keys(dummyObj).sort().forEach((key) => {
    //   this.templateHeader[key] = dummyObj[key];
    // });
  }

  public prepareThead() {
    this.customThead = _.cloneDeep(this.tableCond.table.data);
    // let obj = _.cloneDeep(this.tableCond.table.data);
    // _.map(this.customThead, (item: IContent) => {
    //   let res = _.find(this.tableCond.table.data, {field: item.field});
    //   if (res) {
    //     item.display = res.display;
    //     item.label = res.label;
    //   }
    // });
  }

  public setUpdateAccFlag() {
    this.updtFlag = true;
    this.onSubmitInvoiceForm();
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

  public onSubmitInvoiceForm() {
    let model: GenerateInvoiceRequestClass = new GenerateInvoiceRequestClass();
    let data: any = _.cloneDeep(this.invFormData);

    // replace /n to br in case of message
    // if (data.other.message2 && data.other.message2.length > 0) {
    //   data.other.message2 = data.other.message2.replace(/\n/g, '<br />');
    // }

    // convert address string to array
    data.accountDetails['billingDetails'].address = this.getArrayFromString(data.accountDetails['billingDetails'].address);
    data.accountDetails['shippingDetails'].address = this.getArrayFromString(data.accountDetails['shippingDetails'].address);

    // convert date object
    data.voucherDetails.voucherDate = this.convertDateForAPI(data.voucherDetails.voucherDate);
    data.voucherDetails.dueDate = this.convertDateForAPI(data.voucherDetails.dueDate);
    data.templateDetails.other.shippingDate = this.convertDateForAPI(data.templateDetails.other.shippingDate);

    let accountUniqueName = this.invFormData.accountDetails.uniqueName;
    if (accountUniqueName) {

      model.voucher = data;
      model.voucher.entries = model.voucher.entries.map((entry) => {
        entry.voucherType = this.selectedVoucher;
        return entry;
      });

      model.voucher.voucherDetails.voucherType = this.selectedVoucher;

      model.uniqueNames = this.getEntryUniqueNames(this.invFormData.entries);
      model.validateTax = true;
      model.updateAccountDetails = this.updtFlag;

      if (this.updateMode) {
        let request: ReciptRequest = {
          voucher: model.voucher,
          entryUniqueNames: model.uniqueNames,
          updateAccountDetails: true
        };
        this.store.dispatch(this.receiptActions.UpdateInvoiceReceiptRequest(request, model.voucher.accountDetails.uniqueName));
      } else {
          this.store.dispatch(this._ledgerActions.GenerateBulkLedgerInvoice({combined: false}, [{accountUniqueName: model.voucher.accountDetails.uniqueName, entries: _.cloneDeep(model.uniqueNames)}], 'invoice'));
      }
      this.updtFlag = false;
    } else {
      this._toasty.warningToast('Something went wrong, please reload the page');
    }
  }

  public getEntryUniqueNames(entryArr: GstEntry[]): string[] {
    let arr: string[] = [];
    _.forEach(entryArr, (item: GstEntry) => {
      arr.push(item.uniqueName);
    });
    return arr;
  }

  public getTransactionTotalTax(taxArr: IInvoiceTax[]): any {
    let count: number = 0;
    if (taxArr.length > 0) {
      _.forEach(taxArr, (item: IInvoiceTax) => {
        count += item.amount;
      });
    }
    if (count > 0) {
      return count;
    } else {
      return null;
    }
  }

  public getEntryTotal(entry: GstEntry, idx: number): any {
    let count: number = 0;
    count = this.getEntryTaxableAmount(entry.transactions[idx], entry.discounts) + this.getTransactionTotalTax(entry.taxes);
    if (count > 0) {
      return count;
    } else {
      return null;
    }
  }

  public getEntryTaxableAmount(transaction: IInvoiceTransaction, discountArr: ICommonItemOfTransaction[]): any {
    let count: number = 0;
    if (transaction.quantity && transaction.rate) {
      count = (transaction.rate * transaction.quantity) - this.getEntryTotalDiscount(discountArr);
    } else {
      count = transaction.amount - this.getEntryTotalDiscount(discountArr);
    }
    if (count > 0) {
      return count;
    } else {
      return null;
    }
  }

  public getEntryTotalDiscount(discountArr: ICommonItemOfTransaction[]): any {
    let count: number = 0;
    if (discountArr.length > 0) {
      _.forEach(discountArr, (item: ICommonItemOfTransaction) => {
        count += Math.abs(item.amount);
      });
    }
    if (count > 0) {
      return count;
    } else {
      return null;
    }
  }

  public closePopupEvent(o) {
    this.closeEvent.emit(o);
  }

  public getSerialNos(entryIndex: number, transIndex: number) {
    // logic
    return entryIndex + 1 + transIndex;
  }

  public autoFillShippingDetails() {
    // auto fill shipping address
    if (this.autoFillShipping) {
      this.invFormData.account.shippingDetails = _.cloneDeep(this.invFormData.account.billingDetails);
    }
  }

  public getStateCode(type: string, statesEle: SelectComponent) {
    let gstVal = _.cloneDeep(this.invFormData.account[type].gstNumber);
    if (gstVal && gstVal.length >= 2) {
      this.statesSource$.pipe(take(1)).subscribe(st => {
        let s = st.find(item => item.value === gstVal.substr(0, 2));
        if (s) {
          this.invFormData.account[type].stateCode = s.value;
        } else {
          this.invFormData.account[type].stateCode = null;
          this._toasty.clearAllToaster();
          this._toasty.warningToast('Invalid GSTIN.');
        }
        statesEle.disabled = true;
      });
    } else {
      statesEle.disabled = false;
      this.invFormData.account[type].stateCode = null;
    }
  }

  /**
   * setMaxDueDate
   */
  public setMaxDueDate(entries) {
    let maxDateEnrty = _.maxBy(entries, (o) => {
      if (o.entryDate) {
        return o.entryDate;
      }
    });
    // console.log(maxDateEnrty);
    if (maxDateEnrty && maxDateEnrty.entryDate) {
      this.maxDueDate = moment(maxDateEnrty.entryDate, 'DD-MM-YYYY').toDate();
    }
  }

  public ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
