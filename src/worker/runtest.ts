import * as Mocha from 'mocha';
import * as fs from 'fs';
import * as path from 'path';

interface Args {
    files: string[];
    options: any;
    grep: string;
    rootPath: string;
    setup: string;
}

const escapeRegExp = require('escape-regexp');

const args: Args = JSON.parse(process.argv[2]);
const options = args.options;

if (Object.keys(options || {}).length) {
    console.log(`Applying Mocha options:\n${indent(JSON.stringify(options, null, 2))}`);
} else {
    console.log(`No Mocha options are configured. You can set it under File > Preferences > Workspace Settings.`);
}

const mocha = new Mocha(options);

console.log();
console.log('Test file(s):');

if (args.setup) { 
    mocha.addFile(path.join(args.rootPath, '.vscode', args.setup));
}

args.files.forEach(file => {
    console.log(`  ${file}`);
    mocha.addFile(file);
});

const grep = args.grep;

if (grep) {
    console.log();
    console.log('Grep pattern:');
    console.log('  ' + grep);

    mocha.grep(new RegExp(grep, 'i'));
}

var _spec: Mocha.reporters.Spec;
const suitePath: any[] = [];
const failed: any[] = [];
const passed: any[] = [];

mocha.reporter(customReporter);

mocha.run();

function customReporter(runner: any, options: any) {
    _spec = new Mocha.reporters.Spec(runner);

    runner
        .on('suite', suite => {
            suitePath.push(suite.title);
        })
        .on('suite end', () => {
            suitePath.pop();
        })
        .on('pass', test => {
            passed.push(toJS(suitePath, test));
        })
        .on('fail', test => {
            failed.push(toJS(suitePath, test));
        })
        .on('end', () => {
            console.error(JSON.stringify({ passed, failed }));
        });
}

function toJS(suitePath, test) {
    const name = test.title;

    return {
        name,
        fullName: trimArray(suitePath).concat([name]).join('/'),
        suitePath: suitePath.slice(),
        file: test.file
    };
}

function trimArray(array) {
    return array.reduce((trimmed, item) => {
        item && trimmed.push(item);
        return trimmed;
    }, []);
}

function indent(lines) {
    return lines.split('\n').map(line => `  ${line}`).join('\n');
}