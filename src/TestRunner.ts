import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as deepExtend from 'deep-extend';
const escapeRegExp = require('escape-regexp');
import { FileTestsInfo, TestsInfo, DescribeInfo, ItInfo, MochaTestInfo, MochaTestResult } from './Types';
import { config } from './config';
import { dedupeStrings, fork, envWithNodePath } from './Utils';

export module TestRunner {
    var tests: MochaTestInfo[] = [];
    var fileTestsInfo: FileTestsInfo;
    var currentFile: string;
    var outputChannel: vscode.OutputChannel;

    export async function execute(document?: string, selector?: string, isDescribe?: boolean, debug?: boolean): Promise<FileTestsInfo> {
        if (document) {
            currentFile = path.relative(vscode.workspace.rootPath, document); // to relative
            currentFile = currentFile.substring(0, currentFile.length - 8); // remove '.test.js'
        }    

        tests = await _findTests(vscode.workspace.rootPath);
        if (!tests.length) {
            vscode.window.showWarningMessage('No tests were found.');
            return;
        }
        
        if (document) {
            tests = _filterTests(tests, document);
        }

        try {
            if (selector) {
                const grep = '^' + escapeRegExp(selector.replace(/\//g, ' ')) + (isDescribe ? '' : '$');
                return await _runMocha(tests.filter(test => test.fullName.indexOf(selector) === 0).map(test => test.file), grep, debug);
            }

            return await _runMocha(tests.map(test => test.file), undefined, debug);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run tests due to ${error.message}`);
            throw error;
        }
    }

    function _filterTests(tests: MochaTestInfo[], document: string) {
        let docPart = path.relative(vscode.workspace.rootPath, document);
        let index = docPart.lastIndexOf('.');
        index = docPart.lastIndexOf('.', index - 1);
        docPart = docPart.substr(0, index);

        const docTests = tests.filter(o => {
            let relative = path.relative(vscode.workspace.rootPath, o.file);
            if (relative.substr(0, 3) === 'out') {
                relative = relative.substr(4);
            }
            return relative.substr(0, relative.length - 8) === docPart;
        });

        if (docTests.length > 0) {
            tests = docTests;
        }

        return tests;
    }

    function _findTests(rootPath: string) {
        const args = [
            JSON.stringify({
                options: config.options,
                files: {
                    glob: config.files.glob,
                    ignore: config.files.ignore
                },
                rootPath,
                setup: config.setup
            })
        ];

        return fork(path.resolve(module.filename, '../worker/findtests.js'), args, { env: envWithNodePath(rootPath), cwd: rootPath })
            .then<MochaTestInfo[]>(process => new Promise<any>((resolve, reject) => {
                const stdoutBuffers = [];
                const resultJSONBuffers = [];

                process.stderr.on('data', data => resultJSONBuffers.push(data));
                process.stdout.on('data', data => stdoutBuffers.push(data));

                process
                    .on('error', err => {
                        vscode.window.showErrorMessage(`Failed to run Mocha due to ${err.message}`);
                        reject(err);
                    })
                    .on('exit', code => {
                        console.log(Buffer.concat(stdoutBuffers).toString());

                        const stderrText = Buffer.concat(resultJSONBuffers).toString();
                        let resultJSON: MochaTestInfo[];
                        try {
                            resultJSON = stderrText && JSON.parse(stderrText);
                        } catch (ex) {
                            code = 1;
                        }

                        if (code) {
                            outputChannel.append('Error: ' + stderrText);
                            console.error(stderrText);
                            reject(new Error('findTests: unknown error'));
                        } else {
                            resolve(resultJSON);
                        }
                    });
            }));
    }

    async function _runMocha(testFiles, grep: string, debug: boolean) {
        try {
            const result = await _runTests(dedupeStrings(testFiles), grep, debug);
            const converted = _convertResult(result);
            return _mergeResults(converted);
        } catch (err) {
            console.error(err);
        }
    }

    function _convertResult(result: any): FileTestsInfo {
        if (!result) {
            return {};
        }

        const output: any = {};

        const addPath = (path: string, succeed: boolean) => {
            let current = output;
            for (let name of path.split('/')) {
                let next = current[name];
                if (!next) {
                    current[name] = next = {};
                }
                current = next;
            }
            (current as ItInfo).succeed = succeed;
        };

        if (result.failed) {
            for (let item of result.failed) {
                addPath(item.fullName, false);
            }
        }

        if (result.passed) {
            for (let item of result.passed) {
                addPath(item.fullName, true);
            }
        }

        return output;
    }

    function _mergeResults(result: FileTestsInfo): FileTestsInfo {
        let data: TestsInfo = {};

        if (fileTestsInfo) {
            data = fileTestsInfo[currentFile];
        }

        if (data && result) {
            deepExtend(data, result);
        } else {
            data = result;
        }

        if (!fileTestsInfo) {
            fileTestsInfo = {};
        }

        fileTestsInfo[currentFile] = data;
        return fileTestsInfo;
    }

    function _runTests(testFiles: string[], grep: string, debug: boolean): Promise<MochaTestResult[]> {
        const rootPath = vscode.workspace.rootPath;

        const args = [
            JSON.stringify({
                files: testFiles,
                options: config.options,
                grep,
                rootPath,
                setup: config.setup
            }),
        ];
        const runTestWorker = path.resolve(module.filename, '../worker/runtest.js');

        if (debug) {
            // todo: figure out how to fire up mocha tests with vscode debug
        } else {
            return fork(runTestWorker, args, { env: envWithNodePath(rootPath), cwd: rootPath })
                .then<MochaTestResult[]>(process => new Promise<any>((resolve, reject) => {
                    if (!outputChannel) {
                        outputChannel = vscode.window.createOutputChannel('Mocha');
                    }
                    
                    outputChannel.clear();
                    outputChannel.appendLine(`Running Mocha with Node.js\n`);

                    const stderrBuffers = [];
                    process.stderr.on('data', data => stderrBuffers.push(data));
                    process.stdout.on('data', data => outputChannel.append(data.toString().replace(/\r/g, '')));

                    process
                        .on('error', err => {
                            vscode.window.showErrorMessage(`Failed to run Mocha due to ${err.message}`);
                            outputChannel.append(err.stack);
                            reject(err);
                        })
                        .on('exit', code => {
                            const stderrText = Buffer.concat(stderrBuffers).toString();
                            let resultJSON: MochaTestResult[];
                            try {
                                resultJSON = stderrText && JSON.parse(stderrText);
                            } catch (ex) {
                                code = 1;
                            }

                            if (code) {
                                outputChannel.append(stderrText);
                                console.error(stderrText);
                                reject(new Error('unknown error'));
                            } else {
                                resolve(resultJSON);
                            }
                        });
                }));
        }
    }
}
