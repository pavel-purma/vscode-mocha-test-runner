import * as vscode from 'vscode';
import * as path from 'path';
import * as diff from 'diff';
import * as minimatch from 'minimatch';
import { TestCodeLensBase, ItCodeLens } from "./TestsCodeLensProvider";
import { getFileSelector, getDocumentSelector, languages, throwIfNot, appendError } from "./Utils";
import { runTests } from "./TestRunner";
import { codeLensProvider, outputChannel } from "./extension";
import { config } from "./config";
import { TestResult, TestStates, FileTestStates } from "./Types";

type TestContext = { lines: string[], passing: number, failing: number };

export function commandRunTests(codeLens: TestCodeLensBase) {
    throwIfNot('commandRunTests', codeLens, 'codeLens');

    if (codeLens.state === 'Running') {
        return;
    }

    outputChannel.clear();

    if (codeLens.document.isDirty) {
        codeLens.document.save();
    }

    const selector = getDocumentSelector(codeLens.document);

    const states: TestStates = {};
    for (var i = 0; i < codeLens.selectors.length; ++i) {
        states[codeLens.selectors[i]] = 'Running';
    }

    codeLensProvider.updateTestStates(selector, states);

    const debug = codeLens instanceof ItCodeLens && codeLens.debug;
    runTests(debug, codeLens.grep)
        .then(results => {
            const context = {
                lines: [],
                failing: 0,
                passing: 0
            };

            updateTestStates(context, states, selector, results[selector] || [], codeLens.selectors);
            codeLensProvider.updateTestStates(selector, states);

            outputChannel.appendLine(context.passing + ' passing');
            outputChannel.appendLine(context.failing + ' failing');
            outputChannel.appendLine('');

            for (let line of context.lines) {
                outputChannel.appendLine(line);
            }
        })
        .catch(appendError);
}

export function commandRunAllTests() {
    outputChannel.clear();

    runTests(false, vscode.workspace.rootPath)
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
        })
        .catch(appendError);
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
    runTests(false, undefined, [selector])
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
        })
        .catch(appendError);
}

function updateTestStates(context: TestContext, states: TestStates, fileSelector: string, results: TestResult[], selectors?: string[]) {
    throwIfNot('updateTestStates', context, 'context');
    throwIfNot('updateTestStates', states, 'states');
    throwIfNot('updateTestStates', fileSelector, 'fileSelector');
    throwIfNot('updateTestStates', results, 'results');

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
    throwIfNot('pushFailInfo', lines, 'lines');
    throwIfNot('pushFailInfo', index, 'index');
    throwIfNot('pushFailInfo', item, 'item');

    lines.push('  ' + index + ') ' + item.selector.join(' ') + ':');
    lines.push('');

    if (item.err.stack && item.err.stack.substr(0, 'AssertionError'.length) === 'AssertionError') {
        lines.push('    AssertionError: ' + item.err.message);
        if (item.err.hasOwnProperty('actual') || item.err.hasOwnProperty('expected')) {
            lines.push(unifiedDiff(item.err));
        }

        const endl = item.err.stack.indexOf('\n') + 1;
        lines.push(item.err.stack.substr(endl));
    } else {
        lines.push('    Error:' + item.err.message);
    }

    lines.push('');
}

function unifiedDiff(err: { actual: any, expected: any }) {
    throwIfNot('unifiedDiff', err, 'err');

    const msg = diff.createPatch('string', err.actual, err.expected, undefined, undefined);
    const lines = msg.split('\n').splice(4);
    return '\n      + expected - actual\n\n' +
        lines
            .map(line => line.match(/@@/) || line.match(/\\ No newline/) ? null : '      ' + line)
            .filter(line => typeof line !== 'undefined' && line !== null)
            .join('\n');
}
