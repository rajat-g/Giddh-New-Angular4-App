import { Component, OnDestroy, OnInit } from '@angular/core';
import { IOption } from '../theme/ng-select/option.interface';
import { Observable } from 'rxjs/Observable';
import { States } from '../models/api-models/Company';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import * as _ from '../lodash-optimized';
import { Store } from '@ngrx/store';
import { AppState } from '../store';
import { contriesWithCodes } from '../shared/helpers/countryWithCodes';
import { SettingsProfileActions } from '../actions/settings/profile/settings.profile.action';
import { Router } from '@angular/router';

@Component({
  selector: 'welcome-component',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})

export class WelcomeComponent implements OnInit, OnDestroy {
  public companyProfileObj: any = null;
  public countryCodeList: IOption[] = [];
  public statesSource$: Observable<IOption[]> = Observable.of([]);
  public stateStream$: Observable<States[]>;
  public states: IOption[] = [];
  public countryIsIndia: boolean = false;
  public industrialList: IOption[] = [{
    label: 'Agriculture',
    value: 'Agriculture'
  }, {
    label: 'Automobile Transport',
    value: 'Automobile Transport'
  }, {
    label: 'Ecommerce',
    value: 'Ecommerce'
  }, {
    label: 'Education',
    value: 'Education'
  }, {
    label: 'Financial Institution',
    value: 'Financial Institution'
  }, {
    label: 'Gym',
    value: 'Gym'
  }, {
    label: 'Hospitality',
    value: 'Hospitality'
  }, {
    label: 'IT Company',
    value: 'IT Company'
  }, {
    label: 'Lifestyle Clubs',
    value: 'Lifestyle Clubs'
  }, {
    label: 'Logistics',
    value: 'Logistics'
  }, {
    label: 'Marriage Bureau',
    value: 'Marriage Bureau'
  }, {
    label: 'Media  Advertisement',
    value: 'Media  Advertisement'
  }, {
    label: 'Personal Use',
    value: 'Personal Use'
  }, {
    label: 'Political',
    value: 'Political'
  }, {
    label: 'Public Sector',
    value: 'Public Sector'
  }, {
    label: 'Real estate',
    value: 'Real estate'
  }, {
    label: 'Retail FMCG',
    value: 'Retail FMCG'
  }, {
    label: 'Stock and Commodity',
    value: 'Stock and Commodity'
  }, {
    label: 'Telecom',
    value: 'Telecom'
  }, {
    label: 'Tips And Alert',
    value: 'Tips And Alert'
  }, {
    label: 'Travel',
    value: 'Travel'
  }, {
    label: 'Wholesalers Distributors',
    value: 'Wholesalers Distributors'
  }
  ];
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(private store: Store<AppState>, private settingsProfileActions: SettingsProfileActions,
              private _router: Router) {
    this.companyProfileObj = {};

    contriesWithCodes.map(c => {
      this.countryCodeList.push({value: c.value, label: c.value});
    });

    this.stateStream$ = this.store.select(s => s.general.states).takeUntil(this.destroyed$);
    this.stateStream$.subscribe((data) => {
      if (data) {
        data.map(d => {
          this.states.push({label: `${d.code} - ${d.name}`, value: `${d.code}`});
        });
      }
      this.statesSource$ = Observable.of(this.states);
    }, (err) => {
      // console.log(err);
    });
    this.store.select(state => {
      if (!state.session.companies) {
        return;
      }
      state.session.companies.forEach(cmp => {
        if (cmp.uniqueName === state.session.companyUniqueName) {
          this.countryIsIndia = cmp.country.toLocaleLowerCase() === 'india';
        }
      });
    }).takeUntil(this.destroyed$).subscribe();
  }

  public ngOnInit() {
    //
  }

  public skip() {
    this._router.navigate(['/onboarding']);
  }

  public submit() {
    let object = _.cloneDeep(this.companyProfileObj);
    object.contactNo = `${object.country}${object.contactNo}`;
    this.store.dispatch(this.settingsProfileActions.UpdateProfile(object));
  }

  public ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
