import * as vscode from 'vscode';
import { TestsCodeLensProvider, TestCodeLensBase } from "./TestsCodeLensProvider";
import { languages } from "./Utils";
import { commandRunTests, commandRunAllTests, commandRunFileTests, commandRunScript } from "./commands";
import { config } from "./config";

export let codeLensProvider: TestsCodeLensProvider;
export let outputChannel: vscode.OutputChannel;
let compilerWatch;

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    if (config.enabled === true) {
        doActivate(context);
    } else if (config.enabled !== false) {
        vscode.window.showInformationMessage('vscode-mocha-test-runner is not enabled', 'Enable', 'Do not show again')
            .then(result => {
                if (result === 'Enable') {
                    config.update('enabled', true);
                    doActivate(context);
                } else if (result === 'Do not show again') {
                    config.update('enabled', false);
                }
            });
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function doActivate(context: vscode.ExtensionContext) {
    try {
        codeLensProvider = new TestsCodeLensProvider();
        outputChannel = vscode.window.createOutputChannel('Mocha test runner');
        outputChannel.show();

        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-test', commandRunTests));
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-all-tests', commandRunAllTests));
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-file-tests', commandRunFileTests));
        context.subscriptions.push(vscode.commands.registerCommand('vscode-mocha-test-runner.run-script', commandRunScript));

        context.subscriptions.push(vscode.languages.registerCodeLensProvider(languages, codeLensProvider));

        console.log('vscode-mocha-test-runner started');
    } catch (err) {
        console.error('vscode-mocha-test-runner activate error: ' + err);
    }
}
