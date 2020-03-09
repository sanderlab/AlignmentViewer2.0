import "jest-webgl-canvas-mock";
import * as React from "react";

import Alignment from "../Alignment";
import { SequenceConsensusComponent } from "../SequenceConsensusComponent";

import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

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
