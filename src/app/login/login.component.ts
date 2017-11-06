import { LoginActions } from '../services/actions/login.action';
import { AppState } from '../store';
import { Router } from '@angular/router';
import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalDirective } from 'ngx-bootstrap';
import { Configuration } from '../app.constant';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { LinkedInRequestModel, SignupWithMobile, UserDetails, VerifyEmailModel, VerifyEmailResponseModel, VerifyMobileModel } from '../models/api-models/loginModels';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { AuthService, GoogleLoginProvider, LinkedinLoginProvider, SocialUser } from 'ng4-social-login';
import { Headers, RequestOptionsArgs } from '@angular/http';
import { ToasterService } from '../services/toaster.service';
import { AdditionalGoogleLoginParams, AdditionalLinkedinLoginParams, GoogleLoginElectronConfig, LinkedinLoginElectronConfig } from '../../mainprocess/main-auth.config';
import { contriesWithCodes } from '../shared/helpers/countryWithCodes';
import { IOption } from '../theme/ng-select/option.interface';
import { userLoginStateEnum } from '../store/authentication/authentication.reducer';

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  public isLoginWithMobileSubmited$: Observable<boolean>;
  @ViewChild('emailVerifyModal') public emailVerifyModal: ModalDirective;
  public isLoginWithEmailSubmited$: Observable<boolean>;
  @ViewChild('mobileVerifyModal') public mobileVerifyModal: ModalDirective;
  @ViewChild('twoWayAuthModal') public twoWayAuthModal: ModalDirective;
  public isSubmited: boolean = false;
  public mobileVerifyForm: FormGroup;
  public emailVerifyForm: FormGroup;
  public twoWayOthForm: FormGroup;
  public isVerifyMobileInProcess$: Observable<boolean>;
  public isLoginWithMobileInProcess$: Observable<boolean>;
  public isVerifyEmailInProcess$: Observable<boolean>;
  public isLoginWithEmailInProcess$: Observable<boolean>;
  public isSocialLogoutAttempted$: Observable<boolean>;
  public userLoginState$: Observable<userLoginStateEnum>;
  public userDetails$: Observable<VerifyEmailResponseModel>;
  public isTwoWayAuthInProcess$: Observable<boolean>;
  public isTwoWayAuthInSuccess$: Observable<boolean>;
  public countryCodeList: IOption[] = [];
  public selectedCountry: string;
  private imageURL: string;
  private email: string;
  private name: string;
  private token: string;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  // tslint:disable-next-line:no-empty
  constructor(private _fb: FormBuilder,
              private store: Store<AppState>,
              private router: Router,
              private loginAction: LoginActions,
              private authService: AuthService,
              private _toaster: ToasterService,
              private zone: NgZone) {
    this.isLoginWithEmailInProcess$ = store.select(state => {
      return state.login.isLoginWithEmailInProcess;
    }).takeUntil(this.destroyed$);
    this.isVerifyEmailInProcess$ = store.select(state => {
      return state.login.isVerifyEmailInProcess;
    }).takeUntil(this.destroyed$);
    this.isLoginWithMobileInProcess$ = store.select(state => {
      return state.login.isLoginWithMobileInProcess;
    }).takeUntil(this.destroyed$);
    this.isVerifyMobileInProcess$ = store.select(state => {
      return state.login.isVerifyMobileInProcess;
    }).takeUntil(this.destroyed$);

    this.isLoginWithMobileSubmited$ = store.select(state => {
      return state.login.isLoginWithMobileSubmited;
    }).takeUntil(this.destroyed$);
    this.isLoginWithEmailSubmited$ = store.select(state => {
      return state.login.isLoginWithEmailSubmited;
    }).takeUntil(this.destroyed$);
    store.select(state => {
      return state.login.isVerifyEmailSuccess;
    }).takeUntil(this.destroyed$).subscribe((value) => {
      if (value) {
        // this.router.navigate(['home']);
      }
    });
    store.select(state => {
      return state.login.isVerifyMobileSuccess;
    }).takeUntil(this.destroyed$).subscribe((value) => {
      if (value) {
        // this.router.navigate(['home']);
      }
    });
    this.isSocialLogoutAttempted$ = this.store.select(p => p.login.isSocialLogoutAttempted).takeUntil(this.destroyed$);

    contriesWithCodes.map(c => {
      this.countryCodeList.push({value: c.countryName, label: c.value});
    });
    this.userLoginState$ = this.store.select(p => p.session.userLoginState);
    this.userDetails$ = this.store.select(p => p.session.user);
    this.isTwoWayAuthInProcess$ = this.store.select(p => p.login.isTwoWayAuthInProcess);
    this.isTwoWayAuthInSuccess$ = this.store.select(p => p.login.isTwoWayAuthSuccess);
  }

  // tslint:disable-next-line:no-empty
  public ngOnInit() {
    this.mobileVerifyForm = this._fb.group({
      country: ['India', [Validators.required]],
      mobileNumber: ['', [Validators.required]],
      otp: ['', [Validators.required]],
    });

    this.emailVerifyForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]],
      token: ['', Validators.required]
    });
    this.twoWayOthForm = this._fb.group({
      otp: ['', [Validators.required]]
    });
    this.setCountryCode({value: 'India'});

    // get user object when google auth is complete
    if (!Configuration.isElectron) {
      this.authService.authState.takeUntil(this.destroyed$).subscribe((user: SocialUser) => {
        this.isSocialLogoutAttempted$.subscribe((res) => {
          if (!res && user) {
            switch (user.provider) {
              case 'GOOGLE': {
                this.store.dispatch(this.loginAction.signupWithGoogle(user.token));
                break;
              }
              case 'LINKEDIN': {
                let obj: LinkedInRequestModel = new LinkedInRequestModel();
                obj.email = user.email;
                obj.token = user.token;
                this.store.dispatch(this.loginAction.signupWithLinkedin(obj));
                break;
              }
              default: {
                // do something
                break;
              }
            }
          }
        });
      });
    }

    //  get login state and check if twoWayAuth is needed
    this.userLoginState$.subscribe(status => {
      if (status === userLoginStateEnum.needTwoWayAuth) {
        this.showTwoWayAuthModal();
      }
    });
    // check if two way auth is successfully done
    this.isTwoWayAuthInSuccess$.subscribe(a => {
      if (a) {
        this.hideTowWayAuthModal();
        this.store.dispatch(this.loginAction.resetTwoWayAuthModal());
      }
    });
  }

  public showEmailModal() {
    this.emailVerifyModal.show();
    this.emailVerifyModal.onShow.takeUntil(this.destroyed$).subscribe(() => {
      this.isSubmited = false;
    });
  }

  public LoginWithEmail(email: string) {
    this.store.dispatch(this.loginAction.SignupWithEmailRequest(email));
  }

  public VerifyEmail(email: string, code: string) {
    let data = new VerifyEmailModel();
    data.email = email;
    data.verificationCode = code;
    this.store.dispatch(this.loginAction.VerifyEmailRequest(data));
  }

  public VerifyCode(mobile: string, code: string) {
    let data = new VerifyMobileModel();
    data.countryCode = Number(this.selectedCountry);
    data.mobileNumber = mobile;
    data.oneTimePassword = code;
    this.store.dispatch(this.loginAction.VerifyMobileRequest(data));
  }

  public verifyTwoWayCode() {
    let user: VerifyEmailResponseModel;
    this.userDetails$.take(1).subscribe(p => user = p);
    let data = new VerifyMobileModel();
    data.countryCode = Number(user.countryCode);
    data.mobileNumber = user.contactNumber;
    data.oneTimePassword = this.twoWayOthForm.value.otp;
    this.store.dispatch(this.loginAction.VerifyTwoWayAuthRequest(data));
  }

  public hideEmailModal() {
    this.emailVerifyModal.hide();
    this.store.dispatch(this.loginAction.ResetSignupWithEmailState());
    this.emailVerifyForm.reset();
  }

  public showMobileModal() {
    this.mobileVerifyModal.show();
  }

  public hideMobileModal() {
    this.mobileVerifyModal.hide();
    this.store.dispatch(this.loginAction.ResetSignupWithMobileState());
    this.mobileVerifyForm.get('mobileNumber').reset();
  }

  public showTwoWayAuthModal() {
    this.twoWayAuthModal.show();
  }

  public hideTowWayAuthModal() {
    this.twoWayAuthModal.hide();
  }

  // tslint:disable-next-line:no-empty
  public getOtp(mobileNumber: string, code: string) {
    let data: SignupWithMobile = new SignupWithMobile();
    data.mobileNumber = mobileNumber;
    data.countryCode = Number(this.selectedCountry);
    this.store.dispatch(this.loginAction.SignupWithMobileRequest(data));
  }

  /**
   * Getting data from browser's local storage
   */
  public getData() {
    this.token = localStorage.getItem('token');
    this.imageURL = localStorage.getItem('image');
    this.name = localStorage.getItem('name');
    this.email = localStorage.getItem('email');
  }

  public async signInWithProviders(provider: string) {
    if (Configuration.isElectron) {

      // electronOauth2
      let electronOauth2 = (window as any).require('electron-oauth');

      let config = {};
      let bodyParams = {};
      if (provider === 'google') {
        // google
        config = GoogleLoginElectronConfig;
        bodyParams = AdditionalGoogleLoginParams;
      } else {
        // linked in
        config = LinkedinLoginElectronConfig;
        bodyParams = AdditionalLinkedinLoginParams;
      }
      try {
        const myApiOauth = electronOauth2(config, {
          alwaysOnTop: true,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            devTools: true,
            partition: 'oauth2'
          }
        });
        let token = await myApiOauth.getAccessToken(bodyParams);
        let options: RequestOptionsArgs = {};

        options.headers = new Headers();
        options.headers.append('Access-Token', token.access_token);

        if (provider === 'google') {
          // google
          this.store.dispatch(this.loginAction.GoogleElectronLogin(options));
        } else {
          // linked in
          this.store.dispatch(this.loginAction.LinkedInElectronLogin(options));
        }
      } catch (e) {
        //
      }
    } else {
      //  web social authentication
      this.store.dispatch(this.loginAction.resetSocialLogoutAttempt());
      if (provider === 'google') {
        this.authService.signIn(GoogleLoginProvider.PROVIDER_ID);
      } else if (provider === 'linkedin') {
        this.authService.signIn(LinkedinLoginProvider.PROVIDER_ID);
      }
    }
  }

  public ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  /**
   * setCountryCode
   */
  public setCountryCode(event) {
    if (event.value) {
      let country = this.countryCodeList.filter((obj) => obj.value === event.value);
      this.selectedCountry = country[0].label;
    }
  }
}
