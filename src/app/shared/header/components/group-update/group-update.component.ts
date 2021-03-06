import { take, takeUntil } from 'rxjs/operators';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { GroupWithAccountsAction } from '../../../../actions/groupwithaccounts.actions';
import { AppState } from '../../../../store';
import { Observable, ReplaySubject } from 'rxjs';
import { GroupResponse, GroupsTaxHierarchyResponse, MoveGroupRequest } from '../../../../models/api-models/Group';
import { ModalDirective } from 'ngx-bootstrap';
import * as _ from '../../../../lodash-optimized';
import { GroupsWithAccountsResponse } from '../../../../models/api-models/GroupsWithAccounts';
import { IGroupsWithAccounts } from '../../../../models/interfaces/groupsWithAccounts.interface';
import { AccountResponseV2 } from '../../../../models/api-models/Account';
import { CompanyActions } from '../../../../actions/company.actions';
import { AccountsAction } from '../../../../actions/accounts.actions';
import { ApplyTaxRequest } from '../../../../models/api-models/ApplyTax';
import { IOption } from '../../../../theme/ng-virtual-select/sh-options.interface';
import { createSelector } from 'reselect';
import { ShSelectComponent } from 'app/theme/ng-virtual-select/sh-select.component';
import { GeneralActions } from '../../../../actions/general/general.actions';
import { digitsOnly } from '../../../helpers';

@Component({
  selector: 'group-update',
  templateUrl: 'group-update.component.html'
})

export class GroupUpdateComponent implements OnInit, OnDestroy, AfterViewInit {
  public companyTaxDropDown: Observable<IOption[]>;
  public groupDetailForm: FormGroup;
  public moveGroupForm: FormGroup;
  public taxGroupForm: FormGroup;
  public activeGroup$: Observable<GroupResponse>;
  public activeGroupUniqueName$: Observable<string>;
  public fetchingGrpUniqueName$: Observable<boolean>;
  public isGroupNameAvailable$: Observable<boolean>;
  public isTaxableGroup$: Observable<boolean>;
  public showEditGroup$: Observable<boolean>;
  public groupList$: Observable<GroupsWithAccountsResponse[]>;
  public activeGroupSelected$: Observable<string[]>;
  public activeGroupTaxHierarchy$: Observable<GroupsTaxHierarchyResponse>;
  public isUpdateGroupInProcess$: Observable<boolean>;
  public isUpdateGroupSuccess$: Observable<boolean>;
  public taxPopOverTemplate: string = `
  <div class="popover-content">
  <label>Tax being inherited from:</label>
    <ul>
    <li>@inTax.name</li>
    </ul>
  </div>
  `;
  public showEditTaxSection: boolean = false;
  public groupsList: IOption[] = [];
  public accountList: any[];
  public showTaxes: boolean = false;
  @ViewChild('deleteGroupModal') public deleteGroupModal: ModalDirective;
  @ViewChild('moveToGroupDropDown') public moveToGroupDropDown: ShSelectComponent;

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(private _fb: FormBuilder, private store: Store<AppState>, private groupWithAccountsAction: GroupWithAccountsAction,
              private companyActions: CompanyActions, private accountsAction: AccountsAction, private _generalActions: GeneralActions) {
    this.groupList$ = this.store.select(state => state.general.groupswithaccounts).pipe(takeUntil(this.destroyed$));
    this.activeGroup$ = this.store.select(state => state.groupwithaccounts.activeGroup).pipe(takeUntil(this.destroyed$));
    this.activeGroupUniqueName$ = this.store.select(state => state.groupwithaccounts.activeGroupUniqueName).pipe(takeUntil(this.destroyed$));
    this.fetchingGrpUniqueName$ = this.store.select(state => state.groupwithaccounts.fetchingGrpUniqueName).pipe(takeUntil(this.destroyed$));
    this.isGroupNameAvailable$ = this.store.select(state => state.groupwithaccounts.isGroupNameAvailable).pipe(takeUntil(this.destroyed$));
    this.showEditGroup$ = this.store.select(state => state.groupwithaccounts.showEditGroup).pipe(takeUntil(this.destroyed$));
    this.activeGroupSelected$ = this.store.select(state => {
      if (state.groupwithaccounts.activeAccount) {
        if (state.groupwithaccounts.activeAccountTaxHierarchy) {
          return _.difference(state.groupwithaccounts.activeAccountTaxHierarchy.applicableTaxes.map(p => p.uniqueName), state.groupwithaccounts.activeAccountTaxHierarchy.inheritedTaxes.map(p => p.uniqueName));
        }
      } else {
        if (state.groupwithaccounts.activeGroupTaxHierarchy) {
          return _.difference(state.groupwithaccounts.activeGroupTaxHierarchy.applicableTaxes.map(p => p.uniqueName), state.groupwithaccounts.activeGroupTaxHierarchy.inheritedTaxes.map(p => p.uniqueName));
        }
      }

      return [];
    }).pipe(takeUntil(this.destroyed$));
    this.activeGroupTaxHierarchy$ = this.store.select(state => state.groupwithaccounts.activeGroupTaxHierarchy).pipe(takeUntil(this.destroyed$));
    this.isUpdateGroupInProcess$ = this.store.select(state => state.groupwithaccounts.isUpdateGroupInProcess).pipe(takeUntil(this.destroyed$));
    this.isUpdateGroupSuccess$ = this.store.select(state => state.groupwithaccounts.isUpdateGroupSuccess).pipe(takeUntil(this.destroyed$));

    this.companyTaxDropDown = this.store.select(createSelector([
        (state: AppState) => state.groupwithaccounts.activeGroupTaxHierarchy,
        (state: AppState) => state.groupwithaccounts.activeGroup,
        (state: AppState) => state.company.taxes],
      (activeGroupTaxHierarchy, activeGroup, taxes) => {
        let arr: IOption[] = [];
        if (taxes) {
          if (activeGroup) {
            let applicableTaxes = activeGroup.applicableTaxes.map(p => p.uniqueName);

            if (activeGroupTaxHierarchy) {

              if (activeGroupTaxHierarchy.inheritedTaxes && activeGroupTaxHierarchy.inheritedTaxes.length) {
                let inheritedTaxes = _.flattenDeep(activeGroupTaxHierarchy.inheritedTaxes.map(p => p.applicableTaxes)).map((j: any) => j.uniqueName);
                let allTaxes = applicableTaxes.filter(f => inheritedTaxes.indexOf(f) === -1);
                // set value in tax group form
                this.taxGroupForm.setValue({taxes: allTaxes});
              } else {
                this.taxGroupForm.setValue({taxes: applicableTaxes});
              }

              // prepare drop down options
              return _.differenceBy(taxes.map(p => {
                return {label: p.name, value: p.uniqueName};
              }), _.flattenDeep(activeGroupTaxHierarchy.inheritedTaxes.map(p => p.applicableTaxes)).map((p: any) => {
                return {label: p.name, value: p.uniqueName};
              }), 'value');
            } else {
              // set value in tax group form
              this.taxGroupForm.setValue({taxes: applicableTaxes});

              return taxes.map(p => {
                return {label: p.name, value: p.uniqueName};
              });
            }
          }
        }
        return arr;
      })).pipe(takeUntil(this.destroyed$));
  }

  public ngOnInit() {
    this.store.dispatch(this._generalActions.getGroupWithAccounts());
    this.groupDetailForm = this._fb.group({
      name: ['', Validators.required],
      uniqueName: ['', Validators.required],
      description: [''],
      closingBalanceTriggerAmount: [0, Validators.compose([digitsOnly])],
      closingBalanceTriggerAmountType: ['CREDIT']
    });
    this.moveGroupForm = this._fb.group({
      moveto: ['', Validators.required]
    });
    this.taxGroupForm = this._fb.group({
      taxes: ['']
    });

    this.activeGroup$.subscribe((a) => {
      if (a) {
        this.groupDetailForm.patchValue({name: a.name, uniqueName: a.uniqueName, description: a.description, closingBalanceTriggerAmount: a.closingBalanceTriggerAmount, closingBalanceTriggerAmountType: a.closingBalanceTriggerAmountType});
        if (a.fixed) {
          this.groupDetailForm.get('name').disable();
          this.groupDetailForm.get('uniqueName').disable();
          this.groupDetailForm.get('description').disable();
        } else {
          this.groupDetailForm.get('name').enable();
          this.groupDetailForm.get('uniqueName').enable();
          this.groupDetailForm.get('description').enable();
        }
      }
    });

    this.groupList$.subscribe((a) => {
      if (a && a.length > 0) {
        let activeGroupUniqueName: string;
        this.activeGroup$.pipe(take(1)).subscribe(grp => activeGroupUniqueName = grp.uniqueName);
        let grpsList = this.makeGroupListFlatwithLessDtl(this.flattenGroup(a, []));
        let flattenGroupsList: IOption[] = [];

        grpsList.forEach(grp => {
          if (grp.uniqueName !== activeGroupUniqueName) {
            flattenGroupsList.push({label: grp.name, value: grp.uniqueName});
          }
        });
        this.groupsList = flattenGroupsList;
      }
    });
  }

  public ngAfterViewInit() {
    this.isTaxableGroup$ = this.store.select(state => {
      let result: boolean = false;
      if (state.groupwithaccounts.groupswithaccounts && state.groupwithaccounts.activeGroup) {
        if (state.groupwithaccounts.activeAccount) {
          return false;
        }
        result = this.getAccountFromGroup(state.groupwithaccounts.groupswithaccounts, state.groupwithaccounts.activeGroup.uniqueName, false);
      } else {
        result = false;
      }
      return result;
    });

    this.activeGroupSelected$.subscribe((p) => {
      this.taxGroupForm.patchValue({taxes: p});
    });
    this.activeGroupTaxHierarchy$.subscribe((a) => {
      let activeAccount: AccountResponseV2 = null;
      let activeGroup: GroupResponse = null;
      this.store.pipe(take(1)).subscribe(s => {
        if (s.groupwithaccounts) {
          activeGroup = s.groupwithaccounts.activeGroup;
          activeAccount = s.groupwithaccounts.activeAccount;
        }
      });
      if (activeGroup && !activeAccount) {
        if (a) {
          this.showEditTaxSection = true;
        }
      }
    });
  }

  public showDeleteGroupModal() {
    this.deleteGroupModal.show();
  }

  public hideDeleteGroupModal() {
    this.deleteGroupModal.hide();
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
      listItem = Object.assign({}, listItem, {parentGroups: []});
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

  public customMoveGroupFilter(term: string, item: IOption): boolean {
    return (item.label.toLocaleLowerCase().indexOf(term) > -1 || item.value.toLocaleLowerCase().indexOf(term) > -1);
  }

  public moveGroup() {
    let activeGroupUniqueName: string;
    this.activeGroupUniqueName$.pipe(take(1)).subscribe(a => activeGroupUniqueName = a);

    let grpObject = new MoveGroupRequest();
    grpObject.parentGroupUniqueName = this.moveGroupForm.value.moveto;
    this.store.dispatch(this.groupWithAccountsAction.moveGroup(grpObject, activeGroupUniqueName));
    this.moveGroupForm.reset();

    if (this.moveToGroupDropDown) {
      this.moveToGroupDropDown.clear();
    }
  }

  public deleteGroup() {
    let activeGroupUniqueName: string;
    this.activeGroupUniqueName$.pipe(take(1)).subscribe(a => activeGroupUniqueName = a);
    this.store.dispatch(this.groupWithAccountsAction.deleteGroup(activeGroupUniqueName));
    this.hideDeleteGroupModal();
  }

  public updateGroup() {
    let activeGroupUniqueName: string;
    let uniqueName = this.groupDetailForm.get('uniqueName');
    uniqueName.patchValue(uniqueName.value.replace(/ /g, '').toLowerCase());

    this.activeGroupUniqueName$.pipe(take(1)).subscribe(a => activeGroupUniqueName = a);
    this.store.dispatch(this.groupWithAccountsAction.updateGroup(this.groupDetailForm.value, activeGroupUniqueName));
  }

  public async taxHierarchy() {
    let activeAccount: AccountResponseV2 = null;
    let activeGroupUniqueName: string = null;
    this.store.pipe(take(1)).subscribe(s => {
      if (s.groupwithaccounts) {
        activeAccount = s.groupwithaccounts.activeAccount;
        activeGroupUniqueName = s.groupwithaccounts.activeGroupUniqueName;
      }
    });
    if (activeAccount) {
      //
      this.store.dispatch(this.companyActions.getTax());
      this.store.dispatch(this.accountsAction.getTaxHierarchy(activeAccount.uniqueName));
    } else {
      this.store.dispatch(this.companyActions.getTax());
      this.store.dispatch(this.groupWithAccountsAction.getTaxHierarchy(activeGroupUniqueName));
      this.showEditTaxSection = true;
    }

  }

  public applyTax() {
    let activeAccount: AccountResponseV2 = null;
    let activeGroup: GroupResponse = null;
    this.store.pipe(take(1)).subscribe(s => {
      if (s.groupwithaccounts) {
        activeAccount = s.groupwithaccounts.activeAccount;
        activeGroup = s.groupwithaccounts.activeGroup;
      }
    });
    let data: ApplyTaxRequest = new ApplyTaxRequest();
    data.isAccount = false;
    data.taxes = [];
    this.activeGroupTaxHierarchy$.pipe(take(1)).subscribe((t) => {
      if (t) {
        t.inheritedTaxes.forEach(tt => {
          tt.applicableTaxes.forEach(ttt => {
            data.taxes.push(ttt.uniqueName);
          });
        });
      }
    });
    data.taxes.push.apply(data.taxes, this.taxGroupForm.value.taxes);
    data.uniqueName = activeGroup.uniqueName;
    this.store.dispatch(this.groupWithAccountsAction.applyGroupTax(data));
    this.showEditTaxSection = false;
  }

  public getAccountFromGroup(groupList: IGroupsWithAccounts[], uniqueName: string, result: boolean): boolean {
    groupList.forEach(el => {
      if (el && el.accounts) {
        if (el.uniqueName === uniqueName && (el.category === 'income' || el.category === 'expenses')) {
          result = true;
          return;
        }
      }
      if (el && el.groups) {
        result = this.getAccountFromGroup(el.groups, uniqueName, result);
      }
    });
    return result;
  }

  public closingBalanceTypeChanged(type: string) {
    if (Number(this.groupDetailForm.get('closingBalanceTriggerAmount').value) > 0) {
      this.groupDetailForm.get('closingBalanceTriggerAmountType').patchValue(type);
    }
  }

  public ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
