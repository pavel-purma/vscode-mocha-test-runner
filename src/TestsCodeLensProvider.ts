import * as vscode from 'vscode';
import * as path from 'path';
import { FileTestsInfo, TestsInfo, DescribeInfo, ItInfo } from './Types';

type itInfo = {
    parent: describeInfo,
    line: number,
    name: string,
    info: ItInfo
};

type describeInfo = {
    parent: describeInfo,
    line: number,
    name: string,
    its: itInfo[],
    describes: describeInfo[]
};

export class TestsCodeLensProvider implements vscode.CodeLensProvider {

    private _fileTestsInfo: FileTestsInfo;
    private _eventEmitter: vscode.EventEmitter<void>;

    constructor() {
        this._fileTestsInfo = {};
        this._eventEmitter = new vscode.EventEmitter<void>();
    }

    get onDidChangeCodeLenses() {
        return this._eventEmitter.event;
    }

    updateCodeLenses(testsInfo: FileTestsInfo) {
        this._fileTestsInfo = testsInfo;
        this._eventEmitter.fire(null);
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLens: vscode.CodeLens[] = [];
        const blocks = this._parseDocument(document);
        for (const item of blocks) {
            if (typeof (item as describeInfo).its !== 'undefined') {
                const describe = item as describeInfo;
                const { codeLens: inCodeLens } = this._createCodeLensForDescribe(document, item as describeInfo)
                codeLens.push.apply(codeLens, inCodeLens);
            } else {
                codeLens.push.apply(codeLens, this._createCodeLensForIt(document, item as itInfo));
            }
        }

        return codeLens;
    }

    resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        throw new Error('Method not implemented.');
    }

    private _parseDocument(document: vscode.TextDocument) {
        const result: (describeInfo | itInfo)[] = [];

        let describe: describeInfo;
        let info: DescribeInfo = this._fileTestsInfo[path.relative(vscode.workspace.rootPath, document.fileName)];
        let describeStack: describeInfo[] = [];
        let infoStack: DescribeInfo[] = [];
        let prev: boolean[] = [];
        for (let i = 0; i < document.lineCount; ++i) {
            const line = document.lineAt(i);
            if (line.isEmptyOrWhitespace) {
                continue;
            }

            const describeMatch = /\s*describe\s*\(\s*'([^']*)'\s*,/.exec(line.text); // describe('...',
            if (describeMatch) {
                const name = describeMatch[1];

                infoStack.push(info);
                info = info && info[name] as DescribeInfo;

                const parent = describe;
                describe = {
                    parent,
                    line: line.lineNumber,
                    name,
                    its: [],
                    describes: []
                };

                if (parent) {
                    describeStack.push(parent);
                    parent.describes.push(describe);
                } else {
                    result.push(describe);
                }

                prev.push(true);
                continue;
            }

            const itMatch = /\s*it\s*\(\s*'([^']*)'\s*,/.exec(line.text); // it('...',
            if (itMatch) {
                const name = itMatch[1];
                const it = {
                    parent: describe,
                    line: line.lineNumber,
                    name,
                    info: info && info[name] as ItInfo
                };

                if (describe) {
                    describe.its.push(it);
                } else {
                    result.push(it);
                }
                prev.push(false);
                continue;
            }

            if (/\s*}\s*\);\s*/.test(line.text)) { // });
                if (prev.pop()) {
                    describe = describeStack.pop();
                    info = infoStack.pop();
                }
                continue;
            }
        }

        return result;
    }

    private _createCodeLensForIt(document: vscode.TextDocument, it: itInfo): vscode.CodeLens[] {
        const stateStr = { undefined: 'Inconclusive', true: 'Success', false: 'Fail' };
        const title = stateStr[it.info && it.info.succeed as any];
        const selector = [it.name];
        let parent = it.parent;
        while (parent) {
            selector.unshift(parent.name);
            parent = parent.parent;
        }

        return [
            new vscode.CodeLens(new vscode.Range(it.line, 0, it.line, title.length), {
                command: 'mochaTestRunner.runTest',
                title,
                arguments: [
                    document,
                    selector.join('/'),
                    false,
                    false
                ]
            }),
            // new vscode.CodeLens(new vscode.Range(it.line, title.length + 1, it.line, 5), {
            //     command: 'mochaTestRunner.runTest',
            //     title: 'Debug',
            //     arguments: [
            //         document,
            //         selector.join('/'),
            //         false,
            //         true
            //     ]
            // })
        ];
    }

    private _createCodeLensForDescribe(document: vscode.TextDocument, describe: describeInfo): { codeLens: vscode.CodeLens[], tests: number, inconclusive: number, failed: number } {
        const codeLens: vscode.CodeLens[] = [];
        let inconclusive = 0;
        let failed = 0;
        let tests = 0;

        for (let it of describe.its) {
            ++tests;
            if (!it.info) {
                ++inconclusive;
            } else if (!it.info.succeed) {
                ++failed;
            }

            codeLens.push.apply(codeLens, this._createCodeLensForIt(document, it));
        }

        for (let item of describe.describes) {
            const { codeLens: inCodeLens, tests: inTests, inconclusive: inInconclusive, failed: inFailed } = this._createCodeLensForDescribe(document, item)
            codeLens.push.apply(codeLens, inCodeLens);
            tests += inTests;
            inconclusive += inInconclusive;
            failed += inFailed;
        }

        const titleParts = [tests + ' tests'];
        if (inconclusive > 0) {
            titleParts.push(', ' + inconclusive + ' Inconclusive');
        }

        if (failed > 0) {
            titleParts.push(', ' + failed + ' Failed');
        }
        
        const title = titleParts.join('') + '.';

        const selector = [describe.name];
        let parent = describe.parent;
        while (parent) {
            selector.unshift(parent.name);
            parent = parent.parent;
        }

        // codeLens.unshift(new vscode.CodeLens(new vscode.Range(describe.line, title.length + 1, describe.line, 5), {
        //     command: 'mochaTestRunner.runTest',
        //     title: 'Debug',
        //     arguments: [
        //         document,
        //         selector.join('/'),
        //         true,
        //         true
        //     ]
        // }));

        codeLens.unshift(new vscode.CodeLens(new vscode.Range(describe.line, 0, describe.line, title.length), {
            command: 'mochaTestRunner.runTest',
            title,
            arguments: [
                document,
                selector.join('/'),
                true,
                false
            ]
        }));

        return { codeLens, tests, inconclusive, failed };
    }
}