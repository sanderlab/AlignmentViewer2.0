/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const glob = require("glob");
const fse = require("fs-extra");
/* eslint-enable @typescript-eslint/no-var-requires */
const srcDir = path.join("./src");
const jsDir = path.join("./dist/js");
const esmDir = path.join("./dist/esm");
const umdDir = path.join("./dist/umd");
const files = glob.sync("**/*.scss", {
  cwd: srcDir,
});
files.forEach((file) => {
  const from = path.join(srcDir, file);
  fse.copySync(from, path.join(jsDir, file));
  fse.copySync(from, path.join(esmDir, file));
  fse.copySync(from, path.join(umdDir, file));
});
