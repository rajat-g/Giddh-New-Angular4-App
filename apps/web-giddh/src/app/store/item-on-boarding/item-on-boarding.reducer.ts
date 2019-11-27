import { CustomActions } from '../customActions';
import { OnBoardingType } from '../../app.constant';
import { ItemOnBoardingActions } from '../../actions/item-on-boarding/item-on-boarding.action';

/**
 * Item on boarding store interface that holds on boarding state
 *
 * @export
 * @interface ItemOnBoarding
 */
export interface ItemOnBoarding {
    isOnBoardingInProgress: boolean;
    onBoardingType: OnBoardingType | null;
}

/**
 * Initial state of item on boarding store
 *
 * @export
 */
export const initialState: ItemOnBoarding = {
    isOnBoardingInProgress: false,
    onBoardingType: null
}

/**
 * Reducer to handle item on boarding related actions
 *
 * @export
 * @param {ItemOnBoarding} [state=initialState] Current state at any instance
 * @param {CustomActions} action Action received from dispatcher
 * @returns
 */
export function itemOnBoardingReducer(state: ItemOnBoarding = initialState, action: CustomActions) {
    switch (action.type) {
        case ItemOnBoardingActions.SET_ON_BOARDING_STATUS:
            return { ...state, isOnBoardingInProgress: action.payload };
        case ItemOnBoardingActions.SET_ON_BOARDING_TYPE:
            return { ...state, onBoardingType: action.payload };
    }
}
