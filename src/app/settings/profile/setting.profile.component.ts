import { Store } from '@ngrx/store';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AppState } from '../../store/roots';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { SettingsProfileActions } from '../../services/actions/settings/profile/settings.profile.action';
import { CompanyService } from '../../services/companyService.service';
import { Select2OptionData } from '../../shared/theme/select2/select2.interface';
import { Observable } from 'rxjs';
import * as _ from 'lodash';
import { ToasterService } from '../../services/toaster.service';

export interface IGstObj {
  newGstNumber: string;
  newstateCode: number;
  newstateName: string;
  newaddress: string;
  isDefault: boolean;
}

@Component({
  selector: 'setting-profile',
  templateUrl: './setting.profile.component.html'
})
export class SettingProfileComponent implements OnInit, OnDestroy {

  public companyProfileObj: any = null;
  public statesSource$: Observable<Select2OptionData[]> = Observable.of([]);
  public addNewGstEntry: boolean = false;
  public newGstObj: any = {};
  public states: Select2OptionData[] = [];
  public isGstValid: boolean = false;
  public countryCode: string = '91';
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    private router: Router,
    private store: Store<AppState>,
    private settingsProfileActions: SettingsProfileActions,
    private _companyService: CompanyService,
    private _toasty: ToasterService
  ) {
    this._companyService.getAllStates().subscribe((data) => {
      data.body.map(d => {
        this.states.push({ text: d.name, id: d.code });
      });
      this.statesSource$ = Observable.of(this.states);
    }, (err) => {
      console.log(err);
    });
  }

  public ngOnInit() {
    this.store.dispatch(this.settingsProfileActions.GetProfileInfo());
    this.initProfileObj();
  }

  public initProfileObj() {
     this.isGstValid = true;
    // getting profile info from store
    this.store.select(p => p.settings.profile).takeUntil(this.destroyed$).subscribe((o) => {
      if (o) {
        this.companyProfileObj = _.cloneDeep(o);
      }
    });
    this.store.take(1).subscribe(s => {
      if (s.session.user) {
        this.countryCode = s.session.user.countryCode ? s.session.user.countryCode : '91';
      }
    });
    console.log('hello from SettingProfileComponent');
  }

  public addGst() {
    let gstDetails = _.cloneDeep(this.companyProfileObj.gstDetails);
    let gstNumber = gstDetails[gstDetails.length - 1].gstNumber;
    let isValid = (Number(gstNumber.substring(0, 2)) > 37 || Number(gstNumber.substring(0, 2)) < 1 || gstNumber.length !== 15) ? false : true;
    // this.isGstValid
    if (isValid) {
      let companyDetails = _.cloneDeep(this.companyProfileObj);
      let newGstObj = {
        gstNumber: '',
        addressList: [{
          stateCode: '',
          stateName: '',
          address: '',
          isDefault: false
        }]
      };

      companyDetails.gstDetails.push(newGstObj);
      this.companyProfileObj = companyDetails;
    } else {
      this._toasty.errorToast('Please enter valid GST number to add more GST details.');
    }
  }

  public stateSelected(v, indx) {
    let profileObj = _.cloneDeep(this.companyProfileObj);
    let selectedStateCode = v.value;
    let selectedState = this.states.find((state) => state.id === selectedStateCode);
    if (selectedState && selectedState.text) {
      profileObj.gstDetails[indx].addressList[0].stateName = selectedState.text;
      this.companyProfileObj = profileObj;
    }
    console.log('The selected state is :', selectedState);
  }

  public updateProfile(data) {
    let dataToSave = _.cloneDeep(data);
    if (dataToSave.gstDetails.length > 0) {
      for (let entry of dataToSave.gstDetails) {
        if (entry.gstNumber === '') {
          dataToSave.gstDetails = _.without(dataToSave.gstDetails, entry);
        }
      }
    }

    delete dataToSave.financialYears;
    delete dataToSave.activeFinancialYear;
    this.companyProfileObj = dataToSave;
    console.log('THe data is :', dataToSave);
    this.store.dispatch(this.settingsProfileActions.UpdateProfile(dataToSave));
  }

  public removeGstEntry(indx) {
    let profileObj = _.cloneDeep(this.companyProfileObj);
    if (indx > -1) {
      profileObj.gstDetails.splice(indx, 1);
    }
    this.companyProfileObj = profileObj;
  }

  public setGstAsDefault(indx, ev) {
    if (indx > -1 && ev.target.checked) {
      for (let entry of this.companyProfileObj.gstDetails) {
        entry.addressList[0].isDefault = false;
      }
      this.companyProfileObj.gstDetails[indx].addressList[0].isDefault = true;
    }
  }

  public getDefaultGstNumber() {
    if (this.companyProfileObj && this.companyProfileObj.gstDetails) {
      let profileObj = this.companyProfileObj;
      let defaultGstObjIndx;
      profileObj.gstDetails.forEach((obj, indx) => {
        if (profileObj.gstDetails[indx].addressList[0].isDefault) {
          defaultGstObjIndx = indx;
        }
      });
      console.log('defaultGstObjIndx is :', defaultGstObjIndx);
      return '';
    }
    return '';
  }

  public checkGstNumValidation(ele: HTMLInputElement) {
    let isInvalid: boolean = false;
    if (ele.value) {
       if (ele.value.length !== 15 || (Number(ele.value.substring(0, 2)) < 1) || (Number(ele.value.substring(0, 2)) > 37)) {
        this._toasty.errorToast('Invalid GST number');
        ele.classList.add('error-box');
        this.isGstValid = false;
      } else {
        ele.classList.remove('error-box');
        this.isGstValid = true;
      }
    } else {
      ele.classList.remove('error-box');
    }
  }

  public setMainState(ele: HTMLInputElement) {
    this.companyProfileObj.state = Number(ele.value.substring(0, 2));
  }

  public setChildState(ele: HTMLInputElement, index: number) {
    let stateCode: any = Number(ele.value.substring(0, 2));
    if (stateCode <= 37 ) {
      if (stateCode < 10 && stateCode !== 0) {
        stateCode = (stateCode < 10) ? '0' + stateCode.toString() : stateCode.toString();
      }
      this.companyProfileObj.gstDetails[index].addressList[0].stateCode = stateCode;
    } else {
      this.companyProfileObj.gstDetails[index].addressList[0].stateCode = null;
    }
  }

  /**
   * onReset
   */
  public onReset() {
    this.initProfileObj();
  }

  public ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  public isValidPAN(ele: HTMLInputElement) {
    // check if PAN number is valid
  }

}
