import { SuccessComponent } from './settings/linked-accounts/success.component';
import { AppState } from './store/roots';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActionReducer, MetaReducer, Store, StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import * as _ from './lodash-optimized';
/*
 * Platform and Environment providers/pipes/pipes
 */
import { environment } from 'environments/environment';
import { ROUTES } from './app.routes';
import { reducers } from './store';
// App is our top level component
import { AppComponent } from './app.component';
import { APP_BASE_HREF } from '@angular/common';
import { APP_RESOLVER_PROVIDERS } from './app.resolver';
import { PageComponent } from './page.component';
import { NoContentComponent } from './no-content/no-content.component';
import { SharedModule } from './shared/shared.module';
import { ServiceModule } from './services/service.module';
import { ToastrModule } from 'ngx-toastr';
import { PerfectScrollbarModule, PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar';
import { DummyComponent } from './dummy.component';
import { WindowRef } from './shared/helpers/window.object';
import { NewUserComponent } from './newUser.component';
import { SocialLoginCallbackComponent } from './social-login-callback.component';
import 'rxjs/add/operator/take';
import { BsDatepickerModule, DatepickerModule } from 'ngx-bootstrap/datepicker';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { LaddaModule } from 'angular2-ladda/module/module';
import { ShSelectModule } from './theme/ng-virtual-select/sh-select.module';
import { LoaderComponent } from './loader/loader.component';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { StoreRouterConnectingModule } from '@ngrx/router-store';
import { localStorageSync } from 'ngrx-store-localstorage';
import { ActionModule } from './actions/action.module';
import { DecoratorsModule } from './decorators/decorators.module';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar/dist/lib/perfect-scrollbar.interfaces';
import { Configuration } from 'app/app.constant';
import { ServiceConfig } from 'app/services/service.config';
// Application wide providers
const APP_PROVIDERS = [
  ...APP_RESOLVER_PROVIDERS,
  { provide: APP_BASE_HREF, useValue: '/' }
];

interface InternalStateType {
  [key: string]: any;
}

interface StoreType {
  state: InternalStateType;
  rootState: InternalStateType;
  restoreInputValues: () => void;
  disposeOldHosts: () => void;
}

// tslint:disable-next-line:prefer-const
let CONDITIONAL_IMPORTS = [];

export function localStorageSyncReducer(reducer: ActionReducer<any>): ActionReducer<any> {
  return localStorageSync({ keys: ['session', 'permission'], rehydrate: true })(reducer);
}

let metaReducers: Array<MetaReducer<any, any>> = [localStorageSyncReducer];
if (ENV === 'development') {
  // console.log('loading react devtools');
  // metaReducers.push(storeFreeze);
  // CONDITIONAL_IMPORTS.push(StoreDevtoolsModule.instrument({ maxAge: 50 }));
}
const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
};

/**
 * `AppModule` is the main entry point into Angular2's bootstraping process
 */
@NgModule({
  bootstrap: [AppComponent],
  declarations: [
    AppComponent,
    PageComponent,
    NoContentComponent,
    DummyComponent,
    SuccessComponent,
    NewUserComponent,
    LoaderComponent,
    SocialLoginCallbackComponent
  ],
  /**
   * Import Angular's modules.
   */
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    LaddaModule.forRoot({
      style: 'slide-left',
      spinnerSize: 30
    }),
    PaginationModule.forRoot(),
    CollapseModule.forRoot(),
    TooltipModule.forRoot(),
    BsDatepickerModule.forRoot(),
    ModalModule.forRoot(),
    PopoverModule.forRoot(),
    NgbTypeaheadModule.forRoot(),
    BsDropdownModule.forRoot(),
    TabsModule.forRoot(),
    TooltipModule.forRoot(),
    DatepickerModule.forRoot(),
    SharedModule.forRoot(),
    ServiceModule.forRoot(),
    ActionModule.forRoot(),
    DecoratorsModule.forRoot(),
    ShSelectModule.forRoot(),
    ToastrModule.forRoot({ preventDuplicates: true, maxOpened: 3 }),
    StoreModule.forRoot(reducers, { metaReducers }),
    PerfectScrollbarModule,
    RouterModule.forRoot(ROUTES, { useHash: isElectron,  }),
    StoreRouterConnectingModule,
    // StoreDevtoolsModule.instrument({
    //   maxAge: 25
    // }),
    ...CONDITIONAL_IMPORTS,
    /**
     * This section will import the `DevModuleModule` only in certain build types.
     * When the module is not imported it will get tree shaked.
     * This is a simple example, a big app should probably implement some logic
     */
    // ...environment.showDevModule ? [DevModuleModule] : [],
  ],
  /**
   * Expose our Services and Providers into Angular's dependency injection.
   * enableTracing: true,
   */
  providers: [
    environment.ENV_PROVIDERS,
    APP_PROVIDERS,
    WindowRef,
    {
      provide: PERFECT_SCROLLBAR_CONFIG,
      useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG
    },
    {
      provide: ServiceConfig,
      useValue: { apiUrl: Configuration.ApiUrl, appUrl: Configuration.AppUrl, _ }
    }
  ]
})
export class AppModule { }
