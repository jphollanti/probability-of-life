import * as React from 'react';
import * as ReactDOM from 'react-dom';
import registerServiceWorker from './registerServiceWorker';
import { createStore } from 'redux';
import { amountOfStarsReducer } from './reducers';
import StarsController from './controller-stars';
import { Provider } from 'react-redux';

const store = createStore(amountOfStarsReducer, {
  amountOfStars: 100
});

ReactDOM.render(
  <Provider store={store}>
    <StarsController />
  </Provider>,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
