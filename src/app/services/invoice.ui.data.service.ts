import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { CustomTemplateResponse } from '../models/api-models/Invoice';
import * as _ from '../lodash-optimized';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { CompanyResponse } from '../models/api-models/Company';

export class TemplateContentUISectionVisibility {
  public header: boolean = true;
  public table: boolean = false;
  public footer: boolean = false;
}

@Injectable()

export class InvoiceUiDataService {

  public customTemplate: BehaviorSubject<CustomTemplateResponse> = new BehaviorSubject(new CustomTemplateResponse());
  public isLogoVisible: Subject<boolean> = new Subject();
  public isCompanyNameVisible: Subject<boolean> = new Subject();
  public logoPath: Subject<string> = new Subject();
  public selectedSection: Subject<TemplateContentUISectionVisibility> = new Subject();
  // Current company real values
  public companyGSTIN: BehaviorSubject<string> = new BehaviorSubject(null);
  public companyPAN: BehaviorSubject<string> = new BehaviorSubject(null);

  private companyName: string;
  private companyAddress: string;

  constructor() {
    //
  }

  /**
   * initCustomTemplate
   */
  public initCustomTemplate(companyUniqueName: string = '', companies: CompanyResponse[] = [], defaultTemplate: CustomTemplateResponse) {
    this.isLogoVisible.next(true);
    let uniqueName = companyUniqueName;
    let currentCompany = companies.find((company) => company.uniqueName === uniqueName);
    if (currentCompany) {
      this.companyName = currentCompany.name;
      this.companyAddress = currentCompany.address;
      if (currentCompany.gstDetails[0]) {
        this.companyGSTIN.next(currentCompany.gstDetails[0].gstNumber);
      }
      if (currentCompany.panNumber) {
        this.companyPAN.next(currentCompany.panNumber);
      }
    }
    this.isCompanyNameVisible.next(true);
    if (defaultTemplate) {
      if (this.companyName) {
        defaultTemplate.sections[0].content[0].label = this.companyName;
        defaultTemplate.sections[2].content[10].label = this.companyName;
      }
      if (this.companyAddress) {
        defaultTemplate.sections[2].content[8].label = this.companyAddress;
      }
      this.customTemplate.next(_.cloneDeep(defaultTemplate));
    }

    this.selectedSection.next({
      header: true,
      table: false,
      footer: false
    });
  }

  /**
   * setCustomTemplate
   */
  public setCustomTemplate(template: CustomTemplateResponse) {
    this.customTemplate.next(template);
  }

  /**
   * setLogoVisibility
   */
  public setLogoVisibility(value: boolean) {
    this.isLogoVisible.next(value);
  }

  /**
   * setCompanyNameVisibility
   */
  public setCompanyNameVisibility(value: boolean) {
    this.isCompanyNameVisible.next(value);
  }

  /**
   * setLogoPath
   */
  public setLogoPath(path: string) {
    this.logoPath.next(path);
  }

  /**
   * setSelectedSection
   */
  public setSelectedSection(section: string) {
    let state = {
      header: false,
      table: false,
      footer: false
    };
    state[section] = true;
    this.selectedSection.next(state);
  }

  /**
   * resetCustomTemplate
   */
  public resetCustomTemplate() {
    this.customTemplate.next(new CustomTemplateResponse());
  }

  public BRToNewLine(template) {
    template.sections[2].content[5].label = template.sections[2].content[5].label.replace(/<br\s*[\/]?>/gi, '\n');
    template.sections[2].content[6].label = template.sections[2].content[6].label.replace(/<br\s*[\/]?>/gi, '\n');
    template.sections[2].content[10].label = template.sections[2].content[10].label.replace(/<br\s*[\/]?>/gi, '\n');
    return template;
  }

  /**
   * setTemplateUniqueName
   */
  public setTemplateUniqueName(uniqueName: string, mode: string, customCreatedTemplates: CustomTemplateResponse[],
                               defaultTemplate: CustomTemplateResponse) {
    if (customCreatedTemplates && customCreatedTemplates.length) {
      let allTemplates = _.cloneDeep(customCreatedTemplates);
      let selectedTemplate = allTemplates.find((template) => template.uniqueName === uniqueName);

      if (selectedTemplate) {

        if (mode === 'create' && selectedTemplate.sections[0].content[9].field !== 'trackingNumber' && defaultTemplate) { // this is default(old) template
          selectedTemplate.sections = _.cloneDeep(defaultTemplate.sections);
        }

        if (selectedTemplate.sections[0].content[0].display) {
          this.isCompanyNameVisible.next(true);
        }
        if (this.companyName && mode === 'create') {
          selectedTemplate.sections[2].content[10].label = this.companyName;
        }
        if (this.companyAddress && mode === 'create') {
          selectedTemplate.sections[2].content[8].label = this.companyAddress;
        }
        selectedTemplate.sections[0].content[0].label = this.companyName;
        if (!selectedTemplate.logoUniqueName) {
          this.isLogoVisible.next(false);
        } else {
          this.isLogoVisible.next(true);
        }

        if (selectedTemplate.sections[0].content.length === 24) {
          selectedTemplate.sections[0].content[24] = {
            display: true,
            label: 'Attention To',
            field: 'attentionTo',
            width: null
          };
        }

        selectedTemplate = this.BRToNewLine(selectedTemplate);
        // console.log('THe selected template is :', selectedTemplate);

        this.customTemplate.next(_.cloneDeep(selectedTemplate));
      }
    }
  }
}
