import * as vscode from 'vscode';
import { TestsCodeLensProvider } from './TestsCodeLensProvider';
import { TestRunner } from './TestRunner';
import { FileTestsInfo } from './Types';
import { fork } from './Utils';
import { config } from './Config';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

const dataFile = path.join(vscode.workspace.rootPath, '.vscode/tests.json');

let codeLensProvider: TestsCodeLensProvider;

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    codeLensProvider = new TestsCodeLensProvider();
    context.subscriptions.push(vscode.commands.registerCommand('mochaTestRunner.runTest', (document: vscode.TextDocument, selector: string, isDescribe: boolean, debug: boolean) => {
        if (document.isDirty) {
            document.save();
        }

        runTest(document, selector, isDescribe, debug);
    }));

    context.subscriptions.push(vscode.languages.registerCodeLensProvider(['javascript', 'javascriptreact', 'typescript', 'typescriptreact'], codeLensProvider));

    if (config.runTestsOnSave) {
        vscode.workspace.onDidSaveTextDocument(onDidSaveTextDocument);
    }    
}

// this method is called when your extension is deactivated
export function deactivate() {
}

async function runTest(document: vscode.TextDocument, selector?: string, isDescribe?: boolean, debug?: boolean) {
    try {
        const data = await TestRunner.execute(document.fileName, selector, isDescribe, debug);
        codeLensProvider.updateCodeLenses(data);
    } catch (err) {
        console.error(err);
    }
}

async function onDidSaveTextDocument(document: vscode.TextDocument) {
    if (!/\.tests?\.[jt]sx?$/.test(document.fileName)) {
        return;
    }

    if (!config.compiler) {
        runTest(document);
        return;
    }

    const relativePath = path.relative(vscode.workspace.rootPath, document.fileName);
    const compilerPath = path.join('.vscode', config.compiler);
    const process = await fork(compilerPath, [relativePath], { cwd: vscode.workspace.rootPath });
    process.on('exit', (code, signal) => {
        if (code !== 0) {
            return;
        }

        runTest(document);
    });
}
