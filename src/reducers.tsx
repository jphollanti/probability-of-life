import * as actions from './actions';
import { AppState } from './types';

export function amountOfStarsReducer(state: AppState, action: actions.UpdateAmountOfStarsAction): AppState {
  return { ...state, amountOfStars: action.amountOfStars}
}