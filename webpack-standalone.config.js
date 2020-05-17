/**
 * This config is used to generate a standalone javascript and
 * css file that can be imported into a basic html file.
 */
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: "./dist/js/index.js",
  output: {
    library: "AlignmentViewer2",
    libraryTarget: "umd",
    filename: "standalone/alignmentviewer.js",
    path: path.resolve(__dirname, "dist"),
  },
  optimization: {
    minimize: true,
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: "standalone/alignmentviewer.css" }),
  ],
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              modules: {
                //needed to remove all :global tags, but not generate unique
                //css module names
                getLocalIdent: (
                  context,
                  localIdentName,
                  localName,
                  options
                ) => {
                  return localName;
                },
              },
            },
          },
          "sass-loader",
        ],
      },
    ],
  },
};
