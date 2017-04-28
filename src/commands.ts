import * as vscode from 'vscode';
import * as path from 'path';
import * as diff from 'diff';
import { TestCodeLensBase } from "./TestsCodeLensProvider";
import { getFileSelector, FileTestStates, TestState, TestStates, TestsResults, getDocumentSelector } from "./Utils";
import { runTests } from "./TestRunner";
import { codeLensProvider, outputChannel } from "./extension";
import { config } from "./config";
import { AssertionError } from "assert";

export function commandRunTests(codeLens: TestCodeLensBase) {
    if (codeLens.state === 'Running') {
        return;
    }
    outputChannel.clear();

    if (codeLens.document.isDirty) {
        codeLens.document.save();
    }

    console.log('run-test: ' + JSON.stringify(codeLens.selectors));

    const selector = getDocumentSelector(codeLens.document);

    updateTestStates(selector, codeLens.selectors);

    runTests(codeLens.grep)
        .then(results => updateTestStates(selector, codeLens.selectors, results));
}

export function commandRunAllTests() {
    outputChannel.clear();

    runTests()
        .then(results => {
            const states: FileTestStates = {};
            const doUpdateFail = (files: { [file: string]: { selector: string, err: any }[] }) => {
                const keys = Object.keys(files);
                for (let i = 0; i < keys.length; ++i) {
                    const file = keys[i];
                    const selector = getFileSelector(file);
                    let fileStates = states[file];
                    if (!fileStates) {
                        fileStates = {};
                        states[file] = fileStates;
                    }

                    const tests = files[file];
                    for (var j = 0; j < tests.length; ++j) {
                        fileStates[tests[j].selector] = 'Fail';
                        appendFailToOutputChannel(j + 1, tests[j]);
                    }
                }
            };

            const doUpdateSuccess = (files: { [file: string]: string[] }) => {
                const keys = Object.keys(files);
                for (let i = 0; i < keys.length; ++i) {
                    const file = keys[i];
                    const selector = getFileSelector(file);
                    let fileStates = states[file];
                    if (!fileStates) {
                        fileStates = {};
                        states[file] = fileStates;
                    }

                    const tests = files[file];
                    for (var j = 0; j < tests.length; ++j) {
                        fileStates[tests[j]] = 'Success';
                    }
                }
            };

            doUpdateFail(results.fail);
            doUpdateSuccess(results.success);
            codeLensProvider.updateFileTestStates(states)
        });
}

function updateTestStates(fileSelector: string, selectors: string[], results?: TestsResults) {
    const states: TestStates = {};

    const doUpdate = (state: TestState, selectors: string[]) => {
        if (!selectors) {
            return;
        }

        for (var i = 0; i < selectors.length; ++i) {
            states[selectors[i]] = state;
        }
    };

    if (results) {
        doUpdate('Inconclusive', selectors);
        if (results.fail) {
            const fail = results.fail[fileSelector];
            if (fail) {
                doUpdate('Fail', fail.map(o => o.selector));
                for (let i = 0; i < fail.length; ++i) {
                    appendFailToOutputChannel(i + 1, fail[i]);
                }
            }
        }
        results.success && doUpdate('Success', results.success[fileSelector]);
    } else {
        doUpdate('Running', selectors);
    }

    codeLensProvider.updateTestStates(fileSelector, states);
}

function appendFailToOutputChannel(index: number, item: { selector: string, err: any }) {
    outputChannel.appendLine('  ' + index + ') ' + item.selector + ':');
    outputChannel.appendLine('');

    // if (item.err instanceof AssertionError) { // this is not working ...
    if (item.err.stack && item.err.stack.substr(0, 'AssertionError'.length) === 'AssertionError') {
        outputChannel.appendLine('    AssertionError:' + item.err.message);
        if (item.err.hasOwnProperty('actual') || item.err.hasOwnProperty('expected')) {
            outputChannel.appendLine(unifiedDiff(item.err, true));
        }
        outputChannel.appendLine('');
        const endl = item.err.stack.indexOf('\n') + 1;
        outputChannel.appendLine(item.err.stack.substr(endl));
    } else {
        outputChannel.appendLine('    Error:' + item.err.message);
    }
    outputChannel.appendLine('');
}

function unifiedDiff(err, escape) {
    var indent = '      ';
    function cleanUp(line) {
        if (escape) {
            line = escapeInvisibles(line);
        }
        if (line[0] === '+') {
            return indent + colorLines('diff added', line);
        }
        if (line[0] === '-') {
            return indent + colorLines('diff removed', line);
        }
        if (line.match(/@@/)) {
            return null;
        }
        if (line.match(/\\ No newline/)) {
            return null;
        }
        return indent + line;
    }
    function notBlank(line) {
        return typeof line !== 'undefined' && line !== null;
    }
    var msg = diff.createPatch('string', err.actual, err.expected, undefined, undefined);
    var lines = msg.split('\n').splice(4);
    return '\n      ' +
        colorLines('diff added', '+ expected') + ' ' +
        colorLines('diff removed', '- actual') +
        '\n\n' +
        lines.map(cleanUp).filter(notBlank).join('\n');
}

function escapeInvisibles(line) {
    return line.replace(/\t/g, '<tab>')
        .replace(/\r/g, '<CR>')
        .replace(/\n/g, '<LF>\n');
}

function colorLines(name, str) {
    return str.split('\n').map(function (str) {
        return color(name, str);
    }).join('\n');
}

function color(type, str) {
    var colors = {
        pass: 90,
        fail: 31,
        'bright pass': 92,
        'bright fail': 91,
        'bright yellow': 93,
        pending: 36,
        suite: 0,
        'error title': 0,
        'error message': 31,
        'error stack': 90,
        checkmark: 32,
        fast: 90,
        medium: 33,
        slow: 31,
        green: 32,
        light: 90,
        'diff gutter': 90,
        'diff added': 32,
        'diff removed': 31
    };
    return '\u001b[' + colors[type] + 'm' + str + '\u001b[0m';
}