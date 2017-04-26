import * as vscode from 'vscode';
import * as ts from "typescript";

export class TestsCodeLensProvider implements vscode.CodeLensProvider {
    constructor() {
        this._testStates = {};
        this._eventEmitter = new vscode.EventEmitter<void>();
    }

    private _items: { [fileName: string]: Item[] } = {};
    private _testStates: FileTestStates;
    private _eventEmitter: vscode.EventEmitter<void>;

    updateTestStates(fileName: string, newValues: TestStates) {
        const testStates = this._testStates[fileName];
        this._testStates[fileName] = testStates ? { ...testStates, ...newValues } : newValues;
        this._eventEmitter.fire(null);
    }

    get onDidChangeCodeLenses() {
        return this._eventEmitter.event;
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        if (document.isDirty || this._items[document.fileName] === undefined) {
            const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, false, ts.ScriptKind.Unknown);
            this._items[document.fileName] = sourceFile.statements.map(statement => visit(sourceFile, statement)).filter(o => o);
        }
        const testStates = this._testStates[document.fileName] || {};
        const items = this._items[document.fileName];
        const result: vscode.CodeLens[] = [];
        for (let i = 0; i < items.length; ++i) {
            createCodeLens(testStates, document, result, items[i]);
        }

        return result;
    }

    resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        if (!(codeLens instanceof TestCodeLensBase)) {
            return null;
        }

        if ((codeLens instanceof DescribeCodeLens && codeLens.state === 'Running') ||
            (codeLens instanceof ItCodeLens && codeLens.state === 'Running')) {
            codeLens.command = {
                title: codeLens.title,
                command: 'vscode-mocha-test-runner.noop',
                arguments: [codeLens]
            };
        } else {
            codeLens.command = {
                title: codeLens.title,
                command: 'vscode-mocha-test-runner.run-test',
                arguments: [codeLens]
            };
        }

        return codeLens;
    }
}

type TestState = 'Inconclusive' | 'Running' | 'Success' | 'Fail';

export type TestStates = { [title: string]: TestState };
export type FileTestStates = { [fileName: string]: TestStates };

export abstract class TestCodeLensBase extends vscode.CodeLens {
    constructor(range: vscode.Range, document: vscode.TextDocument, selector: string) {
        super(range);
        this._document = document;
        this._selector = selector;
    }

    private _document: vscode.TextDocument;
    private _selector: string;

    get document(): vscode.TextDocument {
        return this._document;
    }

    abstract get title(): string;

    get selectors(): string[] {
        return [this._selector];
    }
}

class DescribeCodeLens extends TestCodeLensBase {
    constructor(range: vscode.Range, document: vscode.TextDocument, selector: string, state: TestState, selectors: string[]) {
        super(range, document, selector);
        this._state = state;
        this._selectors = selectors;
    }

    private _state: TestState;
    private _selectors: string[];

    get state(): TestState {
        return this._state;
    }

    get selectors(): string[] {
        return this._selectors;
    }

    get title(): string {
        return this._selectors.length + ' ' + this._state;
    }
}

class ItCodeLens extends TestCodeLensBase {
    constructor(range: vscode.Range, document: vscode.TextDocument, selector: string, state: TestState) {
        super(range, document, selector);
        this._state = state;
    }

    private _state: TestState;

    get state(): TestState {
        return this._state;
    }

    get title(): string {
        return this._state;
    }
}

type DescribeItem = { name: 'describe'; line: number; title: string; parent: DescribeItem; children: Item[]; }
type ItItem = { name: 'it'; line: number; title: string; parent: DescribeItem; }
type Item = DescribeItem | ItItem;

function visit(sourceFile: ts.SourceFile, node: ts.Node) {
    switch (node.kind) {
        case ts.SyntaxKind.ExpressionStatement: {
            const obj = node as ts.ExpressionStatement;
            return visit(sourceFile, obj.expression);
        }

        case ts.SyntaxKind.CallExpression: {
            const obj = node as ts.CallExpression;
            const name = visit(sourceFile, obj.expression);
            switch (name) {
                case 'describe': {
                    let children = visit(sourceFile, obj.arguments[1]);
                    if (!Array.isArray(children)) {
                        children = [children];
                    }
                    // known bug (wont fix): this will return wrong position:
                    // describe /* multiline comment 
                    //             here with character sequence *describe* in it * /('title', function() { });
                    const pos = sourceFile.text.lastIndexOf('describe', obj.arguments[0].pos);
                    const result = {
                        name,
                        line: sourceFile.getLineAndCharacterOfPosition(pos).line,
                        title: visit(sourceFile, obj.arguments[0]),
                        children
                    };

                    children.filter(o => o).forEach(o => o.parent = result);
                    return result as DescribeItem;
                }

                case 'it': {
                    // known bug (wont fix): this will return wrong position:
                    // it /* multiline comment 
                    //             here with character sequence *it* in it * /('title', function() { });
                    const pos = sourceFile.text.lastIndexOf('it', obj.arguments[0].pos);
                    return {
                        name,
                        line: sourceFile.getLineAndCharacterOfPosition(pos).line,
                        title: visit(sourceFile, obj.arguments[0])
                    } as ItItem;
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
                return visit(sourceFile, obj.body);
            }

            break;
        }

        case ts.SyntaxKind.Block: {
            const obj = node as ts.Block;
            return obj.statements.map(statement => visit(sourceFile, statement)).filter(o => o);
        }

        case ts.SyntaxKind.ImportDeclaration:
        case ts.SyntaxKind.VariableStatement:
        case ts.SyntaxKind.PropertyAccessExpression: {
            return null;
        }

        default: {
            console.log('Unresolved node: \'' + ts.SyntaxKind[node.kind] + '\'');
            return null;
        }
    }
}

type createCodeLensResult = { tests: number, inconclusive: string[], running: string[], success: string[], fail: string[] };

function createCodeLens(testStates: { [title: string]: TestState }, document: vscode.TextDocument, codeLens: vscode.CodeLens[], item: Item, parentSelector?: string): createCodeLensResult {
    let selector = item.title;

    if (parentSelector) {
        selector = parentSelector + '/' + selector;
    }

    if (item.name === 'it') {
        const testState = testStates[selector] || 'Inconclusive';
        codeLens.push(new ItCodeLens(new vscode.Range(item.line, 0, item.line, testState.length), document, selector, testState));
        return {
            tests: 1,
            inconclusive: testState === 'Inconclusive' ? [selector] : [],
            running: testState === 'Running' ? [selector] : [],
            success: testState === 'Success' ? [selector] : [],
            fail: testState === 'Fail' ? [selector] : [],
        };
    }

    let testsCounter = 0;
    const inconclusiveTests: string[] = [];
    const runningTests: string[] = [];
    const successTests: string[] = [];
    const failTests: string[] = [];
    for (let child of item.children) {
        const { tests, inconclusive, running, success, fail } = createCodeLens(testStates, document, codeLens, child, selector);
        testsCounter += tests;
        inconclusiveTests.push.apply(inconclusiveTests, inconclusive);
        runningTests.push.apply(runningTests, running);
        successTests.push.apply(successTests, success);
        failTests.push.apply(failTests, fail);
    }

    let offset = 0;
    const factory = (state: TestState, selectors: string[]) => {
        if (selectors.length > 0) {
            const length = state.length + (selectors.length + '').length + 2;
            codeLens.push(new DescribeCodeLens(new vscode.Range(item.line, offset, item.line, offset + length), document, selector, state, selectors));
            offset += length;
        }
    };

    factory('Inconclusive', inconclusiveTests);
    factory('Running', runningTests);
    factory('Success', successTests);
    factory('Fail', failTests);

    return {
        tests: testsCounter,
        inconclusive: inconclusiveTests,
        running: runningTests,
        success: successTests,
        fail: failTests
    };
}