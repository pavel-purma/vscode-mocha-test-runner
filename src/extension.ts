import * as vscode from 'vscode';
import { TestsCodeLensProvider, TestCodeLensBase, TestStates } from './TestsCodeLensProvider';
import { TestRunner } from './TestRunner';
import { FileTestsInfo } from './Types';
import { fork } from './Utils';
import { config } from './Config';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

let codeLensProvider: TestsCodeLensProvider;
let compilerWatch;

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('vscode-mocha-test-runner starting ...');
    try {
        codeLensProvider = new TestsCodeLensProvider();
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-test', (codeLens: TestCodeLensBase) => {
            if (codeLens.document.isDirty) {
                codeLens.document.save();
            }

            console.log('run-test: ' + JSON.stringify(codeLens.selectors));

            const states: TestStates = {};
            for (let i = 0; i < codeLens.selectors.length; ++i) {
                states[codeLens.selectors[i]] = 'Running';
            }

            codeLensProvider.updateTestStates(codeLens.document.fileName, states);

            // runTest(document, selector, isDescribe, debug);
        }));

        // used by codelens in 'Running' state
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.noop', () => { }));
        
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-all-tests', () => {
            console.log('run-all-tests');
        }));

        context.subscriptions.push(vscode.languages.registerCodeLensProvider([
            { language: 'javascript', pattern: '**/*.test.js' },
            { language: 'javascriptreact', pattern: '**/*.test.jsx' },
            { language: 'typescript', pattern: '**/*.test.ts' },
            { language: 'typescriptreact', pattern: '**/*.test.tsx' },
        ], codeLensProvider));

        vscode.workspace.onDidSaveTextDocument(onDidSaveTextDocument);

        console.log('vscode-mocha-test-runner started');
    } catch (err) {
        console.error(err);
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}

async function runTest(document: vscode.TextDocument, selector?: string, isDescribe?: boolean, debug?: boolean) {
    // try {
    //     codeLensProvider.updateCodeLenses(document.fileName, selector);
    //     const data = await TestRunner.execute(document.fileName, selector, isDescribe, debug);
    //     if (data) {
    //         codeLensProvider.updateCodeLenses(data);
    //     }
    // } catch (err) {
    //     console.error(err);
    // }
}

async function onDidSaveTextDocument(document: vscode.TextDocument) {
    if (!/\.tests?\.[jt]sx?$/.test(document.fileName)) {
        return;
    }

    // if (!config.runTestsOnSave) {
    //     runTest(document);
    //     return;
    // }

    // const compilerPath = path.join('.vscode', config.compiler);
    // const process = await fork(compilerPath, [], { cwd: vscode.workspace.rootPath });
    // process.on('exit', (code, signal) => {
    //     if (code !== 0) {
    //         return;
    //     }

    //     runTest(document);
    // });
}
