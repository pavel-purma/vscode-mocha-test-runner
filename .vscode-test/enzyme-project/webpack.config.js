const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const WrapperPlugin = require('wrapper-webpack-plugin');



const components = [
  'SelectEdit'
];

const externals = {
  "jquery": 'jQuery',
  "react": 'React',
  "react-dom": 'ReactDOM',
  "moment": 'moment'
};


const entry = {};
for (var i = 0; i < components.length; ++i) {
  const name = components[i];
  entry[name] = [
    './src/Components/' + name + '.tsx',
  ];
}

const config = {
  devtool: 'source-map',
  entry: entry,
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
    }],
  },
  plugins: [
    new ExtractTextPlugin('[name].css'),
  ],
  externals: externals
};

if (process.env.NODE_ENV === 'production') {
  config.module.rules = config.module.rules.concat([
    {
      test: /\.s?css$/,
      exclude: [/node_modules/],
      use: {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]'
        },
      }
    },
  ]);
  config.plugins = config.plugins.concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        screw_ie8: true,
        conditionals: true,
        unused: true,
        comparisons: true,
        sequences: true,
        dead_code: true,
        evaluate: true,
        if_return: true,
        join_vars: true,
      },
      output: {
        comments: false,
      },
      sourceMap: true
    }),
    new WrapperPlugin({
      header: function (fileName) {
        return '/* #region ' + fileName.replace('.min.js', '') + ' - ' + new Date().toLocaleString() + ' */\n';
      },
      footer: '\n/* #endregion */\n'
    })
  ]);
} else {
  config.module.rules = config.module.rules.concat([
    {
      test: /\.s?css$/,
      exclude: [/node_modules/],
      use: ExtractTextPlugin.extract({
        use: [
          { loader: 'css-loader' },
          { loader: 'sass-loader' }
        ]
      })
    }
  ]);
}

module.exports = config;
