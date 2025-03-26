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
        // These files will be included into each vue component,
        // so they should contain sass which doesn't output any css code,
        // like variables and mixins.
        // Order here is important.
        additionalData: `
          @import "@/sass/_variables.scss";
          @import "~bulma/sass/utilities/mixins.sass";
        `,
      },
    },
  },
};
