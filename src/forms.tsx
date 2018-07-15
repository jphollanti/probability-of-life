import * as React from 'react';

export class Question extends React.Component<any, any> {
    constructor(props:any) {
        super(props)
        this.state = { 
            question: this.props.question,
            min: this.props.min,
            max: this.props.max, 
            unit: this.props.unit,
            onChange: this.props.onChange,
            currentValue: this.props.currentValue
        }
    }

    public handleChange(e: React.FormEvent<HTMLInputElement>) {
        this.state.onChange(e.currentTarget.value)
    }

    public render() {
        return (
            <div className="section">
                <div className="question">
                    { this.state.question }
                </div>
                <div className="answer">
                    between { this.state.min } - { this.state.max }
                    <input type="text" className="answer"  onChange={(e) => this.handleChange(e) } />
                    current value: { this.state.currentValue }
                </div>
                <div className="unit">
                    { this.state.unit }
                </div>
            </div>
        );
    }
}