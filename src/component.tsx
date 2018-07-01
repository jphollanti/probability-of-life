
import * as React from 'react';

export interface Props {
  amountOfStars: number;
  onChange: (amountOfStars:number) => void;
}
  
function App({ amountOfStars = 1, onChange }: Props) {
  return (
    <div className="hello">
      <div className="greeting">
        {amountOfStars} stars in the milkyway
      </div>
      <div>
        <button onClick={() => onChange(200)}>on change</button>
      </div>
    </div>
  );
}

export default App;