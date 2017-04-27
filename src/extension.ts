import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TestsCodeLensProvider, TestCodeLensBase } from "./TestsCodeLensProvider";
import { FileTestStates, TestState, TestsResults, TestStates } from "./Utils";
import { runTests, runTestsInFile } from "./TestRunner";
import { config } from "./config";
import { commandRunTests, commandRunAllTests } from "./commands";

export let codeLensProvider: TestsCodeLensProvider;
let compilerWatch;

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    try {
        codeLensProvider = new TestsCodeLensProvider();
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-test', commandRunTests));
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-all-tests', commandRunAllTests));

        context.subscriptions.push(vscode.languages.registerCodeLensProvider([
            { language: 'javascript', pattern: '**/*.test.js' },
            { language: 'javascriptreact', pattern: '**/*.test.jsx' },
            { language: 'typescript', pattern: '**/*.test.ts' },
            { language: 'typescriptreact', pattern: '**/*.test.tsx' },
        ], codeLensProvider));

        console.log('vscode-mocha-test-runner started');
    } catch (err) {
        console.error(err);
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}