import * as vscode from 'vscode';
import * as Mocha from 'mocha';
import * as path from 'path';
import * as fs from 'fs';
import { Glob } from 'glob';
import { fork, ForkOptions } from 'child_process';
import { config } from "./config";
import { throwIfNot } from "./Utils";
import { TestProcessRequest, TestsResults, TestProcessResponse } from "./Types";
import { runTestProcess } from "./TestProcess";

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

    const forkArgs = [];
    if (debug) {
        forkArgs.push('--debug=' + config.debugPort);
    }

    const process = fork(testProcess, forkArgs, { cwd: vscode.workspace.rootPath, silent: true });

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

        process.on('message', data => {
            results = data;
        });

        process.stdout.on('data', data => { 
            if (typeof data !== 'string') { 
                data = data.toString('utf8');
            }

            stdout.push(data);
        });

        process.stderr.on('data', data => { 
            if (typeof data !== 'string') { 
                data = data.toString('utf8');
            }
            
            if (data.startsWith('Warning:')) {
                stdout.push(data);
                return;
            }

            stderr.push(data);
            if (!stderrTimeout) { 
                stderrTimeout = setTimeout(() => { 
                    results = stderr.join('');
                    process.kill();
                }, 500);
            }
        });

        process.on('exit', code => {
            if (code !== 0) {
                reject(stdout.join('') + '\r\n' + results);
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
                process.send(args);
            }, 1000);
        } else {
            process.send(args);
        }
    });
}