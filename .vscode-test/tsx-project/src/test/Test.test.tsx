import * as React from 'react';
import { createRenderer } from 'react-test-renderer/shallow';
import expect = require('expect');
import expectJSX = require('expect-jsx');
expect.extend(expectJSX.default);


import { Test, TestProps, Button, ButtonProps } from '../Test';

describe('Test', function () {

    it('Success', function () {
        const props: TestProps = {
            value: 42
        };

        var renderer = createRenderer();
        renderer.render(<Test {...props} />);
        const actual = renderer.getRenderOutput();
        const expected = <Button onClick={() => { }} value={42} />;

        expect(actual).toEqualJSX(expected);
    });

    it('Fail', function () {
        const props: TestProps = {
            value: 73
        };

        var renderer = createRenderer();
        renderer.render(<Test {...props} />);
        const actual = renderer.getRenderOutput();
        const expected = <Button onClick={() => { }} value={42} />;

        expect(actual).toEqualJSX(expected);
    });
});