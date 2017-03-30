import * as React from 'react';
import * as Mocha from 'mocha';
import { expect } from 'chai';
import { Foo, FooProps } from '../src/Foo';

describe('Foo', function (){
    it('Success', function () {
        expect(Foo.name).to.equal('Foo');
    });

    it('Fail', function () {
        const component = <Foo bar="baz" />;        
        expect(component.props.bar).to.equal('bar');
    });
}); 