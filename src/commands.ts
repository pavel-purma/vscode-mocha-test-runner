import * as vscode from 'vscode';
import * as path from 'path';
import * as diff from 'diff';
import * as minimatch from 'minimatch';
import { TestCodeLensBase } from "./TestsCodeLensProvider";
import { getFileSelector, FileTestStates, TestState, TestStates, TestsResults, getDocumentSelector, TestResult, languages } from "./Utils";
import { runTests } from "./TestRunner";
import { codeLensProvider, outputChannel } from "./extension";
import { config } from "./config";

type TestContext = { lines: string[], passing: number, failing: number };

export function commandRunTests(codeLens: TestCodeLensBase) {
    if (codeLens.state === 'Running') {
        return;
    }

    outputChannel.clear();

    if (codeLens.document.isDirty) {
        codeLens.document.save();
    }

    //console.log('run-test: ' + JSON.stringify(codeLens.selectors));
    const selector = getDocumentSelector(codeLens.document);

    const states: TestStates = {};
    for (var i = 0; i < codeLens.selectors.length; ++i) {
        states[codeLens.selectors[i]] = 'Running';
    }
    
    codeLensProvider.updateTestStates(selector, states);

    runTests(codeLens.grep)
        .then(results => {
            const context = {
                lines: [],
                failing: 0,
                passing: 0
            };

            updateTestStates(context, states, selector, results[selector], codeLens.selectors);
            codeLensProvider.updateTestStates(selector, states);

            outputChannel.appendLine(context.passing + ' passing');
            outputChannel.appendLine(context.failing + ' failing');
            outputChannel.appendLine('');

            for (let line of context.lines) {
                outputChannel.appendLine(line);
            }
        });
}

export function commandRunAllTests() {
    outputChannel.clear();

    runTests()
        .then(results => {
            const fileStates: FileTestStates = {};

            const context = {
                lines: [],
                failing: 0,
                passing: 0
            };

            const keys = Object.keys(results);
            for (let selector of keys) {
                let states = fileStates[selector];
                if (!states) {
                    states = {};
                    fileStates[selector] = states;
                }

                updateTestStates(context, states, selector, results[selector]);
            }

            codeLensProvider.updateFileTestStates(fileStates);

            outputChannel.appendLine(context.passing + ' passing');
            outputChannel.appendLine(context.failing + ' failing');
            outputChannel.appendLine('');

            for (let line of context.lines) {
                outputChannel.appendLine(line);
            }
        });
}

export function commandRunFileTests() { 
    outputChannel.clear();
    
    if (!vscode.window.activeTextEditor) { 
        outputChannel.appendLine('run-file-tests: No active editor');
        return;
    }

    const document = vscode.window.activeTextEditor.document;    
    if (!document || languages.findIndex(o => o.language === document.languageId && minimatch(document.fileName, o.pattern, { dot: true })) === -1) { 
        outputChannel.appendLine('run-file-tests: Active document is not valid test file.');
        return;
    }

    if (document.isDirty) {
        document.save();
    }

    const selector = getDocumentSelector(document);

    const states: TestStates = {};
    runTests(undefined, [selector])
        .then(results => {
            const context = {
                lines: [],
                failing: 0,
                passing: 0
            };

            updateTestStates(context, states, selector, results[selector]);
            codeLensProvider.updateTestStates(selector, states);

            outputChannel.appendLine(context.passing + ' passing');
            outputChannel.appendLine(context.failing + ' failing');
            outputChannel.appendLine('');

            for (let line of context.lines) {
                outputChannel.appendLine(line);
            }
        });
}

function updateTestStates(context: TestContext, states: TestStates, fileSelector: string, results: TestResult[], selectors?: string[]) {
    outputChannel.appendLine(fileSelector + ':');

    if (selectors) {
        for (var i = 0; i < selectors.length; ++i) {
            states[selectors[i]] = 'Inconclusive';
        }
    }

    let prev = '';
    for (let i = 0; i < results.length; ++i) {
        const test = results[i];
        const actual = test.selector.slice(0, -1).join(' ');
        if (actual !== prev) {
            prev = actual;
            const title = test.selector.length > 2 ? test.selector[test.selector.length - 2] : test.selector[test.selector.length - 1];
            outputChannel.appendLine(Array(test.selector.length).join('  ') + title);
        }

        if (!test.err) {
            states[test.selector.join(' ')] = 'Success';
            outputChannel.appendLine(Array(test.selector.length + 1).join('  ') + '√  ' + test.selector[test.selector.length - 1]);
            ++context.passing;
        } else {
            states[test.selector.join(' ')] = 'Fail';
            outputChannel.appendLine(Array(test.selector.length + 1).join('  ') + (++context.failing) + ') ' + test.selector[test.selector.length - 1]);
            pushFailInfo(context.lines, context.failing, test);
        }
    }

    outputChannel.appendLine('');
}

function pushFailInfo(lines: string[], index: number, item: TestResult) {
    lines.push('  ' + index + ') ' + item.selector.join(' ') + ':');
    lines.push('');

    // if (item.err instanceof AssertionError) { // this is not working ...
    if (item.err.stack && item.err.stack.substr(0, 'AssertionError'.length) === 'AssertionError') {
        lines.push('    AssertionError: ' + item.err.message);
        if (item.err.hasOwnProperty('actual') || item.err.hasOwnProperty('expected')) {
            lines.push(unifiedDiff(item.err, true));
        }
        const endl = item.err.stack.indexOf('\n') + 1;
        lines.push(item.err.stack.substr(endl));
    } else {
        lines.push('    Error:' + item.err.message);
    }

    lines.push('');
}

function unifiedDiff(err, escape) {
    var indent = '      ';
    function cleanUp(line) {
        if (escape) {
            line = line.replace(/\t/g, '<tab>').replace(/\r/g, '<CR>').replace(/\n/g, '<LF>\n');
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