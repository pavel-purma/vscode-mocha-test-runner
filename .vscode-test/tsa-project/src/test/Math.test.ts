import * as Mocha from 'mocha';
import { expect } from 'chai';
import { Math } from '../Math';

describe('Math', () => {
    it('Success', () => {
        var math = new Math();
        expect(math.sum(1, 2)).to.equal(3);
    });

    it('Fail', () => {
        var math = new Math();
        expect(math.sum(1, 2)).to.equal(0);
    });
}); 