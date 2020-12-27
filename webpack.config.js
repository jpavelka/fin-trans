const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');


module.exports = (env, options) => {
  let plugins = [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    new HtmlWebpackPlugin({
        filename: 'index.html',
        title: 'Transactions',
        template: './src/html/template.html',
        inject: true,
        chunks: ['index'],
        minify: {
          collapseWhitespace: options.mode == 'production'
        },
    }),
    new HtmlWebpackPlugin({
        filename: 'login.html',
        title: 'Transactions - Login',
        template: './src/html/template.html',
        inject: true,
        chunks: ['login'],
        imports: '<link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/4.6.1/firebase-ui-auth.css" />',
        bodyTemplate: "<div id='firebaseui-auth-container'></div>",
        minify: {
          collapseWhitespace: options.mode == 'production'
        },
    }),
    new HtmlWebpackPlugin({
        filename: 'tos.html',
        title: 'Transactions - Terms of Service',
        template: './src/html/template.html',
        inject: true,
        chunks: ['tos'],
        bodyTemplate: "<div>Use this, if you dare...</div>",
        minify: {
          collapseWhitespace: options.mode == 'production'
        },
    }),
    new HtmlWebpackPlugin({
        filename: 'privacy.html',
        title: 'Transactions - Terms of Service',
        template: './src/html/template.html',
        chunks: ['privacy'],
        bodyTemplate: "<div>Your data will not be shared with anyone. We Promise.</div>",
        minify: {
          collapseWhitespace: options.mode == 'production'
        },
    }),
  ]
  if (options.mode == 'production'){
    plugins.push(new CleanWebpackPlugin())
  }
  return {
    entry: {
        index: ["@babel/polyfill", './src/nav.js', './src/index.js', './src/css/nav.css'],
        login: ["@babel/polyfill", './src/nav.js', './src/login.js', './src/css/nav.css'],
        tos: ['./src/nav.js', './src/css/nav.css'],
        privacy: ['./src/nav.js', './src/css/nav.css'],
    },
    output: {
        filename: '[name].[contenthash].js',
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
            use: [MiniCssExtractPlugin.loader, 'css-loader'],
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