import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { GstReconcileActions } from 'app/actions/gst-reconcile/GstReconcile.actions';
import { Store } from '@ngrx/store';
import { AppState } from 'app/store';
import { ReplaySubject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { GstDatePeriod, GstOverViewRequest } from '../../../../models/api-models/GstReconcile';

@Component({
  selector: 'filing-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['overview.component.css'],
})
export class FilingOverviewComponent implements OnInit, OnChanges, OnDestroy {

  @Input() public currentPeriod: GstDatePeriod = new GstDatePeriod();
  @Input() public activeCompanyGstNumber: string = '';
  @Input() public selectedGst: string = '';
  @Input() public isTransactionSummary: boolean = false;

  public showTransaction: boolean = false;
  public filters: any = {};
  public request: GstOverViewRequest;

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(private gstAction: GstReconcileActions, private _store: Store<AppState>, private _route: Router, private activatedRoute: ActivatedRoute) {
    this.request = new GstOverViewRequest();
  }

  public ngOnInit() {
    this.activatedRoute.url.subscribe(params => {
      this.showTransaction = this._route.routerState.snapshot.url.includes('transaction');
    });

    this.request.from = this.currentPeriod.from;
    this.request.to = this.currentPeriod.to;
    this.request.gstin = this.activeCompanyGstNumber;

    // let model = {
    //   period: this.currentPeriod,
    //   gstin: this.activeCompanyGstNumber,
    //   page: 1,
    //   count: 20
    // };
    this._store.dispatch(this.gstAction.GetOverView(this.selectedGst, this.request));
    //
  }

  public selectTxn(param) {
    this.filters = param;
  }

  /**
   * ngOnChanges
   */
  public ngOnChanges(s: SimpleChanges) {
    //
  }

  /**
   * ngOnDestroy
   */
  public ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
