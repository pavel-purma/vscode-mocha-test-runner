const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    modules: [
      path.join(__dirname, 'src'),
      'node_modules'
    ]
  },
  context: __dirname,
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
}
