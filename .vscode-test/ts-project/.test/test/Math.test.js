"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Math_1 = require("../src/Math");
describe('Math', function () {
    it('Success', function () {
        var math = new Math_1.Math();
        chai_1.expect(math.sum(1, 2)).to.equal(3);
    });
    it('Fail', function () {
        var math = new Math_1.Math();
        chai_1.expect(math.sum(1, 2)).to.equal(0);
    });
});
//# sourceMappingURL=Math.test.js.map