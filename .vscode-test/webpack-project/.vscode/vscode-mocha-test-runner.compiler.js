const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

// process.argv = [node.exe, _this_file_, args]
const files = process.argv.slice(2);

const tsConfig = 'tsconfig.json';
const customTsConfig = 'vscode-mocha-test-runner.tsconfig.json';


fs.exists(tsConfig, function (exists) {
    if (exists) {
        fs.readFile(tsConfig, 'utf8', function (err, data) {
            if (err) {
                throw err;
            }

            const json = JSON.parse(data);
            json.compilerOptions.jsx = 'react';
            json.compilerOptions.outDir = '.temp';
            if (files && files.length > 0) {
                json.files = files;
            }
            data = JSON.stringify(json, null, 2);

            fs.writeFile(customTsConfig, data, function (err) {
                if (err) {
                    throw err;
                }

                runTsc(customTsConfig)
            });

        });
    } else {
        throw new Error('tsConfig.json not found!');
    }
});



function runTsc(project) {
    var params = '';
    if (project) {
        params = ' --project ' + project;
    }

    const tsc = exec('node_modules\\.bin\\tsc.cmd' + params);
    tsc.on('exit', function (code) {
        if (code !== 0) {
            process.exit(code);
        }

        if (project) {
            fs.unlink(project, function (err) { });
        }
    });
}




