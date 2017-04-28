const Mocha = require('mocha');
const expect = require('chai').expect;
const utils = require('../src/utility');

describe('Utility', function () {
    it('Success', function () {
        expect(utils.add(1, 2)).to.equal(3);
    });
    
    it('Fail', function () {
        expect(utils.add(1, 2)).to.equal(0);
    });
 
    describe('nested', function () {
        it('nested Success', function () {
            expect(utils.add(1, 2)).to.equal(3);
        });
        
        it('nested Fail', function () {
            expect(utils.add(1, 2)).to.equal(0);
        });

        describe('double nested', function () {
            it('double nested Success', function () {
                expect(utils.add(1, 2)).to.equal(3);
            });

            it('double nested Fail', function () {
                expect(utils.add(1, 2)).to.equal(0);
            });

        });
    });
}); 