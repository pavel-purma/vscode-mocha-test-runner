const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

const args = process.argv.splice(2); // 0 === node.exe, 1 === this file

const tsConfig = 'tsconfig.json';
const customTsConfig = 'vscode-mocha-test-runner.tsconfig.json';

fs.exists(tsConfig, function (exists) {
    if (!exists) {
        throw new Error('Unable to find tsConfig.json!');
    }

    fs.readFile(tsConfig, 'utf8', function (err, data) {
        if (err) {
            throw err;
        }

        const json = JSON.parse(data);
        json.compilerOptions.outDir = '.test';
        json.compilerOptions.rootDir = '.';
        json.compilerOptions.watch = args.indexOf('--watch') !== -1;
        json.exclude = ["node_modules"];
    
        if (args.length > 0) {
            const files = args.filter(function (o) { return o !== '--watch' });
            if (files.length > 0) {
                json.files = files;
            }    
        }        

        data = JSON.stringify(json, null, 2);

        fs.writeFile(customTsConfig, data, function (err) {
            if (err) {
                throw err;
            }

            runTsc()
        });

    });
});

function runTsc() {
    const tsc = exec('node_modules\\.bin\\tsc.cmd --project ' + customTsConfig);
    tsc.stdout.pipe(process.stdout);
    tsc.stderr.pipe(process.stderr);

    tsc.on('exit', function (code) {
        if (code !== 0) {
            console.log('exit: ' + code);
            process.exit(code);
        }

        //fs.unlink(customTsConfig, function (err) { });
    });
}