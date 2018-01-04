import { PermissionDataService } from 'app/permissions/permission-data.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { TabsetComponent } from 'ngx-bootstrap';
import { StateDetailsRequest } from '../models/api-models/Company';
import { CompanyActions } from '../actions/company.actions';
import { Store } from '@ngrx/store';
import { AppState } from '../store/roots';
import { SettingsProfileActions } from '../actions/settings/profile/settings.profile.action';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  @ViewChild('staticTabs') public staticTabs: TabsetComponent;

  public isUserSuperAdmin: boolean = false;

  constructor(
    private store: Store<AppState>,
    private companyActions: CompanyActions,
    private settingsProfileActions: SettingsProfileActions,
    private _permissionDataService: PermissionDataService) {
      this.isUserSuperAdmin = this._permissionDataService.isUserSuperAdmin;
    }
  public ngOnInit() {
    let companyUniqueName = null;
    this.store.select(c => c.session.companyUniqueName).take(1).subscribe(s => companyUniqueName = s);
    let stateDetailsRequest = new StateDetailsRequest();
    stateDetailsRequest.companyUniqueName = companyUniqueName;
    stateDetailsRequest.lastState = 'settings';

    this.store.dispatch(this.companyActions.SetStateDetails(stateDetailsRequest));
    this.selectTab(0);
  }

  public selectTab(id: number) {
    this.staticTabs.tabs[id].active = true;
  }
  public disableEnable() {
    this.staticTabs.tabs[2].disabled = ! this.staticTabs.tabs[2].disabled;
  }
  public profileSelected(e) {
    if (!e.target) { // It will prevent from inside tab click
      this.store.dispatch(this.settingsProfileActions.GetProfileInfo());
    }
  }
}
