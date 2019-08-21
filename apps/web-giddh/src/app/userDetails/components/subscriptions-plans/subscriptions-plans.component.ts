import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { BsModalRef, BsModalService } from 'ngx-bootstrap';

@Component({
  selector: 'subscriptions-plans',
  styleUrls: ['./subscriptions-plans.component.css'],
  templateUrl: './subscriptions-plans.component.html'
})

export class SubscriptionsPlansComponent implements OnInit, OnDestroy {

  modalRef: BsModalRef;
  constructor(private modalService: BsModalService) {}
  
  public ngOnInit() {}
  public ngOnDestroy() {}

  openModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template);
  }
  openModalTwo(modalTwo: TemplateRef<any>) {
    this.modalRef = this.modalService.show(modalTwo);
  }
  
}