import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../../store';
import { AccountsAction } from '../../actions/accounts.actions';
import {CompanyActions} from "../../actions/company.actions";
import { takeUntil, take } from 'rxjs/operators';
import {Observable, of as observableOf, ReplaySubject} from "rxjs";
import {VerifyEmailResponseModel, VerifyMobileModel} from "../../models/api-models/loginModels";
import {AccountResponseV2} from "../../models/api-models/Account";
import {CompanyService} from "../../services/companyService.service";
import {BankTransferRequest} from "../../models/api-models/Company";
import {IRegistration} from "../../models/interfaces/registration.interface";
import {ToasterService} from "../../services/toaster.service";

@Component({
  selector: 'payment-aside',
  styles: [`
    :host {
      position: fixed;
      left: auto;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      z-index: 1045;
    }



    :host.in #close {
      display: block;
      position: fixed;
      left: -41px;
      top: 0;
      z-index: 5;
      border: 0;
      border-radius: 0;
    }

    :host .container-fluid {
      padding-left: 0;
      padding-right: 0;
    }

    :host .aside-pane {
      width: 480px;
    }
    .aside-header {
      background-color: #fff;
      padding: 20px 10px;
  }
  .aside-pane {
    padding: 0;
    background-color: #fff;
}
.aside-title {
  padding-bottom: 0;
  border-bottom: none;
}
.creditors_detail {
  padding: 10px;
  background-color: #F7F8FA;
  line-height: 1.6;
}
.creditors_detail > p {
  font-size: 16px;
  color: #2D3B4B;
}
.creditors_detail span.red-text {
  color: #FF0000;
}
.contactDetails p {
  font-size: 12px;
  color: #2D3B4B;
}
.accountDetils {
  padding: 10px;
}
form label {
 font-size:16px;
  margin-bottom: 5px;
}
.accountDetils .btn-default{
  width: 100%;
    text-align: left;
    background-color: transparent;
    border: 1px solid #ccc;
}
.accountDetils  .btn-group{
  width: 230px;
display: block;
text-align: left;
}
.accountDetils {
  padding: 10px;
}
.accountDetils span.caret {
  position: absolute;
  right: 20px;
  top: 14px;
}





  `],
  templateUrl: './payment-aside.component.html'
})


export class PaymentAsideComponent implements OnInit {

  //variable that holds registered account information
  private registeredAccounts :any;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  //variable holding available mode for payment transfer
  private mode:IRegistration;
  //user information
  private  user: VerifyEmailResponseModel;
  //Active account to make the transfer
  private activeAccount$: Observable<AccountResponseV2>;
  //Account details into which the amount is to be transferred
  private accountDetails: any;
  //Default amount value
  private amount = 0;
  private userDetails$: Observable<VerifyEmailResponseModel>;
  //variable to check whether OTP is sent to show and hide OTP text field
  private OTPsent: boolean = false;

  //Event emitter to close the Aside panel
  @Output() public closeAsideEvent: EventEmitter<boolean> = new EventEmitter(true);
  //Input current account holders information
  @Input() public selectedAccForPayment : any;
  //Variable holding OTP received by user
  OTP: number;
  constructor(
    private store: Store<AppState>,
    private _companyActions: CompanyActions,
    private accountsAction: AccountsAction,
    private _companyService: CompanyService,
    private _toaster :ToasterService
  ) {
    this.userDetails$ = this.store.select(p => p.session.user);
    this.userDetails$.pipe(take(1)).subscribe(p => this.user = p);
    this.activeAccount$ = this.store.select(state => state.groupwithaccounts.activeAccount).pipe(takeUntil(this.destroyed$));
  }

  public ngOnInit() {
    // get all registered account
    this.store.dispatch(this._companyActions.getAllRegistrations());

    //get current registered account on the user
    this.store.select(p => p.company).pipe(takeUntil(this.destroyed$)).subscribe((o) => {
      if(o.account) {
        this.registeredAccounts = o.account;
      }
    });
    //get selecetd vendors account details
    this.store.dispatch(this.accountsAction.getAccountDetails(this.selectedAccForPayment.uniqueName));
    this.activeAccount$.subscribe(acc => {
      if(acc && acc.accountBankDetails) {
        this.accountDetails = acc;
      }
    });
  }

  /*
  * Close Aside panel view
  *
  * */
  public closeAsidePane(event?) {
    this.closeAsideEvent.emit(event);
  }
  /*
  * API call to send OTP to user
  *
  * */
  public sendOTP() {
    let request = {
      params: {
        urn: this.mode.iciciCorporateDetails.URN
      }
    };
    this._companyService.getOTP(request).subscribe((res) => {
      if (res.status === 'success') {
        this.OTPsent = true;
      }else {
        this._toaster.errorToast(res.message);
      }
    });
  }
  /*
  * API call to send OTP to user
  *
  * */
  public reSendOTP() {
    let request = {
      params: {
        urn: this.mode.iciciCorporateDetails.URN
      }
    };
    this._companyService.getOTP(request).subscribe((res) => {
      if (res.status === 'success') {
        this.OTPsent = true;
      }else {
        this._toaster.errorToast(res.message);
      }
    });
  }

  /*
  * API call to confirm OTP received by user
  *
  * */
  public confirmOTP() {
    let bankTransferRequest :BankTransferRequest = new BankTransferRequest();
    bankTransferRequest.amount = this.amount;
    bankTransferRequest.otp = this.OTP;
    bankTransferRequest.urn = this.mode.iciciCorporateDetails.URN;
    bankTransferRequest.payeeName = this.user.user.name;
    bankTransferRequest.transferAccountUniqueName = this.accountDetails.uniqueName;
    bankTransferRequest.remarks = '';
    this._companyService.confirmOTP(bankTransferRequest).subscribe((res)=>{
      if (res.status === 'success') {
        this.closeAsidePane();
     }else {
        this._toaster.errorToast(res.message);
      }
    });
  }
}
