import { Question } from './forms'

export interface Props {
  amountOfStars: number;
  onChange: (amountOfStars:number) => void;
}

export default class Question1 extends Question {
  constructor({ amountOfStars = 1, onChange }: Props) {
    super({
      question: "It is estimated that in the Milkyway, there is 100 - 500 billion stars. What is your estimate?",
      min: 100,
      max: 500, 
      unit: "billion",
      onChange,
      currentValue: amountOfStars
    })
  }
  
  public componentWillReceiveProps(newProps: Props, oldProps: Props) {
    this.setState({ ...this.state, currentValue: newProps.amountOfStars })
  }
}
