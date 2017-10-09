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

// sigtly modified version of child_process.fork
export function fork(modulePath: string, args?: string[], options?: ForkOptions): ChildProcess {
    // Get options and args arguments.
    var execArgv: string[];

    // COMMENTED OUT: (using typescript optional params instead)
    // var options: any = {};
    // var args: any = [];
    // var pos = 1;
    // if (pos < arguments.length && Array.isArray(arguments[pos])) {
    //     args = arguments[pos++];
    // }

    // if (pos < arguments.length && arguments[pos] != null) {
    //     if (typeof arguments[pos] !== 'object') {
    //         throw new TypeError('Incorrect value of args option');
    //     }

    //     options = util._extend({}, arguments[pos++]);
    // }

    // Prepare arguments for fork:
    execArgv = [...(options.execArgv || process.execArgv)];

    if (execArgv === process.execArgv && (process as any)._eval != null) {
        const index = execArgv.lastIndexOf((process as any)._eval);
        if (index > 0) {
            // Remove the -e switch to avoid fork bombing ourselves.
            execArgv = execArgv.slice();
            execArgv.splice(index - 1, 2);
        }
    }

    // ADDED: remove --inspect-brk= atribute from original arguments (in case of debugging extension)
    const index = execArgv.findIndex(o => o.startsWith('--inspect-brk='));
    if (index !== -1) {
        execArgv.splice(index, 1);
    }

    args = execArgv.concat([modulePath], args);

    if (!Array.isArray(options.stdio)) {
        // Use a separate fd=3 for the IPC channel. Inherit stdin, stdout,
        // and stderr from the parent if silent isn't set.
        options.stdio = options.silent ? ['pipe', 'pipe', 'pipe', 'ipc'] :
            [0, 1, 2, 'ipc'];
    } else if (options.stdio.indexOf('ipc') === -1) {
        throw new TypeError('Forked processes must have an IPC channel');
    }

    // When forking a child script, we setup a special environment to make
    // the atom-shell binary run like the upstream node.
    if (!options.env) {
        options.env = Object.create(process.env);
    }

    // REMOVED - dont wanna electorn in the mix
    //options.env.ELECTRON_RUN_AS_NODE = 1;

    // On Mac we use the helper app as node binary.
    if (!options.execPath && (process as any).type && process.platform == 'darwin') {
        options.execPath = (process as any).helperExecPath;
    }

    options.execPath = options.execPath || process.execPath;

    return spawn(options.execPath, args, options);
}
