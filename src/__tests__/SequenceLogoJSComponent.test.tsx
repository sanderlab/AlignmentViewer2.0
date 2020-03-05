import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";
import { default as Alignment } from "../Alignment";
import { SequenceLogoJSComponent } from "../SequenceLogoJSComponent";

describe("SequenceLogoJSComponent", () => {
  beforeAll(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  it("Should render when given an empty alignment.", () => {
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

  it("Should render when given an alignment.", () => {
    const wrapper = shallow(
      <SequenceLogoJSComponent
        alignment={
          new Alignment("test-alignment", [
            { id: "the-first", sequence: "ABC" }
          ])
        }
        characterWidth={2}
        logoLoaded={jest.fn()}
        id={"test-Sequence-Logo"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
