import "jest-webgl-canvas-mock";
import * as React from "react";

import Alignment from "../Alignment";
import { SequenceLogoComponent, LOGO_TYPES } from "../SequenceLogoComponent";

import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

describe("SequenceLogoComponent", () => {
  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <SequenceLogoComponent
        alignment={new Alignment("", [])}
        glyphWidth={3}
        id={"test-sequence-logo-component"}
        logoType={LOGO_TYPES.BARS}
        logoLoaded={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should render when given a basic alignment.", () => {
    const wrapper = shallow(
      <SequenceLogoComponent
        alignment={
          new Alignment("my-alignment", [
            { id: "my-alignment-1", sequence: "CDE" },
            { id: "my-alignment-2", sequence: "EDC" }
          ])
        }
        glyphWidth={3}
        id={"test-sequence-logo-component"}
        logoType={LOGO_TYPES.BARS}
        logoLoaded={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
