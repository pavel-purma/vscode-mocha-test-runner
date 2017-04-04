const webpack = require('webpack');
const glob = require('glob');
const path = require('path');
const nodeExternals = require('webpack-node-externals');

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
        // process.argv = [node.exe, _this_file_, args]
        const files = process.argv.slice(2);
        if (files.length > 0) {
            resolve(files);
            return;
        }

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
        const name = path.basename(file).slice(0, -9); // .test.js
        result.push({
            name,
            file: '.\\' + path.normalize(file),
            path: path.join(rootPath, '.temp', path.dirname(path.relative(rootPath, file)))
        });
    })).then(function () {
        return result;
    });
}

function compileEntries(entries) {
    let index = 0;

    const runNext = function (stats) { 
        ++index;
        if (index < entries.length) { 
            return runCompiler(entries[index]);
        }

        return Promise.resolve();
    }

    return runCompiler(entries[0]).then(runNext);
}

function runCompiler(entry) {
    return new Promise(function (resolve, reject) {
        console.log('Compiling ' + entry.name + ' ...');
        const config = {
            entry: {
                [entry.name]: entry.file
            },
            resolve: {
                extensions: ['.ts', '.tsx', '.js', '.json'],
                modules: [
                    path.join(rootPath, 'src'),
                    'node_modules'
                ]
            },
            context: rootPath,
            output: {
                path: entry.path,
                filename: '[name].test.js'
            },
            module: {
                rules: [{
                    test: /\.tsx?$/,
                    exclude: [/node_modules/],
                    use: [
                        { loader: 'babel-loader' },
                        { loader: 'ts-loader' }
                    ]
                }, {
                    test: /\.s?css$/,
                    exclude: [/node_modules/],
                    use: [
                        { loader: 'null-loader' }
                    ]
                }],
            },
            target: 'node',
            externals: [nodeExternals()],
            devtool: 'inline-source-map'
        };

        const compiler = webpack(config);
        compiler.run(function (err, stats) {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(stats.toString() + '\r\n');
            resolve(stats);
        });
    });
}