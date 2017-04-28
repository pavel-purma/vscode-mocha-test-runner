const Mocha = require('mocha');
const expect = require('chai').expect;

describe('main block', function () {
    it('inconclusive', function () {
        // this test was not yet executed in current session
    });

    it('running', function (done) {
        // this test is currently executing ...
        this.timeout(10000);

        setTimeout(() => done(), 5000);
    });

    it('success', function () {
        expect(1).to.equal(1);
    });

    it('fail', function () {
        expect(1).to.equal(0);
    });
});