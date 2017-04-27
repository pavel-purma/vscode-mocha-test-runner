import * as vscode from 'vscode';
import * as Mocha from 'mocha';
import * as path from 'path';
import { Glob } from 'glob';
import { config } from "./config";
import { TestsResults, getFileSelector } from "./Utils";

export function runTests(grep?: RegExp) {
    const mocha = createMocha();
    
    if (grep) {
        console.log();
        console.log('Grep pattern:');
        console.log('  ' + grep);
        mocha.grep(grep);
    }

    return resolveGlob()
        .then(files => {
            files.forEach(file => {
                delete require.cache[file];
                mocha.addFile(file);
                console.log('Test file: ' + file);
            });

            return runMocha(mocha);
        });
}

export function runTestsInFile(filePath: string) {
    const mocha = createMocha();

    delete require.cache[filePath];
    mocha.addFile(filePath);

    return runMocha(mocha);
}

function createMocha() {
    let options: {
        grep?: RegExp;
        ui?: string;
        reporter?: string;
        timeout?: number;
        reporterOptions?: any;
        slow?: number;
        bail?: boolean;
    } = {};

    if (config.options) {
        options.grep = config.options.grep;
        options.ui = config.options.ui;
        options.reporter = config.options.reporter;
        options.timeout = config.options.timeout;
        options.reporterOptions = config.options.reporterOptions;
        options.slow = config.options.slow;
        options.bail = config.options.bail;
    }

    const jsonOptions = JSON.stringify(options, null, 2);
    if (jsonOptions !== '{}') {
        console.log(`Applying Mocha options:\n${indent(jsonOptions)}`);
    } else {
        console.log(`No Mocha options are configured. You can set it under File > Preferences > Workspace Settings.`);
        options = undefined;
    }

    const mocha = new Mocha(options);
    if (config.setup) {
        const file = path.join(vscode.workspace.rootPath, config.setup);
        delete require.cache[file];
        mocha.addFile(file);
    }

    mocha.reporter(customReporter);
    return mocha;
}

function runMocha(mocha: Mocha) {
    return new Promise<TestsResults>(resolve => {
        mocha.run(failures => {
            resolve({
                success: success,
                fail: fail
            });
        });
    });
}

let spec: Mocha.reporters.Spec;
let success: { [file: string]: string[] };
let fail: { [file: string]: string[] };
const suitePath: string[] = [];

function customReporter(runner: any, options: any) {
    spec = new Mocha.reporters.Spec(runner);
    success = {};
    fail = {};

    const callback = (target: { [file: string]: string[] }) => {
        return (test: any) => {
            const selector = getFileSelector(test.file);
            let list = target[selector];
            if (!list) {
                list = [];
                target[selector] = list;
            }
            list.push(trimArray(suitePath).concat([test.title]).join(' '));
        };
    }

    runner
        .on('suite', suite => suitePath.push(suite.title))
        .on('suite end', () => suitePath.pop())
        .on('pass', callback(success))
        .on('fail', callback(fail));
}

function resolveGlob(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const rootPath = path.join(vscode.workspace.rootPath, config.files.rootPath);
        new Glob('**/*.test.js', { cwd: rootPath, ignore: config.files.ignore }, (err, files) => {
            if (err) {
                return reject(err);
            }

            files = files.map(file => path.resolve(rootPath, file));
            resolve(files);
        });
    });
}

function indent(lines) {
    return lines.split('\n').map(line => `  ${line}`).join('\n');
}

function trimArray<T>(array: T[]): T[] {
    return array.reduce((trimmed, item) => {
        item && trimmed.push(item);
        return trimmed;
    }, []);
}

function dedupeStrings(array: string[]): string[] {
    const keys = {};
    array.forEach(key => keys[key] = 0);
    return Object.keys(keys);
}