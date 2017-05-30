import * as React from 'react';

export interface TestProps { value: number; }
export interface TestState { value: number; }
export class Test extends React.Component<TestProps, TestState>{
    constructor(props: TestProps) {
        super(props);
        this.state = {
            value: props.value
        };
    }

    render() {
        const { value } = this.state;
        return <Button onClick={() => this.setState({ value: this.state.value + 1 })} value={value} />;
    }
}

export interface ButtonProps { onClick: () => void; value: number }
export function Button({ onClick, value }: ButtonProps) { 
    // test are using react-test-renderer/shallow so this will not be called in test run ...
    return <button onClick={() => onClick}>{value}</button>;
}