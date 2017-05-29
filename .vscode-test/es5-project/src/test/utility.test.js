const Mocha = require('mocha');
const expect = require('chai').expect;
const utils = require('../utility');

describe('Utility', function() {
    it('Success', function(done) {
        this.timeout(11000);
        setTimeout(function() {
            expect(utils.add(1, 2)).to.equal(3);
            done();
        }, 1000);
    });

    it('Fail', function() {
        console.log('tu');
        expect(utils.add(1, 2)).to.equal(0);
    });

    describe('nested', function() {
        it('nested Success', function() {
            expect(utils.add(1, 2)).to.equal(3);
        });

        it('nested Fail', function() {
            expect(utils.add(1, 2)).to.equal(0);
        });

        describe('double nested', function() {
            it('double nested Success', function() {
                expect(utils.add(1, 2)).to.equal(3);
            });

            it('double nested Fail', function() {
                expect(utils.add(1, 2)).to.equal(0);
            });

        });
    });
});