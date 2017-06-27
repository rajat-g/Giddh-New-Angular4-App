import { Select2Component } from '../../../theme/select2/select2.component';
import { TaxResponse } from './../../../../models/api-models/Company';
import { CompanyActions } from './../../../../services/actions/company.actions';
import { GroupListItemResponse } from './../../../../models/api-models/GroupListItem';
import { Observable } from 'rxjs/Observable';
import { GroupsWithAccountsResponse } from './../../../../models/api-models/GroupsWithAccounts';
import { GroupWithAccountsAction } from './../../../../services/actions/groupwithaccounts.actions';
import { GroupResponse, GroupCreateRequest, ShareGroupRequest, GroupSharedWithResponse, MoveGroupRequest, GroupsTaxHierarchyResponse } from './../../../../models/api-models/Group';
import { IGroup } from './../../../../models/interfaces/group.interface';
import { IAccountsInfo } from './../../../../models/interfaces/accountInfo.interface';
import { IGroupsWithAccounts } from './../../../../models/interfaces/groupsWithAccounts.interface';
import { AppState } from './../../../../store/roots';
import { Store } from '@ngrx/store';
import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs/Rx';
import * as _ from 'lodash';
import { IOption, SelectModule, SelectComponent } from 'ng-select';
import { Select2OptionData } from '../../../theme/select2/select2.interface';
import { ApplyTaxRequest } from '../../../../models/api-models/ApplyTax';
import { AccountResponse } from "../../../../models/api-models/Account";

@Component({
  selector: 'account-operations',
  templateUrl: './account-operations.component.html',
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountOperationsComponent implements OnInit, AfterViewInit {
  public activeGroupSelected$: Observable<string[]>;
  @ViewChild('applyTaxSelect2') public applyTaxSelect2: Select2Component;
  public activeGroupTaxHierarchy$: Observable<GroupsTaxHierarchyResponse>;
  // tslint:disable-next-line:no-empty
  public subGroupForm: FormGroup;
  public groupDetailForm: FormGroup;
  public moveGroupForm: FormGroup;
  public shareGroupForm: FormGroup;
  public taxGroupForm: FormGroup;
  public showGroupForm: boolean = false;
  public activeGroup$: Observable<GroupResponse>;
  public activeGroupInProgress$: Observable<boolean>;
  public isTaxableGroup$: Observable<boolean>;
  public activeGroupSharedWith$: Observable<GroupSharedWithResponse[]>;
  public groupList$: Observable<GroupsWithAccountsResponse[]>;
  public companyTaxes$: Observable<TaxResponse[]>;
  public companyTaxDropDown: Observable<Select2OptionData[]>;
  public accountList: any[];
  public showEditTaxSection: boolean = false;

  public showAddAccountForm$: Observable<boolean>;

  public taxPopOverTemplate: string = `
  <div class="popover-content">
  <label>Tax being inherited from:</label>
    <ul>
    <li>@inTax.name</li>
    </ul>
  </div>
  `;
  public selectedTax: string[];
  public options: Select2Options = {
    minimumResultsForSearch: 9001,
    multiple: true,
    width: '100%',
    placeholder: 'Choose a project',
    templateResult: (data) => {
      if (!data.id) { return data.text; }
      // let text = this._translate.instant(data.text);
      return $('<span>' + data.text + '</span>');
    },
    templateSelection: (data) => {

      if (!data.id) { return data.text; }
      // let text = this._translate.instant(data.text);
      return $('<span>' + data.text + '</span>');
    }
  };
  constructor(private _fb: FormBuilder, private store: Store<AppState>, private groupWithAccountsAction: GroupWithAccountsAction,
    private companyActions: CompanyActions) {

    this.activeGroup$ = this.store.select(state => state.groupwithaccounts.activeGroup);
    this.activeGroupSelected$ = this.store.select(state => {
      if (state.groupwithaccounts.activeGroupTaxHierarchy) {
        return _.difference(state.groupwithaccounts.activeGroupTaxHierarchy.applicableTaxes.map(p => p.uniqueName), state.groupwithaccounts.activeGroupTaxHierarchy.inheritedTaxes.map(p => p.uniqueName));
      }
      return [];
    });
    this.activeGroupInProgress$ = this.store.select(state => state.groupwithaccounts.activeGroupInProgress);
    this.activeGroupSharedWith$ = this.store.select(state => state.groupwithaccounts.activeGroupSharedWith);
    this.groupList$ = this.store.select(state => state.groupwithaccounts.groupswithaccounts);
    this.activeGroupTaxHierarchy$ = this.store.select(state => state.groupwithaccounts.activeGroupTaxHierarchy);
    this.companyTaxes$ = this.store.select(state => state.company.taxes);
    this.showAddAccountForm$ = this.store.select(state => state.groupwithaccounts.addAccountOpen);

    this.companyTaxDropDown = this.store.select(state => {
      let arr: Select2OptionData[] = [];
      if (state.groupwithaccounts.activeGroup && state.company.taxes && state.groupwithaccounts.activeGroupTaxHierarchy) {
        return _.differenceBy(state.company.taxes.map(p => {
          return { text: p.name, id: p.uniqueName };
        }), _.flattenDeep(state.groupwithaccounts.activeGroupTaxHierarchy.inheritedTaxes.map(p => p.applicableTaxes)).map((p: any) => {
          return { text: p.name, id: p.uniqueName };
        }), 'id');

      }
      return arr;
    });
  }

  public ngOnInit() {
    this.groupDetailForm = this._fb.group({
      name: ['', Validators.required],
      uniqueName: ['', Validators.required],
      description: ['']
    });

    this.subGroupForm = this._fb.group({
      name: ['', Validators.required],
      uniqueName: ['', Validators.required],
      desc: ['', Validators.required]
    });

    this.moveGroupForm = this._fb.group({
      moveto: ['', Validators.required]
    });

    this.shareGroupForm = this._fb.group({
      userEmail: ['', [Validators.required, Validators.email]]
    });

    this.taxGroupForm = this._fb.group({
      taxes: ['']
    });

    this.groupList$.subscribe((a) => {
      if (a) {
        this.accountList = this.makeGroupListFlatwithLessDtl(this.flattenGroup(a, []));
      }
    });

    this.activeGroup$.subscribe((a) => {
      if (a) {
        this.showGroupForm = true;
        this.showEditTaxSection = false;
        this.groupDetailForm.patchValue({ name: a.name, uniqueName: a.uniqueName, description: a.description });
      } else {
        this.showGroupForm = false;
      }
    });

  }

  public ngAfterViewInit() {
    this.isTaxableGroup$ = this.store.select(state => {
      let result: boolean = false;
      if (state.groupwithaccounts.groupswithaccounts && state.groupwithaccounts.activeGroup) {
        result = this.getAccountFromGroup(state.groupwithaccounts.groupswithaccounts, state.groupwithaccounts.activeGroup.uniqueName, false);
      } else {
        result = false;
      }
      return result;
    });
    // let a: GroupResponse;
    // this.activeGroup$.take(1).subscribe(ac => {
    //   a = ac;
    // });
    // if (a) {
    //   let selectedTax = _.map(a.applicableTaxes, (at) => {
    //     return at.uniqueName;
    //   });
    //   this.selectedTax = selectedTax;
    //   // this.taxGroupForm.patchValue({ taxes: selectedTax });
    // }
    this.activeGroupSelected$.subscribe(() => {
      if (this.applyTaxSelect2) {
        this.applyTaxSelect2.cd.detectChanges();
      }
    });
  }
  public async addNewGroup() {
    let activeGrp = await this.activeGroup$.first().toPromise();

    let grpObject = new GroupCreateRequest();
    grpObject.parentGroupUniqueName = activeGrp.uniqueName;
    grpObject.description = this.subGroupForm.controls['desc'].value;
    grpObject.name = this.subGroupForm.controls['name'].value;
    grpObject.uniqueName = this.subGroupForm.controls['uniqueName'].value;

    this.store.dispatch(this.groupWithAccountsAction.createGroup(grpObject));
    this.subGroupForm.reset();
  }

  public async updateGroup() {
    let activeGroup = await this.activeGroup$.first().toPromise();
    let extendedObj = Object.assign({}, activeGroup, this.groupDetailForm.value);
    this.store.dispatch(this.groupWithAccountsAction.updateGroup(this.groupDetailForm.value, activeGroup.uniqueName));
  }
  public async shareGroup() {
    let activeGrp = await this.activeGroup$.first().toPromise();

    let grpObject = new ShareGroupRequest();
    grpObject.role = 'view_only';
    grpObject.user = this.shareGroupForm.controls['userEmail'].value;
    this.store.dispatch(this.groupWithAccountsAction.shareGroup(grpObject, activeGrp.uniqueName));
  }
  public moveToGroupSelected(event: any) {
    this.moveGroupForm.patchValue({ moveto: event.item.uniqueName });
  }
  public async moveGroup() {
    let activeGrp = await this.activeGroup$.first().toPromise();

    let grpObject = new MoveGroupRequest();
    grpObject.parentGroupUniqueName = this.moveGroupForm.controls['moveto'].value;
    this.store.dispatch(this.groupWithAccountsAction.moveGroup(grpObject, activeGrp.uniqueName));
    this.moveGroupForm.reset();
  }

  public async unShareGroup(val) {
    let activeGrp = await this.activeGroup$.first().toPromise();

    this.store.dispatch(this.groupWithAccountsAction.unShareGroup(val, activeGrp.uniqueName));
  }

  public flattenGroup(rawList: any[], parents: any[] = []) {
    let listofUN;
    listofUN = _.map(rawList, (listItem) => {
      let newParents;
      let result;
      newParents = _.union([], parents);
      newParents.push({
        name: listItem.name,
        uniqueName: listItem.uniqueName
      });
      listItem = Object.assign({}, listItem, { parentGroups: [] });
      listItem.parentGroups = newParents;
      if (listItem.groups.length > 0) {
        result = this.flattenGroup(listItem.groups, newParents);
        result.push(_.omit(listItem, 'groups'));
      } else {
        result = _.omit(listItem, 'groups');
      }
      return result;
    });
    return _.flatten(listofUN);
  }

  public makeGroupListFlatwithLessDtl(rawList: any) {
    let obj;
    obj = _.map(rawList, (item: any) => {
      obj = {};
      obj.name = item.name;
      obj.uniqueName = item.uniqueName;
      obj.synonyms = item.synonyms;
      obj.parentGroups = item.parentGroups;
      return obj;
    });
    return obj;
  }

  public async taxHierarchy() {
    let activeGrp = await this.activeGroup$.first().toPromise();
    this.store.dispatch(this.companyActions.getTax());
    this.store.dispatch(this.groupWithAccountsAction.getTaxHierarchy(activeGrp.uniqueName));
    this.showEditTaxSection = true;
  }

  public getAccountFromGroup(groupList: IGroupsWithAccounts[], uniqueName: string, result: boolean): boolean {
    groupList.forEach(el => {
      if (el.accounts) {
        if (el.uniqueName === uniqueName && (el.category === 'income' || el.category === 'expenses')) {
          result = true;
          return;
        }
      }
      if (el.groups) {
        result = this.getAccountFromGroup(el.groups, uniqueName, result);
      }
    });
    return result;
  }

  public applyTax() {
    let activeAccount: AccountResponse = null;
    let activeGroup: GroupResponse = null;
    this.store.take(1).subscribe(s => {
      if (s.groupwithaccounts) {
        activeAccount = s.groupwithaccounts.activeAccount;
        activeGroup = s.groupwithaccounts.activeGroup;
      }
    });
    if (activeAccount) {
      //
    } else {
      debugger;
      let data: ApplyTaxRequest = new ApplyTaxRequest();
      data.isAccount = false;
      data.taxes = [];
      this.activeGroupTaxHierarchy$.take(1).subscribe((t) => {
        if (t) {
          t.inheritedTaxes.forEach(tt => {
            tt.applicableTaxes.forEach(ttt => {
              data.taxes.push(ttt.uniqueName);
            });
          });
        }
      });
      debugger;
      data.taxes.push(...this.taxGroupForm.controls['taxes'].value);
      data.uniqueName = activeGroup.uniqueName;
      this.store.dispatch(this.groupWithAccountsAction.applyGroupTax(data));
    }

  }
}
