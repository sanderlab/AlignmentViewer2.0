import "jest-webgl-canvas-mock";
import * as React from "react";

import Alignment from "../Alignment";
import { SequenceConservationComponent } from "../SequenceConservationComponent";

import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

describe("SequenceConservationComponent", () => {
  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <SequenceConservationComponent
        characterWidth={3}
        conservationPlotLoaded={jest.fn()}
        alignment={new Alignment("", [])}
        id={"test-sequence-logo-component"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
