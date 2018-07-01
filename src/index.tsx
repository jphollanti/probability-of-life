import * as React from 'react';
import * as ReactDOM from 'react-dom';
import registerServiceWorker from './registerServiceWorker';
import { createStore } from 'redux';
import { amountOfStarsReducer } from './reducers';
import Controller from './controller';
import { Provider } from 'react-redux';

const store = createStore(amountOfStarsReducer, {
  amountOfStars: 100
});

ReactDOM.render(
  <Provider store={store}>
    <Controller />
  </Provider>,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
