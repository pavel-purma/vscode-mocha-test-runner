const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

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
        json.compilerOptions.outDir = '.temp';
        json.compilerOptions.rootDir = '.';
        json.exclude = ["node_modules"];

        // process.argv = [node.exe, _this_file_, args]
        const files = process.argv.slice(2);
        if (files.length > 0) {
            json.files = files;
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
    tsc.on('exit', function (code) {
        if (code !== 0) {
            process.exit(code);
        }

        fs.unlink(customTsConfig, function (err) { });
    });
}