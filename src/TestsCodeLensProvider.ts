import * as vscode from 'vscode';
import * as ts from "typescript";
import * as path from 'path';
import { getDocumentSelector, throwIfNot } from "./Utils";
import { FileTestStates, TestStates, TestState } from "./Types";
const escapeRegExp = require('escape-regexp');

export class TestsCodeLensProvider implements vscode.CodeLensProvider {
    constructor() {
        this._testStates = {};
        this._eventEmitter = new vscode.EventEmitter<void>();
    }

    private _items: { [fileName: string]: Item[] } = {};
    private _testStates: FileTestStates;
    private _eventEmitter: vscode.EventEmitter<void>;

    updateTestStates(fileSelector: string, newValues: TestStates) {
        throwIfNot('updateTestStates', fileSelector, 'fileSelector');
        throwIfNot('updateTestStates', newValues, 'newValues');

        const testStates = this._testStates[fileSelector];
        this._testStates[fileSelector] = testStates ? { ...testStates, ...newValues } : newValues;
        this._eventEmitter.fire(null);
    }

    updateFileTestStates(fileTestStates: FileTestStates) {
        throwIfNot('updateFileTestStates', fileTestStates, 'fileTestStates');

        this._testStates = this._testStates ? { ...this._testStates, ...fileTestStates } : fileTestStates;
        this._eventEmitter.fire(null);
    }

    updateAllRunningStatesTo(state: 'Inconclusive' | 'Success' | 'Fail') {
        if (!this._testStates) {
            return;
        }

        let needUpdate = false;
        for (let selector of Object.keys(this._testStates)) {
            const states = this._testStates[selector];
            for (let test of Object.keys(states)) {
                if (states[test] === 'Running') {
                    states[test] = state;
                    needUpdate = true;
                }
            }
        }

        if (needUpdate) {
            this._eventEmitter.fire(null);
        }
    }

    updateFileStates(selector: string, state: TestState) {
        if (!this._testStates) {
            return {};
        }

        const states = this._testStates[selector];
        if (!states) {
            return {};
        }

        for (let test of Object.keys(states)) {
            states[test] = state;
        }

        this._eventEmitter.fire(null);
        return states;
    }

    get onDidChangeCodeLenses() {
        return this._eventEmitter.event;
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const selector = getDocumentSelector(document);
        if (document.isDirty || this._items[selector] === undefined) {
            const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, false, ts.ScriptKind.Unknown);
            this._items[selector] = sourceFile.statements.map(statement => visitor(sourceFile, statement))
                .filter(o => o)
                // filter out *it* function calls that arent wrapped by *describe* function - mocha dont return file path for these ...
                .filter((o: Item) => o && (o.name === 'describe' || o.name === 'suite'));
        }

        const testStates = this._testStates[selector] || {};
        const items = this._items[selector];
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

        codeLens.command = {
            title: codeLens.title,
            command: 'vscode-mocha-test-runner.run-test',
            arguments: [codeLens]
        };

        return codeLens;
    }
}

export abstract class TestCodeLensBase extends vscode.CodeLens {
    constructor(range: vscode.Range, document: vscode.TextDocument, selector: string, state?: TestState) {
        super(range);
        throwIfNot('TestCodeLensBase', document, 'document');
        throwIfNot('TestCodeLensBase', selector, 'selector');

        this._document = document;
        this._selector = selector;
        this._state = state;
    }

    private _document: vscode.TextDocument;
    private _selector: string;
    private _state: TestState;

    get document(): vscode.TextDocument {
        return this._document;
    }

    get selector(): string {
        return this._selector;
    }

    abstract get title(): string;

    get selectors(): string[] {
        return [this._selector];
    }

    get state(): TestState {
        return this._state;
    }

    abstract get grep(): string;
}

type DescribeItem = { name: 'describe'; line: number; title: string; parent: DescribeItem; children: Item[]; }
type ItItem = { name: 'it'; line: number; title: string; parent: DescribeItem; }
type SuiteItem = { name: 'suite'; line: number; title: string; parent: SuiteItem; children: Item[]; };
type TestItem = { name: 'test'; line: number; title: string; parent: SuiteItem; };
type Item = DescribeItem | ItItem | SuiteItem | TestItem;
type createCodeLensResult = { tests: number, inconclusive: string[], running: string[], success: string[], fail: string[] };

class DescribeCodeLens extends TestCodeLensBase {
    constructor(range: vscode.Range, document: vscode.TextDocument, selector: string, state: TestState, selectors: string[]) {
        super(range, document, selector, state);
        throwIfNot('DescribeCodeLens', selectors, 'selectors');

        this._selectors = selectors;
    }

    private _selectors: string[];

    get selectors(): string[] {
        return this._selectors;
    }

    get title(): string {
        return this._selectors.length + ' ' + this.state;
    }

    get grep() {
        return '^(' + this.selectors.map(o => escapeRegExp(o)).join('|') + ')$';
    }
}

class DescribeAllCodeLens extends TestCodeLensBase {
    constructor(range: vscode.Range, document: vscode.TextDocument, selector: string) {
        super(range, document, selector, undefined);
    }

    get title(): string {
        return 'Run all';
    }

    get grep() {
        return '^' + this.selector;
    }
}

export class ItCodeLens extends TestCodeLensBase {
    constructor(range: vscode.Range, document: vscode.TextDocument, selector: string, state: TestState, debug: boolean) {
        super(range, document, selector, state);
        this._debug = debug;
    }

    private _debug: boolean;

    get debug(): boolean {
        return this._debug;
    }
    get title(): string {
        return this._debug ? 'Debug' : this.state;
    }

    get grep() {
        return '^' + escapeRegExp(this.selector) + '$';
    }
}

function visitor(sourceFile: ts.SourceFile, node: ts.Node) {
    throwIfNot('visitor', sourceFile, 'sourceFile');
    throwIfNot('visitor', node, 'node');

    switch (node.kind) {
        case ts.SyntaxKind.ExpressionStatement: {
            const obj = node as ts.ExpressionStatement;
            return visitor(sourceFile, obj.expression);
        }

        case ts.SyntaxKind.CallExpression: {
            const obj = node as ts.CallExpression;
            const name = visitor(sourceFile, obj.expression);
            switch (name) {
                case 'describe':
                case 'suite': {
                    let children = visitor(sourceFile, obj.arguments[1]);
                    if (!Array.isArray(children)) {
                        children = [children];
                    }
                    // known bug (wont fix): this will return wrong position:
                    // describe /* multiline comment 
                    //             here with character sequence *describe* in it * /('title', function() { });
                    const pos = sourceFile.text.lastIndexOf(name, obj.arguments[0].pos);
                    const result = {
                        name,
                        line: sourceFile.getLineAndCharacterOfPosition(pos).line,
                        title: visitor(sourceFile, obj.arguments[0]),
                        children
                    };

                    children.filter(o => o).forEach(o => o.parent = result);
                    return name === 'describe' ? result as DescribeItem : result as SuiteItem;
                }

                case 'it':
                case 'test': {
                    // known bug (wont fix): this will return wrong position:
                    // it /* multiline comment 
                    //             here with character sequence *it* in it * /('title', function() { });
                    const pos = sourceFile.text.lastIndexOf(name, obj.arguments[0].pos);
                    const result = {
                        name,
                        line: sourceFile.getLineAndCharacterOfPosition(pos).line,
                        title: visitor(sourceFile, obj.arguments[0])
                    };
                    return name === 'it' ? result as ItItem : result as TestItem;
                }
            }

            return null;
        }

        case ts.SyntaxKind.ArrowFunction: {
            const obj = node as ts.ArrowFunction;
            return visitor(sourceFile, obj.body);
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
                return visitor(sourceFile, obj.body);
            }

            break;
        }

        case ts.SyntaxKind.Block: {
            const obj = node as ts.Block;
            return obj.statements.map(statement => visitor(sourceFile, statement)).filter(o => o);
        }

        case ts.SyntaxKind.ImportDeclaration:
        case ts.SyntaxKind.VariableStatement:
        case ts.SyntaxKind.PropertyAccessExpression:
        case ts.SyntaxKind.FunctionDeclaration:
            return null;

        default: {
            console.log('Unresolved node: \'' + ts.SyntaxKind[node.kind] + '\'');
            return null;
        }
    }
}

function createCodeLens(testStates: { [title: string]: TestState }, document: vscode.TextDocument, codeLens: vscode.CodeLens[], item: Item, parentSelector?: string): createCodeLensResult {
    throwIfNot('createCodeLens', testStates, 'testStates');
    throwIfNot('createCodeLens', document, 'document');
    throwIfNot('createCodeLens', codeLens, 'codeLens');
    throwIfNot('createCodeLens', item, 'item');

    let selector = item.title;

    if (parentSelector) {
        selector = parentSelector + ' ' + selector;
    }

    if (item.name === 'it' || item.name === 'test') {

        const testState = testStates[selector] || 'Inconclusive';
        codeLens.push(new ItCodeLens(new vscode.Range(item.line, 0, item.line, testState.length), document, selector, testState, false));
        codeLens.push(new ItCodeLens(new vscode.Range(item.line, testState.length, item.line, testState.length + 5), document, selector, testState, true));
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

    if ((inconclusiveTests.length > 0 ? 1 : 0) + (successTests.length > 0 ? 1 : 0) + (failTests.length > 0 ? 1 : 0) > 1) {
        codeLens.push(new DescribeAllCodeLens(new vscode.Range(item.line, offset, item.line, offset + 7), document, selector));
    }

    return {
        tests: testsCounter,
        inconclusive: inconclusiveTests,
        running: runningTests,
        success: successTests,
        fail: failTests
    };
}
