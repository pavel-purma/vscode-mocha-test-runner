import * as React from 'react';

export interface FooProps { 
    bar: string;
}
export class Foo extends React.Component<FooProps, void> { 
    render() { 
        return (
            <div className="baz">{this.props.bar}</div>
        )
    }
}

