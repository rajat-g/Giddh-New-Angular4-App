import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import {
  IsDivVisible,
  IsFieldVisible
} from '../invoice/templates/edit-template/filters-container/content-filters/content.filters.component';
import { EmailSettingObjDefinition } from '../models/interfaces/invoice.setting.interface';

@Injectable()

export class InvoiceUiDataService {
  public templateName: string;
  public logoPath: Subject<string> = new Subject();
  public imageSignaturePath: Subject<string> = new Subject();
  public setDivVisible: Subject<IsDivVisible> = new Subject();
  public setFieldDisplay: Subject<IsFieldVisible> = new Subject();
  public logoSize: Subject<string> = new Subject();
  public defaultPrintSetting: Subject<number> = new Subject();
  public showLogo: Subject<boolean> = new Subject();
  public invoiceEmailSettingObject: EmailSettingObjDefinition = new EmailSettingObjDefinition();

  public setLogoPath(val) {
    // console.log('The value is :', val);
    this.logoPath.next(val);
  }

  public setImageSignatgurePath(val) {
    // console.log('The value is :', val);
    this.imageSignaturePath.next(val);
  }

  public setDivStatus(div: IsDivVisible) {
    this.setDivVisible.next(div);
  }

  public setFieldDisplayState(field: IsFieldVisible) {
    this.setFieldDisplay.next(field);
  }

  public setLogoSize(size: string) {
    this.logoSize.next(size);
  }
  public resetPrintSetting(margin: number) {
    this.defaultPrintSetting.next(margin);
  }
  public logoState(state) {
    this.showLogo.next(state);
  }
  // Email
  public updateEmailSettingObj(emailSettingObj) {
    this.invoiceEmailSettingObject = emailSettingObj;
  }
  public getEmailSettingObj() {
    return this.invoiceEmailSettingObject;
  }
  public setTemplateName(name: string) {
    this.templateName = name;
  }
  public getTemplateName() {
    return this.templateName;
  }
}
