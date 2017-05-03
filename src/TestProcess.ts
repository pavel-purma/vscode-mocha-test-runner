// !! no import to vscode !!  (used by child_process)
import * as Mocha from 'mocha';
import * as path from 'path';
import { Glob } from 'glob';
import { TestProcessArgs, TestsResults } from "./Types";

let args: TestProcessArgs;
let spec: Mocha.reporters.Spec;
let results: TestsResults;
const suitePath: string[] = [];

process.on('message', processArgs => {
    processArgs.options = { ...processArgs.options, timeout: 360000 };
    runTestProcess(processArgs)
        .then(results => {
            process.send(results);
            process.exit(0);
        })
        .catch(err => {
            process.send(err);
            process.exit(-1);
        });
});

export function runTestProcess(processArgs: TestProcessArgs) {
    args = processArgs;
    const mocha = createMocha();

    if (args.grep) {
        console.log();
        console.log('Grep pattern:');
        console.log('  ' + args.grep);
        mocha.grep(new RegExp(args.grep, 'i'));
    }

    if (args.fileName) {
        delete require.cache[args.fileName];
        mocha.addFile(args.fileName);
        return runMocha(mocha);
    }

    return resolveGlob()
        .then(files => {
            if (args.fileSelectors) {
                files = files.filter(file => {
                    const selector = getFileSelector(file);
                    return args.fileSelectors.indexOf(selector) !== -1;
                });
            }

            files.forEach(file => {
                delete require.cache[file];
                mocha.addFile(file);
            });

            return runMocha(mocha);
        });
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

    if (args.options && Object.keys(args.options).length > 0) {
        options = { ...args.options };
        console.log(`Applying Mocha options:\n${indent(JSON.stringify(options, null, 2))}`);
    } else {
        console.log(`No Mocha options are configured. You can set it under File > Preferences > Workspace Settings.`);
    }

    const mocha = new Mocha(options);
    
    if (args.setup) {
        for (let setupFile of args.setup) {
            const file = path.join(args.workspacePath, setupFile);
            delete require.cache[file];
            mocha.addFile(file);
        }
    }

    mocha.reporter(customReporter);
    return mocha;
}

function runMocha(mocha: Mocha) {
    return new Promise<TestsResults>((resolve, reject) => {
        const callback = (failures: number) => {            
            const keys = Object.keys(results);
            for (let key of keys) {
                results[key].sort((a, b) => {
                    const sa = a.selector.join(' ');
                    const sb = b.selector.join(' ');
                    return a < b ? -1 : a > b ? 1 : 0;
                });
            }

            resolve(results);
        };

        try {
            mocha.run(callback);
        } catch (err) {
            reject(err.message);
        }
    });
}

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
                err: {
                    actual: err.actual,
                    expected: err.expected,
                    message: err.message,
                    stack: err.stack
                }
            });
        });
}

function resolveGlob(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        new Glob(args.glob, { cwd: args.workspacePath, ignore: args.ignore, dot: true }, (err, files) => {
            if (err) {
                return reject(err);
            }

            files = files.map(file => path.resolve(args.workspacePath, file));
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

function getFileSelector(fileName: string) {
    const selector = path.relative(args.workspacePath, fileName);
    const index = selector.lastIndexOf('.');
    return (index === -1) ? selector : selector.substring(0, index);
}
