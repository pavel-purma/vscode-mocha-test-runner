import * as vscode from 'vscode';
import * as Mocha from 'mocha';
import * as path from 'path';
import * as fs from 'fs';
import { Glob } from 'glob';
import { ForkOptions } from 'child_process';
import { config } from "./config";
import { TestProcessRequest, TestsResults, TestProcessResponse } from "./Types";
import { runTestProcess } from "./TestProcess";
import {spawnTestProcess, throwIfNot} from './Utils';

export function runTests(debug = false, grep?: string, fileSelectors?: string[]) {
    return runTestsCore({ grep, fileSelectors }, debug);
}

export function runTestsInFile(fileName: string) {
    throwIfNot('runTestsInFile', fileName, 'fileName');

    return runTestsCore({ fileName }, false);
}

function runTestsCore(processArgs: Partial<TestProcessRequest>, debug: boolean) {
    const args = {
        rootPath: config.outputDir,
        workspacePath: vscode.workspace.rootPath,
        ignore: config.ignoreGlobs,
        glob: config.glob,
        setup: config.setupFile,
        options: config.options,
        ...processArgs
    };

    const testProcess = path.join(path.dirname(module.filename), 'TestProcess.js');

    const spawnTestProcessOptions = {
        cwd: vscode.workspace.rootPath,
        env: config.env,
        execPath: config.nodeExec,
        execArgv: [],
        requires: config.requires || [],
    };

    if (debug) {
        spawnTestProcessOptions.execArgv = ['--debug-brk=' + config.debugPort];
    }

    const childProcess = spawnTestProcess(testProcess, [], spawnTestProcessOptions);

    if (debug) {
        vscode.commands.executeCommand('vscode.startDebug', {
            "name": "Attach",
            "type": "node",
            "request": "attach",
            "port": config.debugPort,
            "address": "localhost",
            "sourceMaps": true,
            "trace": config.debugTrace,
            "runtimeArgs": [
                "--nolazy"
            ],
            "env": {
                "NODE_ENV": "test",
            },
            "outFiles": [
                path.join(args.workspacePath, args.rootPath, "**/*.js")
            ],
        });

        args.options = { ...args.options, timeout: 360000 };
    }

    return new Promise<TestProcessResponse>((resolve, reject) => {
        let results: any;
        let stdout: string[] = [];
        let stderr: string[] = [];
        let stderrTimeout: NodeJS.Timer;
        let pendingReject: boolean;

        const doReject = () => {
            reject(stdout.join('') + '\r\n' + stderr.join(''));
        };

        childProcess.on('message', data => {
            results = data;
        });

        childProcess.stdout.on('data', data => {
            if (typeof data !== 'string') {
                data = data.toString('utf8');
            }

            stdout.push(data);
        });

        childProcess.stderr.on('data', data => {
            if (typeof data !== 'string') {
                data = data.toString('utf8');
            }

            if (data.startsWith('Warning:') ||
                data.startsWith('Debugger listening on')) {
                stdout.push(data);
                return;
            }

            stderr.push(data);
            if (!stderrTimeout) {
                stderrTimeout = setTimeout(() => {
                    childProcess.kill('SIGTERM');
                    doReject();
                }, 500);
            }
        });

        childProcess.on('exit', code => {
            if (code !== 0) {
                if (stderrTimeout) {
                    pendingReject = true;
                } else {
                    doReject();
                }
            } else {
                resolve({
                    results,
                    stdout: stdout.join('')
                } as TestProcessResponse);
            }
        });

        if (debug) {
            // give debugger some time to properly attach itself before running tests ...
            setTimeout(() => {
                childProcess.send(args);
            }, 1000);
        } else {
            childProcess.send(args);
        }
    });
}