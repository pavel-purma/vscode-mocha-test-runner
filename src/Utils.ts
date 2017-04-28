import * as vscode from 'vscode';
import * as path from 'path';
import { config } from "./config";

export type TestsResults = { [file: string]: TestResult[] };
export type TestResult = { selector: string[], err?: any };
export type TestState = 'Inconclusive' | 'Running' | 'Success' | 'Fail';
export type TestStates = { [title: string]: TestState };
export type FileTestStates = { [fileName: string]: TestStates };

export function getFileSelector(fileName: string) {
    let selector = path.relative(vscode.workspace.rootPath, fileName);
    return selector.substring(0, selector.lastIndexOf('.'));
}

export function getDocumentSelector(document: vscode.TextDocument) {
    let selector = path.relative(vscode.workspace.rootPath, document.fileName);
    selector = path.join(config.files.rootPath, selector);
    return selector.substring(0, selector.lastIndexOf('.'));
}

export const languages = [
    { language: 'javascript', pattern: '**/*.test.js' },
    { language: 'javascriptreact', pattern: '**/*.test.jsx' },
    { language: 'typescript', pattern: '**/*.test.ts' },
    { language: 'typescriptreact', pattern: '**/*.test.tsx' }
];