/// <reference path="typings/typings.d.ts" />
import * as React from 'react';
import { expect, assert } from 'chai'
import * as chai from 'chai';
import { shallow, ShallowWrapper } from 'enzyme';

chai.use((_chai: any, utils: any) => {
    var Assertion = _chai.Assertion;
    utils.addMethod(_chai.Assertion.prototype, 'equalJsx', function (expected: React.ReactElement<any>) {
        const actualString = ReactElementHelper.toString(this._obj.instance().render());
        const expectedString = ReactElementHelper.toString(expected);
        expect(actualString).to.be.equal(expectedString);
    });
});

module ReactElementHelper {
    export function toString(element: React.ReactElement<any>) {
        if (!element) {
            return '--NULL--';
        }

        var name = showName(element);
        var props = showProps(element);
        var children = showChildren(element);
        var hasChildren = children.length > 0;

        if (hasChildren) {
            return '<' + name + props + '>' + children + '</' + name + '>';
        }
        return '<' + name + props + ' />';
    }

    function showName(element: any) {
        var type = element.type;
        if (type.displayName) return type.displayName;
        if (type.name) return type.name;
        if (typeof type == 'string') return type;
        return 'Unknown';
    }

    function showProps(element: any) {
        var keys = Object.keys(element.props || {});
        keys.sort();
        return keys.map(function (prop) {
            var val = element.props[prop];

            if (prop == 'children') {
                return '';
            }

            if (isDefaultProp(element, prop, val)) {
                return '';
            }

            if (typeof val == 'string') {
                return ' ' + prop + '=' + JSON.stringify(val);
            }

            if (React.isValidElement(val)) {
                val = toString(val);
            }

            if (typeof val == 'object') {
                val = stringify(val);
            }

            if (typeof val == 'function') {
                val = ('function') + '()';
            }

            if (val === undefined) {
                return '';
            }

            return ' ' + prop + '={' + val + '}';
        }).join('');
    }

    function showChildren(element: any) {
        var children = element.props.children;
        if (!children) return '';

        // Currently we support React 0.13, where React.Children.map returns an
        // opaque data structure rather than an array. So we build one via forEach.
        var shownChildren: any[] = [];
        React.Children.forEach(children, function (child) {
            shownChildren.push(showChild(child));
        });
        var content = shownChildren.filter(Boolean).join("\n");

        return "\n" + indentString(content, ' ', 2) + "\n";
    }

    function showChild(element: any) {
        if (React.isValidElement(element)) {
            return toString(element);
        }

        if (element == null || element === false) {
            return '';
        }

        return String(element);
    }

    function isDefaultProp(element: any, prop: any, value: any) {
        if (!element.type.defaultProps) {
            return false;
        }

        return element.type.defaultProps[prop] === value;
    }

    function indentString(str: string, indent: string, count: number) {
        if (count === 0) {
            return str;
        }

        indent = count > 1 ? repeating(indent, count) : indent;

        return str.replace(/^(?!\s*$)/mg, indent);
    };

    function repeating(str: string, n: number) {
        var ret = '';
        do {
            if (n & 1) {
                ret += str;
            }

            str += str;
        } while ((n >>= 1));

        return ret;
    }

    function stringify(obj:any, options?:any) {
        options = options || {}
        var indent = JSON.stringify([1], null, get(options, 'indent', 2)).slice(2, -3)
        var maxLength = (indent === '' ? Infinity : get(options, 'maxLength', 80))

        return (function _stringify(obj, currentIndent, reserved):string {
            if (obj && typeof obj.toJSON === 'function') {
                obj = obj.toJSON()
            }

            var string = JSON.stringify(obj)

            if (string === undefined) {
                return string
            }

            var length = maxLength - currentIndent.length - reserved

            if (string.length <= length) {
                var prettified = prettify(string)
                if (prettified.length <= length) {
                    return prettified
                }
            }

            if (typeof obj === 'object' && obj !== null) {
                var nextIndent = currentIndent + indent
                var items:string[] = []
                var delimiters
                var comma = function (array:any[], index:number) {
                    return (index === array.length - 1 ? 0 : 1)
                }

                if (Array.isArray(obj)) {
                    for (var index = 0; index < obj.length; index++) {
                        items.push(
                            _stringify(obj[index], nextIndent, comma(obj, index)) || 'null'
                        )
                    }
                    delimiters = '[]'
                } else {
                    Object.keys(obj).forEach(function (key, index, array) {
                        var keyPart = JSON.stringify(key) + ': '
                        var value = _stringify(obj[key], nextIndent,
                            keyPart.length + comma(array, index))
                        if (value !== undefined) {
                            items.push(keyPart + value)
                        }
                    })
                    delimiters = '{}'
                }

                if (items.length > 0) {
                    return [
                        delimiters[0],
                        indent + items.join(',\n' + nextIndent),
                        delimiters[1]
                    ].join('\n' + currentIndent)
                }
            }

            return string
        }(obj, '', 0))
    }

    // Note: This regex matches even invalid JSON strings, but since we’re
    // working on the output of `JSON.stringify` we know that only valid strings
    // are present (unless the user supplied a weird `options.indent` but in
    // that case we don’t care since the output would be invalid anyway).
    var stringOrChar = /("(?:[^"]|\\.)*")|[:,]/g

    function prettify(string: string) {
        return string.replace(stringOrChar, function (match, string) {
            return string ? match : match + ' '
        })
    }

    function get(options: any, name: string, defaultValue: any) {
        return (name in options ? options[name] : defaultValue)
    }
}
