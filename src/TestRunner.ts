import * as vscode from 'vscode';
import * as Mocha from 'mocha';
import * as path from 'path';
import * as fs from 'fs';
import { Glob } from 'glob';
import { fork, ForkOptions } from 'child_process';
import { config } from "./config";
import { throwIfNot } from "./Utils";
import { TestProcessArgs, TestsResults } from "./Types";
import { runTestProcess } from "./TestProcess";

export function runTests(debug = false, grep?: string, fileSelectors?: string[]) {
    return runTestsCore({ grep, fileSelectors }, debug);
}

export function runTestsInFile(fileName: string) {
    throwIfNot('runTestsInFile', fileName, 'fileName');

    return runTestsCore({ fileName }, false);
}

function runTestsCore(processArgs: Partial<TestProcessArgs>, debug: boolean) {
    const args = {
        rootPath: config.files.rootPath,
        workspacePath: vscode.workspace.rootPath,
        ignore: config.files.ignore,
        glob: config.glob,
        setup: config.files.setup,
        options: config.options,
        ...processArgs
    };

    if (!debug) {
        // no need to fork new process when not debugging ...
        return runTestProcess(args);
    }

    const testProcess = path.join(path.dirname(module.filename), 'TestProcess.js');

    const forkArgs = [
        '--debug=' + config.debugPort
    ];

    // create form process ...
    const process = fork(testProcess, forkArgs, { cwd: vscode.workspace.rootPath });

    // ... and start attaching to it
    vscode.commands.executeCommand('vscode.startDebug', {
        "name": "Attach",
        "type": "node",
        "request": "attach",
        "port": config.debugPort,
        "address": "localhost",
        "sourceMaps": true,
        "trace": true,
        "runtimeArgs": [
            "--nolazy"
        ],
        "env": {
            "NODE_ENV": "test",
        },
        "outFiles": [
            path.join(args.workspacePath, args.rootPath, args.glob)
        ],
    });

    return new Promise((resolve, reject) => {
        let result: any;
        process.on('message', data => {
            result = data;
        });

        process.on('exit', code => {
            if (code !== 0) {
                reject(result as string);
            } else {
                resolve(result as TestsResults);
            }
        });

        // wait a while for debugger to properly attach itself to process before running tests ...        
        setTimeout(() => {
            process.send(args);
        }, 1000);
    });
}