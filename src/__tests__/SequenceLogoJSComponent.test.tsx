import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";

Enzyme.configure({ adapter: new Adapter() });
import { default as Alignment } from "../Alignment";
import { SequenceLogoJSComponent } from "../SequenceLogoJSComponent";

describe("SequenceLogoJSComponent", () => {
  beforeEach(() => {
    jest.doMock("pixi.js");
  });
  it("Should render", () => {
    const wrapper = shallow(
      <SequenceLogoJSComponent
        alignment={new Alignment("", [])}
        characterWidth={2}
        logoLoaded={jest.fn()}
        id={"test-Sequence-Logo"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
