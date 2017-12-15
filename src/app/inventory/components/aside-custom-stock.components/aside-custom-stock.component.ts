import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import * as _ from '../../lodash-optimized';

@Component({
  selector: 'aside-custom-stock',
  styles: [`
    :host{
      position: fixed;
      left: auto;
      top: 0;
      right: 0;
      bottom: 0;
      width: 530px;
      z-index: 1045;
    }
    #close{
      display: none;
    }
    :host.in  #close{
      display: block;
      position: fixed;
      left: -41px;
      top: 0;
      z-index: 5;
      border: 0;
      border-radius: 0;
    }
    :host .container-fluid{
      padding-left: 0;
      padding-right: 0;
    }
    :host .aside-pane {
      width: 530px;
    }
  `],
  templateUrl: './aside-custom-stock.component.html'
})
export class AsideCustomStockComponent implements OnInit {

  @Output() public closeAsideEvent: EventEmitter<boolean> = new EventEmitter(true);

  constructor(
    private store: Store<AppState>
  ) {
  }

  public ngOnInit() {

  }
  public closeAsidePane(event) {
    this.closeAsideEvent.emit(event);
  }

}
