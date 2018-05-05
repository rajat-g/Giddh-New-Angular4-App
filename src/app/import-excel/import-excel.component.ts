import { Store } from '@ngrx/store';
import { AppState } from '../store/roots';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'import-excel',  // <home></home>
  styleUrls: ['./import-excel.component.scss'],
  templateUrl: './import-excel.component.html'
})

export class ImportComponent implements OnInit, OnDestroy, AfterViewInit {

  constructor(
    private store: Store<AppState>,
    private _router: Router,
  ) {
  }

  public ngOnInit() {
    //
  }

  public ngAfterViewInit(): void {
    //
  }

  public ngOnDestroy() {
    //
  }

}
