// DEBUGGER may hit invisible breakpoint on "use strict" line above ... just hit F5 to continue.
// !! no import to vscode !!  (used by child_process)
import * as Mocha from 'mocha';
import * as path from 'path';
import { Glob } from 'glob';
import { TestProcessRequest, TestsResults } from "./Types";

let args: TestProcessRequest;
let results: TestsResults;
const suitePath: string[] = [];

process.on('message', processArgs => {
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

export function runTestProcess(processArgs: TestProcessRequest) {
    args = processArgs;
    const mocha = createMocha();

    if (args.fileName) {
        delete require.cache[args.fileName];
        mocha.addFile(args.fileName);

        console.log('Test file:');
        console.log(args.fileName);
        console.log();

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

            console.log('Test file(s):');
            files.forEach(file => {
                delete require.cache[file];
                mocha.addFile(file);
                console.log(file);
            });
            console.log();

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

    if (args.options) {
        if (Object.keys(args.options).length > 0) {
            options = { ...args.options };
            console.log(`Applying Mocha options:\n${JSON.stringify(options, null, 2).split('\n').slice(1).slice(0, -1).join('\n').replace(/"([^"]+)"/g, '$1')}\n`);
        }    
    } else {
        console.log(`No Mocha options are configured.\n  You can set it under File > Preferences > Workspace Settings.\n`);
    }

    const mocha = new Mocha(options);

    if (args.setup && args.setup.length > 0) {
        const file = path.join(args.workspacePath, args.setup);
        console.log('Setup file:\n  ' + file + '\n');
        delete require.cache[file];
        mocha.addFile(file);
    }

    if (args.grep) {
        console.log('Grep pattern:\n  ' + args.grep);
        mocha.grep(new RegExp(args.grep, 'i'));
        console.log();
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
            console.log('Starting mocha ...');
            mocha.run(callback);
        } catch (err) {
            reject(err.message);
        }
    });
}

function customReporter(runner: any, options: any) {
    // to get 'spec' output to stdout ...
    new Mocha.reporters.Spec(runner);

    results = {};

    runner
        .on('suite', suite => suitePath.push(suite.title))
        .on('suite end', () => suitePath.pop())
        .on('pass', (test: any) => {
            const selector = getFileSelector(test.file);
            results[selector] = results[selector] || [];
            results[selector].push({
                selector: trimArray(suitePath).concat([test.title]),
                state: 'Success'
            });
        })
        .on('fail', (test: any, err: any) => {
            const selector = getFileSelector(test.file);
            results[selector] = results[selector] || [];
            results[selector].push({
                selector: trimArray(suitePath).concat([test.title]),
                state: 'Fail'
            });
        });
}

function resolveGlob(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const cmd = path.join(args.workspacePath, args.rootPath);
        new Glob(args.glob, { cwd: cmd, ignore: args.ignore, dot: true }, (err, files) => {
            if (err) {
                return reject(err);
            }

            files = files.map(file => path.resolve(cmd, file));
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
