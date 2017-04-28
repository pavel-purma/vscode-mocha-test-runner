import * as vscode from 'vscode';
import * as path from 'path';
import { TestCodeLensBase } from "./TestsCodeLensProvider";
import { getFileSelector, FileTestStates, TestState, TestStates, TestsResults, getDocumentSelector } from "./Utils";
import { runTests } from "./TestRunner";
import { codeLensProvider } from "./extension";
import { config } from "./config";

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
            const doUpdate = (files: { [file: string]: string[] }, state: TestState) => {
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
                        fileStates[tests[j]] = state;
                    }
                }
            };

            doUpdate(results.fail, 'Fail');
            doUpdate(results.success, 'Success');
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
        results.fail && doUpdate('Fail', results.fail[fileSelector]);
        results.success && doUpdate('Success', results.success[fileSelector]);
    } else { 
        doUpdate('Running', selectors);
    }
    
    codeLensProvider.updateTestStates(fileSelector, states);
}