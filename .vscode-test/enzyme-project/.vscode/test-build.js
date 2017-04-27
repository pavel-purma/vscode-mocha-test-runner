const webpack = require('webpack');
const glob = require('glob');
const path = require('path');

const args = process.argv.splice(2); // 0 === node.exe, 1 === this file

const rootPath = path.join(__dirname, '..');

getFiles()
    .then(getEntries)
    .then(compileEntries)
    .catch(function (err) {
        console.error(err);
        process.exit(1);
    });

function getFiles() {
    return new Promise(function (resolve, reject) {
        glob('test/**/*.test.*', { cwd: rootPath }, function (err, matches) {
            if (err) {
                reject(err);
            } else {
                resolve(matches);
            }
        });
    });
}

function getEntries(files) {
    const result = [];
    return Promise.all(files.map(function (file) {

        let name = path.basename(file);
        let index = name.lastIndexOf('.');
        name = name.slice(0, index - 5);
        result.push({
            name,
            file: '.\\' + path.normalize(file),
            path: path.join(rootPath, '.test', path.dirname(path.relative(rootPath, file)))
        });
    })).then(function () {
        return result;
    });
}

function compileEntries(entries) {
    const config = require('../webpack.config.test.js');
    config.entry = {};
    for (let entry of entries) {
        const name = path.join(path.relative(rootPath, entry.path), entry.name);
        config.entry[name] = entry.file;
    }

    const compiler = webpack(config);
    if (args.indexOf('--watch') !== -1) {
        compiler.watch(undefined, compilerCallback);
    } else {
        compiler.run(compilerCallback);
    }
}

function compilerCallback(err, stats) {
    if (err) {
        throw err;
    }
    
    console.log(stats.toString() + '\r\n');
}
