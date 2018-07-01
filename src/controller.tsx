import * as actions from './actions';
import { AppState } from './types';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import App from './component';

export function mapStateToProps({ amountOfStars }: AppState) {
  return {
    amountOfStars
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.UpdateAmountOfStarsAction>) {
  return {
    onChange: (amountOfStars:number) => dispatch(actions.updateAmountOfStars(amountOfStars)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(App);