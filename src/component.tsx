
import * as React from 'react';
import { Question } from './forms';

export interface Props {
  amountOfStars: number;
  onChange: (amountOfStars:number) => void;
}
  
function App({ amountOfStars = 1, onChange }: Props) {
  return (
    <div id="app">
      {/* TODO: amountOfStars updates will not propagate to Question (because this is how React
          optimizes DOM updates. Instead, the reducer needs to be directly linked to the Question 
          object, not the "App" object. */}
      <Question question="It is estimated that in the Milkyway, there is 100 - 500 billion stars. What is your estimate?" 
        min="100" max="500" unit="billion" onChange={onChange} currentValue={amountOfStars} />

      <div className="hello">
        <div className="greeting">
          {amountOfStars} stars in the milkyway
        </div>
        <div>
          <button onClick={() => onChange(200)}>on change</button>
        </div>
      </div>
    </div>
  );
}

export default App;