import { Component, OnInit } from '@angular/core';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import {Router} from "@angular/router";
import {select, Store} from "@ngrx/store";
import {AppState} from "../../../store";
import {CompanyActions} from "../../../actions/company.actions";
import {CompanyService} from "../../../services/companyService.service";
import {ReportsModel, ReportsRequestModel, ReportsResponseModel} from "../../../models/api-models/Reports";
import {ToasterService} from "../../../services/toaster.service";
import {createSelector} from "reselect";
import {takeUntil} from "rxjs/operators";
import * as moment from "../../../tb-pl-bs/components/filter/tb-pl-bs-filter.component";
import {ReplaySubject} from "rxjs";


@Component({
  selector: 'reports-details-component',
  templateUrl: './report.details.component.html',
  styleUrls: ['./report.details.component.scss']
})
export class ReportsDetailsComponent implements OnInit {

  bsValue = new Date();
  public reportRespone: ReportsModel[];
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  public activeFinacialYr;
  public salesRegisterTotal:ReportsModel = new ReportsModel();

  ngOnInit() {
  }

  constructor(private router: Router,private store: Store<AppState>, private companyActions: CompanyActions, private companyService:CompanyService, private _toaster: ToasterService) {
    this.setCurrentFY();
    this.populateRecords('monthly');
    this.salesRegisterTotal.particular = this.activeFinacialYr.uniqueName;
  }

  public goToDashboard() {
      this.router.navigate(['/pages/reports']);
  }

  public filterReportResp(response){
    let reportModelArray = [];
    let index  = 1;
    let indexMonths  = 0;
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    let reportsModelCombined : ReportsModel = new ReportsModel();
    _.forEach(response, (item) => {
      let reportsModel : ReportsModel = new ReportsModel();
      reportsModel.sales = item.creditTotal;
      reportsModel.returns = item.debitTotal;
      reportsModel.netSales = item.closingBalance.amount;
      reportsModel.cumulative = item.balance.amount;

      this.salesRegisterTotal.sales += item.creditTotal;
      this.salesRegisterTotal.returns += item.debitTotal;
      this.salesRegisterTotal.netSales += item.closingBalance.amount;
      this.salesRegisterTotal.cumulative += item.balance.amount;

      let mdyFrom = item.from.split('-');
      let mdyTo = item.to.split('-');
      let dateDiff = this.datediff(this.parseDate(mdyFrom), this.parseDate(mdyTo));

      if(dateDiff <= 31){
        reportsModel.particular = monthNames[parseInt(mdyFrom[1]) -1 ] +  mdyFrom[2];
        indexMonths++;
        reportsModelCombined.sales += item.creditTotal;
        reportsModelCombined.returns += item.debitTotal;
        reportsModelCombined.netSales += item.closingBalance.amount;
        reportsModelCombined.cumulative += item.balance.amount;
        reportModelArray.push(reportsModel);
        if(indexMonths % 3 === 0){
          reportsModelCombined.particular = 'Quarter '+ indexMonths / 3;
          reportsModelCombined.reportType = 'combined';
          reportModelArray.push(reportsModelCombined);

          reportsModelCombined = new ReportsModel();
        }
      }else{
        reportsModel.particular = this.formatParticular(mdyTo, mdyFrom, index, monthNames);
        reportModelArray.push(reportsModel);
        index++;
      }

    });
    return reportModelArray;
  }

  // new Date("dateString") is browser-dependent and discouraged, so we'll write
  // a simple parse function for U.S. date format (which does no error checking)
  public parseDate(mdy) {
    return new Date(mdy[2], mdy[1], mdy[0]);
  }

  public datediff(first, second) {
    // Take the difference between the dates and divide by milliseconds per day.
    // Round to nearest whole number to deal with DST.
    return Math.round((second-first)/(1000*60*60*24));
  }

  public setCurrentFY() {
    // set financial years based on company financial year
    this.store.pipe(select(createSelector([(state: AppState) => state.session.companies, (state: AppState) => state.session.companyUniqueName], (companies, uniqueName) => {
      if (!companies) {
        return;
      }

      return companies.find(cmp => {
        if (cmp && cmp.uniqueName) {
          return cmp.uniqueName === uniqueName;
        } else {
          return false;
        }
      });
    })), takeUntil(this.destroyed$)).subscribe(selectedCmp => {
      if (selectedCmp) {
        let activeFinancialYear = selectedCmp.activeFinancialYear;
        if (activeFinancialYear) {
          this.activeFinacialYr = activeFinancialYear;
        }
      }
    });
  }

  public populateRecords(interval) {
    let request: ReportsRequestModel = {
      to: this.activeFinacialYr.financialYearEnds,
      from: this.activeFinacialYr.financialYearStarts,
      interval:interval,
    }
    this.companyService.getSalesRegister(request).subscribe((res) => {
      if (res.status === 'error') {
        this._toaster.errorToast(res.message);
      }else{
        this.salesRegisterTotal = new ReportsModel();
        this.salesRegisterTotal.particular = this.activeFinacialYr.uniqueName;
        this.reportRespone = this.filterReportResp(res.body);
      }
    });
  }
  public formatParticular(mdyTo, mdyFrom, index, monthNames){
    return 'Quarter '+ index +" ("+ monthNames[parseInt(mdyFrom[1]) - 1] + " "+  mdyFrom[2] + "-" + monthNames[parseInt(mdyTo[1]) - 1] +" "+ mdyTo[2]+")";
  }
}
