import * as React from 'react';

export class Foo extends React.Component { 
    render() { 
        return (
            <div className="baz">{this.props.bar}</div>
        )
    }
}
