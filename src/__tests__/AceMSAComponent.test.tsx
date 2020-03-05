import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";

Enzyme.configure({ adapter: new Adapter() });
import { AceMSAComponent } from "../AceMSAComponent";

describe("AceMSAComponent", () => {
  beforeEach(() => {
    jest.doMock("pixi.js");
  });
  it("Should render", () => {
    const wrapper = shallow(<AceMSAComponent />);
    expect(wrapper).toMatchSnapshot();
  });
});
