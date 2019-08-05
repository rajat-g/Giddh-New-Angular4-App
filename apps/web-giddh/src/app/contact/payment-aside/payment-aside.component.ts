import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../../store';
import { AccountsAction } from '../../actions/accounts.actions';
import { GroupWithAccountsAction } from '../../actions/groupwithaccounts.actions';
import {CompanyActions} from "../../actions/company.actions";
import { takeUntil, take } from 'rxjs/operators';
import {Observable, ReplaySubject} from "rxjs";
import {VerifyEmailResponseModel, VerifyMobileModel} from "../../models/api-models/loginModels";
import {AccountRequestV2, AccountResponseV2} from "../../models/api-models/Account";
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

  private registeredAccounts;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private mode = "select";
  private  user: VerifyEmailResponseModel;
  private activeAccount$: Observable<AccountResponseV2>;
  private accountDetails: any;
  @Output() public closeAsideEvent: EventEmitter<boolean> = new EventEmitter(true);
  @Input() public selectedAccForPayment : any;
  private userDetails$: Observable<VerifyEmailResponseModel>;
  constructor(
    private store: Store<AppState>,
    private _companyActions: CompanyActions,
    private accountsAction: AccountsAction
  ) {
    this.userDetails$ = this.store.select(p => p.session.user);
    this.userDetails$.pipe(take(1)).subscribe(p => this.user = p);
    this.activeAccount$ = this.store.select(state => state.groupwithaccounts.activeAccount).pipe(takeUntil(this.destroyed$));
  }

  public ngOnInit() {
    //logic to get all registered account for integration tab
    this.store.dispatch(this._companyActions.getAllRegistrations());

    this.store.select(p => p.company).pipe(takeUntil(this.destroyed$)).subscribe((o) => {
      if(o.account) {
        this.registeredAccounts = o.account;
      }
    });
    this.store.dispatch(this.accountsAction.getAccountDetails(this.selectedAccForPayment.uniqueName));
    this.activeAccount$.subscribe(acc => {
      if(acc) {
        this.accountDetails = acc.accountBankDetails[0];
      }
    });
  }


  public closeAsidePane(event) {
    this.closeAsideEvent.emit(event);
  }

}
