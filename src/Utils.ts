import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { config } from "./config";
import { outputChannel } from "./extension";
import { spawn, ForkOptions, ChildProcess } from 'child_process';

export function getFileSelector(fileName: string) {
    throwIfNot('getFileSelector', fileName, 'fileName');


    const selector = path.relative(vscode.workspace.rootPath, fileName);
    const index = selector.lastIndexOf('.');
    return (index === -1) ? selector : selector.substring(0, index);
}

export function getDocumentSelector(document: vscode.TextDocument) {
    throwIfNot('getDocumentSelector', document, 'document');

    let rootDir = vscode.workspace.rootPath;
    const tsConfigFile = path.join(vscode.workspace.rootPath, 'tsconfig.json');
    if (config.sourceDir) {
        rootDir = path.join(rootDir, config.sourceDir);
    }

    let selector = path.relative(rootDir, document.fileName);
    selector = path.join(config.outputDir, selector);
    const index = selector.lastIndexOf('.');
    return (index === -1) ? selector : selector.substring(0, index);
}

export const languages = [
    { language: 'javascript', pattern: config.glob },
    { language: 'javascriptreact', pattern: config.glob },
    { language: 'typescript', pattern: config.glob },
    { language: 'typescriptreact', pattern: config.glob }
];

export function throwIfNot(source: string, value: any, name: string) {
    if (typeof value === 'undefined') {
        throw new Error(source + '- invalid parameter: ' + name);
    }
}

export function appendError(err) {
    outputChannel.appendLine(err);
}

export interface SpawnTestProcessOptions {
  cwd?: string;
  env?: any;
  execPath?: string;
  execArgv?: string[];
  stdio?: any[];
  requires?: string[];
}

// spawn our TestProcess program
export function spawnTestProcess(modulePath: string, args?: string[], options?: SpawnTestProcessOptions): ChildProcess {
    // Get options and args arguments.
    var execArgv: string[];

    // Prepare arguments for fork:
    execArgv = [...(options.execArgv)];


    args = execArgv.concat([modulePath], args);
    options.stdio = ['pipe', 'pipe', 'pipe', 'ipc']

    }


    console.log('spawning:', options.execPath, args, options)
    return spawn(options.execPath, args, options);
}
