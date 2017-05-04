import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as diff from 'diff';
import * as minimatch from 'minimatch';
import { TestCodeLensBase, ItCodeLens } from "./TestsCodeLensProvider";
import { getFileSelector, getDocumentSelector, languages, throwIfNot, appendError } from "./Utils";
import { runTests } from "./TestRunner";
import { codeLensProvider, outputChannel } from "./extension";
import { config } from "./config";
import { TestResult, TestStates, FileTestStates, TestState } from "./Types";

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
    testFileExists(selector)
        .then(() => {
            for (var i = 0; i < codeLens.selectors.length; ++i) {
                states[codeLens.selectors[i]] = 'Running';
            }
            codeLensProvider.updateTestStates(selector, states);
        })
        .then(() => runTests(codeLens instanceof ItCodeLens && codeLens.debug, codeLens.grep))
        .then(response => {
            updateTestStates(states, selector, response.results[selector] || [], codeLens.selectors);
            outputChannel.append(response.stdout);
        })
        .catch(err => {
            updateTestStates(states, selector, [], codeLens.selectors, 'Fail');
            appendError(err);
        })
        .then(() => codeLensProvider.updateTestStates(selector, states));
}

export function commandRunAllTests() {
    outputChannel.clear();

    runTests(false)
        .then(response => {
            const fileStates: FileTestStates = {};

            const keys = Object.keys(response.results);
            for (let selector of keys) {
                let states = fileStates[selector];
                if (!states) {
                    states = {};
                    fileStates[selector] = states;
                }

                updateTestStates(states, selector, response.results[selector]);
            }

            codeLensProvider.updateFileTestStates(fileStates);
            outputChannel.append(response.stdout);
        })
        .catch(appendError)
        .then(() => codeLensProvider.updateAllRunningStatesTo('Fail'));
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
    let states: TestStates;
    testFileExists(selector)
        .then(() => {
            states = codeLensProvider.updateFileStates(selector, 'Running');
        })
        .then(() => runTests(false, undefined, [selector]))
        .then(response => {
            updateTestStates(states, selector, response.results[selector], Object.keys(states));
            codeLensProvider.updateTestStates(selector, states);
            outputChannel.append(response.stdout);
        })
        .catch(appendError)
        .then(() => codeLensProvider.updateAllRunningStatesTo('Fail'));
}

function updateTestStates(states: TestStates, fileSelector: string, results: TestResult[], selectors?: string[], selectorsState: TestState = 'Inconclusive') {
    throwIfNot('updateTestStates', states, 'states');
    throwIfNot('updateTestStates', fileSelector, 'fileSelector');
    throwIfNot('updateTestStates', results, 'results');

    if (selectors) {
        for (var i = 0; i < selectors.length; ++i) {
            states[selectors[i]] = selectorsState;
        }
    }

    for (let i = 0; i < results.length; ++i) {
        const test = results[i];
        states[test.selector.join(' ')] = test.state;
    }
}

function testFileExists(fileSelector: string) {
    return new Promise((resolve, reject) => {
        const testFile = path.join(vscode.workspace.rootPath, fileSelector + '.js');
        fs.exists(testFile, exists => {
            if (exists) {
                resolve();
            } else { 
                reject('Test file \'' + testFile + '\' was not found (Didnt u forget to transpile sources?)');
            }
        });
    });
}
