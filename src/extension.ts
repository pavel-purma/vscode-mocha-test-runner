import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TestsCodeLensProvider, TestCodeLensBase } from "./TestsCodeLensProvider";
import { FileTestStates, TestState, TestsResults, TestStates, languages } from "./Utils";
import { runTests, runTestsInFile } from "./TestRunner";
import { config } from "./config";
import { commandRunTests, commandRunAllTests, commandRunFileTests } from "./commands";

export let codeLensProvider: TestsCodeLensProvider;
export let outputChannel: vscode.OutputChannel;
let compilerWatch;

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    try {
        codeLensProvider = new TestsCodeLensProvider();
        outputChannel = vscode.window.createOutputChannel('Mocha test runner');        
        outputChannel.show();
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-test', commandRunTests));
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-all-tests', commandRunAllTests));
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-file-tests', commandRunFileTests));
        context.subscriptions.push(vscode.languages.registerCodeLensProvider(languages, codeLensProvider));
        console.log('vscode-mocha-test-runner started');
    } catch (err) {
        console.error(err);
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}