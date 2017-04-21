import * as vscode from 'vscode';
import * as path from 'path';
import * as ts from "typescript";
import { FileTestsInfo, TestsInfo, DescribeInfo, ItInfo } from './Types';

interface ItemBase {
    name: string;
    line: number;
    title: string;
    parent: DescribeItem;
}

interface DescribeItem extends ItemBase {
    name: 'describe';
    children: Item[];
}

interface ItItem extends ItemBase {
    name: 'it';
}

type Item = DescribeItem | ItItem;

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

    updateCodeLenses(fileName: string, selector?: string);
    updateCodeLenses(fileTestsInfo: FileTestsInfo);
    updateCodeLenses(...args: any[]) {
        if (typeof args[0] === 'string') {
            const fileName: string = args[0];
            const selector: string = args.length > 0 ? args[1] : undefined;

            const codeLens = this._codeLensCache[fileName];
            if (codeLens) {
                for (let lens of codeLens) {
                    if (lens.command.command === 'mochaTestRunner.runTest') {
                        if (lens.command.arguments[0].fileName === fileName && (!selector || lens.command.arguments[1] === selector)) {
                            lens.command.title = 'Running ...';
                        }
                    }
                }

                this._useCodeLensCache = true;
            }    
        } else {
            this._fileTestsInfo = args[0];
        }
        
        this._eventEmitter.fire(null);
    }

    private _itemsCache: { [fileName: string]: Item[] } = {};
    private _codeLensCache: { [fileName: string]: vscode.CodeLens[] } = {};
    private _useCodeLensCache: boolean;

    invalidateCacheForFile(fileName: string) {
        delete this._itemsCache[fileName];
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        let codeLens: vscode.CodeLens[];

        if (this._useCodeLensCache) {
            this._useCodeLensCache = false;
            codeLens = this._codeLensCache[document.fileName];
        }

        if (!codeLens) {
            let tree: Item[] = undefined;
            if (!document.isDirty) {
                this._itemsCache[document.fileName];
            }

            if (!tree) {
                const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, false, ts.ScriptKind.Unknown);
                tree = sourceFile.statements.map(statement => this._visit(sourceFile, statement)).filter(o => o);
                this._itemsCache[document.fileName] = tree;
            }

            let fileIdentifier = path.relative(vscode.workspace.rootPath, document.fileName); // to relative
            fileIdentifier = fileIdentifier.substring(0, fileIdentifier.length - 8); // remove '.test.js'

            const testsInfo = this._fileTestsInfo && this._fileTestsInfo[fileIdentifier];

            codeLens = [];
            for (let item of tree) {
                this._createCodeLens(document, codeLens, item, undefined, testsInfo);
            }
        }

        this._codeLensCache[document.fileName] = codeLens;
        return codeLens;
    }

    resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        throw new Error('Method not implemented.');
    }

    private _visit(sourceFile: ts.SourceFile, node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.ExpressionStatement: {
                const obj = node as ts.ExpressionStatement;
                return this._visit(sourceFile, obj.expression);
            }

            case ts.SyntaxKind.CallExpression: {
                const obj = node as ts.CallExpression;
                const name = this._visit(sourceFile, obj.expression);
                switch (name) { 
                    case 'describe': {
                        let children = this._visit(sourceFile, obj.arguments[1]);
                        if (!Array.isArray(children)) {
                            children = [children];
                        }
                        /* known bug: this will return wrong position for this code: (specially when comment is multiline)
                        * describe /* comment here with word describe in it * /('title', function() { });
                        *
                        * wont fix: who would write comment in there in first place??
                        */
                        const pos = sourceFile.text.lastIndexOf('describe', obj.arguments[0].pos);
                        const result = {
                            name,
                            line: sourceFile.getLineAndCharacterOfPosition(pos).line,
                            title: this._visit(sourceFile, obj.arguments[0]),
                            children
                        };

                        children.filter(o => o).forEach(o => o.parent = result);
                        return result;
                    }
                    case 'it': {
                        // known bug: same as with describe couple lines above
                        const pos = sourceFile.text.lastIndexOf('it', obj.arguments[0].pos);
                        return {
                            name,
                            line: sourceFile.getLineAndCharacterOfPosition(pos).line,
                            title: this._visit(sourceFile, obj.arguments[0])
                        };
                    }  
                }

                return null; 
            }

            case ts.SyntaxKind.Identifier: {
                const obj = node as ts.Identifier;
                return obj.text;
            }

            case ts.SyntaxKind.StringLiteral: {
                const obj = node as ts.StringLiteral;
                return obj.text;
            }

            case ts.SyntaxKind.FunctionExpression: {
                const obj = node as ts.FunctionExpression;
                if (obj.parameters.length === 0) {
                    return this._visit(sourceFile, obj.body);
                }

                break;
            }

            case ts.SyntaxKind.Block: {
                const obj = node as ts.Block;
                return obj.statements.map(statement => this._visit(sourceFile, statement)).filter(o => o);
            }

            case ts.SyntaxKind.ImportDeclaration:
            case ts.SyntaxKind.VariableStatement:
            case ts.SyntaxKind.PropertyAccessExpression:
                return null;

            default: {
                console.log('Unresolved node: \'' + ts.SyntaxKind[node.kind] + '\'');
                return null;
            }
        }
    }

    private _createCodeLens(document: vscode.TextDocument, codeLens: vscode.CodeLens[], item: Item, parentSelector?: string, testsInfo?: DescribeInfo | ItInfo) {
        let selector = item.title;

        const testInfo = testsInfo && testsInfo[selector];

        if (parentSelector) {
            selector = parentSelector + '/' + selector;
        }

        if (item.name === 'describe') {
            let testsCounter = 0, inconclusiveCounter = 0, succeedCounter = 0, failCounter = 0, runningCounter = 0;
            for (let child of item.children) {
                const { tests, inconclusive, succeed, fail } = this._createCodeLens(document, codeLens, child, selector, testInfo);
                testsCounter += tests;
                inconclusiveCounter += inconclusive;
                succeedCounter += succeed;
                failCounter += fail;
            }

            const title = [testsCounter, ' tests,'];
            if (inconclusiveCounter > 0) { title.push(', ', inconclusiveCounter, ' inconclusive'); }
            if (succeedCounter > 0) { title.push(', ', succeedCounter, ' succeed'); }
            if (failCounter > 0) { title.push(', ', failCounter, ' failed'); }

            codeLens.push(new vscode.CodeLens(new vscode.Range(item.line, 0, item.line, title.length), {
                command: 'mochaTestRunner.runTest',
                title: title.join(''),
                arguments: [
                    document,
                    selector,
                    true, // is describe
                    false // debug
                ]
            }));

            return {
                tests: testsCounter,
                inconclusive: inconclusiveCounter,
                succeed: succeedCounter,
                fail: failCounter
            };
        }

        const stateStr = { undefined: 'Inconclusive', true: 'Success', false: 'Fail', null: 'Running ...' };
        const title = stateStr[testInfo && testInfo.succeed as any];

        codeLens.push(new vscode.CodeLens(new vscode.Range(item.line, 0, item.line, title.length), {
            command: 'mochaTestRunner.runTest',
            title,
            arguments: [
                document,
                selector,
                false, // is describe
                false  // debug
            ]
        }));

        return {
            tests: 1,
            inconclusive: testInfo === undefined ? 1 : 0,
            succeed: testInfo && testInfo.succeed === true ? 1 : 0,
            fail: testInfo && testInfo.succeed === false ? 1 : 0
        };
    }
}
