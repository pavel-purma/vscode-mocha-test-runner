import * as vscode from 'vscode';
import * as path from 'path';
import { config } from "./config";
import { outputChannel } from "./extension";

export function getFileSelector(fileName: string) {
    throwIfNot('getFileSelector', fileName, 'fileName');

    const selector = path.relative(vscode.workspace.rootPath, fileName);
    const index = selector.lastIndexOf('.');
    return (index === -1) ? selector : selector.substring(0, index);
}

export function getDocumentSelector(document: vscode.TextDocument) {
    throwIfNot('getDocumentSelector', document, 'document');

    let selector = path.relative(vscode.workspace.rootPath, document.fileName);
    selector = path.join(config.files.rootPath, selector);
    const index = selector.lastIndexOf('.');
    return (index === -1) ? selector : selector.substring(0, index);
}

export const languages = [
    { language: 'javascript', pattern: '**/*.test.js' },
    { language: 'javascriptreact', pattern: '**/*.test.jsx' },
    { language: 'typescript', pattern: '**/*.test.ts' },
    { language: 'typescriptreact', pattern: '**/*.test.tsx' }
];

export function throwIfNot(source: string, value: any, name: string) {
    if (typeof value === 'undefined') {
        throw new Error(source + '- invalid parameter: ' + name);
    }
}

export function appendError(err) {
    outputChannel.appendLine(err);
}
