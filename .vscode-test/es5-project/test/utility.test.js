const Mocha = require('mocha');
const expect = require('chai').expect;
const utils = require('../src/utility');

//describe('commented out', function () {
//    it('test', function () {
//    });
//});

/*    
    describe('commented out', function () {
        it('test', function () {
        });
    });
*/

/* comment */ describe('comments #1', function () {
    it('test', function () {
    });
});

describe(/* comment */ 'comments #2', function () {
    it('test', function () {
    });
});

describe('comments #3' /* comment */, function () {
    it('test', function () {
    });
});

describe('multi line #1',
    function () {
        it('test', function () {
        });
    }
);

describe(
    'multi line #2',
    function () {
        it('test', function () {
        });
    }
);

describe('multi line #3', // comment
    function () {  // comment
        it('test', function () {
        });
    }
);

describe( // comment
    'multi line #4', // comment
    function () {
        it('test', function () {
        });
    }
);

describe('same name', function () {
    it('test #1', function () {
    });
});

describe('same name', function () {
    it('test #2', function () {
    });
});



describe('Utility', function () {
    it('Success', function () {
        expect(utils.add(1, 2)).to.equal(3);
    });

    // nesting is fine ...    
    describe('nested', function () {
        it('nested Success', function () {
            expect(utils.add(1, 2)).to.equal(3);
        });

        describe('double nested', function () {
            it('double nested Success', function () {
                expect(utils.add(1, 2)).to.equal(3);
            });

            it('double nested Fail', function () {
                expect(utils.add(1, 2)).to.equal(0);
            });

        });

        it('nested Fail', function () {
            expect(utils.add(1, 2)).to.equal(0);
        });
    });

    it('Fail', function () {
        expect(utils.add(1, 2)).to.equal(0);
    });
}); 