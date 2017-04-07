import * as vscode from 'vscode';
import * as path from 'path';
import * as ts from "typescript";
import * as tspoon from "tspoon";
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

    updateCodeLenses(fileTestsInfo: FileTestsInfo) {
        this._fileTestsInfo = fileTestsInfo;
        this._eventEmitter.fire(null);
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, false, ts.ScriptKind.Unknown);
        const tree = sourceFile.statements.map(statement => this._visit(sourceFile, statement)).filter(o => o != null);

        let fileIdentifier = path.relative(vscode.workspace.rootPath, document.fileName); // to relative
        fileIdentifier = fileIdentifier.substring(0, fileIdentifier.length - 8); // remove '.test.js'

        const codeLens: vscode.CodeLens[] = [];
        const testsInfo = this._fileTestsInfo && this._fileTestsInfo[fileIdentifier];

        for (let item of tree) {
            this._createCodeLens(document, codeLens, item, undefined, testsInfo);
        }

        return codeLens;
    }

    resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        throw new Error('Method not implemented.');
    }

    private _visit(sourceFile: ts.SourceFile, node: ts.Node) {
        const getLineOfPosition = (pos: number) => {
            while (/^\s$/.test(sourceFile.text.substr(pos, 1))) {
                ++pos;
            }

            return sourceFile.getLineAndCharacterOfPosition(pos).line;
        };

        switch (node.kind) {
            case ts.SyntaxKind.ExpressionStatement: {
                const obj = node as ts.ExpressionStatement;
                return this._visit(sourceFile, obj.expression);
            }

            case ts.SyntaxKind.CallExpression: {
                const obj = node as ts.CallExpression;
                const name = this._visit(sourceFile, obj.expression);
                if (name === 'describe') {
                    let children = this._visit(sourceFile, obj.arguments[1]);
                    if (!Array.isArray(children)) {
                        children = [children];
                    }

                    const result = {
                        name,
                        line: getLineOfPosition(obj.pos),
                        title: this._visit(sourceFile, obj.arguments[0]),
                        children
                    };

                    children.forEach(o => o.parent = result);
                    return result;
                } else if (name === 'it') {
                    return {
                        name,
                        line: getLineOfPosition(obj.pos),
                        title: this._visit(sourceFile, obj.arguments[0])
                    };
                }

                break;
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
                return obj.statements.map(statement => this._visit(sourceFile, statement));
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
            let testsCounter = 0, inconclusiveCounter = 0, succeedCounter = 0, failCounter = 0;
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
                    true,
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

        const stateStr = { undefined: 'Inconclusive', true: 'Success', false: 'Fail' };
        const title = stateStr[testInfo && testInfo.succeed as any];

        codeLens.push(new vscode.CodeLens(new vscode.Range(item.line, 0, item.line, title.length), {
            command: 'mochaTestRunner.runTest',
            title,
            arguments: [
                document,
                selector,
                false,
                false // debug
            ]
        }));

        return {
            tests: 1,
            inconclusive: testInfo === undefined ? 1 : 0,
            succeed: testInfo && testInfo.succeed ? 1 : 0,
            fail: testInfo && !testInfo.succeed ? 1 : 0
        };
    }
}
