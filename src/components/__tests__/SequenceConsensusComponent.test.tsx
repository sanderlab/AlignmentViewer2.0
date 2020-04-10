import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";

import Alignment from "../../common/Alignment";
import { SequenceConsensusComponent } from "../SequenceConsensusComponent";

describe("SequenceConsensusComponent", () => {
  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <SequenceConsensusComponent
        characterWidth={3}
        consensusPlotLoaded={jest.fn()}
        alignment={new Alignment("", [])}
        id={"test-sequence-logo-component"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
