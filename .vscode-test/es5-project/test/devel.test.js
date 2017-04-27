const Mocha = require('mocha');
const expect = require('chai').expect;
const utils = require('../src/utility');


describe('block #1', function () {
    it('test', function () {

        console.log('---- im HERE');
        expect(utils.add(1, 2)).to.equal(3);
    });
});

describe('block #2', function () {
    it('test', function () {

        console.log('---- im HERE');
        expect(utils.add(1, 2)).to.equal(3);
    });
});
