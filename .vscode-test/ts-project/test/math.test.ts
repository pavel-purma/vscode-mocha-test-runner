import * as Mocha from 'mocha';
import { expect } from 'chai';
import * as math from '../src/math';

describe('Math', function (){
    it('Success', function () {
        expect(math.sum(1, 2)).to.equal(3);
    });

    describe('nested', function () {
        it('nested Success', function () {
            expect(math.sum(1, 2)).to.equal(3);
        });

        describe('double nested', function () {
            it('double nested Success', function () {
                expect(math.sum(1, 2)).to.equal(3);
            });
            
            it('double nested Fail', function () {
                expect(math.sum(1, 2)).to.equal(0);
            });

        });

        it('nested Fail', function () {
            expect(math.sum(1, 2)).to.equal(0);
        });
    });

    it('Fail', function () {
        expect(math.sum(1, 2)).to.equal(0);
    });
}); 