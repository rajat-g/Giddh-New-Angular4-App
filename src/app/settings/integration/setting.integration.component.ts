import { Store } from '@ngrx/store';
import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AppState } from '../../store/roots';
import { SettingsIntegrationActions } from '../../services/actions/settings/settings.integration.action';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import * as _ from 'lodash';
import { SmsKeyClass, EmailKeyClass, RazorPayClass } from '../../models/api-models/SettingsIntegraion';
import { Observable } from 'rxjs/Observable';
import { Select2OptionData } from '../../shared/theme/select2/select2.interface';
import { AccountService } from '../../services/account.service';

@Component({
  selector: 'setting-integration',
  templateUrl: './setting.integration.component.html',
  styles: [`
    #inlnImg img{
      max-height:18px;
    }
  `]
})
export class SettingIntegrationComponent implements OnInit {

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private smsFormObj: SmsKeyClass = new SmsKeyClass();
  private emailFormObj: EmailKeyClass = new EmailKeyClass();
  private razorPayObj: RazorPayClass = new RazorPayClass();
  private accounts$: Observable<Select2OptionData[]>;
  private select2Options: Select2Options = {
    multiple: false,
    width: '100%',
    placeholder: 'Select Accounts',
    allowClear: true
  };
  private updateRazor: boolean = false;

  constructor(
    private router: Router,
    private store: Store<AppState>,
    private SettingsIntegrationActions: SettingsIntegrationActions,
    private accountService: AccountService
  ) {}

  public ngOnInit() {
    this.store.dispatch(this.SettingsIntegrationActions.GetSMSKey());
    this.store.dispatch(this.SettingsIntegrationActions.GetEmailKey());
    this.store.dispatch(this.SettingsIntegrationActions.GetRazorPayDetails());
    // getting all page data of integration page
    this.store.select(p => p.settings.integration).takeUntil(this.destroyed$).subscribe((o) => {
      // set sms form data
      if (o.smsForm) {
        this.smsFormObj = o.smsForm;
      }
      // set email form data
      if (o.emailForm) {
        this.emailFormObj = o.emailForm;
      }
      // set razor pay form data
      if (o.razorPayForm) {
        this.razorPayObj = _.cloneDeep(o.razorPayForm);
        this.razorPayObj.password = 'YOU_ARE_NOT_ALLOWED';
        this.updateRazor = true;
      } else {
        this.setDummyData();
        this.updateRazor = false;
      }
    });

    // get accounts
    this.accountService.GetFlattenAccounts('', '').takeUntil(this.destroyed$).subscribe(data => {
      if (data.status === 'success') {
        let accounts: Select2OptionData[] = [];
        _.forEach(data.body.results, (item) => {
          accounts.push({ text: item.name, id: item.uniqueName });
        });
        this.accounts$ = Observable.of(accounts);
      }
    });
  }

  private setDummyData() {
    this.razorPayObj.userName = '';
    this.razorPayObj.password = 'YOU_ARE_NOT_ALLOWED';
    this.razorPayObj.account = { name: null, uniqueName: null };
    this.razorPayObj.autoCapturePayment = true;
  }

  private onSubmitMsgform(f: NgForm) {
    if (f.valid) {
      this.store.dispatch(this.SettingsIntegrationActions.SaveSMSKey(f.value.smsFormObj));
    }
  }

  private onSubmitEmailform(f: NgForm) {
    if (f.valid) {
      this.store.dispatch(this.SettingsIntegrationActions.SaveEmailKey(f.value));
    }
  }

  private toggleCheckBox() {
    return this.razorPayObj.autoCapturePayment = !this.razorPayObj.autoCapturePayment;
  }

  private selectAccount(event) {
    if (event.value) {
      this.accounts$.subscribe((arr: Select2OptionData[]) => {
        let res = _.find(arr, function(o) { return o.id === event.value; });
        if (res) {
          this.razorPayObj.account.name = res.text;
        }
      });
    }
  }

  private saveRazorPayDetails() {
    let data = _.cloneDeep(this.razorPayObj);
    this.store.dispatch(this.SettingsIntegrationActions.SaveRazorPayDetails(data));
  }

  private updateRazorPayDetails() {
    let data = _.cloneDeep(this.razorPayObj);
    this.store.dispatch(this.SettingsIntegrationActions.UpdateRazorPayDetails(data));
  }

  private deleteRazorPayDetails() {
    this.store.dispatch(this.SettingsIntegrationActions.DeleteRazorPayDetails());
  }

}
