const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const path = require('path');


module.exports = (env, options) => {
  let plugins = [
    new HtmlWebpackPlugin({
        template: './src/html/index.html',
        inject: true,
        chunks: ['index'],
        filename: 'index.html'
    }),
    new HtmlWebpackPlugin({
        template: './src/html/login.html',
        inject: true,
        chunks: ['login'],
        filename: 'login.html'
    }),
  ]
  if (options.mode == 'production'){
    plugins.push(new CleanWebpackPlugin())
  }
  return {
    entry: {
        index: ["@babel/polyfill", './src/index.js'],
        login: ["@babel/polyfill", './src/login.js']
    },
    output: {
        filename: '[name].bundle.[contenthash].js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env']
              }
            }
          },
          {
            test: /\.css$/,
            use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
          },
        ]
      },
    plugins: plugins,
    devServer: {
        contentBase: './dist',
        open: true
    },
  }
};