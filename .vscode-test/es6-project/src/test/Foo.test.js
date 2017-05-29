import * as Mocha from 'mocha';
import { expect } from 'chai';
import { Foo } from '../Foo';

describe('Foo', function() {
    it('Success', function() {
        var foo = new Foo('bar');
        expect(foo.func('baz')).to.equal('bar-baz');
    });

    it('Fail', function() {
        var foo = new Foo('bar');
        expect(foo.func('baz')).to.equal('bar+baz');
    });
});