/**
 * @fileoverview Webpack configuration for 2fapc project
 * @description This configuration sets up a development environment with Babel, CSS loaders, 
 * HTML webpack plugin, and dev server with proxy settings.
 */

"use strict";

import path from "path";
import hw_plugin from "html-webpack-plugin";
import url from "url";

const { fileURLToPath: uri_to_path } = url;

/**
 * Current directory path using ES modules compatibility
 * @type {string}
 */
const __dirname = path.dirname(uri_to_path(import.meta.url));

/**
 * Entry point for the webpack bundle
 * @type {string}
 */
const entry = "./src/client/index.jsx";

/**
 * Output configuration for webpack
 * @type {Object}
 * @property {string} path - Output directory path
 * @property {string} filename - Output bundle filename
 * @property {string} publicPath - Public URL path for assets
 */
const output = {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: "/"
};

/**
 * Module configuration with loaders
 * @type {Object}
 * @property {Array} rules - Array of loader rules
 */
const module = {
    rules: [
        {
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            use: {
                loader: "babel-loader"
            }
        },
        {
            test: /\.css$/,
            use: ["style-loader", "css-loader"]
        }
    ]
}

/**
 * Webpack plugins configuration
 * @type {Array}
 */
const plugins = [
    new hw_plugin({
        template: "./src/views/index.html",
    })
];

/**
 * Module resolution configuration
 * @type {Object}
 * @property {Array<string>} extensions - File extensions to resolve
 */
const resolve = {
    extensions: [".js", ".jsx"]
};

/**
 * Development server configuration
 * @type {Object}
 * @property {boolean} historyApiFallback - Enable HTML5 history API fallback
 * @property {Object} proxy - Proxy configuration for API requests
 */
const devServer = {
    historyApiFallback: true,
    port: 32505,
    proxy: [{
        "/api": "http://localhost:32504"
    }]
};

/**
 * Complete webpack configuration object
 * @type {Object}
 * @property {string} entry - Entry point
 * @property {Object} output - Output configuration
 * @property {Object} module - Module configuration with loaders
 * @property {Array} plugins - Webpack plugins
 * @property {Object} resolve - Module resolution settings
 * @property {Object} devServer - Development server settings
 */
export default {
    entry,
    output,
    module,
    plugins,
    resolve,
    devServer
};