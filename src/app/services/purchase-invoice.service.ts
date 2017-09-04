import { Observable } from 'rxjs/Observable';
import { HttpWrapperService } from './httpWrapper.service';
import { Injectable, OnInit } from '@angular/core';
import { Response } from '@angular/http';
import { Store } from '@ngrx/store';
import { AppState } from '../store/roots';
import { UserDetails } from '../models/api-models/loginModels';
import { BaseResponse } from '../models/api-models/BaseResponse';
import { HandleCatch } from './catchManager/catchmanger';
import { SmsKeyClass, EmailKeyClass } from '../models/api-models/SettingsIntegraion';
import { ActiveFinancialYear } from '../models/api-models/Company';
import { PURCHASE_INVOICE_API } from './apiurls/purchase-invoice.api';

export interface Account {
  accountName: string;
  gstIn: string;
  uniqueName: string;
}

export interface IInvoicePurchaseResponse {
  account: Account;
  entryUniqueName: string;
  entryDate: string;
  voucherNo: number;
  entryType: boolean;
  gstin: string;
  particulars: string;
  invoiceNo: string;
  utgstAmount: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  taxableValue: number;
}

// export interface IInvoicePurchaseResponse {
//   accountName: string;
//   igstAmount: number;
//   cgstAmount: number;
//   sgstAmount: number;
//   taxableValue: number;
//   voucherNo: number;
//   gstin: string;
//   entryDate: string;
//   entryType: string;
//   particulars: string;
//   invoiceNo: string;
//   utgstAmount: number;
// }

@Injectable()
export class PurchaseInvoiceService {

  private user: UserDetails;
  private companyUniqueName: string;
  private roleUniqueName: string;

  constructor(private _http: HttpWrapperService, private store: Store<AppState>) { }

  /*
  * Get Purchase Invoice
  * API: 'company/:companyUniqueName/invoice/purchase'
  * Method: GET
  */
  public GetPurchaseInvoice(): Observable<BaseResponse<IInvoicePurchaseResponse[], string>> {
    this.store.take(1).subscribe(s => {
      if (s.session.user) {
        this.user = s.session.user.user;
      }
      this.companyUniqueName = s.session.companyUniqueName;
    });
    return this._http.get(PURCHASE_INVOICE_API.INVOICE_API.replace(':companyUniqueName', this.companyUniqueName)).map((res) => {
      let data: BaseResponse<IInvoicePurchaseResponse[], string> = res.json();
      data.queryString = {};
      return data;
    }).catch((e) => HandleCatch<IInvoicePurchaseResponse[], string>(e));
  }

  /*
  * Update Purchase Invoice
  * API: 'company/:companyUniqueName/invoice/purchase'
  * Method: PUT
  */
  public UpdatePurchaseInvoice(model: IInvoicePurchaseResponse): Observable<BaseResponse<IInvoicePurchaseResponse, string>> {
    this.store.take(1).subscribe(s => {
      if (s.session.user) {
        this.user = s.session.user.user;
      }
      this.companyUniqueName = s.session.companyUniqueName;
    });
    return this._http.put(PURCHASE_INVOICE_API.INVOICE_API.replace(':companyUniqueName', this.companyUniqueName), model).map((res) => {
      let data: BaseResponse<IInvoicePurchaseResponse, string> = res.json();
      data.queryString = {};
      return data;
    }).catch((e) => HandleCatch<IInvoicePurchaseResponse, string>(e));
  }
}
