import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { HttpWrapperService } from './httpWrapper.service';
import { Inject, Injectable, Optional } from '@angular/core';
import { UserDetails } from '../models/api-models/loginModels';
import { BaseResponse } from '../models/api-models/BaseResponse';
import { ErrorHandler } from './catchManager/catchmanger';
import { GenericRequestForGenerateSCD } from '../models/api-models/Sales';
import { SALES_API_V2 } from './apiurls/sales.api';
import { GeneralService } from './general.service';
import { IServiceConfigArgs, ServiceConfig } from './service.config';

@Injectable()
export class SalesService {

  private user: UserDetails;
  private companyUniqueName: string;

  constructor(
    private _http: HttpWrapperService,
    private errorHandler: ErrorHandler,
    private _generalService: GeneralService,
    @Optional() @Inject(ServiceConfig)
    private config: IServiceConfigArgs
  ) {
  }

  /**
   *
   * @param model : any object
   * @param updateAccount: boolean flag
   */
  public generateSales(model: any): Observable<BaseResponse<any, any>> {
    let accountUniqueName = model.invoice.account.uniqueName;
    this.user = this._generalService.user;
    this.companyUniqueName = this._generalService.companyUniqueName;
    return this._http.post(this.config.apiUrl + SALES_API_V2.GENERATE_SALES.replace(':companyUniqueName', this.companyUniqueName).replace(':accountUniqueName', accountUniqueName), model).pipe(
      map((res) => {
        let data: BaseResponse<any, any> = res;
        data.request = model;
        return data;
      }),
      catchError((e) => this.errorHandler.HandleCatch<any, any>(e, model)));
  }

  /**
   *
   * @param model : GenericRequestForGenerateSCD object
   * @param updateAccount: boolean flag to update A/c
   * {{url}}/company/{{companyUniqueName}}/accounts/{{accountUniqueName}}/vouchers/generate
   */
  public generateGenericItem(model: any): Observable<BaseResponse<any, GenericRequestForGenerateSCD>> {
    let accountUniqueName = model.voucher.accountDetails.uniqueName;
    this.user = this._generalService.user;
    this.companyUniqueName = this._generalService.companyUniqueName;
    return this._http.post(this.config.apiUrl + SALES_API_V2.GENERATE_GENERIC_ITEMS.replace(':companyUniqueName', this.companyUniqueName).replace(':accountUniqueName', accountUniqueName), model).pipe(
      map((res) => {
        let data: BaseResponse<any, GenericRequestForGenerateSCD> = res;
        data.request = model;
        return data;
      }),
      catchError((e) => this.errorHandler.HandleCatch<any, GenericRequestForGenerateSCD>(e, model)));
  }
}
