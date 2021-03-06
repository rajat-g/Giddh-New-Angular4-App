import { take, takeUntil } from 'rxjs/operators';
import { LoginActions } from '../actions/login.action';
import { AppState } from '../store';
import { Router } from '@angular/router';
import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalDirective } from 'ngx-bootstrap';
import { Configuration } from '../app.constant';
import { Store } from '@ngrx/store';
import { Observable, ReplaySubject } from 'rxjs';
import { LinkedInRequestModel, SignupWithMobile, VerifyEmailModel, VerifyEmailResponseModel, VerifyMobileModel } from '../models/api-models/loginModels';
import { AuthService, GoogleLoginProvider, LinkedinLoginProvider, SocialUser } from '../theme/ng-social-login-module/index';
import { AdditionalGoogleLoginParams, AdditionalLinkedinLoginParams, GoogleLoginElectronConfig, LinkedinLoginElectronConfig } from '../../mainprocess/main-auth.config';
import { contriesWithCodes } from '../shared/helpers/countryWithCodes';
import { userLoginStateEnum } from '../store/authentication/authentication.reducer';
import { IOption } from '../theme/ng-virtual-select/sh-options.interface';
import { DOCUMENT } from '@angular/platform-browser';
import { ToasterService } from '../services/toaster.service';

@Component({
  selector: 'signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit, OnDestroy {
  public isLoginWithMobileSubmited$: Observable<boolean>;
  @ViewChild('emailVerifyModal') public emailVerifyModal: ModalDirective;
  public isLoginWithEmailSubmited$: Observable<boolean>;
  @ViewChild('mobileVerifyModal') public mobileVerifyModal: ModalDirective;
  @ViewChild('twoWayAuthModal') public twoWayAuthModal: ModalDirective;
  public urlPath: string = '';
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
  public selectedBanner: string = null;
  public loginUsing: string = null;
  public signUpWithPasswdForm: FormGroup;
  public showPwdHint: boolean = false;
  public isSignupWithPasswordInProcess$: Observable<boolean>;
  public signupVerifyForm: FormGroup;
  public isSignupWithPasswordSuccess$: Observable<boolean>;
  public signupVerifyEmail$: Observable<string>;
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
              @Inject(DOCUMENT) private document: Document,
              private _toaster: ToasterService
  ) {
    this.urlPath = isElectron ? '' : AppUrl + APP_FOLDER;
    this.isLoginWithEmailInProcess$ = store.select(state => {
      return state.login.isLoginWithEmailInProcess;
    }).pipe(takeUntil(this.destroyed$));
    this.isVerifyEmailInProcess$ = store.select(state => {
      return state.login.isVerifyEmailInProcess;
    }).pipe(takeUntil(this.destroyed$));
    this.isLoginWithMobileInProcess$ = store.select(state => {
      return state.login.isLoginWithMobileInProcess;
    }).pipe(takeUntil(this.destroyed$));
    this.isVerifyMobileInProcess$ = store.select(state => {
      return state.login.isVerifyMobileInProcess;
    }).pipe(takeUntil(this.destroyed$));

    this.isLoginWithMobileSubmited$ = store.select(state => {
      return state.login.isLoginWithMobileSubmited;
    }).pipe(takeUntil(this.destroyed$));
    this.isLoginWithEmailSubmited$ = store.select(state => {
      return state.login.isLoginWithEmailSubmited;
    }).pipe(takeUntil(this.destroyed$));
    store.select(state => {
      return state.login.isVerifyEmailSuccess;
    }).pipe(takeUntil(this.destroyed$)).subscribe((value) => {
      if (value) {
        // this.router.navigate(['home']);
      }
    });
    store.select(state => {
      return state.login.isVerifyMobileSuccess;
    }).pipe(takeUntil(this.destroyed$)).subscribe((value) => {
      if (value) {
        // this.router.navigate(['home']);
      }
    });
    this.isSignupWithPasswordInProcess$ = store.select(state => {
      return state.login.isSignupWithPasswordInProcess;
    }).pipe(takeUntil(this.destroyed$));

    this.isSignupWithPasswordSuccess$ = store.select(state => {
      return state.login.isSignupWithPasswordSuccess;
    }).pipe(takeUntil(this.destroyed$));

    this.signupVerifyEmail$ = this.store.select(p => p.login.signupVerifyEmail).pipe(takeUntil(this.destroyed$));

    this.isSocialLogoutAttempted$ = this.store.select(p => p.login.isSocialLogoutAttempted).pipe(takeUntil(this.destroyed$));

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
    this.document.body.classList.remove('unresponsive');
    this.generateRandomBanner();
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
    this.signUpWithPasswdForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$^+=!*()@%&]).{8,20}$')]]
    });
    this.signupVerifyForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]],
      verificationCode: ['', Validators.required]
    });
    this.setCountryCode({value: 'India', label: 'India'});

    // get user object when google auth is complete
    if (!Configuration.isElectron) {
      this.authService.authState.pipe(takeUntil(this.destroyed$)).subscribe((user: SocialUser) => {
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

    this.signupVerifyEmail$.subscribe(a => {
      if (a) {
        // console.log(a);
        this.signupVerifyForm.get('email').patchValue(a);
      }
    });
  }

  public showEmailModal() {
    this.emailVerifyModal.show();
    this.emailVerifyModal.onShow.pipe(takeUntil(this.destroyed$)).subscribe(() => {
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
    this.userDetails$.pipe(take(1)).subscribe(p => user = p);
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

  public resetTwoWayAuthModal() {
    this.store.dispatch(this.loginAction.SetLoginStatus(userLoginStateEnum.notLoggedIn));
    this.hideTowWayAuthModal();
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
        if (provider === 'google') {
          // google
          this.store.dispatch(this.loginAction.signupWithGoogle(token.access_token));
        } else {
          // linked in
          this.store.dispatch(this.loginAction.LinkedInElectronLogin(token.access_token));
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
    this.document.body.classList.add('unresponsive');
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  /**
   * setCountryCode
   */
  public setCountryCode(event: IOption) {
    if (event.value) {
      let country = this.countryCodeList.filter((obj) => obj.value === event.value);
      this.selectedCountry = country[0].label;
    }
  }

  /**
   * randomBanner
   */
  public generateRandomBanner() {
    let bannerArr = ['1', '2', '3'];
    let selectedSlide = bannerArr[Math.floor(Math.random() * bannerArr.length)];
    this.selectedBanner = 'slide' + selectedSlide;
  }

  public SignupWithPasswd(model: FormGroup) {
    let ObjToSend = model.value;
    let pattern = /^(?=.*[a-z])(?=.*\d)[A-Za-z\d$@$!%*?&_]{8,20}$/g;
    if (pattern.test(ObjToSend.password)) {
      this.store.dispatch(this.loginAction.SignupWithPasswdRequest(ObjToSend));
    } else {
      return this._toaster.errorToast('Password is weak');
    }
  }

  public validatePwd(value) {
    // let pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$^+=!*()@%&]).{8,20}$/g;
    let pattern = /^(?=.*[a-z])(?=.*\d)[A-Za-z\d$@$!%*?&_]{8,20}$/g;
    if (pattern.test(value)) {
      // this.store.dispatch(this.loginAction.SignupWithPasswdRequest(ObjToSend));
      this.showPwdHint = false;
    } else if (value) {
      return this.showPwdHint = true;
    } else {
      this.showPwdHint = false;
    }
  }
}
