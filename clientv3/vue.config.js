const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

module.exports = {
  configureWebpack: {
    plugins: [
      new MonacoWebpackPlugin({
        customLanguages: {
          label: 'yaml',
          entry: 'monaco-yaml',
          worker: {
            id: 'monaco-yaml/yamlWorker',
            entry: 'monaco-yaml/yaml.worker',
          },
        },
      })
    ],
  },
  devServer: {
    proxy: "http://localhost:3000",
  },
  css: {
    loaderOptions: {
      sass: {
        additionalData: `
          @import "@/sass/index.scss";
        `,
      },
    },
  },
};
