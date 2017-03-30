const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    devtool: 'source-map',
    entry: {
        Foo: 'Foo.tsx'
    },
    context: path.resolve(__dirname, 'src'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
        modules: [
            path.join(__dirname, 'src'),
            'node_modules'
        ]
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
            use: ExtractTextPlugin.extract({
                use: [
                    { loader: 'css-loader' },
                    { loader: 'sass-loader' }
                ]
            })
        }],
    },
    plugins: [
        new ExtractTextPlugin('[name].css'),
    ],
    externals: [
        'React', 'ReactDOM'
    ]
};