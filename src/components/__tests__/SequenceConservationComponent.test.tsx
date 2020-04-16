import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";

import { Alignment } from "../../common/Alignment";
import { SequenceConservationComponent } from "../SequenceConservationComponent";

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
