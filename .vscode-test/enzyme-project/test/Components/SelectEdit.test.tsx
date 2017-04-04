import * as React from 'react';
import * as TestUtils from 'react-addons-test-utils';
import * as chai from 'chai'
import * as chaiEnzyme from 'chai-enzyme';
chai.use(chaiEnzyme());
const expect = chai.expect;
import { shallow } from 'enzyme';
import '../TestUtils';

import { Select, SelectProps } from 'Components/SelectEdit';

describe('Select', function () {
    it('Renders options', function () {
        const props: SelectProps = {
            items: [
                { id: '1', name: 'first' },
                { id: '2', name: 'second' },
                { id: '3', name: 'third' },
            ],
            onChanged: () => { }
        };

        const actual = shallow(<Select {...props} />);
        const expected =
            <select onChange={() => { }}>
                <option value="">[prázdný výběr]</option>
                <option value="1">first</option>
                <option value="2">second</option>
                <option value="3">third</option>
            </select>;

        expect(actual).to.equalJsx(expected);
    });

    it('Renders options without default', function () {
        const props: SelectProps = {
            items: [
                { id: '1', name: 'first' },
                { id: '2', name: 'second' },
                { id: '3', name: 'third' },
            ],
            required: true,
            onChanged: () => { }
        };

        const actual = shallow(<Select {...props} />);
        const expected =
            <select onChange={() => { }}>
                <option value="1">first</option>
                <option value="2">second</option>
                <option value="3">third</option>
            </select>;

        expect(actual).to.equalJsx(expected);
    });

    it('Renders optgroups', function () {
        const props: SelectProps = {
            items: [
                { id: '1', name: 'first', group: 'prvni' },
                { id: '2', name: 'second', group: 'prvni' },
                { id: '3', name: 'third', group: 'druhy' },
            ],
            onChanged: () => { }
        };

        const actual = shallow(<Select {...props} />);
        const expected =
            <select onChange={() => { }}>
                <option value="">[prázdný výběr]</option>
                <optgroup label="prvni">
                    <option value="1">first</option>
                    <option value="2">second</option>
                </optgroup>
                <optgroup label="druhy">
                    <option value="3">third</option>
                </optgroup>
            </select>;

        expect(actual).to.equalJsx(expected);
    });

    it('Renders optgroups without default', function () {
        const props: SelectProps = {
            items: [
                { id: '1', name: 'first', group: 'prvni' },
                { id: '2', name: 'second', group: 'prvni' },
                { id: '3', name: 'third', group: 'druhy' },
            ],
            required: true,
            onChanged: () => { }
        };

        const actual = shallow(<Select {...props} />);
        const expected =
            <select onChange={() => { }}>
                <optgroup label="prvni">
                    <option value="1">first</option>
                    <option value="2">second</option>
                </optgroup>
                <optgroup label="druhy">
                    <option value="3">third</option>
                </optgroup>
            </select>;

        expect(actual).to.equalJsx(expected);
    });

    it('Renders selected', function () {
        const props: SelectProps = {
            items: [
                { id: '1', name: 'first' },
                { id: '2', name: 'second' },
                { id: '3', name: 'third' },
            ],
            selectedItemId: '2',
            onChanged: () => { }
        };

        const actual = shallow(<Select {...props} />);
        const expected =
            <select onChange={() => { }} value="2">
                <option value="">[prázdný výběr]</option>
                <option value="1">first</option>
                <option value="2">second</option>
                <option value="3">third</option>
            </select>;

        expect(actual).to.equalJsx(expected);
    });

    it('Renders className', function () {
        const props: SelectProps = {
            items: [],
            className: 'className',
            onChanged: () => { }
        };

        const actual = shallow(<Select {...props} />);
        const expected =
            <select onChange={() => { }} className="className">
                <option value="">[prázdný výběr]</option>
            </select>;

        expect(actual).to.equalJsx(expected);
    });

    it('Renders readOnly', function () {
        const props: SelectProps = {
            items: [],
            readOnly: true,
            onChanged: () => { }
        };

        const actual = shallow(<Select {...props} />);
        const expected =
            <select onChange={() => { }} readOnly={true}>
                <option value="">[prázdný výběr]</option>
            </select>;

        expect(actual).to.equalJsx(expected);
    });

    it('Renders disabled', function () {
        const props: SelectProps = {
            items: [],
            disabled: true,
            onChanged: () => { }
        };

        const actual = shallow(<Select {...props} />);
        const expected =
            <select onChange={() => { }} disabled={true}>
                <option value="">[prázdný výběr]</option>
            </select>;

        expect(actual).to.equalJsx(expected);
    });
});