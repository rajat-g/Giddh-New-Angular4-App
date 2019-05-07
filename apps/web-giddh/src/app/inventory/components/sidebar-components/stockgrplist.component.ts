import { takeUntil } from 'rxjs/operators';
import { StockDetailResponse, StockGroupResponse } from '../../../models/api-models/Inventory';
import { AppState } from '../../../store/roots';
import { IGroupsWithStocksHierarchyMinItem } from '../../../models/interfaces/groupsWithStocks.interface';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SidebarAction } from '../../../actions/inventory/sidebar.actions';
import { Store } from '@ngrx/store';
import { Observable, ReplaySubject } from 'rxjs';
import { InventoryAction } from '../../../actions/inventory/inventory.actions';
import { InvViewService } from '../../inv.view.service';

@Component({
  selector: 'stockgrp-list',
  styles: [`
    .active {
      color: #d35f29 !important;
    }

    .stock-grp-list li > i:focus {
      outline: 0;
    }

    .grp_open {
      background: rgb(255, 255, 255);
    }

    .grp_open li {
      border: 0;
    }

    .btn-link {
      padding-top: 0 !important;
    }

    .stock-grp-list .active a, s.tock-grp-list .active i {
      color: #FF5F00 !important;
    }

    .stock-grp-list .active {
      background-color: #FFF3EC;
    }

    .item-group {
      padding: 12px 20px;
      padding-right: 0;
      display: flex;
      align-items: center;
      max-height:41px;
    }

    .main-group div > stockgrp-list .item-group {
      padding: 8px 0 8px 35px !important;
    }

    .main-group div > stock-list ::ng-deep.in-list {
      padding: 8px 0 8px 35px;
    }

    stock-list ::ng-deep.in-list a div {
      color: black !important;
    }

    .item-group {
      text-transform: unset !important;
    }

    /*.parent-Group > .stock-grp-list:first-child {*/
    /*max-height: 67vh;*/
    /*min-height: 78vh;*/
    /*overflow: unset !important;*/
    /*}*/
  `],
  // [routerLink]="[ 'add-group', grp.uniqueName ]"
  template: `
    <ul class="list-unstyled stock-grp-list clearfix">
      <li class="clearfix main-group" [ngClass]="{'isGrp': grp.childStockGroups.length > 0,'grp_open': grp.isOpen}" *ngFor="let grp of Groups" style="padding: 0 !important;padding-right: 10 !important;">
        <div class="item-group" [ngClass]="{'active': grp.isOpen && (activeGroup && activeGroup.uniqueName === grp.uniqueName) && !(activeStockUniqueName$ | async)}">
          <a (click)="OpenGroup(grp,$event)" style="display: flex;align-items: center;flex: 1;color: black;" class="d-flex" [routerLink]="[ 'group', grp.uniqueName, 'report' ]">
            {{grp.name}}
            <i style="margin:0 15px;font-size: 9px" class="icon-arrow-down pr" [ngClass]="{'open': grp.isOpen}"></i>
          </a>
          <!-- *ngIf="grp.isOpen && (activeGroup && activeGroup.uniqueName === grp.uniqueName) && (activeStockUniqueName$ | async)" -->
          <span class="pull-right">
        <!-- *ngIf="grp.isOpen && (activeGroup && activeGroup.uniqueName === grp.uniqueName)" -->
          <button class="btn btn-link btn-xs pull-right" (click)="goToManageGroup(grp)" *ngIf="grp.isOpen && (activeGroup && activeGroup.uniqueName === grp.uniqueName) && !(activeStockUniqueName$ | async)">
            <i class="fa fa-pencil" style="color: #FF5F00 !important;"> </i>
          </button>
        </span>
        </div>
        <div>
          <stock-list [Groups]='grp'>
          </stock-list>
          <stockgrp-list [Groups]='grp.childStockGroups' *ngIf="grp.childStockGroups.length > 0 && grp.isOpen">
          </stockgrp-list>
        </div>
      </li>
    </ul>
  `
})
export class StockgrpListComponent implements OnInit, OnDestroy {
  public activeStock$: Observable<StockDetailResponse>;
  public activeGroup$: Observable<StockGroupResponse>;
  public activeGroupUniqueName$: Observable<string>;
  @Input()
  public Groups: IGroupsWithStocksHierarchyMinItem[];
  public stockUniqueName: string;
  public activeGroup: any = null;
  public activeStock: any = null;
  public activeStockUniqueName$: Observable<string>;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(private store: Store<AppState>, private route: ActivatedRoute, private sideBarAction: SidebarAction,
              private inventoryAction: InventoryAction, private invViewService: InvViewService,) {
    this.activeGroup$ = this.store.select(p => p.inventory.activeGroup).pipe(takeUntil(this.destroyed$));
    this.activeStock$ = this.store.select(p => p.inventory.activeStock).pipe(takeUntil(this.destroyed$));
    this.activeGroupUniqueName$ = this.store.select(p => p.inventory.activeGroupUniqueName).pipe(takeUntil(this.destroyed$));
    this.activeStockUniqueName$ = this.store.select(p => p.inventory.activeStockUniqueName);
  }

  public ngOnInit() {
    this.activeGroup$.pipe(takeUntil(this.destroyed$)).subscribe(a => {
      if (a) {
        this.activeGroup = a;
      }
    });

    this.activeStock$.pipe(takeUntil(this.destroyed$)).subscribe(a => {
      if (a) {
        this.activeStock = a;
      }
    });
  }

  public ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  public OpenGroup(grp: IGroupsWithStocksHierarchyMinItem, e: Event) {
    this.invViewService.setActiveView('group', grp.name, null, grp.uniqueName, grp.isOpen);
    e.stopPropagation();
    this.store.dispatch(this.sideBarAction.ShowBranchScreen(false));
    if (grp.isOpen) {
      this.store.dispatch(this.sideBarAction.OpenGroup(grp.uniqueName));
    } else {
      this.store.dispatch(this.sideBarAction.GetInventoryGroup(grp.uniqueName));
    }
    // this.store.dispatch(this.inventoryAction.resetActiveStock());
    // if (grp.isOpen) {
    //   this.store.dispatch(this.sideBarAction.OpenGroup(grp.uniqueName));
    //   this.store.dispatch(this.inventoryAction.resetActiveStock());
    // } else {
    //   // this.store.dispatch(this.sideBarAction.GetInventoryGroup(grp.uniqueName));
    //   this.store.dispatch(this.inventoryAction.resetActiveStock());
    // }
  }

  public goToManageGroup(grp) {
    if (grp.uniqueName) {
      this.store.dispatch(this.inventoryAction.OpenInventoryAsidePane(true));
      this.setInventoryAsideState(true, true, true);
    }
  }

  /**
   * setInventoryAsideState
   */
  public setInventoryAsideState(isOpen, isGroup, isUpdate) {
    this.store.dispatch(this.inventoryAction.ManageInventoryAside({isOpen, isGroup, isUpdate}));
  }

}
