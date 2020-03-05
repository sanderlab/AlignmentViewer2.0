import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";

import { AceMSAComponent } from "../AceMSAComponent";

describe("AceMSAComponent", () => {
  beforeAll(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });
  it("Should render", () => {
    const wrapper = shallow(<AceMSAComponent />);
    expect(wrapper).toMatchSnapshot();
  });
});
