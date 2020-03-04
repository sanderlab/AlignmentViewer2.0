import * as Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

const jestGlobal = global as any;

jestGlobal["ts-jest"] = {
  tsConfig: "test/tsconfig.json"
};

jestGlobal["ts-jest"] = {
  tsConfig: "test/tsconfig.json"
};
export default () => {
  Enzyme.configure({ adapter: new Adapter() });
};
