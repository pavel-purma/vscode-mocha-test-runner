"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var Nightmare = require("nightmare");
describe('test duckduckgo search results', function () {
    this.timeout(15000);
    it('should find the nightmare github link first', function () {
        return new Promise(function (resolve, reject) {
            var nightmare = new Nightmare();
            nightmare
                .goto('https://duckduckgo.com')
                .type('#search_form_input_homepage', 'github nightmare')
                .click('#search_button_homepage')
                .wait('#zero_click_wrapper .c-info__title a')
                .evaluate(function () {
                var a = document.querySelector('#zero_click_wrapper .c-info__title a');
                return a.href;
            })
                .end()
                .then(function (link) {
                chai_1.expect(link).to.equal('https://github.com/segmentio/nightmare');
                resolve();
            }, function (err) {
                reject(err);
            });
        });
    });
});
//# sourceMappingURL=Units.test.js.map