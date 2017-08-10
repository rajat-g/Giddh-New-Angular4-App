import { BaseResponse } from './../../models/api-models/BaseResponse';
import { TaxResponse } from './../../models/api-models/Company';
import { CompanyActions } from './../../services/actions/company.actions';
import { Action, ActionReducer } from '@ngrx/store';
import { ComapnyResponse, CompanyRequest } from '../../models/api-models/Company';
import * as _ from 'lodash';
/**
 * Keeping Track of the CompanyState
 */
export interface CurrentCompanyState {
  companies?: ComapnyResponse[];
  activeCompany?: ComapnyResponse;
  isRefreshing: boolean;
  taxes: TaxResponse[];
  isCompanyCreationInProcess: boolean;
  isCompanyCreated: boolean;
  isTaxesLoading: boolean;
}

/**
 * Setting the InitialState for this Reducer's Store
 */
const initialState: CurrentCompanyState = {
  companies: null,
  isRefreshing: false,
  taxes: null,
  isTaxesLoading: false,
  isCompanyCreationInProcess: false,
  isCompanyCreated: false
};

export const CompanyReducer: ActionReducer<CurrentCompanyState> = (state: CurrentCompanyState = initialState, action: Action) => {

  switch (action.type) {
    case CompanyActions.CREATE_COMPANY:
      return Object.assign({}, state, { isCompanyCreationInProcess: true });
    case CompanyActions.RESET_CREATE_COMPANY_FLAG:
      return Object.assign({}, state, { isCompanyCreated: false, isCompanyCreationInProcess: false });
    case CompanyActions.CREATE_COMPANY_RESPONSE:
      let companyResp: BaseResponse<ComapnyResponse, CompanyRequest> = action.payload;
      if (companyResp.status === 'success') {
        let newState = _.cloneDeep(state);
        newState.isCompanyCreationInProcess = false;
        newState.isCompanyCreated = false;
        newState.companies.push(companyResp.body);
        return newState;
      }
      return state;
    case 'CATCH_ERROR':
      console.log(action.payload);
      return;
    case CompanyActions.REFRESH_COMPANIES:
      return Object.assign({}, state, {
        isRefreshing: true,
        isCompanyCreated: false
      });
    case CompanyActions.REFRESH_COMPANIES_RESPONSE:
      let companies: BaseResponse<ComapnyResponse[], string> = action.payload;
      if (companies.status === 'success') {
        return Object.assign({}, state, {
          isRefreshing: false,
          companies: action.payload.body
        });
      }
      return state;
    case CompanyActions.DELETE_COMPANY_RESPONSE:
      let uniqueName: BaseResponse<string, string> = action.payload;
      if (uniqueName.status === 'success') {
        let array = state.companies.filter(cmp => cmp.uniqueName !== uniqueName.body);
        return Object.assign({}, state, {
          companies: array
        });
      }
      return state;
    case CompanyActions.GET_TAX:
      return Object.assign({}, state, {
        isTaxesLoading: true
      });
    case CompanyActions.GET_TAX_RESPONSE:
      let taxes: BaseResponse<TaxResponse[], string> = action.payload;
      if (taxes.status === 'success') {
        return Object.assign({}, state, {
          taxes: taxes.body,
          isTaxesLoading: false
        });
      }
      return Object.assign({}, state, {
        isTaxesLoading: false
      });
    case CompanyActions.SET_ACTIVE_COMPANY:
      console.log(action.payload);
      return state;
    default:
      return state;
  }
};
