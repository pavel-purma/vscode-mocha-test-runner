import * as Mocha from 'mocha';
import { expect } from 'chai';
import { Math } from '../src/Math';

describe('Math', function () {
    it('Success', function () {
        var math = new Math();
        expect(math.sum(1, 2)).to.equal(3);
    });

    it('Fail', function () {
        var math = new Math();
        expect(math.sum(1, 2)).to.equal(0);
    });
}); 