const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
 
module.exports = {
    context: path.join(__dirname, 'your-app'),
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'static' }
            ]
        })
    ]
};

module.exports = {
    entry: './src/program.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'static' }
            ]
        })
    ],
    watch: true
};