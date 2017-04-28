import * as vscode from 'vscode';
import * as path from 'path';
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
    outputChannel.appendLine('    AssertionError:' + item.err.message);
    outputChannel.appendLine('    + expected - actual');
    outputChannel.appendLine('');
    outputChannel.appendLine('    -' + item.err.actual);
    outputChannel.appendLine('    +' + item.err.expected);
    const endl = item.err.stack.indexOf('\n');
    outputChannel.appendLine(item.err.stack.substr(endl));
    outputChannel.appendLine('');
}