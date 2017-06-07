import * as Mocha from 'mocha';
import { expect } from 'chai';
import Nightmare = require('nightmare');



describe('test duckduckgo search results', function () {
    this.timeout(15000);

    it('should find the nightmare github link first', function () {
        return new Promise((resolve, reject) => {
            var nightmare: Nightmare = new Nightmare();
            nightmare
                .goto('https://duckduckgo.com')
                .type('#search_form_input_homepage', 'github nightmare')
                .click('#search_button_homepage')
                .wait('#zero_click_wrapper .c-info__title a')
                .evaluate(function () {
                    const a = document.querySelector('#zero_click_wrapper .c-info__title a') as HTMLAnchorElement;
                    return a.href;
                })
                .end()
                .then(function (link: any) {
                    expect(link).to.equal('https://github.com/segmentio/nightmare');
                    resolve();
                }, function (err: any) {
                    reject(err);
                });
        });
    });
});

