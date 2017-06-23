import { Select2Module } from 'ng2-select2';
import { CommonModule } from '@angular/common';
import { NgModule, ModuleWithProviders } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';
import { Ng2BootstrapModule } from 'ngx-bootstrap';
import { LaddaModule } from 'angular2-ladda';

import { LayoutComponent } from './layout/layout.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { FormWizardModule, ConfirmModalComponent } from './theme';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {
  ManageGroupsAccountsComponent, AccountsSideBarComponent, CompanyAddComponent,
  AccountOperationsComponent, GroupsRecursiveListComponent, GroupsRecursiveListItemComponent,
  GroupAccountsListComponent
} from './header/components';

const PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
};
@NgModule({
  declarations: [
    // Components / Directives/ Pipes
    LayoutComponent, HeaderComponent, FooterComponent, AccountsSideBarComponent,
    ManageGroupsAccountsComponent, CompanyAddComponent, ConfirmModalComponent, AccountOperationsComponent,
    GroupsRecursiveListComponent, GroupsRecursiveListItemComponent, GroupAccountsListComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    PerfectScrollbarModule.forRoot(PERFECT_SCROLLBAR_CONFIG),
    Ng2BootstrapModule.forRoot(),
    LaddaModule.forRoot({
      style: 'slide-left',
      spinnerSize: 30
    }),
    BrowserAnimationsModule,
    ToastrModule.forRoot(),
    FormWizardModule,
    Select2Module
  ],
  exports: [LayoutComponent, HeaderComponent, FooterComponent, LaddaModule, Ng2BootstrapModule, ToastrModule, BrowserAnimationsModule],
  entryComponents: [ManageGroupsAccountsComponent, CompanyAddComponent, ConfirmModalComponent, AccountOperationsComponent,
    GroupsRecursiveListComponent, GroupsRecursiveListItemComponent, GroupAccountsListComponent]
})
export class SharedModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: []
    };
  }
}
