import * as Mocha from 'mocha';
import * as path from 'path';
import { Glob } from 'glob';

interface Args {
    options: any;
    files: {
        glob: string;
        ignore: string[];
    };
    rootPath: string;
    setup: string;
}

interface TestInfo {
    name: string;
    fullName: string;
    suitePath: string[];
    file: string;
}

interface SuiteInfo {
    suite: {
        tests: any[];
        suites: SuiteInfo[];
        file: string;
    };
    path: string[];
}

const args: Args = JSON.parse(process.argv[2]);

createMocha(args.rootPath, args.options, args.files.glob, args.files.ignore)
    .then((mocha: any) => crawlTests(mocha.suite))
    .then(tests => console.error(JSON.stringify(tests)))
    .catch(err => {
        console.error(err.stack);
        process.exit(-1);
    });

function createMocha(rootPath: string, options: any, glob: string, ignore: string[]): Promise<Mocha> {
    return new Promise((resolve, reject) => {
        new Glob(glob, { cwd: rootPath, ignore }, (err, files) => {
            if (err) {
                return reject(err);
            }

            try {
                const mocha = new Mocha(options);

                if (args.setup) { 
                    mocha.addFile(path.join(args.rootPath, '.vscode', args.setup));
                }
                
                files.forEach(file => mocha.addFile(path.resolve(rootPath, file)));
                (mocha as any).loadFiles();
                resolve(mocha);
            } catch (ex) {
                reject(ex);
            }
        });
    });
}

function crawlTests(suite) {
    let suites = [{ suite, path: [suite.title] }];
    let tests: TestInfo[] = [];

    while (suites.length) {
        const entry = suites.shift();
        const suite = entry.suite;

        if (suite.tests && suite.tests.length > 0) {
            const suiteTests = suite.tests.map(test => {
                const name = test.title;

                return {
                    name,
                    fullName: trimArray(entry.path).concat([name]).join('/'),
                    suitePath: entry.path,
                    file: suite.file
                };
            });

            tests = tests.concat(suiteTests);
        }

        if (suite.suites && suite.suites.length > 0) {
            const suiteSuites = suite.suites.map(suite => {
                return {
                    suite,
                    path: entry.path.concat(suite.title),
                };
            });

            suites = suites.concat(suiteSuites);
        }
    }

    return tests;
}

function trimArray<T>(array: T[]): T[] {
    return array.reduce((trimmed, item) => {
        item && trimmed.push(item);
        return trimmed;
    }, []);
}
