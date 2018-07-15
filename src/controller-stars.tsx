import * as actions from './actions';
import { AppState } from './types';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import StarsComponent from './component-stars';

export function mapStateToProps({ amountOfStars }: AppState) {
  console.log('passing on amount of stars', amountOfStars)
  return {
    amountOfStars
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.UpdateAmountOfStarsAction>) {
  return {
    onChange: (amountOfStars:number) => {
      console.log('update amount of stars', amountOfStars)
      dispatch(actions.updateAmountOfStars(amountOfStars))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(StarsComponent);