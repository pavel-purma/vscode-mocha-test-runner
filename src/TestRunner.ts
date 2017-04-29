import * as vscode from 'vscode';
import * as Mocha from 'mocha';
import * as path from 'path';
import { Glob } from 'glob';
import { config } from "./config";
import { TestsResults, getFileSelector, throwIfNot, appendError } from "./Utils";

export function runTests(grep?: RegExp, fileSelectors?: string[]) {
    const mocha = createMocha();

    if (grep) {
        console.log();
        console.log('Grep pattern:');
        console.log('  ' + grep);
        mocha.grep(grep);
    }

    return resolveGlob()
        .then(files => {
            if (fileSelectors) {
                files = files.filter(file => {
                    const selector = getFileSelector(file);
                    return fileSelectors.indexOf(selector) !== -1;
                });
            }

            files.forEach(file => {
                delete require.cache[file];
                mocha.addFile(file);
                console.log('Test file: ' + file);
            });

            return runMocha(mocha);
        })
        .catch(appendError);
}

export function runTestsInFile(filePath: string) {
    throwIfNot('runTestsInFile', filePath, 'filePath');

    const mocha = createMocha();

    delete require.cache[filePath];
    mocha.addFile(filePath);

    return runMocha(mocha)
        .catch(appendError);
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
    } = undefined;

    if (config.options && Object.keys(config.options).length > 0) {
        options = { ...config.options };
        console.log(`Applying Mocha options:\n${indent(JSON.stringify(options, null, 2))}`);
    } else {
        console.log(`No Mocha options are configured. You can set it under File > Preferences > Workspace Settings.`);
    }

    const mocha = new Mocha(options);
    if (config.files.setup) {
        for (let setup of config.files.setup) {
            const file = path.join(vscode.workspace.rootPath, setup);
            delete require.cache[file];
            mocha.addFile(file);
        }
    }

    mocha.reporter(customReporter);
    return mocha;
}

function runMocha(mocha: Mocha) {
    throwIfNot('runMocha', mocha, 'mocha');

    return new Promise<TestsResults>(resolve => {
        mocha.run(failures => {
            const keys = Object.keys(results);
            for (let key of keys) {
                results[key].sort((a, b) => {
                    const sa = a.selector.join(' ');
                    const sb = b.selector.join(' ');
                    return a < b ? -1 : a > b ? 1 : 0;
                });
            }
            resolve(results);
        });
    });
}

let spec: Mocha.reporters.Spec;
let results: TestsResults;
const suitePath: string[] = [];

function customReporter(runner: any, options: any) {
    spec = new Mocha.reporters.Spec(runner);
    results = {};

    runner
        .on('suite', suite => suitePath.push(suite.title))
        .on('suite end', () => suitePath.pop())
        .on('pass', (test: any) => {
            const selector = getFileSelector(test.file);
            results[selector] = results[selector] || [];
            results[selector].push({
                selector: trimArray(suitePath).concat([test.title]),
            });
        })
        .on('fail', (test: any, err: any) => {
            const selector = getFileSelector(test.file);
            results[selector] = results[selector] || [];
            results[selector].push({
                selector: trimArray(suitePath).concat([test.title]),
                err
            });
        });
}

function resolveGlob(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const rootPath = path.join(vscode.workspace.rootPath, config.files.rootPath);
        new Glob('**/*.test.js', { cwd: rootPath, ignore: config.files.ignore, dot: true }, (err, files) => {
            if (err) {
                return reject(err);
            }

            files = files.map(file => path.resolve(rootPath, file));
            resolve(files);
        });
    });
}

function indent(lines) {
    throwIfNot('indent', lines, 'lines');

    return lines.split('\n').map(line => `  ${line}`).join('\n');
}

function trimArray<T>(array: T[]): T[] {
    throwIfNot('trimArray', array, 'array');

    return array.reduce((trimmed, item) => {
        item && trimmed.push(item);
        return trimmed;
    }, []);
}

function dedupeStrings(array: string[]): string[] {
    throwIfNot('dedupeStrings', array, 'array');

    const keys = {};
    array.forEach(key => keys[key] = 0);
    return Object.keys(keys);
}