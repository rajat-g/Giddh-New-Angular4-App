import {
  Component, Input, EventEmitter, Output, OnInit, OnChanges, OnDestroy
} from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../store/roots';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import ownKeys = Reflect.ownKeys;
import { NgStyle } from '@angular/common';
import { InvoiceActions } from '../../../../services/actions/invoice/invoice.actions';
import * as _ from 'lodash';
import { InvoiceTemplatesService } from '../../../../services/invoice.templates.service';
import {
  GetInvoiceTemplateDetailsResponse, GetTemplateResponse, ISection,
  Template,
  CustomTemplateResponse
} from '../../../../models/api-models/Invoice';
import { InvoiceUiDataService, TemplateContentUISectionVisibility } from '../../../../services/invoice.ui.data.service';
// import { IsDivVisible, IsFieldVisible } from '../filters-container/content-filters/content.filters.component';

@Component({
  selector: 'invoice-template',
  templateUrl: 'out.template.component.html',
  styleUrls: ['out.template.component.css']
})

export class OutTemplateComponent implements OnInit, OnDestroy {

  @Input() public isPreviewMode: boolean = false;
  public inputTemplate: CustomTemplateResponse = new CustomTemplateResponse();
  public templateUISectionVisibility: TemplateContentUISectionVisibility = new TemplateContentUISectionVisibility();
  public logoSrc: string;
  public showLogo: boolean = true;
  public showCompanyName: boolean;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(private store: Store<AppState>, private invoiceAction: InvoiceActions, private invoiceTemplatesService: InvoiceTemplatesService, private _invoiceUiDataService: InvoiceUiDataService) {}

  public ngOnInit() {
    this._invoiceUiDataService.customTemplate.subscribe((template: CustomTemplateResponse) => {
      this.inputTemplate = _.cloneDeep(template);
    });

    this._invoiceUiDataService.logoPath.subscribe((path: string) => {
      this.logoSrc = _.cloneDeep(path);
    });

    this._invoiceUiDataService.isLogoVisible.subscribe((yesOrNo: boolean) => {
      this.showLogo = _.cloneDeep(yesOrNo);
    });

    this._invoiceUiDataService.isCompanyNameVisible.subscribe((yesOrNo: boolean) => {
      this.showCompanyName = _.cloneDeep(yesOrNo);
    });

    if (this.isPreviewMode) {
      this.templateUISectionVisibility = {
        header: true,
        table: true,
        footer: true
      };
    } else {
      this._invoiceUiDataService.selectedSection.subscribe((info: TemplateContentUISectionVisibility) => {
        this.templateUISectionVisibility = _.cloneDeep(info);
      });
    }
  }

  public onClickSection(sectionName: string) {
    if (!this.isPreviewMode) {
      this._invoiceUiDataService.setSelectedSection(sectionName);
    }
  }

  public ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
