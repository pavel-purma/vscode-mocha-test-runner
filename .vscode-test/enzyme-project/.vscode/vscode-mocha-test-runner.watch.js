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
    const config = {
        entry: {
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

    
    for (let entry of entries) {
        const name = path.join(path.relative(rootPath, entry.path), entry.name);
        config.entry[name] = entry.file;
    }

    const compiler = webpack(config);
    compiler.watch(undefined, function (err, stats) {
        if (err) {
            reject(err);
            return;
        }
            
        console.error('compiled');
        console.log(stats.toString() + '\r\n');
    });
}
